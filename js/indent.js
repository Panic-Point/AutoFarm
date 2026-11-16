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
