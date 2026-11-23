import { test } from "node:test";
import assert from "node:assert/strict";
import { enterQuest, freshMain, isEmptyCode, loadWorkspace, starterWorkspace, windowNameFor } from "../js/files.js";
import {
  deletePiece, findPiece, insertCode, libraryName, loadLibrary, preview, renamePiece, savePiece,
} from "../js/library.js";

const quest = (id, title) => ({ id, title });

test("a new player keeps Bolt's first lines for the first quest", () => {
  const ws = starterWorkspace();
  assert.equal(enterQuest(ws, quest("1-1", "Hello")), null);
  assert.equal(ws.questFor, "1-1");
});

test("the next quest starts with a fresh main window, and the old code is kept", () => {
  const ws = starterWorkspace();
  enterQuest(ws, quest("1-1", "Hello"));
  ws.windows[0].code = "move(NORTH)\n";
  const fresh = enterQuest(ws, quest("1-2", "Up the Hill"));
  assert.equal(fresh, freshMain("Up the Hill"));
  assert.match(fresh, /^# Write Bolt's program for "Up the Hill" here\./);
  assert.ok(isEmptyCode(fresh));
  assert.equal(ws.lastCode["1-1"], "move(NORTH)\n");
  assert.equal(ws.questFor, "1-2");
  // Coming back to the same quest leaves main alone.
  assert.equal(enterQuest(ws, quest("1-2", "Up the Hill")), null);
});

test("an untouched fresh window isn't kept as code from last time", () => {
  const ws = starterWorkspace();
  enterQuest(ws, quest("1-1", "A"));
  ws.windows[0].code = freshMain("A");
  enterQuest(ws, quest("1-2", "B"));
  assert.equal(ws.lastCode["1-1"], undefined);
});

test("saves from before fresh starts keep their code once", () => {
  const ws = loadWorkspace({ windows: [{ name: "main", code: "harvest()" }] });
  assert.equal(ws.questFor, undefined);
  assert.equal(enterQuest(ws, quest("3-2", "Zig")), null);
  assert.notEqual(enterQuest(ws, quest("3-3", "Zag")), null);
});

test("the quest and last code survive saving and loading", () => {
  const ws = loadWorkspace(JSON.parse(JSON.stringify({
    windows: [{ name: "main", code: "a" }], questFor: "2-1", lastCode: { "1-1": "x", bad: 5 },
  })));
  assert.equal(ws.questFor, "2-1");
  assert.deepEqual(ws.lastCode, { "1-1": "x" });
});

test("a quest title makes a free window name", () => {
  assert.equal(windowNameFor("Up the Hill", ["main"]), "up_the_hill");
  assert.equal(windowNameFor("Up the Hill", ["up_the_hill"]), "up_the_hill2");
  assert.equal(windowNameFor("Repeat", []), "my_repeat");
  assert.equal(windowNameFor("3 rows!", []), "my_3_rows");
  assert.equal(windowNameFor("!!!", []), "saved_code");
});

test("saving to the Library asks before replacing", () => {
  const lib = [];
  assert.ok(savePiece(lib, { name: "  zig   zag ", code: "move(EAST)" }).piece);
  assert.equal(lib[0].name, "zig zag");
  assert.equal(lib[0].code, "move(EAST)\n");
  assert.deepEqual(savePiece(lib, { name: "Zig Zag", code: "x" }), { exists: "zig zag" });
  assert.equal(lib[0].code, "move(EAST)\n");
  savePiece(lib, { name: "Zig Zag", code: "x" }, true);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].code, "x\n");
  assert.match(savePiece(lib, { name: "", code: "x" }).problem, /name/);
  assert.match(savePiece(lib, { name: "empty", code: "  \n" }).problem, /no code/);
});

test("pieces can be renamed and deleted", () => {
  const lib = [];
  savePiece(lib, { name: "a", code: "1" });
  savePiece(lib, { name: "b", code: "2" });
  const a = findPiece(lib, "a");
  assert.match(renamePiece(lib, a, "B"), /already have/);
  assert.equal(renamePiece(lib, a, "my loop"), null);
  assert.equal(a.name, "my loop");
  deletePiece(lib, a);
  assert.deepEqual(lib.map((p) => p.name), ["b"]);
});

test("a damaged Library keeps the good pieces", () => {
  const lib = loadLibrary([{ name: "ok", code: "x", quest: "1-1" }, { name: "OK", code: "dup" }, { name: "", code: "x" }, null, { name: "n", code: 3 }]);
  assert.deepEqual(lib.map((p) => p.name), ["ok"]);
  assert.equal(lib[0].quest, "1-1");
  assert.deepEqual(loadLibrary("nope"), []);
  assert.equal(libraryName("x".repeat(50)).length, 30);
});

test("the preview shows the first lines with code on them", () => {
  assert.equal(preview("a\n\nb\nc\nd\n"), "a\nb\nc\n…");
  assert.equal(preview("a\n"), "a");
});

test("inserting on an empty line lines the code up with the cursor", () => {
  const text = "repeat 2 times:\n    \n";
  const out = insertCode(text, 20, 20, "move(NORTH)\nharvest()\n");
  assert.equal(out.text, "repeat 2 times:\n    move(NORTH)\n    harvest()\n");
  assert.equal(out.cursor, out.text.length - 1);
});

test("inserting in the middle of a line puts the code on the next line", () => {
  const text = "    move(NORTH)\nharvest()";
  const out = insertCode(text, 6, 6, "plant(WHEAT)\nwater()");
  assert.equal(out.text, "    move(NORTH)\n    plant(WHEAT)\n    water()\nharvest()");
  assert.equal(out.text.slice(0, out.cursor), "    move(NORTH)\n    plant(WHEAT)\n    water()");
});

test("inserting before code on a line keeps that code on its own line", () => {
  const out = insertCode("harvest()", 0, 0, "move(EAST)");
  assert.equal(out.text, "move(EAST)\nharvest()");
});
