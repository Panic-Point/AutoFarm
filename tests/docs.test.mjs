// docs/chapters.md and docs/solutions.md are built from the game's data and
// tests/solutions.mjs by scripts/build-docs.mjs. These tests fail when they're
// out of date: run `npm run docs` and commit the result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CHAPTERS, QUESTS } from "../js/chapters.js";
import { WORDS } from "../js/words.js";
import { DOCS, buildChapters, buildSolutions } from "../scripts/build-docs.mjs";
import { CHAPTER_CONCEPTS, CHAPTER_NOTES, SOLUTION_NOTES, WORD_NOTES } from "../scripts/docs-notes.mjs";

const STALE = "is out of date: run `npm run docs` and commit the result";

test("docs/chapters.md is up to date", async () => {
  assert.equal(await readFile(DOCS.chapters, "utf8"), buildChapters(), `docs/chapters.md ${STALE}`);
});

test("docs/solutions.md is up to date", async () => {
  assert.equal(await readFile(DOCS.solutions, "utf8"), buildSolutions(), `docs/solutions.md ${STALE}`);
});

test("every chapter, coding word and quest has a note, and no note is left over", () => {
  const chapters = CHAPTERS.map((ch) => String(ch.n)).sort();
  assert.deepEqual(Object.keys(CHAPTER_CONCEPTS).sort(), chapters);
  assert.deepEqual(Object.keys(CHAPTER_NOTES).sort(), chapters);
  assert.deepEqual(Object.keys(WORD_NOTES).sort(), Object.keys(WORDS).sort());
  assert.deepEqual(Object.keys(SOLUTION_NOTES).sort(), QUESTS.map((q) => q.id).sort());
});
