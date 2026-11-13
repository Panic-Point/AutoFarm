// Quest fields and goal checks. No DOM code here, so it can be tested with Node.
import { CAN_SIZE, CROPS, ITEMS, WET_TICKS, emptyInventory, isTileDry, isTileRipe, strawberryFriends } from "./game.js";
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
  P: { ground: "soil", crop: "pumpkin", ripe: true },
  p: { ground: "soil", crop: "pumpkin", ripe: false },
  x: { ground: "soil", crop: "pumpkin", rotten: true },
  M: { ground: "soil", crop: "mushroom", ripe: true },
  K: { ground: "soil", crop: "corn", ripe: true },
  k: { ground: "soil", crop: "corn", ripe: false, age: 4 },
  q: { ground: "soil", crop: "corn", ripe: false, age: 4, wet: true },
  F: { ground: "soil", crop: "sunflower", ripe: true },
  f: { ground: "soil", crop: "sunflower", ripe: false },
  O: { ground: "well", crop: null },
};

const CROP_CODES = {
  G: "grass", W: "wheat", C: "carrot", L: "lettuce", R: "strawberry", B: "blueberry",
  P: "pumpkin", M: "mushroom", K: "corn", F: "sunflower",
};

// The map's rows are north first, but tiles are stored south row first.
function mapCell(map, x, y) {
  return map[map.length - 1 - y][x];
}

// A quest's test plots. `field` is one plot, or a list of plots that the
// same program has to work on, one after another.
export function questPlots(quest) {
  return Array.isArray(quest.field) ? quest.field : [quest.field];
}

// The goal for one plot: the quest's goal, with anything the plot changes.
export function plotGoal(quest, plot = 0) {
  return { ...quest.goal, ...(questPlots(quest)[plot].goal ?? {}) };
}

// Facts about a plot the player's program can read (see plot_data in
// js/bridge.js), like the rows of a design or a market order.
export function plotData(quest, plot = 0) {
  return questPlots(quest)[plot].data ?? {};
}

// A fresh farm state for one of a quest's plots. Every try starts from this.
export function questField(quest, plot = 0) {
  const { map, start = [0, 0], inventory = {}, can = CAN_SIZE } = questPlots(quest)[plot];
  const size = map.length;
  const tiles = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const code = TILE_CODES[mapCell(map, x, y)];
      if (!code) throw new Error(`Quest ${quest.id}: unknown tile "${mapCell(map, x, y)}"`);
      const info = code.crop ? CROPS[code.crop] : null;
      const tile = { ground: code.ground, crop: code.crop, age: code.age ?? 0 };
      if (code.ripe) tile.age = info.growTicks;
      if (code.rotten) {
        tile.age = info.growTicks + info.rotTicks;
        tile.rotten = true;
      }
      if (code.wet) tile.wet = WET_TICKS;
      tiles.push(tile);
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
    can,
    wasted: 0,
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
  if (n === 1 || word === "hay" || word === "wheat" || word === "corn") return `${n} ${word}`;
  if (word.endsWith("berry")) return `${n} ${word.slice(0, -1)}ies`;
  return `${n} ${word}s`;
}

// How many ticks a quest run may use before Bolt gets tired and stops. A few
// times the 2-star target leaves room for slow answers, but a loop that never
// ends stops in seconds instead of walking into the fence for 5,000 ticks.
export function tickLimit(quest) {
  return Math.max(60, quest.stars.two * 5);
}

export function starsFor(quest, ticks) {
  if (ticks <= quest.stars.three) return 3;
  if (ticks <= quest.stars.two) return 2;
  return 1;
}

// Judge one plot's run. run: { status, ticks, words }.
// Returns { met, problems: [text], gained }.
export function checkPlot(quest, plot, start, end, run) {
  const goal = plotGoal(quest, plot);
  const gained = gains(start, end);
  const problems = [];
  if (run.status === "out_of_ticks") {
    // The program never finished, so the quest isn't done, even if the field
    // happens to look right (like Bolt walking into the fence forever).
    problems.push("Bolt got tired before your program finished. Make your loop stop when the job is done!");
    return { met: false, problems, gained };
  }
  if (run.status !== "ok") {
    return { met: false, problems, gained };
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
  if (goal.thirsty) {
    // Every young corn that started on dry soil needs a drink.
    const dry = start.tiles.filter((t, i) => t.crop === "corn" && !isTileRipe(t) && isTileDry(t)
      && !(end.tiles[i].crop === "corn" && end.tiles[i].watered)).length;
    if (dry) problems.push(`${plural(dry, "corn")} on dry soil didn't get any water.`);
  }
  if (goal.noWaste && end.wasted > 0) {
    problems.push(`Bolt poured water where it wasn't needed ${end.wasted === 1 ? "once" : `${end.wasted} times`}. Only water dry corn that isn't ripe.`);
  }
  for (const group of goal.needs ?? []) {
    if (!group.some((w) => run.words.includes(w))) {
      const names = group.map((w) => WORDS[w].label).join(" or ");
      problems.push(`This quest is about ${names}. Try it with ${names}!`);
    }
  }
  return { met: problems.length === 0, problems, gained };
}

// Judge a finished run on a quest with one plot.
// Returns { met, stars, problems: [text], gained }.
export function checkQuest(quest, start, end, run) {
  const result = checkPlot(quest, 0, start, end, run);
  return { ...result, stars: result.met ? starsFor(quest, run.ticks) : 0 };
}

function plotList(n) {
  const names = Array.from({ length: n }, (_, i) => String(i + 1));
  if (n === 1) return "plot 1";
  return `plots ${names.slice(0, -1).join(", ")} and ${names[n - 1]}`;
}

// What to say when the program worked on the plots before `plot` but not on it.
export function plotProblem(quest, plot) {
  const total = questPlots(quest).length;
  if (total === 1) return null;
  if (plot === 0) return `It didn't work on plot 1 of ${total}.`;
  return `Your program worked on ${plotList(plot)}, but not on plot ${plot + 1}.`;
}

// Judge a whole quest from the runs on its plots, in order:
// results: [{ start, end, run }]. Plots after the first one that fails
// aren't needed (and aren't run). Stars count the ticks of every plot.
// Returns { met, stars, problems, gained, ticks, failedPlot }.
export function judgeQuest(quest, results) {
  const total = questPlots(quest).length;
  const gained = {};
  let ticks = 0;
  for (let i = 0; i < results.length; i++) {
    const { start, end, run } = results[i];
    const r = checkPlot(quest, i, start, end, run);
    ticks += run.ticks;
    for (const [item, n] of Object.entries(r.gained)) gained[item] = (gained[item] ?? 0) + n;
    if (!r.met) {
      const lead = plotProblem(quest, i);
      return { met: false, stars: 0, problems: lead ? [lead, ...r.problems] : r.problems, gained, ticks, failedPlot: i };
    }
  }
  if (results.length < total) {
    return { met: false, stars: 0, problems: [`Bolt only ran ${plotList(results.length)} of ${total}.`], gained, ticks, failedPlot: results.length };
  }
  return { met: true, stars: starsFor(quest, ticks), problems: [], gained, ticks, failedPlot: null };
}

// One short line about a quest's star targets.
export function starTargets(quest) {
  const ticks = (n) => `${n} ${n === 1 ? "tick" : "ticks"}`;
  const plots = questPlots(quest).length;
  const all = plots === 2 ? " (both plots together)" : plots > 2 ? ` (all ${plots} plots together)` : "";
  return `★ finish · ★★ in ${ticks(quest.stars.two)} · ★★★ in ${ticks(quest.stars.three)}${all}`;
}
