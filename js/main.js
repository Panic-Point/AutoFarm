// Page controller: quests and the home farm, run/stop, playback of the
// worker's snapshots, and the map, shop and shelf.
import { ITEMS, emptyInventory, newFarmState } from "./game.js";
import { drawFarm } from "./render.js";
import { loadWorkspace } from "./files.js";
import { Desk } from "./windows.js";
import { CHAPTERS, chapterOf, findQuest } from "./chapters.js";
import {
  checkPlot, gains, judgeQuest, patternMisses, plotData, plotProblem, questField, questPlots, starTargets, tickLimit,
} from "./quests.js";
import { WORDS, wordsInChapter } from "./words.js";
import {
  ALMANAC, HAT_NAMES, SHOP, badges, buy, canAfford, chapterLockReason, chapterStars, fieldSize,
  isChapterDone, isChapterOpen, isForSale, isQuestOpen, loadProgress, locked, looks, newProgress,
  nextQuest, noteHarvest, recordResult, seeds, titles, totalStars, wear,
} from "./progress.js";

// Watchdog: if Python goes quiet this long, restart it.
const WATCHDOG_MS = 20000;
const STORE_CODE = "autofarm.code"; // the single program saved before code windows
const STORE_FILES = "autofarm.files";
const STORE_FARM = "autofarm.farm";
const STORE_PROGRESS = "autofarm.progress";
const STORE_MODE = "autofarm.mode";

const $ = (id) => document.getElementById(id);
const canvas = $("farm");
const ctx = canvas.getContext("2d");
const runBtn = $("run");
const stopBtn = $("stop");
const speedEl = $("speed");
const consoleEl = $("console");

let progress = loadProgress(load(STORE_PROGRESS));
let home = loadHome(load(STORE_FARM));
// What the player is doing: the home farm (free play) or a quest.
let mode = loadMode(load(STORE_MODE));
// The quest plot on the field: the one Bolt is running, or the one picked to look at.
let plot = 0;
// Plots that passed in the current try, while a quest with test plots runs.
let passedPlots = 0;
// Waiting to start the next plot of a quest with test plots.
let nextPlotTimer = null;
let farm = mode.quest ? questField(findQuest(mode.quest)) : home;
let hintsShown = 0;
let worker = null;
let workerReady = false;
let runId = 0;

// Playback state for the current run.
let run = null; // { id, queue: [], done: null|{status,message}, lastActivity, start, quest }
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

function saveAll() {
  save(STORE_PROGRESS, progress);
  save(STORE_FARM, home);
  save(STORE_MODE, mode);
}

// The home farm is the size the player has bought. Its inventory is the barn.
function loadHome(saved) {
  const size = fieldSize(progress);
  let state = saved;
  if (!state || state.size !== size || !Array.isArray(state.tiles)) {
    state = newFarmState(size, saved?.inventory ?? {});
  }
  // Older saves don't have the newer crops in the barn yet.
  state.inventory = emptyInventory(state.inventory);
  state.seeds = seeds(progress);
  state.lost = 0;
  state.wilted = 0;
  return state;
}

function loadMode(saved) {
  if (saved?.quest && isQuestOpen(progress, saved.quest)) return { quest: saved.quest };
  if (saved && !saved.quest) return { quest: null };
  // A new player goes straight to the first quest.
  return { quest: nextQuest(progress) };
}

const currentQuest = () => (mode.quest ? findQuest(mode.quest) : null);

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

const itemName = (item) => item[0].toUpperCase() + item.slice(1);
const inventoryHtml = (inv) =>
  ITEMS.map((item) => `<span>${itemName(item)} <b>${inv[item] ?? 0}</b></span>`).join("");
const starText = (n, of = 3) => "★".repeat(n) + "☆".repeat(Math.max(0, of - n));

function render() {
  const quest = currentQuest();
  let goal = null;
  if (quest) {
    goal = { at: quest.goal.at };
    if (quest.goal.pattern) goal.misses = patternMisses(quest.goal.pattern, farm);
  }
  drawFarm(ctx, farm, { looks: looks(progress), fog: Boolean(quest && questPlots(quest)[plot].fog), goal });
  $("tick").textContent = farm.tick;
  $("inventory").innerHTML = inventoryHtml(farm.inventory);
  $("inv-label").textContent = quest ? "This try" : "Barn";
  $("barn").innerHTML = inventoryHtml(home.inventory);
}

function renderHeader() {
  $("star-total").textContent = totalStars(progress);
  const all = titles(progress);
  $("player-title").textContent = all[all.length - 1];
}

// The card above the farm: who's talking, the goal and the star targets.
function renderQuestCard(bubble) {
  const quest = currentQuest();
  const hintEl = $("quest-hint");
  const nextBtn = $("next-btn");
  if (quest) {
    const ch = chapterOf(quest.id);
    const best = progress.stars[quest.id] ?? 0;
    $("quest-place").textContent = `Chapter ${ch.n}: ${ch.title} · ${quest.bonus ? "Bonus quest" : "Quest"} ${quest.id}`;
    $("quest-title").textContent = `${quest.title} ${best ? starText(best) : ""}`.trim();
    $("quest-who").textContent = quest.who;
    $("quest-bubble").textContent = bubble ?? quest.story;
    $("quest-goal").textContent = `Goal: ${quest.goalText}`;
    $("quest-targets").textContent = starTargets(quest);
    $("quest-targets").hidden = false;
    renderPlots(quest);
    $("starter-btn").hidden = !quest.starter;
    $("hint-btn").hidden = false;
    $("hint-btn").textContent = hintsShown >= quest.hints.length ? "No more hints" : "Hint";
    $("hint-btn").disabled = hintsShown >= quest.hints.length;
    hintEl.hidden = hintsShown === 0;
    hintEl.textContent = quest.hints.slice(0, hintsShown).map((h, i) => `Hint ${i + 1}: ${h}`).join("\n");
    $("mode-btn").textContent = "Home farm";
    const next = nextQuest(progress);
    nextBtn.hidden = !(best && next && next !== quest.id);
    nextBtn.textContent = "Next quest";
  } else {
    const next = nextQuest(progress);
    $("quest-place").textContent = "Home farm";
    $("quest-title").textContent = "Your farm";
    $("quest-who").textContent = "Bolt";
    $("quest-bubble").textContent = bubble ?? "This is your own farm. Everything I harvest goes in the barn, and you can spend it in the shop.";
    $("quest-goal").textContent = next ? `Next quest: ${findQuest(next).title}` : "Every quest has 3 stars. What a farmer!";
    $("quest-targets").hidden = true;
    $("quest-plots").hidden = true;
    $("starter-btn").hidden = true;
    $("hint-btn").hidden = true;
    hintEl.hidden = true;
    $("mode-btn").textContent = "Map";
    nextBtn.hidden = !next;
    nextBtn.textContent = "Play the next quest";
  }
  $("reset").textContent = quest ? "Reset field" : "Reset farm";
  $("reset").title = quest ? "Put the quest field back how it started" : "Start the farm over (the barn keeps its produce)";
}

// Chips for a quest's test plots: which one is on the field, and which ones
// passed in this try. Click one to look at it.
function renderPlots(quest) {
  const box = $("quest-plots");
  const plots = questPlots(quest);
  box.hidden = plots.length < 2;
  if (box.hidden) return;
  const chips = plots.map((_, i) => el("button", {
    type: "button",
    class: `plot-chip${i === plot ? " current" : ""}${run && i < passedPlots ? " passed" : ""}`,
    title: `Look at plot ${i + 1}`,
    disabled: Boolean(run || nextPlotTimer),
    onclick: () => showPlot(i),
  }, `Plot ${i + 1}`));
  box.replaceChildren(el("span", { class: "plots-label" }, `${plots.length} test plots, one program:`), ...chips);
}

function showPlot(i) {
  const quest = currentQuest();
  if (!quest || run || nextPlotTimer) return;
  plot = i;
  farm = questField(quest, plot);
  renderQuestCard();
  render();
}

// A quest that starts with code to fix opens it in its own window. Code the
// player already changed there is kept, unless they ask for it back.
function starterName(quest) {
  return quest.starter?.name ?? `fix_${quest.id.replace(/-/g, "_")}`;
}

function openStarter(quest, fresh = false) {
  if (!quest?.starter) return;
  const code = typeof quest.starter === "string" ? quest.starter : quest.starter.code;
  desk.openWindow(starterName(quest), code.trim() + "\n", fresh);
}

// Grey out commands Bolt hasn't learned yet.
function renderReference() {
  const lockedNow = locked(progress);
  for (const li of document.querySelectorAll(".reference li[data-word]")) {
    const word = li.dataset.word;
    const isLocked = word in lockedNow;
    li.classList.toggle("locked", isLocked);
    li.querySelector(".lock-note")?.remove();
    if (isLocked) {
      const note = document.createElement("span");
      note.className = "lock-note";
      note.textContent = `🔒 Chapter ${WORDS[word].chapter}`;
      li.prepend(note);
    }
  }
}

function renderAll(bubble) {
  renderHeader();
  renderQuestCard(bubble);
  renderReference();
  render();
}

// ---- Switching between quests and the home farm ----

function playQuest(id) {
  if (run) stopRun();
  cancelNextPlot();
  if (!id || !isQuestOpen(progress, id)) return;
  if (mode.quest !== id) hintsShown = 0;
  mode = { quest: id };
  plot = 0;
  farm = questField(findQuest(id));
  openStarter(findQuest(id));
  save(STORE_MODE, mode);
  consoleEl.textContent = "";
  renderAll();
}

function goHome() {
  if (run) stopRun();
  cancelNextPlot();
  mode = { quest: null };
  home = loadHome(home);
  farm = home;
  save(STORE_MODE, mode);
  consoleEl.textContent = "";
  renderAll();
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

function cancelNextPlot() {
  clearTimeout(nextPlotTimer);
  nextPlotTimer = null;
}

// results: the runs on the plots before this one, for quests with test plots.
function startRun(name = desk.active, plotIndex = 0, results = []) {
  if (!workerReady || run) return;
  cancelNextPlot();
  if (plotIndex === 0) consoleEl.textContent = "";
  const quest = currentQuest();
  if (quest) {
    // Every try starts from the same field.
    plot = plotIndex;
    passedPlots = plotIndex;
    farm = questField(quest, plot);
    if (questPlots(quest).length > 1) log(`Plot ${plot + 1} of ${questPlots(quest).length}`, "note");
  } else {
    home.seeds = seeds(progress);
    farm = home;
  }
  render();
  runId += 1;
  run = {
    id: runId,
    queue: [],
    done: null,
    lastActivity: performance.now(),
    pos: 0,
    start: structuredClone(farm),
    quest: quest?.id ?? null,
    name,
    results,
  };
  save(STORE_FILES, desk.workspace);
  const program = desk.program(name);
  const maxTicks = quest ? tickLimit(quest) : undefined;
  const data = quest ? plotData(quest, plot) : {};
  worker.postMessage({ type: "run", runId, ...program, state: farm, locked: locked(progress), maxTicks, data });
  desk.setRunning(name);
  desk.showLine(null);
  updateRunButton();
  stopBtn.disabled = false;
  accumulator = 0;
  if (quest) renderPlots(quest);
}

function finishRun(message, cls) {
  if (message) log(message, cls);
  run = null;
  desk.setRunning(null);
  desk.showLine(null);
  updateRunButton();
  stopBtn.disabled = true;
  if (!mode.quest) home = farm;
  saveAll();
}

function stopRun() {
  if (nextPlotTimer) {
    cancelNextPlot();
    log("Stopped.", "note");
    renderAll();
  }
  if (!run) return;
  const stillComputing = !run.done;
  finishRun("Stopped.", "note");
  if (stillComputing) {
    // Python is still busy with the program, so restart it.
    worker.terminate();
    startWorker();
  }
}

// The run has finished playing: judge the quest and hand out rewards.
function completeRun(done) {
  const start = run.start;
  const questId = run.quest;
  const { name, results } = run;
  const { status, message, ticks } = done;
  const cls = status === "ok" ? "status" : "error";
  finishRun(`${message} (${ticks} ${ticks === 1 ? "tick" : "ticks"})`, cls);
  // Point at the line the problem is on, in whichever window it is.
  if (status !== "ok" && done.errorAt) desk.showLine(done.errorAt, "error");
  const gained = gains(start, farm);
  if (questId) {
    // Produce harvested in a quest still goes to the barn.
    for (const [item, n] of Object.entries(gained)) home.inventory[item] += n;
  }
  const pages = noteHarvest(progress, gained);
  if (!questId) {
    saveAll();
    renderAll(status === "ok" ? "Beep boop! All done." : `*shrug* ${message}`);
    if (pages.length) showReward({ title: "New almanac page!", pages });
    return;
  }
  const quest = findQuest(questId);
  const plots = questPlots(quest).length;
  const thisPlot = results.length;
  const all = [...results, { start, end: farm, run: done }];
  // On to the next test plot while the program keeps working.
  if (thisPlot + 1 < plots && checkPlot(quest, thisPlot, start, farm, done).met) {
    passedPlots = thisPlot + 1;
    saveAll();
    renderAll(`Plot ${thisPlot + 1} done! Now plot ${thisPlot + 2}...`);
    nextPlotTimer = setTimeout(() => {
      nextPlotTimer = null;
      startRun(name, thisPlot + 1, all);
    }, 1200);
    return;
  }
  const result = judgeQuest(quest, all);
  if (!result.met) {
    for (const problem of result.problems) log(problem, "note");
    saveAll();
    let why = status === "error" || status === "too_many_steps" ? message : result.problems[plots > 1 ? 1 : 0];
    const lead = plotProblem(quest, thisPlot);
    if (lead) why = `${lead} ${why ?? ""}`.trim();
    renderAll(`*shrug* ${why ?? "Not quite. Try again!"}`);
    beep(false);
    return;
  }
  const rewards = recordResult(progress, questId, result.stars, result.ticks);
  saveAll();
  renderAll(`Beep boop! ${starText(result.stars)}`);
  beep(true);
  showReward({ quest, stars: result.stars, ticks: result.ticks, gained: result.gained, rewards, pages });
}

// Apply queued events: logs immediately, frames at the chosen speed.
function pump(maxFrames) {
  let frames = 0;
  while (run && run.pos < run.queue.length) {
    const ev = run.queue[run.pos];
    if (ev.kind === "frame") {
      if (frames >= maxFrames) break;
      farm = ev.state;
      run.at = ev.at;
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
    if (used > 0) {
      render();
      desk.showLine(run.at, "run");
    }
    if (run && run.done && run.pos >= run.queue.length) {
      completeRun(run.done);
    } else if (run && !run.done && now - run.lastActivity > WATCHDOG_MS) {
      log("Python stopped responding, so it was restarted.", "error");
      finishRun();
      worker.terminate();
      startWorker();
    }
  }
  requestAnimationFrame(loop);
}

// A short happy beep, or a lower "hmm". Quiet if sound isn't available.
let audio = null;
function beep(happy) {
  try {
    audio ??= new AudioContext();
    const notes = happy ? [660, 880] : [330, 262];
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + i * 0.12;
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch {
    // No sound, no problem.
  }
}

// ---- Dialogs ----

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.querySelector(".close")?.addEventListener("click", () => dialog.close());
  // Click outside the box to close.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function costText(cost) {
  return Object.entries(cost).map(([item, n]) => `${n} ${item}`).join(" + ");
}

function renderMap() {
  const body = $("map-body");
  body.textContent = "";
  for (const ch of CHAPTERS) {
    const open = isChapterOpen(progress, ch.n);
    const done = isChapterDone(progress, ch.n);
    const words = wordsInChapter(ch.n).map((w) => WORDS[w].label).join(", ");
    const quests = ch.quests.map((q) => {
      const stars = progress.stars[q.id] ?? 0;
      const playable = isQuestOpen(progress, q.id);
      return el("button", {
        type: "button",
        class: `quest-stop${mode.quest === q.id ? " current" : ""}`,
        disabled: !playable,
        title: playable ? `Play ${q.title}` : "Finish the quest before this one first",
        onclick: () => {
          $("map-dialog").close();
          playQuest(q.id);
        },
      }, el("span", { class: "stop-id" }, q.id), el("span", {}, q.title),
      q.bonus ? el("span", { class: "stop-bonus", title: "A bonus quest. You don't need it to finish the chapter." }, "Bonus") : null,
      el("span", { class: "stop-stars" }, starText(stars)));
    });
    body.append(el("article", { class: `chapter${open ? "" : " closed"}${done ? " done" : ""}` },
      el("div", { class: "chapter-head" },
        el("span", { class: "chapter-num" }, String(ch.n)),
        el("div", {},
          el("h3", {}, ch.title),
          el("p", { class: "chapter-intro" }, ch.intro)),
        el("span", { class: "chapter-stars" }, `★ ${chapterStars(progress, ch.n)}/${ch.quests.length * 3}`)),
      el("p", { class: "chapter-words" }, `New words: ${words}`),
      open ? el("div", { class: "quest-stops" }, quests) : el("p", { class: "lock-reason" }, `🔒 ${chapterLockReason(progress, ch.n)}`),
      done ? el("p", { class: "chapter-badge" }, `🏅 ${ch.badge}`) : null,
    ));
  }
  body.append(el("button", { type: "button", class: "secondary home-stop", onclick: () => {
    $("map-dialog").close();
    goHome();
  } }, "Go to your home farm"));
}

function renderShop(message = "") {
  $("shop-barn").innerHTML = inventoryHtml(home.inventory);
  $("shop-message").textContent = message;
  const body = $("shop-body");
  body.textContent = "";
  const groups = [
    ["growth", "Growth"],
    ["seeds", "Seeds"],
    ["hat", "Hats for Bolt"],
    ["looks", "Farm looks"],
  ];
  for (const [kind, heading] of groups) {
    const items = SHOP.filter((i) => i.kind === kind);
    const rows = [];
    if (kind === "hat") items.unshift({ id: "straw_hat", name: HAT_NAMES.straw_hat, text: "Bolt's first hat.", cost: {}, after: 0 });
    for (const item of items) {
      const owned = progress.owned.includes(item.id);
      let action;
      if (owned && kind === "hat") {
        action = progress.hat === item.id
          ? el("span", { class: "owned" }, "Wearing")
          : el("button", { type: "button", class: "small", onclick: () => {
            wear(progress, item.id);
            saveAll();
            renderShop();
            render();
          } }, "Wear");
      } else if (owned) {
        action = el("span", { class: "owned" }, "Yours ✓");
      } else if (!isForSale(progress, item)) {
        action = el("span", { class: "for-sale-later" }, `🔒 After chapter ${item.after}`);
      } else {
        action = el("button", {
          type: "button",
          class: "small",
          disabled: !canAfford(home.inventory, item.cost),
          onclick: () => {
            const problem = buy(progress, home.inventory, item.id);
            if (!problem && item.size) home = loadHome(home);
            if (!problem && item.crop) home.seeds = seeds(progress);
            if (!problem && !mode.quest) farm = home;
            saveAll();
            renderShop(problem ?? `You bought the ${item.name.toLowerCase()}!`);
            renderAll();
            if (!problem) beep(true);
          },
        }, `Buy · ${costText(item.cost)}`);
      }
      rows.push(el("li", { class: owned ? "is-owned" : "" },
        el("div", {}, el("b", {}, item.name), el("span", { class: "item-text" }, item.text)),
        action));
    }
    body.append(el("h3", {}, heading), el("ul", { class: "shop-list" }, rows));
  }
}

function renderShelf() {
  const body = $("shelf-body");
  body.textContent = "";
  const earned = badges(progress);
  body.append(
    el("h3", {}, "Badges"),
    el("ul", { class: "badge-shelf" }, CHAPTERS.map((ch) => {
      const has = earned.includes(ch.badge);
      return el("li", { class: has ? "earned" : "", title: has ? ch.badge : `Finish chapter ${ch.n}` },
        el("span", { class: "badge-icon" }, has ? "🏅" : "?"), el("span", {}, has ? ch.badge : `Chapter ${ch.n}`));
    })),
    el("h3", {}, "Titles"),
    el("p", {}, titles(progress).join(" · ")),
    el("h3", {}, "Almanac"),
    el("ul", { class: "almanac" }, ALMANAC.map((page) => {
      const has = progress.almanac.includes(page.item);
      return el("li", { class: has ? "earned" : "" },
        el("b", {}, has ? page.name : "???"),
        el("span", {}, has ? page.fact : "Harvest a new crop to fill in this page."));
    })),
  );
  $("practice").checked = progress.practice;
}

function showReward({ quest, stars, ticks, gained, rewards, pages = [], title }) {
  $("reward-stars").textContent = quest ? starText(stars) : "📖";
  $("reward-heading").textContent = quest ? `${quest.title}: done!` : title;
  const lines = [];
  if (quest) {
    const plots = questPlots(quest).length;
    let text = `Bolt finished in ${ticks} ${ticks === 1 ? "tick" : "ticks"}${plots > 1 ? ` on all ${plots} plots` : ""}.`;
    if (stars < 3) text += ` Can you do it in ${stars === 1 ? quest.stars.two : quest.stars.three} for another star?`;
    $("reward-text").textContent = text;
    const got = Object.entries(gained).map(([item, n]) => `${n} ${item}`).join(", ");
    if (got) lines.push(`Your barn got ${got}.`);
    lines.push(...rewards.lines);
  } else {
    $("reward-text").textContent = "";
  }
  for (const page of pages) lines.push(`New almanac page: ${page.name}. ${page.fact}`);
  $("reward-lines").replaceChildren(...lines.map((l) => el("li", {}, l)));
  const next = nextQuest(progress);
  $("reward-again").hidden = !quest;
  $("reward-next").textContent = next && next !== quest?.id ? "Next quest" : "OK";
  $("reward-next").onclick = () => {
    $("reward-dialog").close();
    if (quest && next && next !== quest.id) playQuest(next);
  };
  $("reward-again").onclick = () => $("reward-dialog").close();
  $("reward-dialog").showModal();
}

$("open-map").addEventListener("click", () => {
  renderMap();
  $("map-dialog").showModal();
});
$("open-shop").addEventListener("click", () => {
  renderShop();
  $("shop-dialog").showModal();
});
$("open-shelf").addEventListener("click", () => {
  renderShelf();
  $("start-over-confirm").hidden = true;
  $("shelf-dialog").showModal();
});
$("practice").addEventListener("change", (e) => {
  progress.practice = e.target.checked;
  saveAll();
  renderAll();
});
$("start-over").addEventListener("click", () => ($("start-over-confirm").hidden = false));
$("start-over-no").addEventListener("click", () => ($("start-over-confirm").hidden = true));
$("start-over-yes").addEventListener("click", () => {
  if (run) stopRun();
  progress = newProgress();
  home = loadHome(newFarmState(fieldSize(progress)));
  hintsShown = 0;
  $("shelf-dialog").close();
  saveAll();
  playQuest(nextQuest(progress));
  log("Progress was started over.", "note");
});

$("mode-btn").addEventListener("click", () => {
  if (mode.quest) {
    goHome();
  } else {
    renderMap();
    $("map-dialog").showModal();
  }
});
$("next-btn").addEventListener("click", () => playQuest(nextQuest(progress)));
$("starter-btn").addEventListener("click", () => {
  if (run) stopRun();
  openStarter(currentQuest(), true);
  log("Bolt's code is back the way it started.", "note");
});
$("hint-btn").addEventListener("click", () => {
  hintsShown += 1;
  renderQuestCard();
});

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
  consoleEl.textContent = "";
  const quest = currentQuest();
  if (quest) {
    cancelNextPlot();
    farm = questField(quest, plot);
    log("The field was put back.", "note");
  } else {
    // The barn keeps its produce.
    home = loadHome(newFarmState(fieldSize(progress), home.inventory));
    farm = home;
    saveAll();
    log("The farm was reset. Your barn kept everything.", "note");
  }
  render();
});

openStarter(currentQuest());
save(STORE_FILES, desk.workspace);
saveAll();
renderAll();
startWorker();
requestAnimationFrame(loop);
