import { test } from "node:test";
import assert from "node:assert/strict";
import { backspaceDedent, lineDedent } from "../js/indent.js";

const after = (text, cut) => text.slice(0, cut.from) + text.slice(cut.to);

test("Backspace in leading spaces goes back to the previous indent level", () => {
  const cases = [[8, 4], [6, 4], [4, 0], [3, 0], [1, 0], [12, 8]];
  for (const [n, want] of cases) {
    const text = "repeat 3:\n" + " ".repeat(n);
    const cut = backspaceDedent(text, text.length);
    assert.equal(after(text, cut), "repeat 3:\n" + " ".repeat(want), `${n} spaces`);
  }
});

test("Backspace with code before the cursor behaves as normal", () => {
  const text = "    move(NORTH)";
  assert.equal(backspaceDedent(text, text.length), null);
  assert.equal(backspaceDedent("  x", 3), null);
});

test("Backspace at the start of a line or with tabs behaves as normal", () => {
  assert.equal(backspaceDedent("a\nb", 2), null);
  assert.equal(backspaceDedent("", 0), null);
  assert.equal(backspaceDedent("\t", 1), null);
});

test("Backspace only looks at spaces before the cursor", () => {
  const text = "        move(NORTH)";
  const cut = backspaceDedent(text, 8);
  assert.equal(after(text, cut), "    move(NORTH)");
});

test("Shift+Tab takes one indent level off the line", () => {
  const text = "if x:\n        move(EAST)\nharvest()";
  const cut = lineDedent(text, text.indexOf("move") + 2);
  assert.equal(after(text, cut), "if x:\n    move(EAST)\nharvest()");
  const odd = "      x";
  assert.equal(after(odd, lineDedent(odd, 7)), "    x");
  assert.equal(lineDedent("harvest()", 3), null);
});
