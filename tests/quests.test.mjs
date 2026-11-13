// Runs every quest's solution with the real farm and Python (Pyodide from
// node_modules), and checks the quest data. Run `npm install` first.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CHAPTERS, QUESTS } from "../js/chapters.js";
import { FarmBridge, PY_FILES } from "../js/bridge.js";
import { checkQuest, questField, tickLimit } from "../js/quests.js";
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

// Run a solution the way the game does: only words from open chapters.
function play(quest, solution, chapter = quest.chapter) {
  const { main, ...files } = typeof solution === "string" ? { main: solution } : solution;
  const start = questField(quest);
  bridge.start(start, tickLimit(quest));
  const locked = lockedWords((n) => n <= chapter);
  const run = bridge.run(api, { code: main.trim() + "\n", files, name: "main", locked });
  return { run, result: checkQuest(quest, start, bridge.game.snapshot(), run) };
}

test("quest data is well formed", () => {
  const ids = new Set();
  for (const ch of CHAPTERS) {
    assert.ok(ch.quests.length >= 3, `chapter ${ch.n} has too few quests`);
    for (const q of ch.quests) {
      assert.ok(!ids.has(q.id), `duplicate quest id ${q.id}`);
      ids.add(q.id);
      const size = q.field.map.length;
      assert.ok(q.field.map.every((row) => row.length === size), `${q.id}: field must be square`);
      if (q.goal.pattern) {
        assert.equal(q.goal.pattern.length, size, `${q.id}: pattern size`);
        assert.ok(q.goal.pattern.every((row) => row.length === size), `${q.id}: pattern rows`);
      }
      assert.ok(q.stars.three <= q.stars.two, `${q.id}: 3 stars must need fewer ticks than 2`);
      assert.equal(q.hints.length, 3, `${q.id}: three hints`);
      for (const group of q.goal.needs ?? []) {
        for (const w of group) assert.ok(WORDS[w], `${q.id}: unknown word ${w}`);
        assert.ok(group.some((w) => WORDS[w].chapter <= ch.n), `${q.id}: needs a word from a later chapter`);
      }
      questField(q); // throws on unknown tiles
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
  const quest = QUESTS.find((q) => q.id === "3-3");
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
  const quest = QUESTS.find((q) => q.id === "4-1");
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
  const quest = QUESTS.find((q) => q.id === "5-1");
  const { run, result } = play(quest, "repeat forever:\n    move(EAST)\n");
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
