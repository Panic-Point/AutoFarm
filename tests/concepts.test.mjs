// Checks the concept data (js/concepts.js): every entry is well formed, every
// example runs with only the words open in its chapter, in plain words and in
// Python, and no example solves the quest it comes before.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findQuest } from "../js/chapters.js";
import { FarmBridge, PY_FILES } from "../js/bridge.js";
import { CONCEPTS, GROUPS, conceptChapter, exampleData, exampleField, lessonsFor, richText } from "../js/concepts.js";
import { judgeQuest, plotData, questField, questPlots, tickLimit } from "../js/quests.js";
import { WORDS, lockedWords } from "../js/words.js";
import { isConceptOpen, loadProgress, markSeen, newProgress, unreadConcepts } from "../js/progress.js";

let api;
const bridge = new FarmBridge(() => {}, 1e9);
const chapterOfQuest = (id) => findQuest(id).chapter;

before(async () => {
  const { loadPyodide } = await import("pyodide");
  const pyodide = await loadPyodide();
  pyodide.registerJsModule("_farm", bridge.module);
  for (const file of PY_FILES) {
    const source = await readFile(new URL(`../py/${file}`, import.meta.url), "utf8");
    pyodide.FS.writeFile(`/home/pyodide/${file}`, source);
  }
  api = pyodide.pyimport("farm_api");
});

function runOn(state, data, code, files, chapter) {
  const locked = lockedWords((n) => n <= chapter);
  bridge.start(state, 200, data);
  const run = bridge.run(api, { code: code.trim() + "\n", files: files ?? {}, name: "main", locked });
  return { run, end: bridge.game.snapshot() };
}

test("concept data is well formed", () => {
  const ids = new Set();
  const groups = new Set(GROUPS.map((g) => g.id));
  for (const c of CONCEPTS) {
    assert.ok(!ids.has(c.id), `duplicate concept ${c.id}`);
    ids.add(c.id);
    assert.ok(groups.has(c.group), `${c.id}: unknown group ${c.group}`);
    for (const key of ["name", "short", "does"]) assert.equal(typeof c[key], "string", `${c.id}: needs ${key}`);
    assert.ok(Array.isArray(c.forms) && c.forms.length, `${c.id}: needs forms`);
    assert.ok(Array.isArray(c.watch) && c.watch.length, `${c.id}: needs things to watch out for`);
    if (c.word) assert.ok(WORDS[c.word], `${c.id}: unknown word ${c.word}`);
    for (const w of c.also ?? []) assert.equal(WORDS[w]?.chapter, WORDS[c.word].chapter, `${c.id}: ${w} opens in another chapter`);
    if (c.learned) {
      assert.ok(findQuest(c.learned), `${c.id}: unknown quest ${c.learned}`);
      // The quest that first needs it must be in a chapter where it's open.
      assert.ok(conceptChapter(c, chapterOfQuest) <= chapterOfQuest(c.learned), `${c.id}: learned before it opens`);
    } else {
      assert.ok(c.word, `${c.id}: needs a word or a quest`);
    }
    if (c.group === "crops") assert.ok(c.crop && c.learned, `${c.id}: crops need an item and a quest`);
    else assert.ok(c.example?.code, `${c.id}: needs an example`);
    for (const text of [c.short, c.does, ...c.watch]) {
      assert.equal(richText(text).map((p) => p.text).join("").includes("`"), false, `${c.id}: unmatched backtick`);
    }
  }
  // Every word Bolt learns has an entry (except "this kind of code" after the festival).
  for (const id of Object.keys(WORDS)) {
    if (id === "advanced") continue;
    assert.ok(CONCEPTS.some((c) => c.word === id || c.also?.includes(id)), `no entry for the word ${id}`);
  }
});

test("rich text splits code and bold", () => {
  assert.deepEqual(richText("Use `till()` **first**."), [
    { text: "Use " }, { text: "till()", code: true }, { text: " " }, { text: "first", bold: true }, { text: "." },
  ]);
});

for (const c of CONCEPTS.filter((x) => x.example)) {
  test(`example for ${c.name} runs in its chapter and doesn't solve ${c.learned ?? "a quest"}`, () => {
    const chapter = c.learned ? chapterOfQuest(c.learned) : conceptChapter(c, chapterOfQuest);
    const forms = [c.example.code, c.example.python].filter(Boolean);
    for (const code of forms) {
      const { run } = runOn(exampleField(c), exampleData(c), code, c.example.files, chapter);
      assert.equal(run.status, "ok", `${c.id}: ${run.message}\n${code}`);
      assert.ok(run.ticks <= 30, `${c.id}: examples should be short (${run.ticks} ticks)`);
      // The quest it comes before is harvest() itself, so that one can't differ.
      if (!c.learned || c.learned === "1-1") continue;
      const quest = findQuest(c.learned);
      const results = [];
      for (let i = 0; i < questPlots(quest).length; i++) {
        const start = questField(quest, i);
        bridge.start(start, tickLimit(quest), plotData(quest, i));
        const r = bridge.run(api, { code: code.trim() + "\n", files: c.example.files ?? {}, name: "main", locked: {} });
        results.push({ start, end: bridge.game.snapshot(), run: r });
      }
      assert.equal(judgeQuest(quest, results).met, false, `${c.id}: the example solves quest ${c.learned}`);
    }
  });
}

test("lessons come before the quests that first need them", () => {
  assert.deepEqual(lessonsFor("2-1").map((c) => c.id), ["repeat"]);
  assert.deepEqual(lessonsFor("2-4").map((c) => c.id), ["till", "plant"]);
  assert.deepEqual(lessonsFor("1-4"), []);
  // Crops have no lesson card.
  assert.ok(lessonsFor("3-5").every((c) => c.group !== "crops"));
});

test("the book only lists what's open", () => {
  const p = newProgress();
  const open = CONCEPTS.filter((c) => isConceptOpen(p, c)).map((c) => c.id);
  assert.ok(open.includes("harvest") && open.includes("move") && open.includes("crop_grass"));
  assert.ok(!open.includes("repeat") && !open.includes("crop_wheat"));
  p.practice = true;
  assert.equal(CONCEPTS.filter((c) => isConceptOpen(p, c)).length, CONCEPTS.length);
  // A crop opens once it's been picked, even before its quest.
  const q = newProgress();
  q.almanac.push("carrot");
  assert.ok(isConceptOpen(q, CONCEPTS.find((c) => c.id === "crop_carrot")));
});

test("read entries are saved", () => {
  const p = newProgress();
  assert.deepEqual(p.seen, []);
  const loaded = loadProgress({ ...p, seen: ["repeat", "nope", "repeat", 5] });
  assert.deepEqual(loaded.seen, ["repeat"]);
});

test("new pages are marked until they're read", () => {
  const p = newProgress();
  const unread = unreadConcepts(p).map((c) => c.id);
  assert.ok(unread.includes("harvest"));
  markSeen(p, "harvest");
  assert.ok(!unreadConcepts(p).some((c) => c.id === "harvest"));
  p.practice = true;
  assert.deepEqual(unreadConcepts(p), []);
});
