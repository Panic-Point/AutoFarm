import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../js/chapters.js";
import { emptyInventory } from "../js/game.js";
import {
  buy, fieldSize, isChapterOpen, isQuestOpen, loadProgress, locked, newProgress, nextQuest,
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
