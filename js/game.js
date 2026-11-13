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
// after (carrot): planted on soil where this crop was just picked, it gives
//   afterBonus more. Soil remembers the last crop picked ripe on it until
//   something is planted there or it's tilled.
// regrowTicks (blueberry): the bush stays after a ripe harvest and is ripe
//   again this many ticks later. Each ripe harvest gives pickBonus more than
//   the one before, up to maxYield.
// rotTicks (pumpkin): it stays good this many ticks after it's ripe, then
//   rots. A rotten crop isn't ripe: harvesting it does nothing, and till()
//   clears it away, leaving soil.
// wild (mushroom): it can't be planted. It only grows in the fog.
// thirsty (corn): it only grows while its soil is wet (see water()).
// tall (sunflower): Bolt can see it from anywhere, with ripe_at(x, y).
export const CROPS = {
  grass: { growTicks: 4, ground: "grass", cost: {}, yield: { hay: 1 } },
  wheat: { growTicks: 8, ground: "soil", cost: {}, yield: { wheat: 1 } },
  carrot: { growTicks: 14, ground: "soil", cost: { wheat: 2 }, yield: { carrot: 1 }, after: "wheat", afterBonus: 1 },
  lettuce: { growTicks: 6, ground: "soil", cost: { hay: 2 }, yield: { lettuce: 1 }, crispTicks: 8 },
  strawberry: { growTicks: 12, ground: "soil", cost: { wheat: 3 }, yield: { strawberry: 1 }, friendBonus: 1 },
  blueberry: {
    growTicks: 24, ground: "soil", cost: { carrot: 2 }, yield: { blueberry: 2 },
    regrowTicks: 10, pickBonus: 1, maxYield: 5,
  },
  pumpkin: { growTicks: 16, ground: "soil", cost: { carrot: 1 }, yield: { pumpkin: 1 }, rotTicks: 30 },
  mushroom: { growTicks: 1, ground: "soil", cost: {}, yield: { mushroom: 1 }, wild: true },
  corn: { growTicks: 10, ground: "soil", cost: { wheat: 1 }, yield: { corn: 2 }, thirsty: true },
  sunflower: { growTicks: 40, ground: "soil", cost: { wheat: 2 }, yield: { sunflower: 1 }, tall: true },
};

export const ITEMS = ["hay", "wheat", "carrot", "lettuce", "strawberry", "blueberry", "pumpkin", "mushroom", "corn", "sunflower"];

// The watering can: water() wets a tile for WET_TICKS ticks and uses 1 of
// the CAN_SIZE drops in the can. refill() fills it up at the well.
export const CAN_SIZE = 5;
export const WET_TICKS = 6;

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
  return Boolean(tile.crop) && !tile.wilted && !tile.rotten && tile.age >= CROPS[tile.crop].growTicks;
}

// True if tile (x, y) has a ripe sunflower. Sunflowers are tall, so Bolt can
// see them from anywhere on the field. Works on a Game or a snapshot.
export function ripeAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.size || y >= state.size) return false;
  const tile = state.tiles[y * state.size + x];
  return Boolean(tile.crop && CROPS[tile.crop].tall) && isTileRipe(tile);
}

// A tile's soil is dry unless it was watered in the last few ticks. The well
// and grass are never dry.
export function isTileDry(tile) {
  return tile.ground === "soil" && !(tile.wet > 0);
}

// What harvesting the ripe crop on tile (x, y) gives: { item: amount }.
export function harvestYield(state, x, y) {
  const tile = state.tiles[y * state.size + x];
  const info = CROPS[tile.crop];
  const [[item, base]] = Object.entries(info.yield);
  let n = base;
  if (tile.rotated) n += info.afterBonus;
  if (info.friendBonus) n += info.friendBonus * (tile.friends ?? strawberryFriends(state, x, y));
  if (info.pickBonus) n = Math.min(info.maxYield, n + info.pickBonus * (tile.picks ?? 0));
  if (BEE_CROPS.includes(tile.crop) && nearHive(state, x, y)) n += 1;
  return { [item]: n };
}

// Bees: a hive on the home farm makes these crops give 1 more when they grow
// within 1 tile of it (diagonals count). Nothing can be planted on the hive.
export const BEE_CROPS = ["strawberry", "blueberry"];

export function nearHive(state, x, y) {
  const h = state.hive;
  return Boolean(h) && !(h[0] === x && h[1] === y) && Math.abs(h[0] - x) <= 1 && Math.abs(h[1] - y) <= 1;
}

// Daisy's dinner time: with `dinner` set ({ every, lastFed, missed }), Daisy
// waits at the barn (0, 0). Bolt has to visit her at least once every
// `every` ticks; each time it doesn't, she misses a meal.
function checkDinner(game) {
  const d = game.dinner;
  if (!d) return;
  if (game.x === 0 && game.y === 0) d.lastFed = game.tick;
  else if (game.tick - d.lastFed >= d.every) {
    d.missed += 1;
    d.lastFed = game.tick;
  }
}

// seeds: the crops that can be planted, or null for every crop.
// can: drops of water left in the watering can.
// wasted: how many times water was poured where nothing needed it.
// lost: how many unripe crops were harvested (and so lost).
// wilted: how many crops wilted before they were picked.
export function newFarmState(size = 3, inventory = {}) {
  const tiles = [];
  for (let i = 0; i < size * size; i++) {
    // Start with a field of ripe grass so the first harvest pays off at once.
    tiles.push({ ground: "grass", crop: "grass", age: CROPS.grass.growTicks });
  }
  return {
    size, x: 0, y: 0, tick: 0, tiles, inventory: emptyInventory(inventory), seeds: null, lost: 0, wilted: 0,
    can: CAN_SIZE, wasted: 0,
  };
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
    this.can = s.can ?? CAN_SIZE;
    this.wasted = s.wasted ?? 0;
    this.hive = s.hive ?? null;
    this.dinner = s.dinner ?? null;
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
      can: this.can,
      wasted: this.wasted,
      hive: this.hive,
      dinner: this.dinner && { ...this.dinner },
    };
  }

  tileAt(x, y) {
    return this.tiles[y * this.size + x];
  }

  get here() {
    return this.tileAt(this.x, this.y);
  }

  // One tick of time: every crop grows. A strawberry counts its friends the
  // moment it ripens, lettuce that's been ripe too long wilts, a pumpkin that's
  // been ripe too long rots, and corn only grows on wet soil. Wet soil dries a
  // little every tick.
  advance() {
    this.tick += 1;
    const ripened = [];
    this.tiles.forEach((t, i) => {
      const wet = t.wet > 0;
      if (wet) t.wet -= 1;
      if (!t.crop || t.wilted || t.rotten) return;
      const info = CROPS[t.crop];
      if (info.thirsty && !wet) return;
      const last = info.growTicks + (info.crispTicks ?? info.rotTicks ?? 0);
      if (t.age >= last) return;
      t.age += 1;
      if (t.age === info.growTicks && info.friendBonus) ripened.push(i);
      if (info.crispTicks && t.age === last) {
        t.wilted = true;
        this.wilted += 1;
      }
      if (info.rotTicks && t.age === last) t.rotten = true;
    });
    for (const i of ripened) {
      this.tiles[i].friends = strawberryFriends(this, i % this.size, Math.floor(i / this.size));
    }
    checkDinner(this);
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

  // Turns grass into soil, or soil back into grass. Clears any crop. A rotten
  // crop is cleared away and the soil stays soil.
  till() {
    const t = this.here;
    if (t.ground === "well") {
      this.advance();
      return false;
    }
    const rotten = Boolean(t.rotten);
    clearExtras(t);
    delete t.last;
    if (rotten) {
      t.crop = null;
      t.age = 0;
    } else if (t.ground === "grass") {
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
    const onHive = Boolean(this.hive) && this.hive[0] === this.x && this.hive[1] === this.y;
    const ok = !info.wild && this.hasSeed(crop) && !onHive && t.crop === null && t.ground === info.ground && this.canAfford(info.cost);
    if (ok) {
      for (const [item, n] of Object.entries(info.cost)) this.inventory[item] -= n;
      clearExtras(t);
      if (info.after && t.last === info.after) t.rotated = true;
      delete t.last;
      t.crop = crop;
      t.age = 0;
    }
    this.advance();
    return ok;
  }

  // Harvesting a ripe crop collects its yield. Harvesting an unripe crop
  // destroys it and collects nothing, and so does harvesting a wilted one.
  // A rotten crop is too squishy to pick: it stays until it's tilled.
  // Grass grows back on its own, and a ripe blueberry bush stays to regrow.
  harvest() {
    const t = this.here;
    let ok = false;
    if (t.crop && !t.rotten) {
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
        const picked = t.crop;
        clearExtras(t);
        t.crop = t.ground === "grass" ? "grass" : null;
        t.age = 0;
        // Soil remembers what was just picked, for crops that like to follow it.
        if (ok && t.ground === "soil") t.last = picked;
      }
    }
    this.advance();
    return ok;
  }

  wait() {
    this.advance();
    return true;
  }

  // Wet this tile's soil for WET_TICKS ticks, using 1 drop from the can.
  // Water poured where nothing needs it (soil that's already wet, a ripe
  // crop, or a tile with no thirsty crop) still counts as wasted.
  water() {
    const t = this.here;
    const ok = this.can > 0 && t.ground === "soil";
    if (ok) {
      const info = t.crop ? CROPS[t.crop] : null;
      if (!info?.thirsty || t.wet > 0 || isTileRipe(t)) this.wasted += 1;
      this.can -= 1;
      t.wet = WET_TICKS;
      t.watered = true;
    }
    this.advance();
    return ok;
  }

  // Fill the watering can. Only works on the well.
  refill() {
    const ok = this.here.ground === "well";
    if (ok) this.can = CAN_SIZE;
    this.advance();
    return ok;
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

  isRotten() {
    return Boolean(this.here.rotten);
  }

  isDry() {
    return isTileDry(this.here);
  }
}

// Forget what a tile's last crop remembered (friends, picks, wilting,
// planted after the right crop).
function clearExtras(t) {
  delete t.rotated;
  delete t.friends;
  delete t.picks;
  delete t.wilted;
  delete t.rotten;
  delete t.watered;
}
