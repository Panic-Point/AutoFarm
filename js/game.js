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
export const CROPS = {
  grass: { growTicks: 4, ground: "grass", cost: {}, yield: { hay: 1 } },
  wheat: { growTicks: 8, ground: "soil", cost: {}, yield: { wheat: 1 } },
  carrot: { growTicks: 14, ground: "soil", cost: { wheat: 2 }, yield: { carrot: 1 } },
};

export const ITEMS = ["hay", "wheat", "carrot"];

// seeds: the crops that can be planted, or null for every crop.
// lost: how many unripe crops were harvested (and so lost).
export function newFarmState(size = 3, inventory = {}) {
  const tiles = [];
  for (let i = 0; i < size * size; i++) {
    // Start with a field of ripe grass so the first harvest pays off at once.
    tiles.push({ ground: "grass", crop: "grass", age: CROPS.grass.growTicks });
  }
  return { size, x: 0, y: 0, tick: 0, tiles, inventory: emptyInventory(inventory), seeds: null, lost: 0 };
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
    };
  }

  tileAt(x, y) {
    return this.tiles[y * this.size + x];
  }

  get here() {
    return this.tileAt(this.x, this.y);
  }

  // One tick of time: every crop grows.
  advance() {
    this.tick += 1;
    for (const t of this.tiles) {
      if (t.crop && t.age < CROPS[t.crop].growTicks) t.age += 1;
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
      t.crop = crop;
      t.age = 0;
    }
    this.advance();
    return ok;
  }

  // Harvesting a ripe crop collects its yield. Harvesting an unripe crop
  // destroys it and collects nothing. Grass grows back on its own.
  harvest() {
    const t = this.here;
    let ok = false;
    if (t.crop) {
      const info = CROPS[t.crop];
      ok = t.age >= info.growTicks;
      if (ok) {
        for (const [item, n] of Object.entries(info.yield)) this.inventory[item] += n;
      } else {
        this.lost += 1;
      }
      t.crop = t.ground === "grass" ? "grass" : null;
      t.age = 0;
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
    const t = this.here;
    return t.crop !== null && t.age >= CROPS[t.crop].growTicks;
  }
}
