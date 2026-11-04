// Runs the player's Python with Pyodide, off the main thread.
//
// The whole program runs at full speed against a copy of the farm. Every
// action produces a snapshot, and snapshots and print() output stream back
// to the page in order, which replays them at the speed the player picks.

import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs";
import { Game } from "./game.js";

const MAX_TICKS = 5000;
const BATCH = 100;

let game = null;
let runId = 0;
let startTick = 0;
let events = [];

function flush() {
  if (events.length) {
    postMessage({ type: "events", runId, events });
    events = [];
  }
}

function act(fn) {
  if (game.tick - startTick >= MAX_TICKS) return -1;
  const ok = fn();
  events.push({ kind: "frame", state: game.snapshot() });
  if (events.length >= BATCH) flush();
  return ok ? 1 : 0;
}

const farm = {
  move: (d) => act(() => game.move(d)),
  till: () => act(() => game.till()),
  plant: (c) => act(() => game.plant(c)),
  harvest: () => act(() => game.harvest()),
  wait: () => act(() => game.wait()),
  is_ripe: () => game.isRipe(),
  crop_here: () => game.here.crop || "",
  ground_here: () => game.here.ground,
  pos_x: () => game.x,
  pos_y: () => game.y,
  field_size: () => game.size,
  count: (item) => game.inventory[item] ?? 0,
  ticks: () => game.tick - startTick,
  log: (text) => {
    events.push({ kind: "log", text: String(text) });
  },
};

async function init() {
  const pyodide = await loadPyodide();
  pyodide.registerJsModule("_farm", farm);
  const source = await (await fetch(new URL("../py/farm_api.py", import.meta.url))).text();
  pyodide.FS.writeFile("/home/pyodide/farm_api.py", source);
  return pyodide.pyimport("farm_api");
}

const ready = init().then(
  (api) => {
    postMessage({ type: "ready", maxTicks: MAX_TICKS });
    return api;
  },
  (err) => {
    postMessage({ type: "fatal", message: String(err) });
    throw err;
  },
);

onmessage = async (e) => {
  const msg = e.data;
  if (msg.type !== "run") return;
  const api = await ready;
  runId = msg.runId;
  game = new Game(msg.state);
  startTick = game.tick;
  events = [];
  let status = "error";
  let message = "";
  try {
    const result = api.run(msg.code);
    [status, message] = result.toJs();
    result.destroy();
  } catch (err) {
    message = `Internal error: ${err}`;
  }
  flush();
  postMessage({ type: "done", runId, status, message, ticks: game.tick - startTick });
};
