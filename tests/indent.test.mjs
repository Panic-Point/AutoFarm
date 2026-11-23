import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backspaceDedent,
  changedRange,
  dedentLines,
  enterDedent,
  indentBlocks,
  indentLines,
  lineDedent,
} from "../js/indent.js";

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

// Mark a selection in a test text with [ and ], and read it back the same way.
const parse = (marked) => {
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return [marked.replace("[", "").replace("]", ""), start, end];
};
const show = ({ text, start, end }) => text.slice(0, start) + "[" + text.slice(start, end) + "]" + text.slice(end);
const tab = (marked) => show(indentLines(...parse(marked)));
const shiftTab = (marked) => show(dedentLines(...parse(marked)));

test("Tab with nothing selected inserts spaces up to the next indent level", () => {
  assert.equal(tab("repeat 3 times:\n[]harvest()"), "repeat 3 times:\n    []harvest()");
  assert.equal(tab("  []x"), "    []x");
  assert.equal(tab("    x[]"), "    x   []");
});

test("Tab with a selection inside one line keeps the selected text", () => {
  assert.equal(tab("[harvest()]"), "    [harvest()]");
  assert.equal(tab("move([EAST])"), "move(   [EAST])");
});

test("Tab pushes in every line the selection touches", () => {
  assert.equal(
    tab("repeat 3 times:\n[harvest()\nmove(EAST)]\ntill()"),
    "repeat 3 times:\n[    harvest()\n    move(EAST)]\ntill()",
  );
  // Partly highlighted first and last lines still move.
  assert.equal(tab("har[vest()\nmove(EA]ST)"), "    har[vest()\n    move(EA]ST)");
  // A selection ending at the start of a line leaves that line alone.
  assert.equal(tab("[a\nb\n]c"), "[    a\n    b\n]c");
  // Empty lines stay empty.
  assert.equal(tab("[a\n\nb]"), "[    a\n\n    b]");
  // Pressing Tab again moves the same lines again.
  assert.equal(tab(tab("[a\nb]")), "[        a\n        b]");
});

test("Shift+Tab takes one indent level off every line the selection touches", () => {
  // Mixed indents: 2, 4, 6 and 8 spaces each go back one level.
  assert.equal(shiftTab("[  a\n    b\n      c\n        d]"), "[a\nb\n    c\n    d]");
  assert.equal(shiftTab("x\n    ha[rvest()\n    mo]ve(EAST)\ny"), "x\nha[rvest()\nmo]ve(EAST)\ny");
  assert.equal(shiftTab("[    a\n    b\n]    c"), "[a\nb\n]    c");
  assert.equal(shiftTab("[a\n\n    b]"), "[a\n\nb]");
  // With no selection, the cursor's line moves.
  assert.equal(shiftTab("if x:\n        mo[]ve(EAST)"), "if x:\n    mo[]ve(EAST)");
  // A cursor inside the removed spaces lands at the start of the line.
  assert.equal(shiftTab("  []  x"), "[]x");
  // Unindented lines don't change.
  assert.equal(shiftTab("[harvest()]"), "[harvest()]");
});

test("Enter on a line of only spaces takes off one indent level", () => {
  const text = "repeat 3 times:\n    harvest()\n    ";
  const cut = enterDedent(text, text.length, text.length);
  assert.equal(after(text, cut), "repeat 3 times:\n    harvest()\n");
  assert.equal(after("        ", enterDedent("        ", 4, 4)), "    ");
  assert.equal(enterDedent("    harvest()", 13, 13), null);
  assert.equal(enterDedent("a\n", 2, 2), null);
  assert.equal(enterDedent("    ", 0, 4), null);
});

test("changedRange finds the smallest edit", () => {
  assert.deepEqual(changedRange("abc", "aXbc"), { from: 1, to: 1, text: "X" });
  assert.deepEqual(changedRange("a\n    b", "a\nb"), { from: 2, to: 6, text: "" });
  assert.deepEqual(changedRange("same", "same"), { from: 4, to: 4, text: "" });
});

test("indentBlocks finds the lines inside each loop, if and define", () => {
  const code = [
    "repeat 2 times:",      // 0
    "    if is_ripe():",    // 1
    "        harvest()",    // 2
    "",                     // 3
    "    move(EAST)  # go", // 4
    "till()",               // 5
    "define go:   # mine",  // 6
    "    move(NORTH)",      // 7
    "repeat 3 times:",      // 8
    "harvest()",            // 9: not pushed in, so not in the loop
  ].join("\n");
  assert.deepEqual(indentBlocks(code), [
    { opener: 0, first: 1, last: 4, indent: 0, kind: "loop" },
    { opener: 1, first: 2, last: 2, indent: 4, kind: "if" },
    { opener: 6, first: 7, last: 7, indent: 0, kind: "define" },
  ]);
  assert.deepEqual(indentBlocks("print('a:')\nx = {1: 2}"), []);
});
