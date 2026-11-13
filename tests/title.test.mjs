import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../js/chapters.js";
import { newProgress, recordResult } from "../js/progress.js";
import { continueText, hasSave, replayChapters, replayNext } from "../js/title.js";

function finishChapter(p, n) {
  for (const q of CHAPTERS[n - 1].quests) if (!q.bonus) recordResult(p, q.id, 1, 1);
}

test("a new player has no save, so New game doesn't need to ask", () => {
  const p = newProgress();
  assert.equal(hasSave(p, {}), false);
  assert.equal(hasSave(p, { hay: 0 }), false);
});

test("stars, ribbons, shop items or a full barn all count as a save", () => {
  const starred = newProgress();
  recordResult(starred, "1-1", 1, 5);
  assert.ok(hasSave(starred, {}));
  const ribbon = newProgress();
  ribbon.contracts.push("c-1");
  assert.ok(hasSave(ribbon, {}));
  const shopper = newProgress();
  shopper.owned.push("red_cap");
  assert.ok(hasSave(shopper, {}));
  assert.ok(hasSave(newProgress(), { hay: 3 }));
});

test("Continue says where the player was", () => {
  const first = CHAPTERS[0].quests[0];
  assert.equal(continueText({ quest: first.id }), `Chapter 1 · Quest ${first.id}: ${first.title}`);
  assert.equal(continueText({ quest: first.id, replay: 1 }), `Replaying chapter 1 · Quest ${first.id}: ${first.title}`);
  assert.equal(continueText({ quest: null }), "Your home farm");
  assert.equal(continueText(null), "Your home farm");
  const festival = CHAPTERS[7].quests.find((q) => q.festival);
  assert.match(continueText({ quest: festival.id }), /^Festival Day · /);
});

test("only finished chapters can be replayed", () => {
  const p = newProgress();
  assert.deepEqual(replayChapters(p), []);
  finishChapter(p, 1);
  assert.deepEqual(replayChapters(p).map((ch) => ch.n), [1]);
  finishChapter(p, 2);
  assert.deepEqual(replayChapters(p).map((ch) => ch.n), [1, 2]);
});

test("replaying walks through every quest in the chapter, bonus ones too, then stops", () => {
  for (const ch of CHAPTERS) {
    const ids = ch.quests.map((q) => q.id);
    const walked = [ids[0]];
    for (let id = replayNext(ch.n, ids[0]); id; id = replayNext(ch.n, id)) walked.push(id);
    assert.deepEqual(walked, ids, `chapter ${ch.n}`);
  }
  assert.equal(replayNext(1, "2-1"), null);
  assert.equal(replayNext(99, "1-1"), null);
});
