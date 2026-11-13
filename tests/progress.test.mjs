import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../js/chapters.js";
import { emptyInventory } from "../js/game.js";
import {
  MIGRATIONS, SAVE_VERSION, buy, fieldSize, isChapterDone, isChapterOpen, isQuestOpen, loadProgress, locked, migrate, newProgress, nextQuest,
  noteHarvest, recordResult, seeds, titles, totalStars,
} from "../js/progress.js";

function finishChapter(p, n, stars = 3) {
  for (const q of CHAPTERS[n - 1].quests) recordResult(p, q.id, stars, 1);
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
  for (const ch of CHAPTERS) finishChapter(p, ch.n);
  assert.deepEqual(locked(p), {});
  assert.deepEqual(titles(p), ["Farm Helper", "Star Farmer", "Master Farmer"]);
  assert.equal(nextQuest(p), null);
});

test("practice mode opens everything", () => {
  const p = newProgress();
  p.practice = true;
  assert.ok(isQuestOpen(p, "8-4"));
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
