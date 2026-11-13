import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTRACTS } from "../js/postgame.js";
import { CHAPTERS, QUESTS } from "../js/chapters.js";
import { emptyInventory } from "../js/game.js";
import {
  CROWNS, MIGRATIONS, checkContract, contractBoard, contractText, goldenStars, recordContract, SAVE_VERSION, SHOP, buy, crownsOwned, fieldSize, isChapterDone, isChapterOpen, isQuestOpen, loadProgress, locked, migrate, newProgress, nextQuest, nextStep, wear,
  noteHarvest, recordResult, seeds, titles, totalStars,
} from "../js/progress.js";

// Finish a chapter's core quests (bonus quests aren't needed).
function finishChapter(p, n, stars = 3) {
  for (const q of CHAPTERS[n - 1].quests) if (!q.bonus) recordResult(p, q.id, stars, 1);
}

test("a new player starts on the first quest with only move and harvest", () => {
  const p = newProgress();
  assert.equal(nextQuest(p), "1-1");
  assert.ok(isQuestOpen(p, "1-1"));
  assert.ok(!isQuestOpen(p, "1-2"));
  assert.ok(!isChapterOpen(p, 2));
  const words = locked(p);
  assert.ok(!("move" in words) && !("harvest" in words));
  assert.equal(words.repeat, "Bolt doesn't know repeat yet. You'll learn it in chapter 2!");
  assert.match(words.advanced, /after the Harvest Festival/);
});

test("quests open one after another", () => {
  const p = newProgress();
  recordResult(p, "1-1", 1, 5);
  assert.ok(isQuestOpen(p, "1-2"));
  assert.equal(nextQuest(p), "1-2");
});

test("a chapter needs the last one finished and enough stars", () => {
  const p = newProgress();
  finishChapter(p, 1, 1);
  assert.equal(totalStars(p), 5);
  assert.ok(!isChapterOpen(p, 2), "5 stars is one short");
  const r = recordResult(p, "1-1", 3, 1);
  assert.ok(isChapterOpen(p, 2));
  assert.ok(r.lines.includes("Chapter 2, Do It Again, is open!"));
  assert.ok(r.lines.some((l) => l.startsWith("Bolt learned: till, plant, wait, repeat")));
  assert.ok(!("repeat" in locked(p)));
});

test("better results are kept, worse ones never take progress away", () => {
  const p = newProgress();
  assert.equal(recordResult(p, "1-1", 2, 3).better, true);
  assert.equal(recordResult(p, "1-1", 1, 9).better, false);
  assert.equal(p.stars["1-1"], 2);
  assert.equal(p.best["1-1"], 3);
  recordResult(p, "1-1", 0, 0); // a failed run
  assert.equal(p.best["1-1"], 3);
});

test("finishing a chapter gives a badge and puts items in the shop", () => {
  const p = newProgress();
  finishChapter(p, 1);
  finishChapter(p, 2);
  const barn = emptyInventory({ hay: 20 });
  assert.match(buy(p, barn, "carrot_seeds"), /after chapter 3/);
  assert.equal(buy(p, barn, "field_5"), null);
  assert.equal(barn.hay, 5);
  assert.equal(fieldSize(p), 5);
  assert.match(buy(p, barn, "field_5"), /already have/);
  assert.equal(buy(p, barn, "wheat_seeds"), null);
  assert.deepEqual(seeds(p), ["grass", "wheat"]);
  assert.match(buy(p, barn, "wheat_seeds"), /already/);
});

test("finishing the festival opens all of Python and the Master Farmer title", () => {
  const p = newProgress();
  for (const q of QUESTS) recordResult(p, q.id, 3, 1);
  assert.deepEqual(locked(p), {});
  assert.deepEqual(titles(p), ["Farm Helper", "Star Farmer", "Master Farmer"]);
  assert.equal(nextQuest(p), null);
});

test("practice mode opens everything", () => {
  const p = newProgress();
  p.practice = true;
  assert.ok(isQuestOpen(p, "8-7"));
  assert.deepEqual(locked(p), {});
});

test("the almanac fills in on a crop's first harvest", () => {
  const p = newProgress();
  assert.deepEqual(noteHarvest(p, { hay: 2 }).map((a) => a.item), ["hay"]);
  assert.deepEqual(noteHarvest(p, { hay: 2 }), []);
});

test("damaged saved progress keeps what's valid", () => {
  const p = loadProgress({
    stars: { "1-1": 3, "9-9": 3, "1-2": 7 },
    owned: ["field_5", "rocket"],
    hat: "rocket",
    almanac: ["wheat", "gold"],
  });
  assert.deepEqual(p.stars, { "1-1": 3 });
  assert.deepEqual(p.owned, ["straw_hat", "field_5"]);
  assert.equal(p.hat, "straw_hat");
  assert.deepEqual(p.almanac, ["wheat"]);
  assert.deepEqual(loadProgress(null), newProgress());
});

test("bonus quests give stars but aren't needed to finish a chapter", () => {
  const p = newProgress();
  for (const ch of CHAPTERS.slice(0, 3)) {
    for (const q of ch.quests) if (!q.bonus) recordResult(p, q.id, 3, 1);
  }
  assert.ok(isChapterDone(p, 3));
  assert.ok(isQuestOpen(p, "3-5"));
  // The next real quest comes before the bonus quest.
  assert.equal(nextQuest(p), "4-1");
  recordResult(p, "3-5", 2, 30);
  assert.equal(p.stars["3-5"], 2);
});

test("the new seeds are sold after the chapter that fits them", () => {
  const p = newProgress();
  const barn = emptyInventory({ hay: 50, wheat: 50, carrot: 50 });
  for (const n of [1, 2]) finishChapter(p, n);
  assert.match(buy(p, barn, "strawberry_seeds"), /after chapter 3/);
  finishChapter(p, 3);
  assert.equal(buy(p, barn, "strawberry_seeds"), null);
  assert.match(buy(p, barn, "lettuce_seeds"), /after chapter 4/);
  finishChapter(p, 4);
  assert.equal(buy(p, barn, "lettuce_seeds"), null);
  finishChapter(p, 5);
  assert.equal(buy(p, barn, "blueberry_seeds"), null);
  assert.deepEqual(seeds(p), ["grass", "strawberry", "lettuce", "blueberry"]);
  assert.deepEqual(noteHarvest(p, { strawberry: 3 }).map((a) => a.item), ["strawberry"]);
});

test("old saves remember which chapters were finished", () => {
  const stars = {};
  for (const id of ["1-1", "1-2", "1-3", "1-4", "1-5", "2-1"]) stars[id] = 3;
  const p = loadProgress({ stars });
  assert.equal(p.version, SAVE_VERSION);
  assert.deepEqual(p.finished, [1]);
});

test("a finished chapter stays finished and open when a quest is added to it", () => {
  const p = newProgress();
  finishChapter(p, 1);
  finishChapter(p, 2);
  assert.deepEqual(p.finished, [1, 2]);
  // Pretend chapter 2 got a new core quest the player hasn't played.
  delete p.stars["2-5"];
  const again = loadProgress(JSON.parse(JSON.stringify(p)));
  assert.ok(isChapterDone(again, 2));
  assert.ok(isChapterOpen(again, 3));
  assert.ok(isQuestOpen(again, "2-5"));
});

test("a chapter the player has played in stays open if its star gate goes up", () => {
  const p = newProgress();
  finishChapter(p, 1, 1);
  recordResult(p, "1-1", 3, 1);
  recordResult(p, "2-1", 1, 1);
  p.stars["1-1"] = 1; // fewer stars than chapter 2 needs now
  assert.ok(isChapterOpen(p, 2));
  assert.ok(!isChapterOpen(p, 3));
});

test("migrations run once, in order, on older saves only", () => {
  const p = migrate({ version: SAVE_VERSION, stars: { "1-1": 3 }, finished: [5] });
  assert.deepEqual(p.finished, [5], "a current save is left alone");
  assert.ok(MIGRATIONS.every((m, i) => i === 0 || m.version > MIGRATIONS[i - 1].version));
});

test("each finished chapter gives a golden crown Bolt can wear", () => {
  const p = newProgress();
  const r = finishChapterResult(p, 1);
  assert.ok(r.lines.includes("A gift: the Hay Crown! Bolt can wear it. Find it on the shelf."));
  assert.deepEqual(crownsOwned(p).map((c) => c.id), ["crown_1"]);
  wear(p, "crown_1");
  assert.equal(p.hat, "crown_1");
  wear(p, "crown_5");
  assert.equal(p.hat, "crown_1", "a crown not earned yet can't be worn");
  assert.equal(CROWNS.length, 8);
  assert.ok(!SHOP.some((item) => item.id === "gold_crown"), "the crown isn't sold any more");
});

test("finishing Festival Day gives the eighth crown", () => {
  const p = newProgress();
  for (const ch of CHAPTERS) finishChapter(p, ch.n);
  assert.equal(crownsOwned(p).length, 8);
  assert.ok(isChapterDone(p, 8));
});

test("an old save that finished the old 8-4 keeps the festival and its crown", () => {
  const stars = {};
  for (const ch of CHAPTERS.slice(0, 7)) for (const q of ch.quests) stars[q.id] = 2;
  for (const id of ["8-1", "8-2", "8-3", "8-4"]) stars[id] = 3;
  const p = loadProgress({ stars, best: { "8-4": 49 }, owned: ["straw_hat", "gold_crown"], hat: "gold_crown" });
  assert.equal(p.stars["8-4"], undefined);
  assert.equal(p.best["8-4"], undefined);
  assert.ok(isChapterDone(p, 8));
  assert.ok(p.festivalSeen);
  assert.equal(p.hat, "crown_8");
  assert.deepEqual(p.refund, { carrot: 15, wheat: 30 });
  assert.ok(isQuestOpen(p, "8-5"));
  assert.ok(isQuestOpen(p, "8-4"), "the new Mayor's Order is open too");
});

test("after the festival, what's next never sends the player back to 1-1", () => {
  const p = newProgress();
  for (const q of QUESTS) recordResult(p, q.id, 3, 1);
  p.contracts = CONTRACTS.map((c) => c.id);
  p.stars["4-2"] = 1;
  p.stars["6-1"] = 2;
  assert.deepEqual(nextStep(p), { id: "4-2", why: "Pip's Garden has 1 star. Can you get 3?" });
  delete p.stars["G-2"];
  assert.deepEqual(nextStep(p), { id: "G-2", why: "Golden Lunch is a golden quest: chapter 2's idea on new fields." });
  p.contracts = [];
  assert.deepEqual(nextStep(p), { contract: "c-1", why: "Daisy has an order on the contract board: 20 hay in 60 ticks." });
  delete p.stars["3-5"];
  assert.deepEqual(nextStep(p), { id: "3-5", why: "Berry Friends is a bonus quest you haven't tried yet." });
});

test("golden quests open after the festival and give golden stars, not chapter stars", () => {
  const p = newProgress();
  for (const ch of CHAPTERS) for (const q of ch.quests) if (!q.bonus) recordResult(p, q.id, 1, 1);
  assert.ok(isQuestOpen(p, "G-3"));
  const before = totalStars(p);
  recordResult(p, "G-1", 3, 1);
  assert.equal(totalStars(p), before);
  assert.equal(goldenStars(p), 1);
  assert.ok(!isQuestOpen(newProgress(), "G-1"));
});

test("the contract board shows 3 orders at a time and opens rewards in the shop", () => {
  const p = newProgress();
  assert.deepEqual(contractBoard(p), [], "nothing before the festival");
  for (const ch of CHAPTERS) for (const q of ch.quests) if (!q.bonus) recordResult(p, q.id, 1, 1);
  assert.deepEqual(contractBoard(p).map((c) => c.id), ["c-1", "c-2", "c-3"]);
  assert.match(buy(p, emptyInventory({ hay: 99 }), "blue_cap"), /contract reward/);
  const lines = recordContract(p, "c-1");
  assert.deepEqual(lines, ["Daisy gave Bolt a ribbon! That's 1 of 12.", "New in the shop: Blue cap."]);
  assert.deepEqual(contractBoard(p).map((c) => c.id), ["c-2", "c-3", "c-4"]);
  assert.equal(buy(p, emptyInventory({ hay: 99 }), "blue_cap"), null);
  // The bees order waits until the hive is bought.
  p.contracts = ["c-1", "c-2", "c-3", "c-4", "c-5", "c-6", "c-7"];
  assert.deepEqual(contractBoard(p).map((c) => c.id), ["c-9", "c-10", "c-11"]);
  p.owned.push("bee_hive");
  assert.deepEqual(contractBoard(p).map((c) => c.id), ["c-8", "c-9", "c-10"]);
  assert.deepEqual(loadProgress(JSON.parse(JSON.stringify(p))).contracts, p.contracts);
});

test("a contract checks the order, the tick budget and Daisy's dinner", () => {
  const c1 = CONTRACTS[0];
  assert.deepEqual(checkContract(c1, { status: "ok", ticks: 50 }, { hay: 21 }, {}), { met: true, problems: [] });
  assert.deepEqual(checkContract(c1, { status: "out_of_ticks", ticks: 60 }, { hay: 12 }, {}).problems,
    ["You harvested 12 hay. Daisy ordered 20."]);
  const dinner = CONTRACTS.find((c) => c.dinner);
  assert.equal(contractText(dinner), "15 hay and 10 wheat in 200 ticks, and visit Daisy at the barn at least every 20 ticks");
  const r = checkContract(dinner, { status: "ok", ticks: 100 }, { hay: 15, wheat: 10 }, { dinner: { missed: 2 } });
  assert.deepEqual(r.problems, ["Daisy missed 2 meals. Visit her at the barn at least every 20 ticks."]);
});

test("the harvest is counted for the festival", () => {
  const p = newProgress();
  noteHarvest(p, { hay: 2, wheat: 1 });
  noteHarvest(p, { hay: 3 });
  assert.deepEqual(p.harvested, { hay: 5, wheat: 1 });
  assert.deepEqual(loadProgress(JSON.parse(JSON.stringify(p))).harvested, { hay: 5, wheat: 1 });
});

// Finish a chapter's core quests, and gather every reward line on the way.
function finishChapterResult(p, n) {
  const lines = [];
  for (const q of CHAPTERS[n - 1].quests) if (!q.bonus) lines.push(...recordResult(p, q.id, 3, 1).lines);
  return { lines };
}
test("bonus quests moved to new IDs keep their stars, and nothing re-locks", () => {
  // A save from before the new quests: chapters 1 to 6 done, with the old
  // bonus quests 4-5 (Crunchy Lettuce), 5-6 and 6-5.
  const stars = {};
  const old = [
    "1-1", "1-2", "1-3", "1-4", "1-5", "2-1", "2-2", "2-3", "2-4", "2-5", "3-1", "3-2", "3-3", "3-4", "3-5",
    "4-1", "4-2", "4-3", "4-4", "4-5", "5-1", "5-2", "5-3", "5-4", "5-5", "5-6", "6-1", "6-2", "6-3", "6-4", "6-5",
  ];
  for (const id of old) stars[id] = 2;
  stars["4-5"] = 3;
  const p = loadProgress({ stars, best: { "4-5": 20, "5-6": 30 } });
  assert.equal(p.stars["4-6"], 3, "Crunchy Lettuce keeps its stars");
  assert.equal(p.stars["5-7"], 2);
  assert.equal(p.stars["6-6"], 2);
  assert.equal(p.best["4-6"], 20);
  assert.equal(p.best["5-7"], 30);
  for (const id of ["4-5", "5-6", "6-5"]) assert.equal(p.stars[id], undefined, `new quest ${id} starts empty`);
  assert.deepEqual(p.finished, [1, 2, 3, 4, 5, 6]);
  for (let n = 1; n <= 7; n++) assert.ok(isChapterOpen(p, n), `chapter ${n} stays open`);
  assert.ok(isQuestOpen(p, "4-5") && isQuestOpen(p, "4-6"));
  // A save from version 2 is moved too, and a current one is left alone.
  assert.equal(loadProgress({ version: 2, stars: { "6-5": 3 } }).stars["6-6"], 3);
  assert.equal(loadProgress({ version: SAVE_VERSION, stars: { "6-5": 3 } }).stars["6-5"], 3);
});
