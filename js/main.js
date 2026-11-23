// Page controller: quests and the home farm, run/stop, playback of the
// worker's snapshots, and the map, shop and shelf.
import { CAN_SIZE, ITEMS, emptyInventory, newFarmState } from "./game.js";
import { drawBoltIcon, drawFarm } from "./render.js";
import { enterQuest, isEmptyCode, loadWorkspace, windowNameFor } from "./files.js";
import { deletePiece, loadLibrary, preview, renamePiece, savePiece } from "./library.js";
import { Desk } from "./windows.js";
import * as playback from "./playback.js";
import { CHAPTERS, QUESTS, chapterOf, findQuest } from "./chapters.js";
import { CONTRACTS, DINNER_EVERY, findContract } from "./postgame.js";
import {
  checkPlot, gains, plural, judgeQuest, patternMisses, plotData, plotProblem, questField, questPlots, starTargets, tickLimit,
} from "./quests.js";
import { WORDS, wordsInChapter } from "./words.js";
import { CONCEPTS, GROUPS, TIPS, exampleData, exampleField, findConcept, lessonsFor, richText } from "./concepts.js";
import { continueText, hasSave, replayChapters, replayNext } from "./title.js";
import { screenParts, shownItems, tapWords } from "./simple.js";
import {
  ALMANAC, CROWNS, HAT_NAMES, SHOP, badges, checkContract, contractBoard, contractText, crownsOwned, goldenStars,
  nextStep, recordContract, saleLockText, buy, canAfford, chapterLockReason, chapterStars, fieldSize,
  isChapterDone, isChapterOpen, isConceptOpen, isForSale, isQuestOpen, loadProgress, locked, looks, markSeen, newProgress,
  nextQuest, noteHarvest, recordResult, seeds, titles, totalStars, unlockAll, unreadConcepts, wear,
} from "./progress.js";

// Watchdog: if Python goes quiet this long, restart it.
const WATCHDOG_MS = 20000;
const STORE_CODE = "autofarm.code"; // the single program saved before code windows
const STORE_FILES = "autofarm.files";
const STORE_FARM = "autofarm.farm";
const STORE_PROGRESS = "autofarm.progress";
const STORE_MODE = "autofarm.mode";
const STORE_LIBRARY = "autofarm.library";

const $ = (id) => document.getElementById(id);
// Opened with ?testing at the end of the address: the shelf (and its
// unlock-everything button) shows from the start.
const TESTING = new URLSearchParams(location.search).has("testing");
const canvas = $("farm");
const ctx = canvas.getContext("2d");
const runBtn = $("run");
const stopBtn = $("stop");
const stepBtn = $("step");
const keepGoingBtn = $("keep-going");
const speedEl = $("speed");
const consoleEl = $("console");

let progress = loadProgress(load(STORE_PROGRESS));
let home = loadHome(load(STORE_FARM));
// The golden crown used to be sold in the shop. It's a gift now, so pay it back.
if (progress.refund) {
  for (const [item, n] of Object.entries(progress.refund)) home.inventory[item] = (home.inventory[item] ?? 0) + n;
  progress.refund = null;
}
// Older saves didn't count the season's harvest, so start from what's in the barn.
if (!Object.keys(progress.harvested).length) {
  for (const [item, n] of Object.entries(home.inventory)) if (n > 0) progress.harvested[item] = n;
}
// What the player is doing: the home farm (free play) or a quest.
let mode = loadMode(load(STORE_MODE));
// Code the player saved with a window's 💾 button. A new game keeps it.
const library = loadLibrary(load(STORE_LIBRARY));
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
let run = null; // { id, queue: [], done: null|{status,message}, lastActivity, start, quest, stepping, wantStep }
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
  state.wasted = 0;
  // The bee hive sits in the middle of the farm once it's bought.
  const mid = Math.floor(size / 2);
  state.hive = progress.owned.includes("bee_hive") ? [mid, mid] : null;
  state.dinner = null;
  // The well sits in the barn corner once it's bought.
  if (progress.owned.includes("well") && state.tiles[0].ground !== "well") {
    Object.assign(state.tiles[0], { ground: "well", crop: null, age: 0 });
    delete state.tiles[0].wet;
  }
  return state;
}

function loadMode(saved) {
  if (saved?.quest && isQuestOpen(progress, saved.quest)) {
    // Replaying a finished chapter carries on after a reload.
    const replay = saved.replay && findQuest(saved.quest).chapter === saved.replay ? saved.replay : null;
    return replay ? { quest: saved.quest, replay } : { quest: saved.quest };
  }
  if (saved?.contract && contractBoard(progress).some((c) => c.id === saved.contract)) {
    return { quest: null, contract: saved.contract };
  }
  if (saved && !saved.quest) return { quest: null };
  // A new player goes straight to the first quest.
  return { quest: nextQuest(progress) };
}

const currentQuest = () => (mode.quest ? findQuest(mode.quest) : null);
const currentContract = () => (!mode.quest && mode.contract ? findContract(mode.contract) : null);

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

// Bolt bumped the fence: { dir: [dx, dy], start } while the bonk plays.
const BONK_MS = 600;
let bonk = null;

function bonkNow() {
  if (!bonk) return null;
  const t = (performance.now() - bonk.start) / BONK_MS;
  if (t >= 1) {
    bonk = null;
    return null;
  }
  return { dir: bonk.dir, t };
}

const itemName = (item) => item[0].toUpperCase() + item.slice(1);
// Counters for `items` (every crop if not given): see shownItems.
const inventoryHtml = (inv, items = ITEMS) =>
  items.map((item) => `<span${inv[item] ? "" : ' class="zero"'}>${itemName(item)} <b>${inv[item] ?? 0}</b></span>`).join("");
const starText = (n, of = 3) => "★".repeat(n) + "☆".repeat(Math.max(0, of - n));

// Show the tick count, and bump it when it goes up so players see each tick
// being counted.
let shownTick = 0;
function bumpTick(tick) {
  const box = $("tick").parentElement;
  $("tick").textContent = tick;
  if (tick > shownTick) {
    box.classList.remove("bump");
    void box.offsetWidth; // restart the animation
    box.classList.add("bump");
  }
  shownTick = tick;
}

function render() {
  const quest = currentQuest();
  let goal = null;
  if (quest) {
    goal = { at: quest.goal.at };
    if (quest.goal.pattern) goal.misses = patternMisses(quest.goal.pattern, farm);
  }
  drawFarm(ctx, farm, { looks: looks(progress), fog: Boolean(quest && questPlots(quest)[plot].fog), goal, bonk: bonkNow() });
  bumpTick(farm.tick);
  // The watering can, on fields where it matters (corn or a well).
  const usesWater = farm.tiles.some((t) => t.crop === "corn" || t.ground === "well");
  // Only crops the player has met, or that grow on this field.
  const items = shownItems(progress, { inventories: [farm.inventory], field: farm });
  $("inventory").innerHTML = inventoryHtml(farm.inventory, items)
    + (usesWater ? `<span title="Water left in the can">💧 Water <b>${farm.can ?? CAN_SIZE}/${CAN_SIZE}</b></span>` : "");
  $("inv-label").textContent = quest ? "This try" : "Barn";
  const barn = shownItems(progress, { inventories: [home.inventory] });
  $("barn").innerHTML = inventoryHtml(home.inventory, barn);
  $("barn").hidden = !barn.length;
}

function renderHeader() {
  $("star-total").textContent = totalStars(progress);
  const unread = unreadConcepts(progress).length;
  $("book-new").hidden = !unread;
  $("book-new").textContent = unread;
  $("open-book").title = unread ? `Everything Bolt has learned. ${unread} new ${unread === 1 ? "page" : "pages"}!` : "Everything Bolt has learned";
  const all = titles(progress);
  $("player-title").textContent = all[all.length - 1];
  // Buttons show up once they have something in them (see simple.js).
  const parts = screenParts(progress);
  $("open-map").hidden = !parts.map;
  $("open-shop").hidden = !parts.shop;
  $("open-shelf").hidden = !parts.shelf && !TESTING;
  if (desk.tools !== parts.windows) desk.setTools(parts.windows);
  updateRunButton();
}

// The card above the farm: who's talking, the goal and the star targets.
function renderQuestCard(bubble) {
  const quest = currentQuest();
  const hintEl = $("quest-hint");
  const nextBtn = $("next-btn");
  if (quest) {
    const ch = chapterOf(quest.id);
    const best = progress.stars[quest.id] ?? 0;
    if (quest.golden) $("quest-place").textContent = `After the Festival · Golden quest ${quest.id} · chapter ${quest.from}'s idea`;
    else if (quest.festival) $("quest-place").textContent = `Festival Day · Event ${quest.festival.event} of 3 · Quest ${quest.id}`;
    else $("quest-place").textContent = `${mode.replay ? "Replaying chapter" : "Chapter"} ${ch.n}: ${ch.title} · ${quest.bonus ? "Bonus quest" : "Quest"} ${quest.id}`;
    $("quest-title").textContent = `${quest.title} ${best ? starText(best) : ""}`.trim();
    $("quest-who").textContent = quest.who;
    $("quest-bubble").textContent = bubble ?? quest.story;
    $("quest-goal").textContent = `Goal: ${quest.goalText}`;
    $("quest-targets").textContent = starTargets(quest);
    $("quest-targets").hidden = false;
    renderPlots(quest);
    $("starter-btn").hidden = !quest.starter;
    $("last-code-btn").hidden = !lastCode(quest);
    $("lesson-btn").hidden = !lessonsFor(quest.id).length;
    $("hint-btn").hidden = false;
    $("hint-btn").textContent = hintsShown >= quest.hints.length ? "No more hints" : "Hint";
    $("hint-btn").disabled = hintsShown >= quest.hints.length;
    hintEl.hidden = hintsShown === 0;
    hintEl.textContent = quest.hints.slice(0, hintsShown).map((h, i) => `Hint ${i + 1}: ${h}`).join("\n");
    $("mode-btn").textContent = "Home farm";
    // A new player has no home farm to go to yet.
    $("mode-btn").hidden = !screenParts(progress).map;
    const step = upNext();
    nextBtn.hidden = !(best && step && step.id !== quest.id);
    nextBtn.textContent = step?.why ? "What's next?" : "Next quest";
    $("contract-btn").hidden = true;
  } else if (currentContract()) {
    const c = currentContract();
    $("quest-place").textContent = "Home farm · Contract board";
    $("quest-title").textContent = c.title ?? `${c.who}'s order`;
    $("quest-who").textContent = c.who;
    $("quest-bubble").textContent = bubble ?? (c.dinner
      ? "Moo! I'll wait at the barn. Come and see me at least every 20 ticks while you farm, or I miss my dinner!"
      : "Can you fill my order from your own farm? Use your own seeds, however you like.");
    $("quest-goal").textContent = `Order: ${contractText(c)}.`;
    $("quest-targets").textContent = `Finish it for a ribbon and a thank-you in the shop. Bolt stops after ${c.ticks} ticks.`;
    $("quest-targets").hidden = false;
    $("quest-plots").hidden = true;
    $("starter-btn").hidden = true;
    $("last-code-btn").hidden = true;
    $("lesson-btn").hidden = true;
    $("hint-btn").hidden = true;
    hintEl.hidden = true;
    $("mode-btn").textContent = "Map";
    $("mode-btn").hidden = false;
    nextBtn.hidden = true;
    $("contract-btn").hidden = false;
  } else {
    const step = nextStep(progress);
    const next = step?.id ?? step?.contract ?? null;
    $("contract-btn").hidden = true;
    $("quest-place").textContent = "Home farm";
    $("quest-title").textContent = "Your farm";
    $("quest-who").textContent = "Bolt";
    $("quest-bubble").textContent = bubble ?? "This is your own farm. Everything I harvest goes in the barn, and you can spend it in the shop.";
    let goal = "Every quest has 3 stars and every contract is done. What a farmer!";
    if (step?.contract) goal = `What's next: ${step.why}`;
    else if (step) goal = `What's next: ${findQuest(step.id).title}${step.why ? `. ${step.why}` : ""}`;
    $("quest-goal").textContent = goal;
    $("quest-targets").hidden = true;
    $("quest-plots").hidden = true;
    $("starter-btn").hidden = true;
    $("last-code-btn").hidden = true;
    $("lesson-btn").hidden = true;
    $("hint-btn").hidden = true;
    hintEl.hidden = true;
    $("mode-btn").textContent = "Map";
    $("mode-btn").hidden = false;
    nextBtn.hidden = !next;
    nextBtn.textContent = isChapterDone(progress, CHAPTERS.length) ? "What's next?" : "Play the next quest";
  }
  renderTapWords(quest);
  $("reset").textContent = quest ? "Reset field" : "Reset farm";
  $("reset").title = quest ? "Put the quest field back how it started" : "Start the farm over (the barn keeps its produce)";
}

// Buttons that put the quest's words into the code, so they don't have to be
// typed (brackets and _ are slow on a tablet). Only in quests.
function renderTapWords(quest) {
  const words = quest ? tapWords(quest.id) : [];
  const box = $("tap-words");
  box.hidden = !words.length;
  box.replaceChildren(...words.map((word) => el("button", {
    type: "button",
    class: "tap-word",
    title: word.inline ? `Put ${word.text} where the cursor is` : `Add ${word.text} as a new line`,
    // Keep the cursor in the code window on a computer.
    onpointerdown: (e) => e.preventDefault(),
    onclick: () => desk.insert(word),
  }, word.text)));
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

// A new quest starts with a fresh main window. The code that was there is
// kept as the old quest's "code from last time".
function freshStart(quest) {
  const code = enterQuest(desk.workspace, quest);
  if (code !== null) desk.openWindow("main", code, true);
  desk.save();
}

function mainWindow() {
  return desk.workspace.windows.find((w) => w.name === "main") ?? null;
}

// The program the player had in main the last time they played this quest.
function lastCode(quest) {
  const code = quest && desk.workspace.lastCode[quest.id];
  return code && code !== mainWindow()?.code ? code : null;
}

// Put the code from last time back in main. What was in main is kept in its
// place, so pressing again swaps back.
function restoreLastCode() {
  const quest = currentQuest();
  const code = lastCode(quest);
  if (!code) return;
  if (run) stopRun();
  const now = mainWindow()?.code ?? "";
  if (isEmptyCode(now)) delete desk.workspace.lastCode[quest.id];
  else desk.workspace.lastCode[quest.id] = now;
  desk.openWindow("main", code, true);
  renderQuestCard();
  log(`Your code from last time is back in main.${isEmptyCode(now) ? "" : " Press the button again to swap back."}`, "note");
}

function openStarter(quest, fresh = false) {
  if (!quest?.starter) return;
  const code = typeof quest.starter === "string" ? quest.starter : quest.starter.code;
  desk.openWindow(starterName(quest), code.trim() + "\n", fresh);
}

// Text with `code` and **bold** in it, as page nodes.
function rich(text) {
  return richText(text).map((p) => {
    if (p.code) return el("code", {}, p.text);
    if (p.bold) return el("b", {}, p.text);
    return p.text;
  });
}

function renderAll(bubble) {
  renderHeader();
  renderQuestCard(bubble);
  render();
}

// ---- Switching between quests and the home farm ----

// replay: the finished chapter being played again, so Next stays in it.
function playQuest(id, replay = null) {
  if (run) stopRun();
  cancelNextPlot();
  if (!id || !isQuestOpen(progress, id)) return;
  if (mode.quest !== id) hintsShown = 0;
  mode = replay ? { quest: id, replay } : { quest: id };
  plot = 0;
  farm = questField(findQuest(id));
  freshStart(findQuest(id));
  openStarter(findQuest(id));
  save(STORE_MODE, mode);
  consoleEl.textContent = "";
  renderAll();
  showFestivalBanner(findQuest(id));
  offerLessons();
}

// Between festival events: "Event 2 of 3: The Fog Race!"
let bannerTimer = null;
function showFestivalBanner(quest) {
  const banner = $("festival-banner");
  clearTimeout(bannerTimer);
  banner.hidden = !quest?.festival;
  if (banner.hidden) return;
  banner.replaceChildren(
    el("small", {}, `Festival Day · judged by ${quest.who}`),
    `Event ${quest.festival.event} of 3: ${quest.festival.name}!`,
  );
  bannerTimer = setTimeout(() => (banner.hidden = true), 2600);
}

// Play whatever What's next suggests: a quest or a contract.
function goNext() {
  const step = upNext();
  if (step?.contract) takeContract(step.contract);
  else if (step) playQuest(step.id, step.replay ?? null);
}

// What Next plays. While replaying a chapter it's the next quest in that
// chapter, bonus quests too. At the end of it, back to What's next.
function upNext() {
  if (mode.replay && mode.quest) {
    const id = replayNext(mode.replay, mode.quest);
    if (id) return { id, why: null, replay: mode.replay };
  }
  return nextStep(progress);
}

function takeContract(id) {
  goHome(id);
  log(`Contract: ${contractText(findContract(id))}. Write your program and press Run.`, "note");
}

function goHome(contract = null) {
  if (run) stopRun();
  cancelNextPlot();
  mode = contract ? { quest: null, contract } : { quest: null };
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
  runBtn.textContent = "Waking Bolt up…";
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
    log("Bolt is ready!", "note");
    return;
  }
  if (msg.type === "fatal") {
    runBtn.textContent = "Bolt can't wake up";
    log(`Bolt couldn't wake up. Check the internet connection and reload the page. (${msg.message})`, "error");
    return;
  }
  if (demo && msg.runId === demo.id) {
    if (msg.type === "events") demo.queue.push(...msg.events);
    if (msg.type === "done") demo.done = msg;
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
// stepping: start paused on the first line, to step through it (see playback.js).
function startRun(name = desk.active, plotIndex = 0, results = [], stepping = false) {
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
    // Daisy starts her dinner clock when a dinner contract's run starts.
    const c = currentContract();
    home.dinner = c?.dinner ? { every: DINNER_EVERY, lastFed: home.tick, missed: 0 } : null;
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
    contract: quest ? null : (currentContract()?.id ?? null),
    name,
    results,
    at: null,
    // Step mode: every line is reported, and playback waits for Step presses.
    lines: stepping,
    stepping,
    wantStep: stepping,
  };
  save(STORE_FILES, desk.workspace);
  const program = desk.program(name);
  run.code = program.code;
  const maxTicks = quest ? tickLimit(quest) : currentContract()?.ticks;
  const data = quest ? plotData(quest, plot) : {};
  worker.postMessage({ type: "run", runId, ...program, state: farm, locked: locked(progress), maxTicks, data, step: stepping });
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
  const { name, results, contract, stepping, code } = run;
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
  if (!questId && contract) {
    const c = findContract(contract);
    const result = checkContract(c, done, gained, farm);
    home.dinner = null;
    if (!result.met) {
      for (const problem of result.problems) log(problem, "note");
      saveAll();
      renderAll(`*shrug* ${result.problems[0] ?? message}`);
      beep(false);
      if (pages.length) showReward({ title: "New almanac page!", pages });
      return;
    }
    const lines = recordContract(progress, contract);
    mode = { quest: null };
    saveAll();
    renderAll("Beep boop! Order filled.");
    beep(true);
    showReward({ title: `${c.title ?? `${c.who}'s order`}: done!`, icon: "🎀", lines, pages, ticks });
    return;
  }
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
      startRun(name, thisPlot + 1, all, stepping);
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
  const festival = isChapterDone(progress, CHAPTERS.length) && !progress.festivalSeen;
  if (festival) progress.festivalSeen = true;
  saveAll();
  renderAll(`Beep boop! ${starText(result.stars)}`);
  beep(true);
  const reward = () => showReward({ quest, stars: result.stars, ticks: result.ticks, gained: result.gained, rewards, pages, code });
  // Finishing Festival Day for the first time plays the festival, then the stars.
  if (festival) playFestival(reward);
  else reward();
}

// Apply one played event to the page (see playback.js).
function applyEvent(ev) {
  if (ev.kind === "frame") {
    farm = ev.state;
    if (ev.bump) bumped(ev);
  } else if (ev.kind === "log") log(ev.text);
  else if (ev.kind === "line_limit" && run.stepping) {
    log("That's a lot of lines! From here on, Step goes one action at a time.", "note");
  }
}

// Bolt walked into the fence: play a bonk, and say so in the console, since
// the bump still took a tick. Bumps in a row from the same line share one
// console line that counts them.
let lastBump = null; // { el, text, n }
function bumped(ev) {
  bonk = { dir: ev.bump, start: performance.now() };
  const at = ev.at;
  const where = !at ? "" : at.name === run?.name ? `Line ${at.line}: ` : `In ${at.name}, line ${at.line}: `;
  const text = `${where}Bolt bumped the fence`;
  if (lastBump && lastBump.text === text && consoleEl.lastChild === lastBump.el) {
    lastBump.n += 1;
    lastBump.el.textContent = `${text} ${lastBump.n} times (${lastBump.n} ticks).`;
    return;
  }
  log(`${text} (1 tick).`, "bump");
  lastBump = { el: consoleEl.lastChild, text, n: 1 };
}

// Step mode: play up to the next line, once the player asks for it.
function stepRun() {
  if (!run.wantStep) return;
  const before = farm;
  if (!playback.step(run, applyEvent)) return; // wait for more events
  run.wantStep = false;
  if (farm !== before) render();
  desk.showLine(run.at, "step");
}

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000 || 0);
  lastFrameTime = now;
  if (demo) stepDemo(dt);
  if (run) {
    if (run.stepping) stepRun();
    const speed = Number(speedEl.value);
    let budget;
    if (speed === 0) {
      budget = Infinity;
    } else {
      accumulator += dt * speed;
      budget = Math.floor(accumulator);
      accumulator -= budget;
    }
    const used = run.stepping ? 0 : playback.play(run, budget, applyEvent);
    if (used > 0) {
      render();
      desk.showLine(run.at, "run");
    }
    // While stepping, the run ends on the Step press after its last line.
    // A bonk at the very end plays out before the result shows.
    if (run && run.done && run.pos >= run.queue.length && (!run.stepping || run.wantStep) && !bonk) {
      completeRun(run.done);
    } else if (run && !run.done && now - run.lastActivity > WATCHDOG_MS) {
      log("Python stopped responding, so it was restarted.", "error");
      finishRun();
      worker.terminate();
      startWorker();
    }
  }
  // Keep drawing while a bonk plays, even after the run has ended.
  if (bonk) render();
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
  body.append(renderAfterFestival());
  body.append(el("button", { type: "button", class: "secondary home-stop", onclick: () => {
    $("map-dialog").close();
    goHome();
  } }, "Go to your home farm"));
}

// The ninth page of the map: golden quests and the contract board.
function renderAfterFestival() {
  const open = isChapterDone(progress, CHAPTERS.length);
  const golden = QUESTS.filter((q) => q.golden);
  const head = el("div", { class: "chapter-head" },
    el("span", { class: "chapter-num" }, "★"),
    el("div", {},
      el("h3", {}, "Willow Creek After the Festival"),
      el("p", { class: "chapter-intro" }, "Golden quests put old ideas on new fields, and the neighbors post orders for your home farm.")),
    el("span", { class: "chapter-stars" }, `🏆 ${goldenStars(progress)}/${golden.length} · 🎀 ${progress.contracts.length}/${CONTRACTS.length}`));
  if (!open) {
    return el("article", { class: "chapter closed after-festival" }, head,
      el("p", { class: "lock-reason" }, "🔒 To open: finish Festival Day."));
  }
  const stops = golden.map((q) => el("button", {
    type: "button",
    class: `quest-stop golden${mode.quest === q.id ? " current" : ""}`,
    title: `Play ${q.title}`,
    onclick: () => {
      $("map-dialog").close();
      playQuest(q.id);
    },
  }, el("span", { class: "stop-id" }, q.id), el("span", {}, q.title),
  el("span", { class: "stop-bonus" }, progress.stars[q.id] ? "🏆" : `Ch. ${q.from}`),
  el("span", { class: "stop-stars" }, starText(progress.stars[q.id] ?? 0))));
  const board = contractBoard(progress);
  const cards = board.map((c) => el("li", { class: `contract${mode.contract === c.id ? " current" : ""}` },
    el("div", {}, el("b", {}, c.title ?? `${c.who}'s order`), el("span", { class: "item-text" }, `${contractText(c)}.`)),
    el("button", { type: "button", class: "small", onclick: () => {
      $("map-dialog").close();
      takeContract(c.id);
    } }, mode.contract === c.id ? "Taken" : "Take it")));
  return el("article", { class: "chapter after-festival" }, head,
    el("h4", {}, "Golden quests"),
    el("div", { class: "quest-stops" }, stops),
    el("h4", {}, "Contract board"),
    cards.length
      ? el("ul", { class: "shop-list contracts" }, cards)
      : el("p", { class: "chapter-intro" }, "Every order is filled. The neighbors are very happy!"));
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
        action = el("span", { class: "for-sale-later" }, saleLockText(item));
      } else {
        action = el("button", {
          type: "button",
          class: "small",
          disabled: !canAfford(home.inventory, item.cost),
          onclick: () => {
            const problem = buy(progress, home.inventory, item.id);
            if (!problem && (item.size || item.id === "well")) home = loadHome(home);
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
    el("h3", {}, `Golden crowns ${crownsOwned(progress).length}/${CROWNS.length}`),
    el("ul", { class: "crowns" }, CROWNS.map((crown) => {
      const has = progress.owned.includes(crown.id);
      const icon = el("canvas", { width: 112, height: 112, "aria-hidden": "true" });
      drawBoltIcon(icon.getContext("2d"), crown.id);
      let action = null;
      if (has) {
        action = progress.hat === crown.id
          ? el("span", { class: "owned" }, "Wearing")
          : el("button", { type: "button", class: "small", onclick: () => {
            wear(progress, crown.id);
            saveAll();
            renderShelf();
            render();
          } }, "Wear");
      }
      const label = crown.chapter === CHAPTERS.length ? "Win the festival" : `Finish chapter ${crown.chapter}`;
      return el("li", { class: has ? "earned" : "", title: has ? crown.name : label },
        icon, el("span", {}, has ? crown.name : label), action);
    })),
    isChapterDone(progress, CHAPTERS.length)
      ? el("button", { type: "button", class: "secondary small replay", onclick: () => {
        $("shelf-dialog").close();
        playFestival();
      } }, "Watch the festival again")
      : null,
    el("h3", {}, `Golden trophies ${goldenStars(progress)}/8 · Ribbons ${progress.contracts.length}/${CONTRACTS.length}`),
    el("ul", { class: "badge-shelf" }, QUESTS.filter((q) => q.golden).map((q) => {
      const has = progress.stars[q.id] >= 1;
      return el("li", { class: has ? "earned" : "", title: has ? q.title : `Golden quest ${q.id}, after the festival` },
        el("span", { class: "badge-icon" }, has ? "🏆" : "?"), el("span", {}, has ? q.title : q.id));
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

function showReward({ quest, stars, ticks, gained, rewards, pages = [], title, icon = "📖", lines: extra = [], code = null }) {
  $("reward-stars").textContent = quest ? starText(stars) : icon;
  $("reward-heading").textContent = quest ? `${quest.title}: done!` : title;
  const lines = [];
  if (quest) {
    const plots = questPlots(quest).length;
    let text = `Bolt finished in ${ticks} ${ticks === 1 ? "tick" : "ticks"}${plots === 2 ? " on both plots" : plots > 2 ? ` on all ${plots} plots` : ""}.`;
    if (stars < 3) text += ` Can you do it in ${stars === 1 ? quest.stars.two : quest.stars.three} for another star?`;
    $("reward-text").textContent = text;
    const got = Object.entries(gained).map(([item, n]) => plural(n, item)).join(", ");
    if (got) lines.push(`Your barn got ${got}.`);
    lines.push(...rewards.lines);
  } else {
    $("reward-text").textContent = extra.length ? `Bolt filled the order in ${ticks} ${ticks === 1 ? "tick" : "ticks"}.` : "";
    lines.push(...extra);
  }
  for (const page of pages) lines.push(`New almanac page: ${page.name}. ${page.fact}`);
  if (quest && mode.replay && !replayNext(mode.replay, quest.id)) lines.push(`That's every quest in chapter ${mode.replay}. You replayed the whole chapter!`);
  const step = upNext();
  const goOn = Boolean(step) && Boolean(quest || extra.length) && !(quest && step.id === quest.id);
  if (goOn && step.why) lines.push(`What's next: ${step.why}`);
  $("reward-lines").replaceChildren(...lines.map((l) => el("li", {}, l)));
  $("reward-again").hidden = !quest;
  // The next quest starts with a fresh main window, so offer to keep this code.
  const keep = $("reward-keep");
  keep.hidden = !(quest && code && !isEmptyCode(code));
  keep.disabled = false;
  // Before the window tools, a hidden window couldn't be tidied away, so the
  // code goes in the Library instead.
  keep.textContent = desk.tools ? "💾 Save this code in its own window" : "💾 Save this code in your Library";
  keep.onclick = () => {
    if (!desk.tools) {
      // Never write over a saved piece: "Title", then "Title 2", "Title 3"...
      let result;
      for (let n = 1; n < 100 && !result?.piece && !result?.problem; n++) {
        const name = n === 1 ? quest.title : `${quest.title.slice(0, 26)} ${n}`;
        result = savePiece(library, { name, code, quest: quest.id, questTitle: quest.title });
      }
      if (!result.piece) return;
      saveLibrary();
      keep.disabled = true;
      keep.textContent = "Saved in your Library ✓";
      log(`Saved your code for "${quest.title}" in your Library. Open it with 📚 Library above the code.`, "note");
      return;
    }
    const name = windowNameFor(quest.title, desk.names());
    desk.addHidden(name, code);
    keep.disabled = true;
    keep.textContent = `Saved in the window ${name} ✓`;
    log(`Saved your code for "${quest.title}" in the window ${name}. Pick it in the bar above the code to open it.`, "note");
  };
  const nextQ = step?.id ? findQuest(step.id) : null;
  let nextText = "Next quest";
  if (nextQ?.festival) nextText = `Event ${nextQ.festival.event} of 3: ${nextQ.festival.name}!`;
  else if (step?.why) nextText = "What's next?";
  $("reward-next").textContent = goOn ? nextText : "OK";
  $("reward-next").onclick = () => {
    $("reward-dialog").close();
    if (goOn) goNext();
  };
  $("reward-again").onclick = () => $("reward-dialog").close();
  $("reward-dialog").showModal();
}

// ---- The Library ----
// Code saved with a window's 💾 button: open it in a new window, insert it
// into the active window at the cursor, rename it or delete it.

function openLibrary() {
  renderLibrary();
  $("library-dialog").showModal();
}

function saveLibrary(message = "") {
  save(STORE_LIBRARY, library);
  renderLibrary(message);
  desk.renderBar();
}

function renderLibrary(message = "") {
  $("library-message").textContent = message;
  $("library-note").textContent = library.length
    ? `Insert puts a piece into the ${desk.active} window, where the cursor is.`
    : "";
  const list = $("library-list");
  if (!library.length) {
    list.replaceChildren(el("li", { class: "library-empty" },
      "Nothing saved yet. Press 💾 on a code window to keep its code here, so you can use it again later."));
    return;
  }
  list.replaceChildren(...library.map((piece) => libraryItem(piece)));
}

function libraryItem(piece) {
  const from = piece.quest ? `From quest ${piece.quest}${piece.questTitle ? `, ${piece.questTitle}` : ""}` : "From your farm";
  const head = el("div", { class: "piece-head" }, el("b", {}, piece.name), el("span", { class: "piece-from" }, from));
  const actions = el("div", { class: "piece-actions" },
    el("button", { type: "button", class: "small", title: "Open this code in a new window", onclick: () => {
      const name = windowNameFor(piece.name, desk.names());
      desk.openWindow(name, piece.code);
      $("library-dialog").close();
      log(`Opened "${piece.name}" in the window ${name}.`, "note");
    } }, "Open"),
    el("button", { type: "button", class: "small secondary", title: `Put this code into ${desk.active} at the cursor`, onclick: () => {
      $("library-dialog").close();
      desk.insertPiece(piece.code);
      log(`Put "${piece.name}" into ${desk.active}.`, "note");
    } }, `Insert into ${desk.active}`),
    el("button", { type: "button", class: "small secondary", onclick: () => startPieceRename(item, piece) }, "Rename"),
    el("button", { type: "button", class: "small secondary", onclick: () => {
      actions.replaceChildren(
        el("span", {}, `Delete "${piece.name}"?`),
        el("button", { type: "button", class: "small danger", onclick: () => {
          deletePiece(library, piece);
          saveLibrary(`Deleted "${piece.name}".`);
        } }, "Delete"),
        el("button", { type: "button", class: "small secondary", onclick: () => renderLibrary() }, "Keep"));
    } }, "Delete"));
  const item = el("li", { class: "piece" }, head, el("pre", { class: "piece-preview" }, preview(piece.code)), actions);
  return item;
}

function startPieceRename(item, piece) {
  const input = el("input", { value: piece.name, maxlength: "30", "aria-label": "New name" });
  const problem = el("span", { class: "piece-problem", "aria-live": "polite" });
  const form = el("form", { class: "piece-rename", onsubmit: (e) => {
    e.preventDefault();
    const old = piece.name;
    const why = renamePiece(library, piece, input.value);
    if (why) problem.textContent = why;
    else saveLibrary(old === piece.name ? "" : `Renamed "${old}" to "${piece.name}".`);
  } },
  input,
  el("button", { type: "submit", class: "small" }, "Save"),
  el("button", { type: "button", class: "small secondary", onclick: () => renderLibrary() }, "Cancel"),
  problem);
  item.querySelector(".piece-head").replaceWith(form);
  input.focus();
  input.select();
}

// ---- Example programs ----
// Each Farm Book entry has a short example. Bolt acts it out on the entry's
// own little field, in the lesson card and in the book.

const DEMO_STEPS_PER_SECOND = 3;
let demo = null; // { id, ctx, out, btn, tick, queue, pos, done, acc, state }

function codePane(label, code) {
  return el("figure", { class: "code-pane" }, el("figcaption", {}, label), el("pre", {}, el("code", {}, code)));
}

function exampleView(c) {
  const ex = c.example;
  const canvas = el("canvas", { width: 216, height: 216, class: "demo-field", "aria-label": `Bolt's field for the ${c.name} example` });
  const out = el("pre", { class: "demo-out", "aria-live": "polite" });
  const tick = el("span", { class: "demo-tick" }, "Tick 0");
  const btn = el("button", { type: "button", class: "small" }, "▶ Watch Bolt do it");
  btn.addEventListener("click", () => playExample(c, canvas, out, btn, tick));
  const panes = [];
  const windows = Object.keys(ex.files ?? {});
  panes.push(codePane(windows.length ? "main window" : ex.python ? "Plain words" : "Example", ex.code));
  if (ex.python) panes.push(codePane(windows.length ? "main window, in Python" : "Python", ex.python));
  for (const name of windows) panes.push(codePane(`${name} window`, ex.files[name]));
  drawFarm(canvas.getContext("2d"), exampleField(c), { looks: looks(progress) });
  return el("div", { class: "example" },
    el("div", { class: "example-code" }, panes),
    el("div", { class: "example-stage" }, canvas, tick, btn, out));
}

function playExample(c, canvas, out, btn, tick) {
  if (run || nextPlotTimer) {
    out.textContent = "Bolt is busy with your program. Watch again when it stops.";
    return;
  }
  if (!workerReady) {
    out.textContent = "Python is still loading. Try again in a moment.";
    return;
  }
  stopDemo();
  runId += 1;
  const state = exampleField(c);
  demo = { id: runId, ctx: canvas.getContext("2d"), out, btn, tick, queue: [], pos: 0, done: null, acc: 1, state };
  out.textContent = "";
  tick.textContent = "Tick 0";
  btn.disabled = true;
  drawFarm(demo.ctx, state, { looks: looks(progress) });
  worker.postMessage({
    type: "run", runId, code: c.example.code.trim() + "\n", files: c.example.files ?? {}, name: "main",
    state, locked: {}, maxTicks: 100, data: exampleData(c),
  });
}

// Play the example's steps a few a second. print() lines show right away.
function stepDemo(dt) {
  demo.acc += dt * DEMO_STEPS_PER_SECOND;
  let drew = false;
  while (demo.pos < demo.queue.length) {
    const ev = demo.queue[demo.pos];
    if (ev.kind === "frame") {
      if (demo.acc < 1) break;
      demo.acc -= 1;
      demo.state = ev.state;
      drew = true;
    } else {
      demo.out.textContent += `${ev.text}\n`;
    }
    demo.pos += 1;
  }
  if (drew) {
    drawFarm(demo.ctx, demo.state, { looks: looks(progress) });
    demo.tick.textContent = `Tick ${demo.state.tick}`;
  }
  if (demo.done && demo.pos >= demo.queue.length && demo.acc >= 1) {
    if (demo.done.status !== "ok") demo.out.textContent += demo.done.message;
    demo.btn.disabled = false;
    demo.btn.textContent = "▶ Watch again";
    demo = null;
  } else if (demo.pos >= demo.queue.length) {
    demo.acc = Math.min(demo.acc, 1);
  }
}

function stopDemo() {
  if (!demo) return;
  demo.btn.disabled = false;
  demo = null;
}

// ---- Lessons ----
// The first time a quest needs a new word, a card shows what it does with a
// short example, before the player starts. The quest card's "What's new"
// button shows it again.

let lessonPages = [];
let lessonAt = 0;

function showLessons(questId) {
  lessonPages = lessonsFor(questId);
  if (!lessonPages.length) return;
  lessonAt = 0;
  renderLesson();
  if (!$("lesson-dialog").open) $("lesson-dialog").showModal();
}

// Show the lessons for the quest being played, if any are new.
function offerLessons() {
  const quest = currentQuest();
  if (!quest || !$("title-screen").hidden) return;
  if (lessonsFor(quest.id).some((c) => !progress.seen.includes(c.id))) showLessons(quest.id);
}

function renderLesson() {
  stopDemo();
  const c = lessonPages[lessonAt];
  markSeen(progress, c.id);
  saveAll();
  renderHeader();
  const many = lessonPages.length > 1;
  $("lesson-heading").textContent = `New: ${c.name}`;
  $("lesson-step").textContent = many ? `${lessonAt + 1} of ${lessonPages.length} new things in this quest` : "Something new in this quest";
  $("lesson-body").replaceChildren(...[
    el("p", { class: "lesson-does" }, rich(c.does)),
    c.forms.length > 1 ? el("p", { class: "lesson-forms" }, "You can write it ", formList(c.forms), ".") : null,
    exampleView(c),
    el("p", { class: "lesson-more" }, "Find it again any time in the ",
      el("button", { type: "button", class: "link", onclick: () => openBook(c.id) }, "Farm Book"), "."),
  ].filter(Boolean));
  $("lesson-back").hidden = lessonAt === 0;
  $("lesson-next").textContent = lessonAt < lessonPages.length - 1 ? "Next" : "Let's go!";
}

// "a, b or c" with each form as code.
function formList(forms) {
  const parts = [];
  forms.forEach((f, i) => {
    if (i) parts.push(i === forms.length - 1 ? " or " : ", ");
    parts.push(el("code", {}, f));
  });
  return parts;
}

$("lesson-next").addEventListener("click", () => {
  if (lessonAt < lessonPages.length - 1) {
    lessonAt += 1;
    renderLesson();
  } else {
    $("lesson-dialog").close();
  }
});
$("lesson-back").addEventListener("click", () => {
  lessonAt = Math.max(0, lessonAt - 1);
  renderLesson();
});
$("lesson-dialog").addEventListener("close", stopDemo);
$("lesson-btn").addEventListener("click", () => {
  const quest = currentQuest();
  if (quest) showLessons(quest.id);
});

// ---- The Farm Book ----
// Every command, idea and crop the player has opened, grouped by topic.
// New pages are marked until they're read.

let bookPage = null;

function openBook(id = null) {
  if ($("lesson-dialog").open) $("lesson-dialog").close();
  const open = CONCEPTS.filter((c) => isConceptOpen(progress, c));
  const wanted = id && open.find((c) => c.id === id);
  bookPage = (wanted ?? open.find((c) => c.id === bookPage) ?? unreadConcepts(progress)[0] ?? open[0]).id;
  renderBook();
  if (!$("book-dialog").open) $("book-dialog").showModal();
}

function renderBook() {
  stopDemo();
  const open = CONCEPTS.filter((c) => isConceptOpen(progress, c));
  const c = findConcept(bookPage);
  markSeen(progress, c.id);
  saveAll();
  renderHeader();
  $("book-note").textContent = progress.practice
    ? "Practice mode: every page is open."
    : `${open.length} of ${CONCEPTS.length} pages. More open as Bolt learns.`;
  const unread = new Set(unreadConcepts(progress).map((x) => x.id));
  const index = [];
  for (const group of GROUPS) {
    const entries = open.filter((x) => x.group === group.id);
    if (!entries.length) continue;
    index.push(el("h3", {}, group.title), el("ul", {}, entries.map((x) => el("li", {},
      el("button", {
        type: "button",
        class: `book-link${x.id === c.id ? " current" : ""}`,
        title: x.short.replace(/[`*]/g, ""),
        "aria-current": x.id === c.id ? "page" : false,
        onclick: () => {
          bookPage = x.id;
          renderBook();
        },
      }, x.name, unread.has(x.id) ? el("span", { class: "new-tag" }, "New") : null)))));
  }
  $("book-index").replaceChildren(...index);
  $("book-entry").replaceChildren(...bookEntry(c));
  $("book-index").querySelector(".current")?.scrollIntoView({ block: "nearest" });
}

function bookEntry(c) {
  const parts = [el("h3", { class: "entry-name" }, c.name), el("p", {}, rich(c.does))];
  if (c.gives) parts.push(el("h4", {}, "Gives back"), el("p", {}, rich(c.gives)));
  parts.push(el("h4", {}, c.forms.length > 1 ? "Ways to write it" : "How to write it"),
    el("ul", { class: "forms" }, c.forms.map((f) => el("li", {}, el("pre", {}, el("code", {}, f))))));
  parts.push(el("h4", {}, "Watch out"), el("ul", {}, c.watch.map((w) => el("li", {}, rich(w)))));
  const tips = TIPS[c.group];
  if (tips) parts.push(el("h4", {}, "Good to know"), el("ul", {}, tips.map((t) => el("li", {}, rich(t)))));
  if (c.example) parts.push(el("h4", {}, "Example"), exampleView(c));
  parts.push(el("h4", {}, c.crop ? "Where Bolt met it" : "Where Bolt learned it"), learnedLine(c));
  return parts;
}

function learnedLine(c) {
  if (!c.learned) return el("p", {}, `It opens in chapter ${WORDS[c.word].chapter}. No quest needs it, but it's there when you want it.`);
  const quest = findQuest(c.learned);
  const playable = isQuestOpen(progress, quest.id);
  let action;
  if (mode.quest === quest.id) action = el("span", { class: "muted" }, "You're playing it now.");
  else if (!playable) action = el("span", { class: "muted" }, "Finish the quests before it to play it.");
  else {
    action = el("button", { type: "button", class: "small secondary", onclick: () => {
      $("book-dialog").close();
      playQuest(quest.id);
    } }, progress.stars[quest.id] ? "Play it again" : "Play it");
  }
  return el("p", {}, `Quest ${quest.id}, ${quest.title}. `, action);
}

$("book-dialog").addEventListener("close", stopDemo);
$("open-book").addEventListener("click", () => openBook());

// ---- The festival scene ----
// After the last festival event: each neighbor gives Bolt a ribbon for what
// was learned, Aunt Juniper gives the festival crown, and the barn shows the
// season's harvest. About 10 seconds, and it can be skipped.

const FESTIVAL_LINES = [
  ["Daisy", "Moo! You learned to repeat!"],
  ["Hazel", "Loops inside loops!"],
  ["Pip", "Look before you act!"],
  ["Wren", "Hoo! You keep going until it's done!"],
  ["Mayor Maple", "You learned to keep count!"],
  ["Bolt", "And I learned new words you taught me!"],
  ["Aunt Juniper", "Lists and big plans! For the best farmer in Willow Creek: the Festival Crown!"],
];
const FESTIVAL_STEP_MS = 1300;
let festivalTimer = null;
let festivalDone = null;

function playFestival(onDone = null) {
  const dialog = $("festival-dialog");
  festivalDone = onDone;
  clearTimeout(festivalTimer);
  const boltCtx = $("festival-bolt").getContext("2d");
  const before = progress.hat === "crown_8" ? "straw_hat" : progress.hat;
  drawBoltIcon(boltCtx, before);
  $("festival-ribbons").textContent = "";
  $("festival-total").hidden = true;
  $("festival-next").hidden = true;
  $("festival-skip").hidden = false;
  let i = 0;
  const step = () => {
    if (i < FESTIVAL_LINES.length) {
      const [who, line] = FESTIVAL_LINES[i];
      $("festival-who").textContent = who;
      // Start the bubble's pop-in again for each new line.
      const bubble = $("festival-line");
      bubble.textContent = line;
      bubble.style.animation = "none";
      void bubble.offsetWidth;
      bubble.style.animation = "";
      if (i < FESTIVAL_LINES.length - 1) $("festival-ribbons").textContent += "🎀";
      else drawBoltIcon(boltCtx, "crown_8");
      i += 1;
      festivalTimer = setTimeout(step, FESTIVAL_STEP_MS);
    } else {
      endFestival();
    }
  };
  dialog.showModal();
  beep(true);
  step();
}

function endFestival() {
  clearTimeout(festivalTimer);
  drawBoltIcon($("festival-bolt").getContext("2d"), "crown_8");
  $("festival-ribbons").textContent = "🎀".repeat(FESTIVAL_LINES.length - 1);
  const total = ITEMS.filter((item) => progress.harvested[item] > 0)
    .map((item) => plural(progress.harvested[item], item)).join(", ");
  $("festival-total").textContent = `This season the barn took in ${total || "lots of crops"}.`;
  $("festival-total").hidden = false;
  $("festival-who").textContent = "Bolt";
  $("festival-line").textContent = "I want to learn more. What's next?";
  $("festival-skip").hidden = true;
  $("festival-next").hidden = false;
  $("festival-next").focus();
}

$("festival-skip").addEventListener("click", endFestival);
$("festival-next").addEventListener("click", () => $("festival-dialog").close());
$("festival-dialog").addEventListener("close", () => {
  clearTimeout(festivalTimer);
  // Bolt wears the festival crown home.
  if (progress.owned.includes("crown_8") && progress.hat !== "crown_8" && festivalDone) {
    wear(progress, "crown_8");
    saveAll();
    render();
  }
  const done = festivalDone;
  festivalDone = null;
  done?.();
});

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
  $("unlock-all-confirm").hidden = true;
  $("shelf-dialog").showModal();
});
$("practice").addEventListener("change", (e) => {
  progress.practice = e.target.checked;
  saveAll();
  renderAll();
});
// The unlock-everything button is for testing, so it only shows when the page
// is opened with ?testing at the end of the address.
$("unlock-all-row").hidden = !TESTING;
$("unlock-all").addEventListener("click", () => ($("unlock-all-confirm").hidden = false));
$("unlock-all-no").addEventListener("click", () => ($("unlock-all-confirm").hidden = true));
$("unlock-all-yes").addEventListener("click", () => {
  if (run) stopRun();
  unlockAll(progress);
  // The field grows, and the well and bee hive appear. The barn keeps its produce.
  home = loadHome(home);
  if (!mode.quest) farm = home;
  $("unlock-all-confirm").hidden = true;
  saveAll();
  renderShelf();
  renderAll();
  log("Everything is unlocked: every chapter, quest, coding word, crop, shop item and Farm Book page.", "note");
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
$("next-btn").addEventListener("click", goNext);
$("contract-btn").addEventListener("click", () => {
  goHome();
  log("You put the contract back on the board. Take it again from the map.", "note");
});
$("starter-btn").addEventListener("click", () => {
  if (run) stopRun();
  openStarter(currentQuest(), true);
  log("Bolt's code is back the way it started.", "note");
});
$("last-code-btn").addEventListener("click", restoreLastCode);
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
  saveName: (name) => (name === "main" || name.startsWith("fix_") ? currentQuest()?.title ?? "My farm code" : name),
  saveCode: (name, code, replace) => {
    const quest = currentQuest();
    const result = savePiece(library, { name, code, quest: quest?.id ?? null, questTitle: quest?.title ?? null }, replace);
    if (result.piece) {
      save(STORE_LIBRARY, library);
      if ($("library-dialog").open) renderLibrary();
      desk.renderBar();
    }
    return result;
  },
  onLibrary: () => openLibrary(),
  hasLibrary: () => library.length > 0,
});

function updateRunButton() {
  updateStepButtons();
  if (!workerReady) return;
  runBtn.disabled = Boolean(run);
  // With one window there's only one thing to run.
  runBtn.textContent = desk.workspace.windows.length > 1 ? `▶ Run ${desk.active}` : "▶ Run";
}

function updateStepButtons() {
  stepBtn.disabled = !workerReady;
  keepGoingBtn.disabled = !run?.stepping;
  keepGoingBtn.hidden = !run?.stepping;
}

// Step: start a run paused on its first line, pause a run that's playing,
// or move a paused run on by one line.
function pressStep() {
  if (!workerReady) return;
  if (!run) {
    startRun(desk.active, 0, [], true);
  } else {
    run.stepping = true;
    run.wantStep = true;
  }
  updateStepButtons();
}

// Keep going: back to normal playback at the chosen speed.
function keepGoing() {
  if (!run?.stepping) return;
  run.stepping = false;
  run.wantStep = false;
  accumulator = 0;
  desk.showLine(run.at, "run");
  updateStepButtons();
}

runBtn.addEventListener("click", () => startRun());
stopBtn.addEventListener("click", stopRun);
stepBtn.addEventListener("click", pressStep);
keepGoingBtn.addEventListener("click", keepGoing);
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

freshStart(currentQuest());
openStarter(currentQuest());
save(STORE_FILES, desk.workspace);
saveAll();
renderAll();
startWorker();
requestAnimationFrame(loop);

// ---- The title screen ----
// Shown when the page opens: Continue where you were, start a New game, or
// Replay a finished chapter. The Title button brings it back.

const STORE_SKIP_TITLE = "autofarm.skipTitle"; // set for the reload after a new game

function showTitle(view = "main") {
  if (view === "main") {
    if (run || nextPlotTimer) stopRun();
    for (const d of document.querySelectorAll("dialog[open]")) d.close();
    drawBoltIcon($("title-bolt").getContext("2d"), progress.hat);
    const saved = hasSave(progress, home.inventory);
    const stars = totalStars(progress);
    $("title-continue").hidden = !saved;
    $("title-continue").classList.add("main");
    $("title-new").classList.toggle("main", !saved);
    $("title-continue-note").textContent = `${continueText(mode)}${stars ? ` · ★ ${stars}` : ""}`;
    const chapters = replayChapters(progress);
    $("title-replay").disabled = !chapters.length;
    $("title-replay-note").textContent = chapters.length
      ? `Play any of your ${chapters.length} finished ${chapters.length === 1 ? "chapter" : "chapters"} again.`
      : "Finish a chapter to play it again.";
  }
  if (view === "confirm") {
    const done = replayChapters(progress).length;
    const bought = progress.owned.filter((id) => SHOP.some((item) => item.id === id)).length;
    $("title-confirm-summary").textContent = `Right now you have ★ ${totalStars(progress)}, `
      + `${plural(done, "finished chapter")} and ${plural(bought, "thing")} from the shop.`;
  }
  if (view === "chapters") renderReplayList();
  for (const [name, id] of [["main", "title-main"], ["confirm", "title-confirm"], ["chapters", "title-chapters"]]) {
    $(id).hidden = name !== view;
  }
  $("title-screen").hidden = false;
  document.querySelector("header").inert = true;
  document.querySelector("main").inert = true;
  const first = { main: $("title-continue").hidden ? "title-new" : "title-continue", confirm: "title-confirm-no", chapters: "title-chapters-back" }[view];
  $(first).focus();
}

function hideTitle() {
  $("title-screen").hidden = true;
  document.querySelector("header").inert = false;
  document.querySelector("main").inert = false;
  renderAll();
}

function renderReplayList() {
  $("title-chapter-list").replaceChildren(...replayChapters(progress).map((ch) => el("li", {},
    el("button", { type: "button", title: `Play chapter ${ch.n} again from quest ${ch.quests[0].id}`, onclick: () => {
      hideTitle();
      playQuest(ch.quests[0].id, ch.n);
      log(`Replaying chapter ${ch.n}, ${ch.title}. Next takes you through every quest in it.`, "note");
    } },
    el("span", { class: "chapter-num" }, String(ch.n)),
    el("span", { class: "ch-title" }, ch.title),
    el("span", { class: "ch-stars" }, `★ ${chapterStars(progress, ch.n)}/${ch.quests.length * 3}`)))));
}

function newGame() {
  if (run) stopRun();
  progress = newProgress();
  home = newFarmState(fieldSize(progress));
  mode = { quest: nextQuest(progress) };
  saveAll();
  // Fresh code windows too. Reloading builds them again, with Bolt's first lines.
  try {
    localStorage.removeItem(STORE_FILES);
    localStorage.removeItem(STORE_CODE);
    sessionStorage.setItem(STORE_SKIP_TITLE, "1");
  } catch {
    // Storage unavailable; the reload still starts over.
  }
  location.reload();
}

$("title-continue").addEventListener("click", () => {
  hideTitle();
  offerLessons();
});
$("title-new").addEventListener("click", () => {
  if (hasSave(progress, home.inventory)) showTitle("confirm");
  else {
    hideTitle();
    offerLessons();
  }
});
$("title-confirm-yes").addEventListener("click", newGame);
$("title-confirm-no").addEventListener("click", () => showTitle("main"));
$("title-replay").addEventListener("click", () => showTitle("chapters"));
$("title-chapters-back").addEventListener("click", () => showTitle("main"));
$("open-title").addEventListener("click", () => showTitle("main"));
$("title-screen").addEventListener("keydown", (e) => {
  // Escape goes back from the confirm or chapter list.
  if (e.key === "Escape" && $("title-main").hidden) showTitle("main");
});

let skipTitle = false;
try {
  skipTitle = sessionStorage.getItem(STORE_SKIP_TITLE) === "1";
  sessionStorage.removeItem(STORE_SKIP_TITLE);
} catch {
  // No session storage: show the title.
}
if (skipTitle) {
  $("title-screen").hidden = true;
  log("A new game! Bolt is ready for the first day on the farm.", "note");
  offerLessons();
} else {
  showTitle("main");
}
