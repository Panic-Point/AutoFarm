import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, QUESTS } from "../js/chapters.js";
import { CONCEPTS } from "../js/concepts.js";
import { newFarmState } from "../js/game.js";
import { questField } from "../js/quests.js";
import { findQuest } from "../js/chapters.js";
import { WORDS } from "../js/words.js";
import { newProgress, noteHarvest, recordResult } from "../js/progress.js";
import { insertWord, screenParts, shownItems, tapWords } from "../js/simple.js";

function finishChapter(p, n) {
  for (const q of CHAPTERS[n - 1].quests) if (!q.bonus) recordResult(p, q.id, 3, 1);
}

test("a new player sees only the crops on the field", () => {
  const p = newProgress();
  const field = questField(findQuest("1-1"));
  assert.deepEqual(shownItems(p, { inventories: [field.inventory], field }), ["hay"]);
  assert.deepEqual(shownItems(p, { inventories: [newFarmState(3).inventory] }), []);
});

test("harvested crops and crops in the barn stay shown", () => {
  const p = newProgress();
  noteHarvest(p, { wheat: 2 });
  const barn = newFarmState(3).inventory;
  barn.carrot = 1;
  assert.deepEqual(shownItems(p, { inventories: [barn] }), ["wheat", "carrot"]);
});

test("a new player sees no map, shop, shelf or window tools", () => {
  const p = newProgress();
  assert.deepEqual(screenParts(p), { map: false, shop: false, shelf: false, windows: false });
});

test("buttons show up as they get something in them", () => {
  const p = newProgress();
  recordResult(p, "1-1", 1, 5);
  assert.equal(screenParts(p).map, true);
  noteHarvest(p, { hay: 1 });
  assert.equal(screenParts(p).shelf, true, "the first almanac page goes on the shelf");
  assert.equal(screenParts(p).shop, false);
  finishChapter(p, 1);
  assert.equal(screenParts(p).shop, true, "wheat seeds are for sale after chapter 1");
});

test("window tools open with the chapter that teaches define, and in practice mode", () => {
  const p = newProgress();
  for (let n = 1; n < WORDS.define.chapter; n++) finishChapter(p, n);
  assert.equal(screenParts(p).windows, true);
  const q = newProgress();
  for (let n = 1; n < WORDS.define.chapter - 1; n++) finishChapter(q, n);
  assert.equal(screenParts(q).windows, false);
  q.practice = true;
  assert.deepEqual(screenParts(q), { map: true, shop: true, shelf: true, windows: true });
});

test("tap words start with harvest and grow with the quests", () => {
  assert.deepEqual(tapWords("1-1").map((w) => w.text), ["harvest()"]);
  const later = tapWords("1-2").map((w) => w.text);
  assert.ok(later.includes("move(EAST)") && later.includes("harvest()"));
  assert.ok(!later.includes("repeat 5 times:"));
  assert.ok(tapWords("2-1").some((w) => w.text === "repeat 5 times:"));
  assert.ok(tapWords("2-4").some((w) => w.text === "plant(WHEAT)"));
  // is_ripe() gets its button at the quest that teaches it (3-2 since the
  // chapter reorder), and not the quest before.
  const ripe = CONCEPTS.find((c) => c.id === "is_ripe").learned;
  assert.equal(ripe, "3-2");
  const hasRipe = (id) => tapWords(id).some((w) => w.text === "is_ripe()" && w.inline);
  assert.ok(hasRipe(ripe));
  assert.ok(!hasRipe(QUESTS[QUESTS.findIndex((q) => q.id === ripe) - 1].id));
  assert.deepEqual(tapWords("no-such-quest"), []);
});

test("every tap word list is short and has no repeats", () => {
  for (const ch of CHAPTERS) {
    for (const q of ch.quests) {
      const texts = tapWords(q.id).map((w) => w.text);
      assert.equal(new Set(texts).size, texts.length, q.id);
      assert.ok(texts.length <= 12, `${q.id} has ${texts.length} words`);
    }
  }
});

test("a line word goes on its own line, with the right indent", () => {
  const harvest = { text: "harvest()", inline: false };
  assert.deepEqual(insertWord("", 0, harvest), { code: "harvest()", at: 9 });
  assert.deepEqual(insertWord("move(EAST)", 4, harvest), { code: "move(EAST)\nharvest()", at: 20 });
  const code = "repeat 3 times:\n    move(EAST)";
  assert.equal(insertWord(code, code.length, harvest).code, "repeat 3 times:\n    move(EAST)\n    harvest()");
  assert.equal(insertWord("repeat 3 times:", 3, harvest).code, "repeat 3 times:\n    harvest()");
  assert.equal(insertWord("move(EAST)\n    \nwait()", 15, harvest).code, "move(EAST)\n    harvest()\nwait()");
});

test("a word ending in a colon starts its block", () => {
  const out = insertWord("move(EAST)", 10, { text: "repeat 5 times:", inline: false });
  assert.equal(out.code, "move(EAST)\nrepeat 5 times:\n    ");
  assert.equal(out.at, out.code.length);
});

test("an inline word goes right at the cursor", () => {
  assert.deepEqual(insertWord("if :", 3, { text: "is_ripe()", inline: true }), { code: "if is_ripe():", at: 12 });
});
