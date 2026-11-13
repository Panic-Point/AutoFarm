// The player's progress: stars, open chapters, the shop, badges, the almanac
// and titles. No DOM code here, so it can be tested with Node.
import { CHAPTERS, QUESTS, findQuest } from "./chapters.js";
import { CONTRACTS, GOLDEN, findContract } from "./postgame.js";
import { ITEMS } from "./game.js";
import { plural } from "./quests.js";
import { AFTER_FESTIVAL, WORDS, lockedWords } from "./words.js";

// ---- The shop ----
// `after`: the chapter that has to be finished before it can be bought.
// `contract`: the contract that has to be finished instead.

export const SHOP = [
  { id: "wheat_seeds", kind: "seeds", name: "Wheat seeds", text: "Plant wheat on your home farm.", cost: { hay: 3 }, after: 1, crop: "wheat" },
  { id: "field_5", kind: "growth", name: "Bigger field", text: "Your home farm grows to 5 by 5.", cost: { hay: 15 }, after: 2, size: 5 },
  { id: "carrot_seeds", kind: "seeds", name: "Carrot seeds", text: "Plant carrots. Plant them where wheat was just picked and they give 2!", cost: { wheat: 10 }, after: 3, crop: "carrot" },
  { id: "strawberry_seeds", kind: "seeds", name: "Strawberry seeds", text: "Plant strawberries. Each one gives more for every strawberry next to it.", cost: { wheat: 12 }, after: 3, crop: "strawberry" },
  { id: "scarecrow", kind: "looks", name: "Scarecrow", text: "A friendly scarecrow for your farm.", cost: { wheat: 8 }, after: 3 },
  { id: "lettuce_seeds", kind: "seeds", name: "Lettuce seeds", text: "Plant lettuce. It's quick, but pick it before it wilts!", cost: { hay: 12 }, after: 4, crop: "lettuce" },
  { id: "red_cap", kind: "hat", name: "Red cap", text: "A bright red cap for Bolt.", cost: { hay: 10 }, after: 4 },
  { id: "cowboy_hat", kind: "hat", name: "Cowboy hat", text: "Yee-haw! A wide brown hat.", cost: { wheat: 12 }, after: 4 },
  { id: "pumpkin_seeds", kind: "seeds", name: "Pumpkin seeds", text: "Plant pumpkins. Pick them when they're ripe, before they rot!", cost: { carrot: 3 }, after: 4, crop: "pumpkin" },
  { id: "jack_o_lantern", kind: "looks", name: "Jack-o'-lantern", text: "A grinning pumpkin for your farm.", cost: { pumpkin: 2 }, after: 4 },
  { id: "field_7", kind: "growth", name: "Even bigger field", text: "Your home farm grows to 7 by 7.", cost: { hay: 20, wheat: 20 }, after: 5, size: 7 },
  { id: "blueberry_seeds", kind: "seeds", name: "Blueberry seeds", text: "Plant blueberry bushes. They grow back and give more each time.", cost: { carrot: 6 }, after: 5, crop: "blueberry" },
  { id: "mushroom_hat", kind: "hat", name: "Mushroom hat", text: "A red spotty cap, like the mushrooms in the fog.", cost: { mushroom: 3 }, after: 5 },
  { id: "berry_hat", kind: "hat", name: "Berry hat", text: "A sun hat with strawberries and blueberries on it.", cost: { strawberry: 10, blueberry: 10 }, after: 6 },
  { id: "fence", kind: "looks", name: "Fence", text: "A wooden fence around your farm.", cost: { hay: 25 }, after: 6 },
  { id: "flower_crown", kind: "hat", name: "Flower crown", text: "Daisies and buttercups for Bolt.", cost: { carrot: 5 }, after: 6 },
  { id: "corn_seeds", kind: "seeds", name: "Corn seeds", text: "Plant corn. It only grows on wet soil, so water() it. Each one gives 2!", cost: { lettuce: 5 }, after: 6, crop: "corn" },
  { id: "well", kind: "looks", name: "Well", text: "A well in the corner of your farm. Stand on it and refill() the watering can.", cost: { wheat: 15 }, after: 6 },
  { id: "dog", kind: "looks", name: "Farm dog", text: "A puppy that follows Bolt around.", cost: { carrot: 8 }, after: 7 },
  { id: "sunflower_seeds", kind: "seeds", name: "Sunflower seeds", text: "Plant sunflowers. They're so tall Bolt can see them from anywhere with ripe_at(x, y).", cost: { pumpkin: 4 }, after: 7, crop: "sunflower" },
  { id: "sunflower_hat", kind: "hat", name: "Sunflower hat", text: "A big sunny flower for Bolt's head.", cost: { sunflower: 5 }, after: 7 },
  { id: "field_10", kind: "growth", name: "Giant field", text: "Your home farm grows to 10 by 10.", cost: { carrot: 20 }, after: 8, size: 10 },
  // Rewards from the contract board.
  { id: "blue_cap", kind: "hat", name: "Blue cap", text: "Daisy's thank-you: a sky blue cap.", cost: { hay: 10 }, contract: "c-1" },
  { id: "baker_hat", kind: "hat", name: "Baker's hat", text: "Hazel's thank-you: a tall white hat for bread days.", cost: { wheat: 10 }, contract: "c-2" },
  { id: "orange_cap", kind: "hat", name: "Orange cap", text: "Pip's thank-you: a carrot orange cap.", cost: { carrot: 5 }, contract: "c-3" },
  { id: "green_beanie", kind: "hat", name: "Green beanie", text: "Wren's thank-you: a warm hat for foggy days.", cost: { lettuce: 5 }, contract: "c-4" },
  { id: "dinner_bell", kind: "looks", name: "Dinner bell", text: "A bell by the barn to call Daisy for dinner.", cost: { hay: 15 }, contract: "c-5" },
  { id: "top_hat", kind: "hat", name: "Top hat", text: "The Mayor's thank-you: very fancy.", cost: { strawberry: 5 }, contract: "c-6" },
  {
    id: "bee_hive", kind: "looks", name: "Bee hive",
    text: "A hive in the middle of your farm. Strawberries and blueberries within 1 tile of it give 1 more.",
    cost: { strawberry: 10 }, contract: "c-7",
  },
  { id: "honey_hat", kind: "hat", name: "Honey hat", text: "A golden hat that smells of honey.", cost: { strawberry: 10 }, contract: "c-8" },
  { id: "purple_cap", kind: "hat", name: "Purple cap", text: "Pip's other thank-you: a blueberry purple cap.", cost: { blueberry: 5 }, contract: "c-9" },
  { id: "sun_hat", kind: "hat", name: "Sun hat", text: "Wren's other thank-you: a wide hat for sunny days.", cost: { wheat: 15 }, contract: "c-10" },
  { id: "ribbon_hat", kind: "hat", name: "Ribbon hat", text: "A hat covered in the Mayor's prize ribbons.", cost: { blueberry: 5, strawberry: 5 }, contract: "c-11" },
  { id: "farmer_hat", kind: "hat", name: "Master farmer's hat", text: "Aunt Juniper's own old farm hat. She says it's yours now.", cost: { carrot: 10 }, contract: "c-12" },
];

// ---- Golden crowns: a free gift for each finished chapter ----
// Each has its chapter's crop on it. Aunt Juniper gives the last one at the
// Harvest Festival.
export const CROWNS = [
  { id: "crown_1", chapter: 1, name: "Hay Crown", crop: "hay" },
  { id: "crown_2", chapter: 2, name: "Wheat Crown", crop: "wheat" },
  { id: "crown_3", chapter: 3, name: "Strawberry Crown", crop: "strawberry" },
  { id: "crown_4", chapter: 4, name: "Pumpkin Crown", crop: "pumpkin" },
  { id: "crown_5", chapter: 5, name: "Mushroom Crown", crop: "mushroom" },
  { id: "crown_6", chapter: 6, name: "Corn Crown", crop: "corn" },
  { id: "crown_7", chapter: 7, name: "Sunflower Crown", crop: "sunflower" },
  { id: "crown_8", chapter: 8, name: "Festival Crown", crop: "festival" },
];

export function crownFor(chapter) {
  return CROWNS.find((c) => c.chapter === chapter) ?? null;
}

export const STARTING_HAT = "straw_hat";
export const HAT_NAMES = { straw_hat: "Straw hat" };
for (const item of SHOP) if (item.kind === "hat") HAT_NAMES[item.id] = item.name;
for (const crown of CROWNS) HAT_NAMES[crown.id] = crown.name;

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
  { item: "pumpkin", name: "Pumpkin", fact: "A pumpkin is really a fruit, with seeds inside. The biggest ones ever grown weighed more than a small car." },
  { item: "mushroom", name: "Mushroom", fact: "A mushroom isn't a plant. It's a fungus, and it loves damp, foggy places. Never eat a wild one unless a grown-up who knows says it's safe." },
  { item: "corn", name: "Corn", fact: "Each strand of corn silk leads to one kernel. A cob has about 800 kernels, always an even number." },
  { item: "sunflower", name: "Sunflower", fact: "Young sunflowers turn to follow the sun across the sky. Their seeds are a favorite snack for birds." },
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
  {
    // Version 3: the old 8-4, The Harvest Festival, became Festival Day (8-5
    // to 8-7), and 8-4 is free for a new quest. Finishing the old one already
    // finished chapter 8 (see version 2). The golden crown left the shop and
    // became the festival's gift, so a bought one is paid back.
    version: 3,
    run(saved) {
      if (saved.stars) delete saved.stars["8-4"];
      if (saved.best) delete saved.best["8-4"];
      if (Array.isArray(saved.owned) && saved.owned.includes("gold_crown")) {
        saved.owned = saved.owned.filter((id) => id !== "gold_crown");
        saved.refund = { carrot: 15, wheat: 30 };
        if (saved.hat === "gold_crown") saved.hat = "crown_8";
      }
      // They finished the festival before there was a scene, so they've seen it.
      if ((saved.finished ?? []).includes(8)) saved.festivalSeen = true;
    },
  },
  {
    // Version 4 makes room for new core quests (Pip's Pumpkin Patch, Mushroom
    // in the Fog, Thirsty Corn) by giving the bonus quests after them new IDs.
    version: 4,
    run(saved) {
      const moved = { "4-5": "4-6", "5-6": "5-7", "6-5": "6-6" };
      for (const key of ["stars", "best"]) {
        const old = saved[key] ?? {};
        const out = {};
        for (const [id, n] of Object.entries(old)) out[moved[id] ?? id] = n;
        saved[key] = out;
      }
    },
  },
];

export const SAVE_VERSION = MIGRATIONS.reduce((v, m) => Math.max(v, m.version), 1);

// finished: chapters the player has finished. Once finished, a chapter stays
// finished, even if a new quest is added to it later.
// harvested: everything ever harvested, for the season's total at the festival.
// contracts: contracts finished on the contract board (each gives a ribbon).
// festivalSeen: the festival scene has played once.
// refund: produce to give back to the barn once (see version 3).
export function newProgress() {
  return {
    version: SAVE_VERSION, stars: {}, best: {}, owned: [STARTING_HAT], hat: STARTING_HAT,
    almanac: [], practice: false, finished: [], harvested: {}, festivalSeen: false, refund: null, contracts: [],
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
  // Crowns come from finished chapters (below), not from the save.
  if (p.owned.includes(saved.hat) && HAT_NAMES[saved.hat]) p.hat = saved.hat;
  if (Array.isArray(saved.almanac)) {
    p.almanac = ALMANAC.map((a) => a.item).filter((item) => saved.almanac.includes(item));
  }
  p.practice = saved.practice === true;
  if (Array.isArray(saved.finished)) {
    p.finished = CHAPTERS.map((ch) => ch.n).filter((n) => saved.finished.includes(n));
  }
  for (const [item, n] of Object.entries(saved.harvested ?? {})) {
    if (ITEMS.includes(item) && Number.isFinite(n) && n > 0) p.harvested[item] = n;
  }
  p.festivalSeen = saved.festivalSeen === true;
  if (Array.isArray(saved.contracts)) p.contracts = CONTRACTS.map((c) => c.id).filter((id) => saved.contracts.includes(id));
  if (saved.refund && typeof saved.refund === "object") p.refund = saved.refund;
  noteFinished(p);
  if (p.owned.includes(saved.hat) && HAT_NAMES[saved.hat]) p.hat = saved.hat;
  return p;
}

// Hand over a crown for every finished chapter.
function giveCrowns(p) {
  for (const crown of CROWNS) {
    if (p.finished.includes(crown.chapter) && !p.owned.includes(crown.id)) p.owned.push(crown.id);
  }
}

export function crownsOwned(p) {
  return CROWNS.filter((c) => p.owned.includes(c.id));
}

// Remember every chapter whose core quests all have a star.
function noteFinished(p) {
  for (const ch of CHAPTERS) {
    if (!p.finished.includes(ch.n) && ch.quests.every((q) => q.bonus || p.stars[q.id] >= 1)) {
      p.finished.push(ch.n);
    }
  }
  p.finished.sort((a, b) => a - b);
  giveCrowns(p);
}

// ---- Stars and chapters ----

// Stars from chapter quests. Golden quests give golden stars instead, which
// don't count toward opening chapters.
export function totalStars(p) {
  return Object.entries(p.stars).reduce((sum, [id, n]) => sum + (findQuest(id)?.golden ? 0 : n), 0);
}

export function goldenStars(p) {
  return GOLDEN.filter((q) => p.stars[q.id] >= 1).length;
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
  // Golden quests are all open once the festival is over.
  if (quest.golden) return true;
  const list = CHAPTERS[quest.chapter - 1].quests;
  const i = list.findIndex((q) => q.id === id);
  // A quest that already has stars stays open, even if a new quest is added
  // before it, and so does every quest in a chapter the player has finished.
  return i === 0 || p.stars[id] >= 1 || p.stars[list[i - 1].id] >= 1 || isChapterDone(p, quest.chapter);
}

// What to play next, and why: { id, why } for a quest or { contract, why }
// for a contract, or null when everything is done. Before the festival it's
// the first open quest not yet finished (bonus quests last), then the first
// open one without 3 stars. After the festival it never sends the player back
// to the start: a new quest, then a bonus quest not tried yet, then a
// contract on the board, then a golden quest, then the quest with the
// fewest stars.
export function nextStep(p) {
  const all = QUESTS.filter((q) => isQuestOpen(p, q.id));
  const open = all.filter((q) => !q.golden);
  if (!isChapterDone(p, CHAPTERS.length)) {
    const q = open.find((x) => !p.stars[x.id] && !x.bonus) ?? open.find((x) => !p.stars[x.id])
      ?? open.find((x) => p.stars[x.id] < 3);
    return q ? { id: q.id, why: null } : null;
  }
  const fresh = open.find((q) => !p.stars[q.id] && !q.bonus);
  if (fresh) return { id: fresh.id, why: `${fresh.title} is a new quest from ${fresh.who}!` };
  const bonus = open.find((q) => !p.stars[q.id]);
  if (bonus) return { id: bonus.id, why: `${bonus.title} is a bonus quest you haven't tried yet.` };
  const [contract] = contractBoard(p);
  if (contract) return { contract: contract.id, why: `${contract.who} has an order on the contract board: ${contractText(contract)}.` };
  const golden = all.find((q) => q.golden && !p.stars[q.id]);
  if (golden) return { id: golden.id, why: `${golden.title} is a golden quest: chapter ${golden.from}'s idea on new fields.` };
  let fewest = null;
  for (const q of all) if (p.stars[q.id] < 3 && (!fewest || p.stars[q.id] < p.stars[fewest.id])) fewest = q;
  if (!fewest) return null;
  const n = p.stars[fewest.id];
  return { id: fewest.id, why: `${fewest.title} has ${n} ${n === 1 ? "star" : "stars"}. Can you get 3?` };
}

export function nextQuest(p) {
  return nextStep(p)?.id ?? null;
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
    jackOLantern: p.owned.includes("jack_o_lantern"),
    dinnerBell: p.owned.includes("dinner_bell"),
  };
}

// ---- Shop ----

export function isForSale(p, item) {
  if (p.practice) return true;
  if (item.contract) return p.contracts.includes(item.contract);
  return isChapterDone(p, item.after);
}

// Why an item isn't for sale yet, for the shop.
export function saleLockText(item) {
  if (item.contract) {
    const c = findContract(item.contract);
    return `🔒 A thank-you from ${c.who}'s contract`;
  }
  return `🔒 After chapter ${item.after}`;
}

// ---- The contract board ----

export function contractText(c) {
  const items = Object.entries(c.order).map(([item, n]) => plural(n, item));
  const list = items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0];
  const extra = c.dinner ? ", and visit Daisy at the barn at least every 20 ticks" : "";
  return `${list} in ${c.ticks} ticks${extra}`;
}

// The contracts on the board now: the first 3 not done yet that the player
// can take on. Empty before the festival.
export function contractBoard(p) {
  if (!isChapterDone(p, CHAPTERS.length)) return [];
  return CONTRACTS.filter((c) => !p.contracts.includes(c.id) && (c.needs ?? []).every((id) => p.owned.includes(id)))
    .slice(0, 3);
}

// Judge a home farm run against a contract. run: { status, ticks }, gained:
// { item: n } (net), end: the farm at the end.
// Returns { met, problems }.
export function checkContract(c, run, gained, end) {
  const problems = [];
  if (run.status !== "ok" && run.status !== "out_of_ticks") return { met: false, problems };
  for (const [item, n] of Object.entries(c.order)) {
    const got = gained[item] ?? 0;
    if (got < n) problems.push(`You harvested ${plural(got, item)}. ${c.who} ordered ${n}.`);
  }
  if (run.ticks > c.ticks) problems.push(`That took ${run.ticks} ticks. The order has to be ready in ${c.ticks}.`);
  const missed = end.dinner?.missed ?? 0;
  if (c.dinner && missed > 0) {
    problems.push(`Daisy missed ${missed === 1 ? "a meal" : `${missed} meals`}. Visit her at the barn at least every 20 ticks.`);
  }
  return { met: problems.length === 0, problems };
}

// Save a finished contract. Returns the reward lines to show.
export function recordContract(p, id) {
  const c = findContract(id);
  if (!c || p.contracts.includes(id)) return [];
  p.contracts.push(id);
  const lines = [`${c.who} gave Bolt a ribbon! That's ${p.contracts.length} of ${CONTRACTS.length}.`];
  const reward = shopItem(c.reward);
  if (reward) lines.push(`New in the shop: ${reward.name}.`);
  return lines;
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
  if (!isForSale(p, item)) return item.contract ? `The ${item.name.toLowerCase()} is a contract reward.` : `The ${item.name.toLowerCase()} is for sale after chapter ${item.after}.`;
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
  p.harvested ??= {};
  for (const [item, n] of Object.entries(gained)) p.harvested[item] = (p.harvested[item] ?? 0) + n;
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
  for (const n of added("done")) {
    lines.push(`You earned the ${CHAPTERS[n - 1].badge}!`);
    const crown = crownFor(n);
    if (crown && n !== CHAPTERS.length) lines.push(`A gift: the ${crown.name}! Bolt can wear it. Find it on the shelf.`);
    if (crown && n === CHAPTERS.length) lines.push(`Aunt Juniper gave Bolt the ${crown.name}, the last of the 8 golden crowns!`);
  }
  for (const n of added("chapters")) lines.push(`Chapter ${n}, ${CHAPTERS[n - 1].title}, is open!`);
  const words = added("words").filter((w) => WORDS[w].chapter !== AFTER_FESTIVAL);
  if (words.length) lines.push(`Bolt learned: ${words.map((w) => WORDS[w].label).join(", ")}.`);
  if (added("words").includes("advanced")) lines.push("Every kind of Python is open now. Bolt knows it all!");
  for (const itemId of added("shop")) lines.push(`New in the shop: ${shopItem(itemId).name}.`);
  for (const title of added("titles")) lines.push(`New title: ${title}!`);
  return { better, newBest, lines };
}
