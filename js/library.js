// The Library: pieces of code the player saved with a window's 💾 button, to
// open again later or drop into another window like a building block.
// No DOM code here, so it can be tested with Node.

export const MAX_LIBRARY_NAME = 30;

// Tidy a name the player typed: "  zig   zag " -> "zig zag".
export function libraryName(text) {
  return String(text ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_LIBRARY_NAME);
}

export function findPiece(library, name) {
  const key = libraryName(name).toLowerCase();
  return library.find((p) => p.name.toLowerCase() === key) ?? null;
}

// Check a saved Library and drop anything broken.
export function loadLibrary(saved) {
  if (!Array.isArray(saved)) return [];
  const library = [];
  for (const p of saved) {
    if (!p || typeof p.code !== "string") continue;
    const name = libraryName(p.name);
    if (!name || findPiece(library, name)) continue;
    library.push({
      name,
      code: p.code,
      quest: typeof p.quest === "string" ? p.quest : null,
      questTitle: typeof p.questTitle === "string" ? p.questTitle : null,
      at: Number.isFinite(p.at) ? p.at : 0,
    });
  }
  return library;
}

// Save a piece. Returns { problem } when it can't be saved, { exists } when
// a piece already has that name and `replace` wasn't asked for, or { piece }.
export function savePiece(library, { name, code, quest = null, questTitle = null }, replace = false, now = Date.now()) {
  const clean = libraryName(name);
  if (!clean) return { problem: "Give your code a name first." };
  if (isBlank(code)) return { problem: "There's no code in this window to save yet." };
  const old = findPiece(library, clean);
  if (old && !replace) return { exists: old.name };
  const piece = { name: clean, code: code.replace(/\s+$/, "") + "\n", quest, questTitle, at: now };
  if (old) library.splice(library.indexOf(old), 1, piece);
  else library.unshift(piece);
  return { piece };
}

// Rename a piece. Returns a message saying why it can't be renamed, or null.
export function renamePiece(library, piece, text) {
  const name = libraryName(text);
  if (!name) return "A saved piece needs a name.";
  const other = findPiece(library, name);
  if (other && other !== piece) return `You already have one called "${other.name}".`;
  piece.name = name;
  return null;
}

export function deletePiece(library, piece) {
  const i = library.indexOf(piece);
  if (i >= 0) library.splice(i, 1);
}

// The first few lines with code on them, for the Library list.
export function preview(code, lines = 3) {
  const all = code.split("\n").filter((l) => l.trim());
  const shown = all.slice(0, lines);
  if (all.length > lines) shown.push("…");
  return shown.join("\n");
}

function isBlank(code) {
  return !String(code ?? "").trim();
}

// Put `code` into `text` where the cursor is (selection start..end).
// On an empty line (or in its leading spaces) it goes right there, lined up
// with the cursor. In the middle of a line it goes on a new line below it,
// lined up with that line. Returns { text, cursor }.
export function insertCode(text, start, end, code) {
  const lines = code.replace(/\s+$/, "").split("\n");
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const before = text.slice(lineStart, start);
  const indented = (indent) => lines.map((l, i) => (i && l ? indent + l : l)).join("\n");
  if (!before.trim()) {
    const lineEnd = text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
    const restOfLine = text.slice(end, lineEnd);
    let piece = indented(before);
    if (restOfLine.trim()) piece += "\n" + before;
    const out = text.slice(0, start) + piece + text.slice(end);
    return { text: out, cursor: start + indented(before).length };
  }
  const from = Math.max(start, end);
  const lineEnd = text.indexOf("\n", from) === -1 ? text.length : text.indexOf("\n", from);
  const indent = text.slice(lineStart).match(/^[ \t]*/)[0];
  const piece = "\n" + indent + indented(indent);
  return { text: text.slice(0, lineEnd) + piece + text.slice(lineEnd), cursor: lineEnd + piece.length };
}
