// The player's progress: stars, open chapters, the shop, badges, the almanac
// and titles. No DOM code here, so it can be tested with Node.
import { CHAPTERS, QUESTS, findQuest } from "./chapters.js";
import { AFTER_FESTIVAL, WORDS, lockedWords } from "./words.js";

// ---- The shop ----
// `after`: the chapter that has to be finished before it can be bought.

export const SHOP = [
  { id: "wheat_seeds", kind: "seeds", name: "Wheat seeds", text: "Plant wheat on your home farm.", cost: { hay: 3 }, after: 1, crop: "wheat" },
  { id: "field_5", kind: "growth", name: "Bigger field", text: "Your home farm grows to 5 by 5.", cost: { hay: 15 }, after: 2, size: 5 },
  { id: "carrot_seeds", kind: "seeds", name: "Carrot seeds", text: "Plant carrots. Plant them where wheat was just picked and they give 2!", cost: { wheat: 10 }, after: 3, crop: "carrot" },
  { id: "strawberry_seeds", kind: "seeds", name: "Strawberry seeds", text: "Plant strawberries. Each one gives more for every strawberry next to it.", cost: { wheat: 12 }, after: 3, crop: "strawberry" },
  { id: "scarecrow", kind: "looks", name: "Scarecrow", text: "A friendly scarecrow for your farm.", cost: { wheat: 8 }, after: 3 },
  { id: "lettuce_seeds", kind: "seeds", name: "Lettuce seeds", text: "Plant lettuce. It's quick, but pick it before it wilts!", cost: { hay: 12 }, after: 4, crop: "lettuce" },
  { id: "red_cap", kind: "hat", name: "Red cap", text: "A bright red cap for Bolt.", cost: { hay: 10 }, after: 4 },
  { id: "cowboy_hat", kind: "hat", name: "Cowboy hat", text: "Yee-haw! A wide brown hat.", cost: { wheat: 12 }, after: 4 },
  { id: "field_7", kind: "growth", name: "Even bigger field", text: "Your home farm grows to 7 by 7.", cost: { hay: 20, wheat: 20 }, after: 5, size: 7 },
  { id: "blueberry_seeds", kind: "seeds", name: "Blueberry seeds", text: "Plant blueberry bushes. They grow back and give more each time.", cost: { carrot: 6 }, after: 5, crop: "blueberry" },
  { id: "berry_hat", kind: "hat", name: "Berry hat", text: "A sun hat with strawberries and blueberries on it.", cost: { strawberry: 10, blueberry: 10 }, after: 6 },
  { id: "fence", kind: "looks", name: "Fence", text: "A wooden fence around your farm.", cost: { hay: 25 }, after: 6 },
  { id: "flower_crown", kind: "hat", name: "Flower crown", text: "Daisies and buttercups for Bolt.", cost: { carrot: 5 }, after: 6 },
  { id: "dog", kind: "looks", name: "Farm dog", text: "A puppy that follows Bolt around.", cost: { carrot: 8 }, after: 7 },
  { id: "field_10", kind: "growth", name: "Giant field", text: "Your home farm grows to 10 by 10.", cost: { carrot: 20 }, after: 8, size: 10 },
  { id: "gold_crown", kind: "hat", name: "Golden crown", text: "For the winner of the Harvest Festival.", cost: { carrot: 15, wheat: 30 }, after: 8 },
];

export const STARTING_HAT = "straw_hat";
export const HAT_NAMES = { straw_hat: "Straw hat" };
for (const item of SHOP) if (item.kind === "hat") HAT_NAMES[item.id] = item.name;

export function shopItem(id) {
  return SHOP.find((item) => item.id === id) ?? null;
}

// ---- The almanac: a page for each crop, filled the first time it's harvested ----

export const ALMANAC = [
  { item: "hay", name: "Hay", fact: "Hay is grass that has been cut and dried. Cows, horses and rabbits eat it all winter." },
  { item: "wheat", name: "Wheat", fact: "Wheat seeds are ground into flour, and flour makes bread, pasta and cake." },
  { item: "carrot", name: "Carrot", fact: "The carrot is a root. The orange part grows under the ground, and the leaves stick out the top." },
  { item: "lettuce", name: "Lettuce", fact: "Lettuce grows fast, but in hot weather it 'bolts': it shoots up a tall stalk and turns bitter. Farmers pick it while it's crisp." },
  { item: "strawberry", name: "Strawberry", fact: "Strawberries wear their seeds on the outside, about 200 on each berry. The plants send out runners to start new plants nearby." },
  { item: "blueberry", name: "Blueberry", fact: "A blueberry bush can keep giving berries for more than 50 years, and it gives more as it grows bigger." },
];

// ---- Saving ----

// Saves carry a version. When quests are added, moved or given new IDs, a
// migration below brings older saves up to date, so nothing earned is lost.
// Each one runs once, on saves older than its version, before anything else
// is checked. Add new ones at the end with the next version number.
export const MIGRATIONS = [
  {
    // Version 2 remembers finished chapters. The core quests of each chapter
    // before then, so a chapter finished then stays finished when a new core
    // quest is added to it.
    version: 2,
    run(saved) {
      const core = [
        ["1-1", "1-2", "1-3", "1-4", "1-5"],
        ["2-1", "2-2", "2-3", "2-4", "2-5"],
        ["3-1", "3-2", "3-3", "3-4"],
        ["4-1", "4-2", "4-3", "4-4"],
        ["5-1", "5-2", "5-3", "5-4", "5-5"],
        ["6-1", "6-2", "6-3", "6-4"],
        ["7-1", "7-2", "7-3"],
        ["8-1", "8-2", "8-3", "8-4"],
      ];
      const stars = saved.stars ?? {};
      saved.finished = core.flatMap((ids, i) => (ids.every((id) => stars[id] >= 1) ? [i + 1] : []));
    },
  },
];

export const SAVE_VERSION = MIGRATIONS.reduce((v, m) => Math.max(v, m.version), 1);

// finished: chapters the player has finished. Once finished, a chapter stays
// finished, even if a new quest is added to it later.
export function newProgress() {
  return {
    version: SAVE_VERSION, stars: {}, best: {}, owned: [STARTING_HAT], hat: STARTING_HAT,
    almanac: [], practice: false, finished: [],
  };
}

// Bring an older save up to date (see MIGRATIONS). Returns a new object.
export function migrate(saved) {
  const out = structuredClone(saved);
  const from = Number.isInteger(out.version) ? out.version : 1;
  for (const m of MIGRATIONS) if (m.version > from) m.run(out);
  out.version = SAVE_VERSION;
  return out;
}

// Check saved progress and fill in anything missing.
export function loadProgress(raw) {
  const p = newProgress();
  if (!raw || typeof raw !== "object") return p;
  const saved = migrate(raw);
  for (const [id, n] of Object.entries(saved.stars ?? {})) {
    if (findQuest(id) && Number.isInteger(n) && n >= 1 && n <= 3) p.stars[id] = n;
  }
  for (const [id, n] of Object.entries(saved.best ?? {})) {
    if (findQuest(id) && Number.isFinite(n) && n >= 0) p.best[id] = n;
  }
  if (Array.isArray(saved.owned)) {
    for (const id of saved.owned) if (shopItem(id) && !p.owned.includes(id)) p.owned.push(id);
  }
  if (p.owned.includes(saved.hat) && HAT_NAMES[saved.hat]) p.hat = saved.hat;
  if (Array.isArray(saved.almanac)) {
    p.almanac = ALMANAC.map((a) => a.item).filter((item) => saved.almanac.includes(item));
  }
  p.practice = saved.practice === true;
  if (Array.isArray(saved.finished)) {
    p.finished = CHAPTERS.map((ch) => ch.n).filter((n) => saved.finished.includes(n));
  }
  noteFinished(p);
  return p;
}

// Remember every chapter whose core quests all have a star.
function noteFinished(p) {
  for (const ch of CHAPTERS) {
    if (!p.finished.includes(ch.n) && ch.quests.every((q) => q.bonus || p.stars[q.id] >= 1)) {
      p.finished.push(ch.n);
    }
  }
  p.finished.sort((a, b) => a - b);
}

// ---- Stars and chapters ----

export function totalStars(p) {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

export function chapterStars(p, n) {
  return CHAPTERS[n - 1].quests.reduce((sum, q) => sum + (p.stars[q.id] ?? 0), 0);
}

// Bonus quests give stars but aren't needed to finish a chapter. A chapter
// that was finished once stays finished.
export function isChapterDone(p, n) {
  const ch = CHAPTERS[n - 1];
  if (!ch) return false;
  return (p.finished ?? []).includes(n) || ch.quests.every((q) => q.bonus || p.stars[q.id] >= 1);
}

// A chapter opens once the one before it is finished and the player has
// enough stars. Chapter 9 means "after the Harvest Festival". A chapter the
// player has already played in stays open, even if more stars are needed
// to open it now.
export function isChapterOpen(p, n) {
  if (p.practice || n <= 1) return true;
  if (n === AFTER_FESTIVAL) return isChapterDone(p, CHAPTERS.length);
  const ch = CHAPTERS[n - 1];
  if (!ch) return false;
  if (isChapterDone(p, n) || ch.quests.some((q) => p.stars[q.id] >= 1)) return true;
  return isChapterDone(p, n - 1) && totalStars(p) >= ch.starsToOpen;
}

// Why a chapter is closed, for the map.
export function chapterLockReason(p, n) {
  if (isChapterOpen(p, n)) return null;
  const parts = [];
  if (!isChapterDone(p, n - 1)) parts.push(`finish chapter ${n - 1}`);
  const need = CHAPTERS[n - 1].starsToOpen - totalStars(p);
  if (need > 0) parts.push(`get ${need} more ★`);
  return `To open: ${parts.join(" and ")}.`;
}

// Quests in a chapter open one after another.
export function isQuestOpen(p, id) {
  const quest = findQuest(id);
  if (!quest || !isChapterOpen(p, quest.chapter)) return false;
  if (p.practice) return true;
  const list = CHAPTERS[quest.chapter - 1].quests;
  const i = list.findIndex((q) => q.id === id);
  // A quest that already has stars stays open, even if a new quest is added before it.
  return i === 0 || p.stars[id] >= 1 || p.stars[list[i - 1].id] >= 1;
}

// The quest to play next: the first open one not yet finished (bonus quests
// last), then the first open one without 3 stars. Null when every quest has
// 3 stars.
export function nextQuest(p) {
  const open = QUESTS.filter((q) => isQuestOpen(p, q.id));
  return (open.find((q) => !p.stars[q.id] && !q.bonus) ?? open.find((q) => !p.stars[q.id])
    ?? open.find((q) => p.stars[q.id] < 3) ?? null)?.id ?? null;
}

export function locked(p) {
  return lockedWords((n) => isChapterOpen(p, n));
}

// ---- Home farm ----

export function fieldSize(p) {
  return Math.max(3, ...p.owned.map((id) => shopItem(id)?.size ?? 0));
}

export function seeds(p) {
  return ["grass", ...SHOP.filter((i) => i.crop && p.owned.includes(i.id)).map((i) => i.crop)];
}

export function looks(p) {
  return {
    hat: p.hat,
    scarecrow: p.owned.includes("scarecrow"),
    fence: p.owned.includes("fence"),
    dog: p.owned.includes("dog"),
  };
}

// ---- Shop ----

export function isForSale(p, item) {
  return p.practice || isChapterDone(p, item.after);
}

export function canAfford(inventory, cost) {
  return Object.entries(cost).every(([item, n]) => (inventory[item] ?? 0) >= n);
}

// Buy an item, paying from `inventory` (the barn). Returns null on success,
// or a reason it can't be bought.
export function buy(p, inventory, id) {
  const item = shopItem(id);
  if (!item) return "That isn't in the shop.";
  if (p.owned.includes(id)) return `You already have the ${item.name.toLowerCase()}.`;
  if (!isForSale(p, item)) return `The ${item.name.toLowerCase()} is for sale after chapter ${item.after}.`;
  if (!canAfford(inventory, item.cost)) return "You need more produce for that.";
  for (const [thing, n] of Object.entries(item.cost)) inventory[thing] -= n;
  p.owned.push(id);
  if (item.kind === "hat") p.hat = id;
  return null;
}

export function wear(p, hat) {
  if (p.owned.includes(hat) && HAT_NAMES[hat]) p.hat = hat;
}

// ---- Badges, titles and the almanac ----

export function badges(p) {
  return CHAPTERS.filter((ch) => isChapterDone(p, ch.n)).map((ch) => ch.badge);
}

export function titles(p) {
  const list = ["Farm Helper"];
  if (CHAPTERS.some((ch) => ch.quests.every((q) => p.stars[q.id] === 3))) list.push("Star Farmer");
  if (isChapterDone(p, CHAPTERS.length)) list.push("Master Farmer");
  return list;
}

// Note crops harvested for the first time. Returns the new almanac pages.
export function noteHarvest(p, gained) {
  const added = [];
  for (const page of ALMANAC) {
    if ((gained[page.item] ?? 0) > 0 && !p.almanac.includes(page.item)) {
      p.almanac.push(page.item);
      added.push(page);
    }
  }
  return added;
}

// ---- Recording a quest ----

// What's open right now, to compare before and after a quest.
function unlockState(p) {
  return {
    chapters: CHAPTERS.filter((ch) => isChapterOpen(p, ch.n)).map((ch) => ch.n),
    done: CHAPTERS.filter((ch) => isChapterDone(p, ch.n)).map((ch) => ch.n),
    words: Object.keys(WORDS).filter((w) => isChapterOpen(p, WORDS[w].chapter)),
    shop: SHOP.filter((item) => isForSale(p, item)).map((item) => item.id),
    titles: titles(p),
  };
}

// Save a quest result. Returns the rewards to show: { better, newBest, lines }.
export function recordResult(p, id, stars, ticks) {
  const before = unlockState(p);
  const old = p.stars[id] ?? 0;
  const better = stars > old;
  if (better) p.stars[id] = stars;
  const newBest = stars > 0 && !(p.best[id] <= ticks);
  if (newBest) p.best[id] = ticks;
  noteFinished(p);
  const after = unlockState(p);
  const added = (key) => after[key].filter((x) => !before[key].includes(x));
  const lines = [];
  for (const n of added("done")) lines.push(`You earned the ${CHAPTERS[n - 1].badge}!`);
  for (const n of added("chapters")) lines.push(`Chapter ${n}, ${CHAPTERS[n - 1].title}, is open!`);
  const words = added("words").filter((w) => WORDS[w].chapter !== AFTER_FESTIVAL);
  if (words.length) lines.push(`Bolt learned: ${words.map((w) => WORDS[w].label).join(", ")}.`);
  if (added("words").includes("advanced")) lines.push("Every kind of Python is open now. Bolt knows it all!");
  for (const itemId of added("shop")) lines.push(`New in the shop: ${shopItem(itemId).name}.`);
  for (const title of added("titles")) lines.push(`New title: ${title}!`);
  return { better, newBest, lines };
}
