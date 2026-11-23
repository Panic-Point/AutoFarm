// Indent helpers for the code editor. Kept free of the DOM so they can be tested.
export const INDENT = 4;

// Where Backspace should delete from when the cursor sits in a line's leading
// spaces: back to the previous indent level (8 -> 4, 6 -> 4, 4 -> 0).
// Returns null when Backspace should behave as normal.
export function backspaceDedent(text, cursor) {
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  const before = text.slice(lineStart, cursor);
  if (!before || !/^ +$/.test(before)) return null;
  const target = Math.floor((before.length - 1) / INDENT) * INDENT;
  return { from: lineStart + target, to: cursor };
}

// Shift+Tab: take one indent level off the start of the line the cursor is on.
// Returns the range of spaces to remove, or null if the line isn't indented.
export function lineDedent(text, cursor) {
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  const spaces = text.slice(lineStart).match(/^ */)[0].length;
  if (!spaces) return null;
  const remove = spaces - Math.floor((spaces - 1) / INDENT) * INDENT;
  return { from: lineStart, to: lineStart + remove };
}

// The lines a selection from `start` to `end` touches, as [first, last] line
// indexes. A selection that ends right at the start of a line doesn't touch
// that line.
function touchedLines(text, start, end) {
  const starts = lineStarts(text);
  const lineOf = (p) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= p) i++;
    return i;
  };
  const first = lineOf(start);
  let last = lineOf(end);
  if (last > first && starts[last] === end) last--;
  return { starts, first, last };
}

function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return starts;
}

// Change the leading spaces of lines first..last. `change(line)` gives how
// many spaces to add (positive) or remove (negative) at the start of a line.
// The selection moves with the text, so the same lines stay highlighted.
function shiftLines(text, start, end, change) {
  const { starts, first, last } = touchedLines(text, start, end);
  const lines = text.split("\n");
  const delta = lines.map((line, i) => (i >= first && i <= last ? change(line) : 0));
  const out = lines.map((line, i) => (delta[i] > 0 ? " ".repeat(delta[i]) + line : line.slice(-delta[i])));
  const move = (p) => {
    let shift = 0;
    for (let i = 0; i < starts.length && starts[i] <= p; i++) {
      const col = p - starts[i];
      const next = starts[i + 1];
      if (next !== undefined && next <= p) shift += delta[i];
      // On its own line, the position moves with the text after the spaces.
      else shift += delta[i] > 0 ? (col > 0 ? delta[i] : 0) : -Math.min(-delta[i], col);
    }
    return p + shift;
  };
  return { text: out.join("\n"), start: move(start), end: move(end) };
}

// Tab. With a selection across lines, push every line it touches in by one
// indent level (empty lines are left alone). Otherwise insert spaces up to the
// next indent level, in front of any highlighted text instead of over it.
// Returns { text, start, end }: the new text and the new selection.
export function indentLines(text, start, end) {
  if (!text.slice(start, end).includes("\n")) {
    const col = start - (text.lastIndexOf("\n", start - 1) + 1);
    const n = INDENT - (col % INDENT);
    return { text: text.slice(0, start) + " ".repeat(n) + text.slice(start), start: start + n, end: end + n };
  }
  return shiftLines(text, start, end, (line) => (line.trim() ? INDENT : 0));
}

// Shift+Tab: take one indent level off every line the selection (or the
// cursor) touches. Lines indented by less than a level lose what they have.
export function dedentLines(text, start, end) {
  return shiftLines(text, start, end, (line) => {
    const spaces = line.match(/^ */)[0].length;
    return spaces ? -(spaces - Math.floor((spaces - 1) / INDENT) * INDENT) : 0;
  });
}

// Enter on a line that is only spaces takes one indent level off it instead
// of starting a new line, so pressing Enter twice leaves a loop. Returns the
// range of spaces to remove, or null when Enter should start a new line.
export function enterDedent(text, start, end) {
  if (start !== end) return null;
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = text.indexOf("\n", start);
  if (lineEnd < 0) lineEnd = text.length;
  const line = text.slice(lineStart, lineEnd);
  if (!line || !/^ +$/.test(line)) return null;
  const keep = Math.floor((line.length - 1) / INDENT) * INDENT;
  return { from: lineStart + keep, to: lineEnd };
}

// The smallest range that changed between two texts, so an edit can be
// applied as one step the browser can undo.
export function changedRange(before, after) {
  let from = 0;
  const max = Math.min(before.length, after.length);
  while (from < max && before[from] === after[from]) from++;
  let a = before.length;
  let b = after.length;
  while (a > from && b > from && before[a - 1] === after[b - 1]) {
    a--;
    b--;
  }
  return { from, to: a, text: after.slice(from, b) };
}

const BLOCK_KINDS = [
  [/^(repeat|for|while)\b/, "loop"],
  [/^(if|elif|else)\b/, "if"],
  [/^(define|def)\b/, "define"],
];

// The blocks in the code: each line ending in a colon and the indented lines
// under it. Returns [{ opener, first, last, indent, kind }] with 0-based line
// indexes, so the code window can shade the lines that belong to each loop.
export function indentBlocks(text) {
  const lines = text.split("\n");
  const indentOf = (line) => line.match(/^ */)[0].length;
  const blank = (line) => !line.trim() || line.trim().startsWith("#");
  const blocks = [];
  lines.forEach((line, i) => {
    const code = line.replace(/#[^'"]*$/, "").trimEnd();
    if (blank(line) || !code.endsWith(":")) return;
    const indent = indentOf(line);
    let last = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (blank(lines[j])) continue;
      if (indentOf(lines[j]) <= indent) break;
      last = j;
    }
    if (last < 0) return;
    const word = line.trim();
    const kind = BLOCK_KINDS.find(([re]) => re.test(word))?.[1] ?? "block";
    blocks.push({ opener: i, first: i + 1, last, indent, kind });
  });
  return blocks;
}
