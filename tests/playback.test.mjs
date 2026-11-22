import { test } from "node:test";
import assert from "node:assert/strict";
import { play, step, stepsByAction } from "../js/playback.js";

const at = (line, name = "main") => ({ name, line });
const line = (n, name) => ({ kind: "line", at: at(n, name) });
const frame = (n, name) => ({ kind: "frame", state: { tick: n }, at: at(n, name) });
const log = (text) => ({ kind: "log", text });

function newRun(queue, lines = true) {
  return { queue, pos: 0, at: null, lines };
}

function recorder() {
  const seen = [];
  return { seen, apply: (ev) => seen.push(ev.kind === "log" ? ev.text : ev.kind) };
}

test("each step stops on the next line, playing frames and logs on the way", () => {
  // set x to 3 / move(EAST) / print(x)
  const run = newRun([line(1), line(2), frame(2), line(3), log("3")]);
  const r = recorder();
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(1));
  assert.deepEqual(r.seen, []);
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(2));
  assert.deepEqual(r.seen, []); // the move hasn't happened yet
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(3));
  assert.deepEqual(r.seen, ["frame"]);
  // The last step plays the print and runs out: the run is over.
  assert.equal(step(run, r.apply), false);
  assert.deepEqual(r.seen, ["frame", "3"]);
  assert.equal(run.pos, run.queue.length);
});

test("a step waits when the next line hasn't arrived yet, and picks up after", () => {
  const run = newRun([line(1), frame(1)]);
  const r = recorder();
  step(run, r.apply);
  assert.equal(step(run, r.apply), false);
  assert.deepEqual(r.seen, ["frame"]);
  run.queue.push(line(2, "helper"));
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(2, "helper"));
});

test("without line events, a step goes one action at a time", () => {
  const run = newRun([frame(1), log("hi"), frame(2)], false);
  assert.equal(stepsByAction(run), true);
  const r = recorder();
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(1));
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(2));
  assert.deepEqual(r.seen, ["frame", "hi", "frame"]);
});

test("after the line limit, steps go one action at a time", () => {
  const run = newRun([line(1), { kind: "line_limit" }, frame(2), frame(3)]);
  const r = recorder();
  step(run, r.apply);
  assert.equal(stepsByAction(run), false);
  assert.equal(step(run, r.apply), true);
  assert.equal(stepsByAction(run), true);
  assert.deepEqual(run.at, at(2));
  assert.deepEqual(r.seen, ["line_limit", "frame"]);
});

test("normal playback skips line events and keeps to the frame budget", () => {
  const run = newRun([line(1), frame(1), line(2), log("a"), frame(2), line(3), frame(3)]);
  const r = recorder();
  assert.equal(play(run, 2, r.apply), 2);
  assert.deepEqual(r.seen, ["frame", "a", "frame"]);
  assert.deepEqual(run.at, at(2));
  // Then stepping again from where it left off.
  assert.equal(step(run, r.apply), true);
  assert.deepEqual(run.at, at(3));
  assert.equal(play(run, Infinity, r.apply), 1);
  assert.deepEqual(run.at, at(3));
});

test("played events are dropped so the queue doesn't grow forever", () => {
  const queue = [];
  for (let i = 0; i < 3000; i++) queue.push(line(i), frame(i));
  const run = newRun(queue);
  play(run, 2500, () => {});
  assert.ok(run.queue.length < 6000);
  assert.equal(step(run, () => {}), true);
  assert.deepEqual(run.at, at(2500));
});

test("the real bridge reports lines in step mode only", async () => {
  const { readFile } = await import("node:fs/promises");
  const { loadPyodide } = await import("pyodide");
  const { FarmBridge, PY_FILES } = await import("../js/bridge.js");
  const { newFarmState } = await import("../js/game.js");
  const events = [];
  const bridge = new FarmBridge((evs) => events.push(...evs), 1e9);
  const pyodide = await loadPyodide();
  pyodide.registerJsModule("_farm", bridge.module);
  for (const file of PY_FILES) {
    pyodide.FS.writeFile(`/home/pyodide/${file}`, await readFile(new URL(`../py/${file}`, import.meta.url), "utf8"));
  }
  const api = pyodide.pyimport("farm_api");
  const code = "set x to 1\nmove(EAST)\nprint(x)\n";
  bridge.start(newFarmState(3));
  bridge.run(api, { code, name: "main", step: true });
  assert.deepEqual(events.map((e) => e.kind), ["line", "line", "frame", "line", "log"]);
  assert.deepEqual(events.filter((e) => e.kind === "line").map((e) => e.at.line), [1, 2, 3]);
  events.length = 0;
  bridge.start(newFarmState(3));
  bridge.run(api, { code, name: "main" });
  assert.deepEqual(events.map((e) => e.kind), ["frame", "log"]);
  // A move into the fence still makes a frame, marked as a bump on its line.
  events.length = 0;
  bridge.start(newFarmState(3));
  bridge.run(api, { code: "move(EAST)\nmove(EAST)\nmove(EAST)\nharvest()\n", name: "main" });
  const frames = events.filter((e) => e.kind === "frame");
  assert.deepEqual(frames.map((e) => e.bump ?? null), [null, null, [1, 0], null]);
  assert.deepEqual(frames[2].at, { name: "main", line: 3 });
  assert.equal(frames[2].state.x, 2);
});
