// The player's code windows: names, the starter workspace, and saving.
// No DOM code here, so it can be tested with Node.

export const STARTER_MAIN = `# Sweep the field and harvest everything that is ripe.
# The commands used here are written in the helper window.
use helper

set size to field_size()

repeat 3 times:
    repeat size times:
        harvest_row(size)
        move(NORTH)
    go_home()

print("Hay collected:", count("hay"))
`;

export const STARTER_HELPER = `# Commands you can use in any other window by writing: use helper

define harvest_if_ripe:
    if is_ripe():
        harvest()

define harvest_row(length):
    # Harvest one row going east, then walk back west.
    repeat length - 1 times:
        harvest_if_ripe()
        move(EAST)
    harvest_if_ripe()
    repeat length - 1 times:
        move(WEST)

define go_home:
    # Walk back to the south-west corner.
    repeat until position() == (0, 0):
        if position()[0] > 0:
            move(WEST)
        else:
            move(SOUTH)
`;

// Names a window can't have: Python words, plain words, and game commands.
const RESERVED = new Set(
  (
    "and as assert async await break class continue def del elif else except finally for from " +
    "global if import in is lambda nonlocal not or pass raise return try while with yield " +
    "None True False true false repeat forever until times each define set change use to by " +
    "move till plant harvest wait is_ripe crop_here ground_here position field_size count ticks " +
    "print NORTH SOUTH EAST WEST Crop farm_api plain_words"
  ).split(" "),
);

export const MAX_NAME = 24;

// Turn what the player typed into a window name: "My Helper" -> "my_helper".
export function normalizeName(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\.py$/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, MAX_NAME);
}

// Returns a message saying why `name` can't be used, or null if it's fine.
export function nameProblem(name, otherNames = []) {
  if (!name) return "A window name needs at least one letter.";
  if (!/^[a-z]/.test(name)) return "A window name has to start with a letter.";
  if (!/^[a-z][a-z0-9_]*$/.test(name)) return "Use only letters, numbers and _ in a window name.";
  if (RESERVED.has(name)) return `"${name}" is already a word the game uses. Try another name.`;
  if (otherNames.includes(name)) return `There is already a window called ${name}.`;
  return null;
}

// A free name like my_code, my_code2, my_code3...
export function nextName(names, base = "my_code") {
  if (!names.includes(base)) return base;
  for (let i = 2; ; i++) if (!names.includes(base + i)) return base + i;
}

export function newWindow(name, code, i = 0) {
  return { name, code, x: 16 + i * 28, y: 16 + i * 28, w: 420, h: 300, hidden: false };
}

export function starterWorkspace() {
  const main = newWindow("main", STARTER_MAIN);
  const helper = { ...newWindow("helper", STARTER_HELPER, 1), x: 300, y: 150 };
  return { windows: [main, helper], active: "main" };
}

// Check a saved workspace and fill in anything missing. `oldCode` is the
// single program saved before code windows existed.
export function loadWorkspace(saved, oldCode) {
  const fresh = typeof oldCode === "string"
    ? { windows: [newWindow("main", oldCode)], active: "main" }
    : starterWorkspace();
  if (!saved || !Array.isArray(saved.windows)) return fresh;
  const windows = [];
  for (const w of saved.windows) {
    if (!w || typeof w.code !== "string") continue;
    const name = normalizeName(w.name);
    if (nameProblem(name, windows.map((x) => x.name))) continue;
    const num = (v, d) => (Number.isFinite(v) ? v : d);
    windows.push({
      name,
      code: w.code,
      x: num(w.x, 16),
      y: num(w.y, 16),
      w: num(w.w, 420),
      h: num(w.h, 300),
      hidden: Boolean(w.hidden),
    });
  }
  if (!windows.length) return fresh;
  const active = windows.some((w) => w.name === saved.active) ? saved.active : windows[0].name;
  return { windows, active };
}
