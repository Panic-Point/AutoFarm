// Page controller: editor, run/stop, playback of the worker's snapshots.
import { ITEMS, newFarmState } from "./game.js";
import { drawFarm } from "./render.js";
import { loadWorkspace } from "./files.js";
import { Desk } from "./windows.js";

// Watchdog: if Python goes quiet this long, restart it.
const WATCHDOG_MS = 20000;
const STORE_CODE = "autofarm.code"; // the single program saved before code windows
const STORE_FILES = "autofarm.files";
const STORE_FARM = "autofarm.farm";

const $ = (id) => document.getElementById(id);
const canvas = $("farm");
const ctx = canvas.getContext("2d");
const runBtn = $("run");
const stopBtn = $("stop");
const speedEl = $("speed");
const consoleEl = $("console");

let farm = load(STORE_FARM) ?? newFarmState();
let worker = null;
let workerReady = false;
let runId = 0;

// Playback state for the current run.
let run = null; // { id, queue: [], done: null|{status,message}, lastActivity }
let accumulator = 0;
let lastFrameTime = 0;

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.); the game still works.
  }
}

// ---- Console ----

function log(text, cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = text;
  consoleEl.append(line);
  while (consoleEl.childElementCount > 500) consoleEl.firstChild.remove();
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// ---- Drawing ----

function render() {
  drawFarm(ctx, farm);
  $("tick").textContent = farm.tick;
  $("inventory").innerHTML = ITEMS.map(
    (item) => `<span>${item[0].toUpperCase() + item.slice(1)} <b>${farm.inventory[item] ?? 0}</b></span>`,
  ).join("");
}

// ---- Worker ----

function startWorker() {
  workerReady = false;
  runBtn.disabled = true;
  runBtn.textContent = "Loading Python…";
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = onWorkerMessage;
  worker.onerror = (e) => {
    log(`Python worker failed: ${e.message || "unknown error"}`, "error");
  };
}

function onWorkerMessage(e) {
  const msg = e.data;
  if (msg.type === "ready") {
    workerReady = true;
    updateRunButton();
    log(`Python is ready. Each run can use up to ${msg.maxTicks} ticks.`, "note");
    return;
  }
  if (msg.type === "fatal") {
    runBtn.textContent = "Python failed to load";
    log(`Could not load Python: ${msg.message}`, "error");
    return;
  }
  if (!run || msg.runId !== run.id) return; // stale message from a stopped run
  run.lastActivity = performance.now();
  if (msg.type === "events") run.queue.push(...msg.events);
  if (msg.type === "done") run.done = msg;
}

// ---- Running ----

function startRun(name = desk.active) {
  if (!workerReady || run) return;
  consoleEl.textContent = "";
  runId += 1;
  run = { id: runId, queue: [], done: null, lastActivity: performance.now(), pos: 0 };
  save(STORE_FILES, desk.workspace);
  const program = desk.program(name);
  worker.postMessage({ type: "run", runId, ...program, state: farm });
  desk.setRunning(name);
  updateRunButton();
  stopBtn.disabled = false;
  stopBtn.disabled = false;
  accumulator = 0;
}

function finishRun(message, cls) {
  if (message) log(message, cls);
  run = null;
  desk.setRunning(null);
  updateRunButton();
  stopBtn.disabled = true;
  save(STORE_FARM, farm);
}

function stopRun() {
  if (!run) return;
  const stillComputing = !run.done;
  finishRun("Stopped.", "note");
  if (stillComputing) {
    // Python is still busy with the program, so restart it.
    worker.terminate();
    startWorker();
  }
}

// Apply queued events: logs immediately, frames at the chosen speed.
function pump(maxFrames) {
  let frames = 0;
  while (run && run.pos < run.queue.length) {
    const ev = run.queue[run.pos];
    if (ev.kind === "frame") {
      if (frames >= maxFrames) break;
      farm = ev.state;
      frames += 1;
    } else {
      log(ev.text);
    }
    run.pos += 1;
  }
  // Drop consumed events now and then so the queue doesn't grow forever.
  if (run && run.pos > 2000) {
    run.queue = run.queue.slice(run.pos);
    run.pos = 0;
  }
  return frames;
}

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000 || 0);
  lastFrameTime = now;
  if (run) {
    const speed = Number(speedEl.value);
    let budget;
    if (speed === 0) {
      budget = Infinity;
    } else {
      accumulator += dt * speed;
      budget = Math.floor(accumulator);
      accumulator -= budget;
    }
    const used = pump(budget);
    if (used > 0) render();
    if (run && run.done && run.pos >= run.queue.length) {
      const { status, message, ticks } = run.done;
      const cls = status === "ok" ? "status" : "error";
      finishRun(`${message} (${ticks} ${ticks === 1 ? "tick" : "ticks"})`, cls);
      render();
    } else if (run && !run.done && now - run.lastActivity > WATCHDOG_MS) {
      log("Python stopped responding, so it was restarted.", "error");
      finishRun();
      worker.terminate();
      startWorker();
    }
  }
  requestAnimationFrame(loop);
}

// ---- Code windows ----

const desk = new Desk({
  desk: $("desk"),
  bar: $("window-bar"),
  workspace: loadWorkspace(load(STORE_FILES), load(STORE_CODE)),
  onChange: (workspace) => {
    save(STORE_FILES, workspace);
    updateRunButton();
  },
  onRun: (name) => startRun(name),
  onMessage: (text, cls) => log(text, cls),
});

function updateRunButton() {
  if (!workerReady) return;
  runBtn.disabled = Boolean(run);
  runBtn.textContent = `Run ${desk.active}`;
}

runBtn.addEventListener("click", () => startRun());
stopBtn.addEventListener("click", stopRun);
$("reset").addEventListener("click", () => {
  if (run) stopRun();
  farm = newFarmState();
  save(STORE_FARM, farm);
  consoleEl.textContent = "";
  log("The farm was reset.", "note");
  render();
});

save(STORE_FILES, desk.workspace);
render();
startWorker();
requestAnimationFrame(loop);
