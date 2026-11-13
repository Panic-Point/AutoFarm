// Farm simulation. Pure logic, no DOM: shared by the Python worker (which runs
// the player's program against it) and the page (which renders snapshots).
//
// Coordinates: x grows to the east, y grows to the north. (0, 0) is the
// south-west corner. Every farmer action takes exactly one tick; looking at
// the farm (is_ripe, position, ...) is free.

export const DIRECTIONS = {
  north: [0, 1],
  south: [0, -1],
  east: [1, 0],
  west: [-1, 0],
};

// growTicks: ticks from planting until ripe.
// ground: which ground the crop can be planted on.
// cost: items spent to plant it.
// yield: items gained when a ripe crop is harvested.
//
// Each of the newer crops has one special rule:
// crispTicks (lettuce): it stays crisp this many ticks after it's ripe, then
//   wilts. A wilted crop isn't ripe, and harvesting it gives nothing.
// friendBonus (strawberry): when it ripens, it counts the strawberries right
//   next to it (north, south, east and west), and gives this much more for
//   each one.
// regrowTicks (blueberry): the bush stays after a ripe harvest and is ripe
//   again this many ticks later. Each ripe harvest gives pickBonus more than
//   the one before, up to maxYield.
export const CROPS = {
  grass: { growTicks: 4, ground: "grass", cost: {}, yield: { hay: 1 } },
  wheat: { growTicks: 8, ground: "soil", cost: {}, yield: { wheat: 1 } },
  carrot: { growTicks: 14, ground: "soil", cost: { wheat: 2 }, yield: { carrot: 1 } },
  lettuce: { growTicks: 6, ground: "soil", cost: { hay: 2 }, yield: { lettuce: 1 }, crispTicks: 8 },
  strawberry: { growTicks: 12, ground: "soil", cost: { wheat: 3 }, yield: { strawberry: 1 }, friendBonus: 1 },
  blueberry: {
    growTicks: 24, ground: "soil", cost: { carrot: 2 }, yield: { blueberry: 2 },
    regrowTicks: 10, pickBonus: 1, maxYield: 5,
  },
};

export const ITEMS = ["hay", "wheat", "carrot", "lettuce", "strawberry", "blueberry"];

// How many strawberries are right next to tile (x, y): north, south, east and
// west. Works on a Game or a snapshot.
export function strawberryFriends(state, x, y) {
  let n = 0;
  for (const [dx, dy] of Object.values(DIRECTIONS)) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) continue;
    if (state.tiles[ny * state.size + nx].crop === "strawberry") n += 1;
  }
  return n;
}

export function isTileRipe(tile) {
  return Boolean(tile.crop) && !tile.wilted && tile.age >= CROPS[tile.crop].growTicks;
}

// What harvesting the ripe crop on tile (x, y) gives: { item: amount }.
export function harvestYield(state, x, y) {
  const tile = state.tiles[y * state.size + x];
  const info = CROPS[tile.crop];
  const [[item, base]] = Object.entries(info.yield);
  let n = base;
  if (info.friendBonus) n += info.friendBonus * (tile.friends ?? strawberryFriends(state, x, y));
  if (info.pickBonus) n = Math.min(info.maxYield, n + info.pickBonus * (tile.picks ?? 0));
  return { [item]: n };
}

// seeds: the crops that can be planted, or null for every crop.
// lost: how many unripe crops were harvested (and so lost).
// wilted: how many crops wilted before they were picked.
export function newFarmState(size = 3, inventory = {}) {
  const tiles = [];
  for (let i = 0; i < size * size; i++) {
    // Start with a field of ripe grass so the first harvest pays off at once.
    tiles.push({ ground: "grass", crop: "grass", age: CROPS.grass.growTicks });
  }
  return { size, x: 0, y: 0, tick: 0, tiles, inventory: emptyInventory(inventory), seeds: null, lost: 0, wilted: 0 };
}

export function emptyInventory(from = {}) {
  return Object.fromEntries(ITEMS.map((item) => [item, Number(from[item]) || 0]));
}

export class Game {
  constructor(state) {
    const s = structuredClone(state);
    this.size = s.size;
    this.x = s.x;
    this.y = s.y;
    this.tick = s.tick;
    this.tiles = s.tiles;
    this.inventory = s.inventory;
    this.seeds = s.seeds ?? null;
    this.lost = s.lost ?? 0;
    this.wilted = s.wilted ?? 0;
  }

  snapshot() {
    return {
      size: this.size,
      x: this.x,
      y: this.y,
      tick: this.tick,
      tiles: this.tiles.map((t) => ({ ...t })),
      inventory: { ...this.inventory },
      seeds: this.seeds,
      lost: this.lost,
      wilted: this.wilted,
    };
  }

  tileAt(x, y) {
    return this.tiles[y * this.size + x];
  }

  get here() {
    return this.tileAt(this.x, this.y);
  }

  // One tick of time: every crop grows. A strawberry counts its friends the
  // moment it ripens, and lettuce that's been ripe too long wilts.
  advance() {
    this.tick += 1;
    const ripened = [];
    this.tiles.forEach((t, i) => {
      if (!t.crop || t.wilted) return;
      const info = CROPS[t.crop];
      const last = info.growTicks + (info.crispTicks ?? 0);
      if (t.age >= last) return;
      t.age += 1;
      if (t.age === info.growTicks && info.friendBonus) ripened.push(i);
      if (info.crispTicks && t.age === last) {
        t.wilted = true;
        this.wilted += 1;
      }
    });
    for (const i of ripened) {
      this.tiles[i].friends = strawberryFriends(this, i % this.size, Math.floor(i / this.size));
    }
  }

  // ---- Actions (each takes one tick, returns true if it did something) ----

  move(direction) {
    const ok = this.canMove(direction);
    if (ok) {
      this.x += DIRECTIONS[direction][0];
      this.y += DIRECTIONS[direction][1];
    }
    this.advance();
    return ok;
  }

  // Turns grass into soil, or soil back into grass. Clears any crop.
  till() {
    const t = this.here;
    clearExtras(t);
    if (t.ground === "grass") {
      t.ground = "soil";
      t.crop = null;
      t.age = 0;
    } else {
      t.ground = "grass";
      t.crop = "grass";
      t.age = 0;
    }
    this.advance();
    return true;
  }

  plant(crop) {
    const info = CROPS[crop];
    if (!info) throw new Error(`unknown crop ${crop}`);
    const t = this.here;
    const ok = this.hasSeed(crop) && t.crop === null && t.ground === info.ground && this.canAfford(info.cost);
    if (ok) {
      for (const [item, n] of Object.entries(info.cost)) this.inventory[item] -= n;
      clearExtras(t);
      t.crop = crop;
      t.age = 0;
    }
    this.advance();
    return ok;
  }

  // Harvesting a ripe crop collects its yield. Harvesting an unripe crop
  // destroys it and collects nothing, and so does harvesting a wilted one.
  // Grass grows back on its own, and a ripe blueberry bush stays to regrow.
  harvest() {
    const t = this.here;
    let ok = false;
    if (t.crop) {
      const info = CROPS[t.crop];
      ok = isTileRipe(t);
      if (ok) {
        for (const [item, n] of Object.entries(harvestYield(this, this.x, this.y))) this.inventory[item] += n;
      } else if (!t.wilted) {
        this.lost += 1;
      }
      if (ok && info.regrowTicks) {
        t.age = info.growTicks - info.regrowTicks;
        t.picks = (t.picks ?? 0) + 1;
      } else {
        clearExtras(t);
        t.crop = t.ground === "grass" ? "grass" : null;
        t.age = 0;
      }
    }
    this.advance();
    return ok;
  }

  wait() {
    this.advance();
    return true;
  }

  // ---- Sensing (free) ----

  canMove(direction) {
    const delta = DIRECTIONS[direction];
    if (!delta) throw new Error(`unknown direction ${direction}`);
    const nx = this.x + delta[0];
    const ny = this.y + delta[1];
    return nx >= 0 && ny >= 0 && nx < this.size && ny < this.size;
  }

  hasSeed(crop) {
    return !this.seeds || this.seeds.includes(crop);
  }

  canAfford(cost) {
    return Object.entries(cost).every(([item, n]) => this.inventory[item] >= n);
  }

  isRipe() {
    return isTileRipe(this.here);
  }

  isWilted() {
    return Boolean(this.here.wilted);
  }
}

// Forget what a tile's last crop remembered (friends, picks, wilting).
function clearExtras(t) {
  delete t.friends;
  delete t.picks;
  delete t.wilted;
}
