// Runs the player's Python with Pyodide, off the main thread.
//
// The whole program runs at full speed against a copy of the farm. Every
// action produces a snapshot, and snapshots and print() output stream back
// to the page in order, which replays them at the speed the player picks.

import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs";
import { FarmBridge, MAX_TICKS, PY_FILES } from "./bridge.js";

let runId = 0;
const bridge = new FarmBridge((events) => postMessage({ type: "events", runId, events }));

async function init() {
  const pyodide = await loadPyodide();
  pyodide.registerJsModule("_farm", bridge.module);
  for (const file of PY_FILES) {
    const source = await (await fetch(new URL(`../py/${file}`, import.meta.url))).text();
    pyodide.FS.writeFile(`/home/pyodide/${file}`, source);
  }
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
  bridge.start(msg.state);
  // The window being run, plus every other window it can `use`.
  const result = bridge.run(api, msg);
  postMessage({ type: "done", runId, ...result });
};
