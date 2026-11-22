// Runs every quest's solution with the real farm and Python (Pyodide from
// node_modules), and checks the quest data. Run `npm install` first.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CHAPTERS, QUESTS } from "../js/chapters.js";
import { FarmBridge, PY_FILES } from "../js/bridge.js";
import { checkQuest, judgeQuest, plotData, questField, questPlots, tickLimit } from "../js/quests.js";
import { WORDS, lockedWords } from "../js/words.js";
import { SOLUTIONS } from "./solutions.mjs";

let api;
const bridge = new FarmBridge(() => {}, 1e9);

before(async () => {
  const { loadPyodide } = await import("pyodide");
  const pyodide = await loadPyodide();
  pyodide.registerJsModule("_farm", bridge.module);
  for (const file of PY_FILES) {
    const source = await readFile(new URL(`../py/${file}`, import.meta.url), "utf8");
    pyodide.FS.writeFile(`/home/pyodide/${file}`, source);
  }
  api = pyodide.pyimport("farm_api");
});

// Run a solution the way the game does: only words from open chapters, on
// each test plot in turn until one fails. `run` is the last plot's run, with
// the ticks of every plot that ran.
function play(quest, solution, chapter = quest.chapter) {
  const { main, ...files } = typeof solution === "string" ? { main: solution } : solution;
  const locked = lockedWords((n) => n <= chapter);
  const results = [];
  for (let i = 0; i < questPlots(quest).length; i++) {
    const start = questField(quest, i);
    bridge.start(start, tickLimit(quest), plotData(quest, i));
    const run = bridge.run(api, { code: main.trim() + "\n", files, name: "main", locked });
    results.push({ start, end: bridge.game.snapshot(), run });
    const judged = judgeQuest(quest, results);
    if (!judged.met && judged.failedPlot === i) break;
  }
  const result = judgeQuest(quest, results);
  const last = results[results.length - 1].run;
  return { run: { ...last, ticks: result.ticks }, result, results };
}

test("quest data is well formed", () => {
  const ids = new Set();
  for (const ch of CHAPTERS) {
    assert.ok(ch.quests.length >= 3, `chapter ${ch.n} has too few quests`);
    for (const q of ch.quests) {
      assert.ok(!ids.has(q.id), `duplicate quest id ${q.id}`);
      ids.add(q.id);
      const plots = questPlots(q);
      assert.ok(plots.length >= 1 && plots.length <= 3, `${q.id}: 1 to 3 test plots`);
      plots.forEach((plot, i) => {
        const size = plot.map.length;
        assert.ok(plot.map.every((row) => row.length === size), `${q.id} plot ${i + 1}: field must be square`);
        const pattern = plot.goal?.pattern ?? q.goal.pattern;
        if (pattern) {
          assert.equal(pattern.length, size, `${q.id} plot ${i + 1}: pattern size`);
          assert.ok(pattern.every((row) => row.length === size), `${q.id} plot ${i + 1}: pattern rows`);
        }
        questField(q, i); // throws on unknown tiles
      });
      if (q.starter !== undefined) {
        const code = typeof q.starter === "string" ? q.starter : q.starter.code;
        assert.equal(typeof code, "string", `${q.id}: starter needs code`);
      }
      assert.ok(q.stars.three <= q.stars.two, `${q.id}: 3 stars must need fewer ticks than 2`);
      assert.equal(q.hints.length, 3, `${q.id}: three hints`);
      for (const group of q.goal.needs ?? []) {
        for (const w of group) assert.ok(WORDS[w], `${q.id}: unknown word ${w}`);
        assert.ok(group.some((w) => WORDS[w].chapter <= ch.n), `${q.id}: needs a word from a later chapter`);
      }
    }
  }
  // A chapter must be possible to open with the stars from earlier chapters.
  let before = 0;
  for (const ch of CHAPTERS) {
    assert.ok(ch.starsToOpen <= before * 3, `chapter ${ch.n} needs more stars than exist`);
    before += ch.quests.length;
  }
});

test("every quest has a solution", () => {
  assert.deepEqual(Object.keys(SOLUTIONS).sort(), QUESTS.map((q) => q.id).sort());
});

for (const quest of QUESTS) {
  test(`quest ${quest.id} ${quest.title}: the solution earns 3 stars`, () => {
    const { run, result } = play(quest, SOLUTIONS[quest.id]);
    assert.equal(run.status, "ok", run.message);
    assert.deepEqual(result.problems, []);
    assert.equal(result.stars, 3, `took ${run.ticks} ticks, 3 stars needs ${quest.stars.three}`);
    // The 3-star target should be tight, so the best players have to find it.
    assert.equal(run.ticks, quest.stars.three, `${quest.id}: best known is ${run.ticks} ticks`);
  });
}

test("using a word too early stops the run with a note from Bolt", () => {
  const quest = QUESTS.find((q) => q.id === "1-3");
  const { run, result } = play(quest, "repeat 3 times:\n    harvest()\n    move(EAST)\n");
  assert.equal(run.status, "error");
  assert.equal(run.message, "Line 1: Bolt doesn't know repeat yet. You'll learn it in chapter 2!");
  assert.equal(result.stars, 0);
});

test("a goal that isn't met says what's missing", () => {
  const quest = QUESTS.find((q) => q.id === "2-1");
  const { result } = play(quest, "harvest()\nmove(EAST)\nharvest()\n");
  assert.equal(result.met, false);
  assert.deepEqual(result.problems, [
    "You harvested 2 hay. The goal is 5.",
    "This quest is about repeat. Try it with repeat!",
  ]);
});

test("slower solutions earn fewer stars", () => {
  const quest = QUESTS.find((q) => q.id === "4-3");
  const slow = `
repeat 5 times:
    repeat 4 times:
        harvest()
        move(EAST)
    harvest()
    repeat 4 times:
        move(WEST)
    move(NORTH)`;
  const { run, result } = play(quest, slow);
  assert.equal(run.ticks, quest.stars.two);
  assert.equal(result.stars, 2);
});

test("losing an unripe crop fails a careful quest", () => {
  const quest = QUESTS.find((q) => q.id === "5-1");
  const { result } = play(quest, "repeat 4 times:\n    harvest()\n    move(EAST)\nharvest()\n");
  assert.equal(result.met, false);
  assert.match(result.problems.join(" "), /picked 2 crops before they were ripe/);
});

test("frames say which line of which window Bolt is running", () => {
  const events = [];
  const onEvents = bridge.onEvents;
  bridge.onEvents = (evs) => events.push(...evs);
  bridge.start(questField(QUESTS[0]));
  const run = bridge.run(api, {
    code: "use helper\ngo()\nwait()\n",
    files: { helper: "define go:\n    move(EAST)\n" },
    name: "main",
    locked: {},
  });
  bridge.onEvents = onEvents;
  assert.equal(run.status, "ok");
  assert.equal(run.errorAt, null);
  const at = events.filter((e) => e.kind === "frame").map((e) => e.at);
  assert.deepEqual(at, [{ name: "helper", line: 2 }, { name: "main", line: 3 }]);
});

test("a command without brackets stops the run and points at its line", () => {
  bridge.start(questField(QUESTS[0]));
  const run = bridge.run(api, { code: "move(EAST)\nif is_ripe:\n    harvest()\n", files: {}, name: "main", locked: {} });
  assert.equal(run.status, "error");
  assert.match(run.message, /^Line 2: `is_ripe` needs brackets/);
  assert.deepEqual(run.errorAt, { name: "main", line: 2 });
  assert.equal(run.ticks, 0);
});

test("a loop that never ends is a loss, even if Bolt ends up in the right place", () => {
  const quest = QUESTS.find((q) => q.id === "3-1");
  const { run, result } = play(quest, "repeat until is_ripe():\n    move(EAST)\n");
  assert.equal(run.status, "out_of_ticks");
  // Bolt stops soon instead of walking into the fence for 5,000 ticks.
  assert.equal(run.ticks, tickLimit(quest));
  assert.ok(run.ticks < 100);
  assert.match(run.message, /^Bolt got tired/);
  assert.equal(result.met, false);
  assert.equal(result.stars, 0);
  assert.deepEqual(result.problems, [
    "Bolt got tired before your program finished. Make your loop stop when the job is done!",
  ]);
});

test("every quest's tick limit leaves room for slow answers", () => {
  for (const quest of QUESTS) {
    assert.ok(tickLimit(quest) >= quest.stars.two * 3, `${quest.id}: tick limit is too tight`);
  }
});

// A made-up quest with three test plots: the grass row is a different length
// on each, so counting steps works on one plot but not the others.
const ROWS = {
  id: "t-1",
  title: "Test Rows",
  field: [
    { map: ["...", "...", "GGG"] },
    { map: ["....", "....", "....", "GGGG"], data: { size: 4 } },
    { map: [".....", ".....", ".....", ".....", "GGGGG"], goal: { at: [4, 0] } },
  ],
  goal: { gain: { hay: 3 } },
  stars: { two: 20, three: 12 },
  hints: ["", "", ""],
};
ROWS.field[1].goal = { gain: { hay: 4 } };
ROWS.field[2].goal.gain = { hay: 5 };

test("test plots: one program runs on every plot and the ticks add up", () => {
  const general = "repeat until not can_move(EAST):\n    harvest()\n    move(EAST)\nharvest()\n";
  const { result, results } = play(ROWS, general, 8);
  assert.equal(results.length, 3);
  assert.deepEqual(results.map((r) => r.run.ticks), [5, 7, 9]);
  assert.equal(result.met, true);
  assert.equal(result.ticks, 21);
  assert.equal(result.stars, 1);
  assert.deepEqual(result.gained, { hay: 12 });
});

test("test plots: counting steps works on plot 1 but stops on plot 2", () => {
  const counted = "harvest()\nmove(EAST)\nharvest()\nmove(EAST)\nharvest()\n";
  const { result, results } = play(ROWS, counted, 8);
  assert.equal(results.length, 2, "plot 3 never runs");
  assert.equal(result.met, false);
  assert.equal(result.failedPlot, 1);
  assert.deepEqual(result.problems, [
    "Your program worked on plot 1, but not on plot 2.",
    "You harvested 3 hay. The goal is 4.",
  ]);
});

test("test plots: a plot's goal is added to the quest's goal", () => {
  const stopShort = "repeat field_size() times:\n    harvest()\n    if position()[0] < field_size() - 2:\n        move(EAST)\n";
  const { result } = play(ROWS, stopShort, 8);
  assert.equal(result.met, false);
  assert.equal(result.failedPlot, 0);
  assert.equal(result.problems[0], "It didn't work on plot 1 of 3.");
});

test("test plots: a program can read facts about its plot", () => {
  bridge.start(questField(ROWS, 1), 100, plotData(ROWS, 1));
  const run = bridge.run(api, { code: "print(_plot_data('size'))\n", files: {}, name: "main", locked: {} });
  assert.equal(run.status, "error", "private helpers stay private to the game");
  assert.equal(bridge.module.plot_data("size"), "4");
  assert.equal(bridge.module.plot_data("nothing"), "null");
});

test("every Fix Bolt's code quest starts with code that needs fixing", () => {
  for (const quest of QUESTS.filter((q) => q.starter)) {
    const code = typeof quest.starter === "string" ? quest.starter : quest.starter.code;
    const { result } = play(quest, code);
    assert.ok(result.stars < 3, `${quest.id}: the starter already earns ${result.stars} stars`);
  }
});

test("pumpkins need else if: a rotten one has to be tilled", () => {
  const quest = QUESTS.find((q) => q.id === "5-5");
  const { result } = play(quest, "repeat 4 times:\n    if is_ripe():\n        harvest()\n    move(EAST)\nif is_ripe():\n    harvest()\n");
  assert.equal(result.met, false);
  assert.match(result.problems.join(" "), /2 tiles still aren't right/);
});

test("test plots catch a program that only knows where the first mushroom is", () => {
  const quest = QUESTS.find((q) => q.id === "6-2");
  const fixed = "repeat forever:\n    if position() == (3, 0):\n        harvest()\n        break\n    move(EAST)\nrepeat 3 times:\n    move(WEST)\n";
  const { result } = play(quest, fixed);
  assert.equal(result.met, false);
  assert.equal(result.problems[0], "Your program worked on plot 1, but not on plot 2.");
});

test("watering every dry tile wastes water on the ripe corn", () => {
  const quest = QUESTS.find((q) => q.id === "7-5");
  const careless = "repeat 5 times:\n    if is_dry():\n        water()\n    if is_ripe():\n        harvest()\n    if can_move(EAST):\n        move(EAST)\n";
  const { result } = play(quest, careless);
  assert.equal(result.met, false);
  assert.match(result.problems.join(" "), /Bolt poured water where it wasn't needed 2 times/);
  assert.match(result.problems.join(" "), /This quest is about and, or and not/);
});

test("skipping the young corn leaves it thirsty", () => {
  const quest = QUESTS.find((q) => q.id === "7-5");
  const lazy = "repeat 5 times:\n    if is_ripe() and true:\n        harvest()\n    if can_move(EAST):\n        move(EAST)\n";
  const { result } = play(quest, lazy);
  assert.deepEqual(result.problems, ["2 corn on dry soil didn't get any water."]);
});

test("the Mayor's Order fails when Bolt picks extra produce", () => {
  const quest = QUESTS.find((q) => q.id === "9-4");
  const greedy = "set basket to []\nrepeat 5 times:\n    if crop_here() in order():\n        harvest()\n        add crop_here() to basket\n    move(EAST)\nharvest()\n";
  const { result } = play(quest, greedy);
  assert.equal(result.met, false);
  assert.match(result.problems.join(" "), /You harvested 2 carrots, but the order is exactly 1/);
});

test("golden quests are well formed and come after the festival", () => {
  const golden = QUESTS.filter((q) => q.golden);
  assert.equal(golden.length, 8);
  // One per chapter, in order. Chapter 3's while loops are already in G-1 and G-2.
  assert.deepEqual(golden.map((q) => q.from), [1, 2, 4, 5, 6, 7, 8, 9]);
  golden.forEach((q) => {
    assert.ok(questPlots(q).length >= 2, `${q.id}: golden quests use test plots`);
    questPlots(q).forEach((plot, n) => {
      const size = plot.map.length;
      assert.ok(plot.map.every((row) => row.length === size), `${q.id} plot ${n + 1}: square`);
      const pattern = plot.goal?.pattern ?? q.goal.pattern;
      if (pattern) assert.ok(pattern.length === size && pattern.every((r) => r.length === size), `${q.id} plot ${n + 1}: pattern`);
      questField(q, n);
    });
    assert.equal(q.hints.length, 3);
    assert.ok(q.stars.three <= q.stars.two);
  });
});

test("a contract can be filled on the home farm", async () => {
  const { newFarmState } = await import("../js/game.js");
  const { checkContract } = await import("../js/progress.js");
  const { CONTRACTS } = await import("../js/postgame.js");
  const c = CONTRACTS[0];
  const start = newFarmState(5);
  bridge.start(start, c.ticks);
  const code = `
set way to EAST
repeat 5 times:
    repeat 4 times:
        harvest()
        move(way)
    harvest()
    move(NORTH)
    if way == EAST:
        set way to WEST
    else:
        set way to EAST
`;
  const run = bridge.run(api, { code, files: {}, name: "main", locked: {} });
  const end = bridge.game.snapshot();
  const gained = { hay: end.inventory.hay - start.inventory.hay };
  assert.equal(run.status, "ok");
  assert.ok(run.ticks <= c.ticks);
  assert.deepEqual(checkContract(c, run, gained, end), { met: true, problems: [] });
});
