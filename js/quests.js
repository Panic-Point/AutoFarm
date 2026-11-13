// Quest fields and goal checks. No DOM code here, so it can be tested with Node.
import { CROPS, ITEMS, emptyInventory, strawberryFriends } from "./game.js";
import { WORDS } from "./words.js";

const TILE_CODES = {
  G: { ground: "grass", crop: "grass", ripe: true },
  g: { ground: "grass", crop: "grass", ripe: false },
  ".": { ground: "soil", crop: null },
  W: { ground: "soil", crop: "wheat", ripe: true },
  w: { ground: "soil", crop: "wheat", ripe: false },
  C: { ground: "soil", crop: "carrot", ripe: true },
  c: { ground: "soil", crop: "carrot", ripe: false },
  L: { ground: "soil", crop: "lettuce", ripe: true },
  l: { ground: "soil", crop: "lettuce", ripe: false },
  R: { ground: "soil", crop: "strawberry", ripe: true },
  r: { ground: "soil", crop: "strawberry", ripe: false },
  B: { ground: "soil", crop: "blueberry", ripe: true },
  b: { ground: "soil", crop: "blueberry", ripe: false },
};

const CROP_CODES = { G: "grass", W: "wheat", C: "carrot", L: "lettuce", R: "strawberry", B: "blueberry" };

// The map's rows are north first, but tiles are stored south row first.
function mapCell(map, x, y) {
  return map[map.length - 1 - y][x];
}

// A fresh farm state for a quest. Every try starts from this.
export function questField(quest) {
  const { map, start = [0, 0], inventory = {} } = quest.field;
  const size = map.length;
  const tiles = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const code = TILE_CODES[mapCell(map, x, y)];
      if (!code) throw new Error(`Quest ${quest.id}: unknown tile "${mapCell(map, x, y)}"`);
      const age = code.crop && code.ripe ? CROPS[code.crop].growTicks : 0;
      tiles.push({ ground: code.ground, crop: code.crop, age });
    }
  }
  const state = {
    size,
    x: start[0],
    y: start[1],
    tick: 0,
    tiles,
    inventory: emptyInventory(inventory),
    seeds: null,
    lost: 0,
    wilted: 0,
  };
  // Strawberries that start ripe have already counted their friends.
  tiles.forEach((t, i) => {
    if (t.crop === "strawberry" && t.age > 0) t.friends = strawberryFriends(state, i % size, Math.floor(i / size));
  });
  return state;
}

// What a run harvested: { item: amount gained } (never negative).
export function gains(start, end) {
  const out = {};
  for (const item of ITEMS) {
    const n = (end.inventory[item] ?? 0) - (start.inventory[item] ?? 0);
    if (n > 0) out[item] = n;
  }
  return out;
}

function tileMatches(tile, want) {
  if (want === "?") return true;
  if (want === "s") return tile.ground === "soil";
  if (want === ".") return tile.ground === "soil" && !tile.crop;
  return tile.crop === CROP_CODES[want];
}

// The [x, y] of every tile that doesn't match the goal pattern yet.
export function patternMisses(pattern, state) {
  const misses = [];
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      if (!tileMatches(state.tiles[y * state.size + x], mapCell(pattern, x, y))) misses.push([x, y]);
    }
  }
  return misses;
}

export function plural(n, word) {
  if (n === 1 || word === "hay" || word === "wheat") return `${n} ${word}`;
  if (word.endsWith("berry")) return `${n} ${word.slice(0, -1)}ies`;
  return `${n} ${word}s`;
}

// Judge a finished run. run: { status, ticks, words }.
// Returns { met, stars, problems: [text], gained }.
export function checkQuest(quest, start, end, run) {
  const goal = quest.goal;
  const gained = gains(start, end);
  const problems = [];
  if (run.status !== "ok" && run.status !== "out_of_ticks") {
    return { met: false, stars: 0, problems, gained };
  }
  for (const [item, n] of Object.entries(goal.gain ?? {})) {
    const got = gained[item] ?? 0;
    if (got < n) problems.push(`You harvested ${plural(got, item)}. The goal is ${n}.`);
  }
  for (const [item, n] of Object.entries(goal.exactly ?? {})) {
    const got = gained[item] ?? 0;
    if (got !== n) problems.push(`You harvested ${plural(got, item)}, but the order is exactly ${n}.`);
  }
  if (goal.at && (end.x !== goal.at[0] || end.y !== goal.at[1])) {
    problems.push("Bolt needs to finish on the tile with the flag.");
  }
  if (goal.pattern) {
    const misses = patternMisses(goal.pattern, end).length;
    if (misses) problems.push(`${plural(misses, "tile")} still ${misses === 1 ? "isn't" : "aren't"} right. Look for the dotted squares.`);
  }
  for (const [crop, n] of Object.entries(goal.plants ?? {})) {
    const got = end.tiles.filter((t) => t.crop === crop).length;
    if (got !== n) problems.push(`There ${got === 1 ? "is" : "are"} ${plural(got, crop)} growing. The goal is exactly ${n}.`);
  }
  if (goal.noLoss && end.lost > 0) {
    problems.push(`Bolt picked ${plural(end.lost, "crop")} before ${end.lost === 1 ? "it was" : "they were"} ripe.`);
  }
  if (goal.fresh && end.wilted > 0) {
    problems.push(`${plural(end.wilted, "lettuce")} wilted before Bolt picked ${end.wilted === 1 ? "it" : "them"}.`);
  }
  for (const group of goal.needs ?? []) {
    if (!group.some((w) => run.words.includes(w))) {
      const names = group.map((w) => WORDS[w].label).join(" or ");
      problems.push(`This quest is about ${names}. Try it with ${names}!`);
    }
  }
  const met = problems.length === 0;
  let stars = 0;
  if (met) {
    stars = 1;
    if (run.ticks <= quest.stars.two) stars = 2;
    if (run.ticks <= quest.stars.three) stars = 3;
  }
  return { met, stars, problems, gained };
}

// One short line about a quest's star targets.
export function starTargets(quest) {
  const ticks = (n) => `${n} ${n === 1 ? "tick" : "ticks"}`;
  return `★ finish · ★★ in ${ticks(quest.stars.two)} · ★★★ in ${ticks(quest.stars.three)}`;
}
