// Page controller: editor, run/stop, playback of the worker's snapshots.
import { ITEMS, newFarmState } from "./game.js";
import { drawFarm } from "./render.js";

const STARTER_CODE = `# Sweep the field row by row and harvest everything that is ripe.
size = field_size()

for sweep in range(3):
    for row in range(size):
        for step in range(size - 1):
            if is_ripe():
                harvest()
            move(EAST)
        if is_ripe():
            harvest()
        # Walk back to the west edge, then go up a row.
        while move(WEST):
            pass
        move(NORTH)
    # Back to the south-west corner for the next sweep.
    while move(SOUTH):
        pass

print("Hay collected:", count("hay"))
`;

// Watchdog: if Python goes quiet this long, restart it.
const WATCHDOG_MS = 20000;
const STORE_CODE = "autofarm.code";
const STORE_FARM = "autofarm.farm";

const $ = (id) => document.getElementById(id);
const canvas = $("farm");
const ctx = canvas.getContext("2d");
const codeEl = $("code");
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
    runBtn.disabled = false;
    runBtn.textContent = "Run";
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

function startRun() {
  if (!workerReady || run) return;
  consoleEl.textContent = "";
  runId += 1;
  run = { id: runId, queue: [], done: null, lastActivity: performance.now(), pos: 0 };
  save(STORE_CODE, codeEl.value);
  worker.postMessage({ type: "run", runId, code: codeEl.value, state: farm });
  runBtn.disabled = true;
  stopBtn.disabled = false;
  accumulator = 0;
}

function finishRun(message, cls) {
  if (message) log(message, cls);
  run = null;
  runBtn.disabled = !workerReady;
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

// ---- Editor niceties ----

codeEl.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: end } = codeEl;
    codeEl.setRangeText("    ", s, end, "end");
  } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    startRun();
  } else if (e.key === "Enter") {
    // Keep the current line's indentation, and indent after a colon.
    const s = codeEl.selectionStart;
    const lineStart = codeEl.value.lastIndexOf("\n", s - 1) + 1;
    const line = codeEl.value.slice(lineStart, s);
    let indent = line.match(/^\s*/)[0];
    if (line.trimEnd().endsWith(":")) indent += "    ";
    e.preventDefault();
    codeEl.setRangeText("\n" + indent, s, codeEl.selectionEnd, "end");
  }
});
codeEl.addEventListener("input", () => save(STORE_CODE, codeEl.value));

runBtn.addEventListener("click", startRun);
stopBtn.addEventListener("click", stopRun);
$("reset").addEventListener("click", () => {
  if (run) stopRun();
  farm = newFarmState();
  save(STORE_FARM, farm);
  consoleEl.textContent = "";
  log("The farm was reset.", "note");
  render();
});

codeEl.value = load(STORE_CODE) ?? STARTER_CODE;
render();
startWorker();
requestAnimationFrame(loop);
