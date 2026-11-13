import { test } from "node:test";
import assert from "node:assert/strict";
import { loadWorkspace, nameProblem, nextName, normalizeName } from "../js/files.js";

test("window names are tidied into names code can use", () => {
  assert.equal(normalizeName("  My Helper "), "my_helper");
  assert.equal(normalizeName("crops.py"), "crops");
  assert.equal(normalizeName("go-home!"), "go_home");
});

test("bad window names get a reason", () => {
  assert.equal(nameProblem("helper", ["main"]), null);
  assert.match(nameProblem("", []), /at least one letter/);
  assert.match(nameProblem("2fast", []), /start with a letter/);
  assert.match(nameProblem("repeat", []), /already a word/);
  assert.match(nameProblem("move", []), /already a word/);
  assert.match(nameProblem("main", ["main"]), /already a window/);
});

test("new windows get a free name", () => {
  assert.equal(nextName(["main"]), "my_code");
  assert.equal(nextName(["my_code", "my_code2"]), "my_code3");
});

test("a new player gets one simple main window", () => {
  const ws = loadWorkspace(null, null);
  assert.deepEqual(ws.windows.map((w) => w.name), ["main"]);
  assert.match(ws.windows[0].code, /^harvest\(\)$/m);
  assert.equal(ws.active, "main");
});

test("code saved before windows existed becomes the main window", () => {
  const ws = loadWorkspace(null, "move(NORTH)\n");
  assert.equal(ws.windows.length, 1);
  assert.equal(ws.windows[0].name, "main");
  assert.equal(ws.windows[0].code, "move(NORTH)\n");
});

test("a damaged save keeps the good windows", () => {
  const ws = loadWorkspace({
    active: "gone",
    windows: [{ name: "main", code: "a", x: "bad" }, { name: "main", code: "dup" }, { name: "x", code: 5 }, null],
  });
  assert.equal(ws.windows.length, 1);
  assert.equal(ws.windows[0].x, 16);
  assert.equal(ws.active, "main");
});
