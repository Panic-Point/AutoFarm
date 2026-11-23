// Keeping the screen simple for young players: which crops, buttons and
// window tools to show, and the tap-to-insert words for a quest. A new player
// sees only what they need, and the rest shows up as it's earned. No DOM code
// here, so it can be tested with Node.
import { CROPS, ITEMS } from "./game.js";
import { CONCEPTS } from "./concepts.js";
import { QUESTS } from "./chapters.js";
import { WORDS } from "./words.js";
import { SHOP, badges, isChapterOpen, isForSale } from "./progress.js";

// The crops worth a counter: ones the player has ever harvested, has in the
// barn or this try, or that grow on the field right now. In ITEMS order.
export function shownItems(p, { inventories = [], field = null } = {}) {
  const want = new Set();
  for (const item of ITEMS) {
    if (p.harvested[item] > 0 || inventories.some((inv) => inv?.[item] > 0)) want.add(item);
  }
  for (const tile of field?.tiles ?? []) {
    if (tile.crop) for (const item of Object.keys(CROPS[tile.crop]?.yield ?? {})) want.add(item);
  }
  return ITEMS.filter((item) => want.has(item));
}

// Which top bar buttons and window tools to show. Each one shows up once it
// has something in it:
//   map      once a quest has a star or a chapter is finished (there's
//            somewhere else to go)
//   shop     once something is for sale
//   shelf    once there's a badge, crown, almanac page or ribbon to put on it
//   windows  "+ New window", hiding, deleting and renaming windows, once the
//            chapter that teaches `define` and `use` is open
// Practice mode shows everything.
export function screenParts(p) {
  const all = p.practice;
  return {
    map: all || Object.keys(p.stars).length > 0 || p.finished.length > 0,
    shop: all || SHOP.some((item) => isForSale(p, item)),
    shelf: all || badges(p).length > 0 || p.almanac.length > 0 || p.contracts.length > 0,
    windows: isChapterOpen(p, WORDS.define.chapter),
  };
}

// Tap-to-insert words. `line` words go on a line of their own (one ending
// in ":" starts an indented block), `inline` ones go where the cursor is.
const line = (...texts) => texts.map((text) => ({ text, inline: false }));
const inline = (...texts) => texts.map((text) => ({ text, inline: true }));

export const TAP_WORDS = {
  harvest: line("harvest()"),
  move: line("move(NORTH)", "move(EAST)", "move(SOUTH)", "move(WEST)"),
  wait: line("wait()"),
  till: line("till()"),
  repeat: line("repeat 5 times:"),
  print: line('print("Hello!")'),
  if: line("if is_ripe():"),
  else: line("else:"),
  elif: line("else if is_rotten():"),
  is_ripe: inline("is_ripe()"),
  is_rotten: inline("is_rotten()"),
  ground_here: inline("ground_here() == SOIL"),
  crop_here: inline("crop_here()"),
  repeat_while: line("repeat while can_move(NORTH):"),
  repeat_until: line("repeat until is_ripe():"),
  repeat_forever: line("repeat forever:", "break"),
  can_move: inline("can_move(NORTH)"),
  position: inline("position()"),
  water: line("water()"),
  refill: line("refill()"),
  count: inline("count(WHEAT)"),
  variables: line("set steps to 0", "change steps by 1"),
  count_from: line("for x from 1 to 5:"),
  define: line("define hop:"),
  use: line("use helper"),
  give_back: line("give back total"),
  ripe_at: inline("ripe_at(x, y)"),
  lists: inline("[NORTH, EAST]"),
  add: line("add WHEAT to basket"),
  order: inline("order()"),
};

// Crops that can't go in plant(): grass grows by itself, mushrooms are wild.
const NOT_PLANTED = ["grass", "mushroom"];
// The newest ideas get buttons, besides move and harvest, which always do.
const NEWEST = 4;

// The words to tap for a quest: move and harvest, then the newest ideas the
// player has learned by this quest (its own new words included).
export function tapWords(questId) {
  const at = QUESTS.findIndex((q) => q.id === questId);
  if (at < 0) return [];
  const order = new Map(QUESTS.map((q, i) => [q.id, i]));
  const learned = CONCEPTS.filter((c) => c.learned && order.has(c.learned) && order.get(c.learned) <= at)
    .sort((a, b) => order.get(a.learned) - order.get(b.learned));
  const knows = (id) => learned.some((c) => c.id === id);
  const wordsOf = (c) => {
    if (c.crop) return knows("plant") && !NOT_PLANTED.includes(c.crop) ? line(`plant(${c.crop.toUpperCase()})`) : [];
    return TAP_WORDS[c.id] ?? [];
  };
  const basics = ["move", "harvest"].filter(knows);
  const newest = learned.filter((c) => !basics.includes(c.id) && wordsOf(c).length).slice(-NEWEST);
  const words = [...basics.flatMap((id) => TAP_WORDS[id]), ...newest.flatMap(wordsOf)];
  // No word twice.
  return words.filter((w, i) => words.findIndex((x) => x.text === w.text) === i);
}

// Where tapping a word puts it, in `code` with the cursor at `at`. A line
// word starts a new line under the cursor's line, with the same indent (or
// 4 more after a ":"), unless the cursor's line is empty. A word ending in
// ":" also starts the indented line inside it. Returns the new code and
// where the cursor goes.
export function insertWord(code, at, word) {
  if (word.inline) return { code: code.slice(0, at) + word.text + code.slice(at), at: at + word.text.length };
  const lineStart = code.lastIndexOf("\n", at - 1) + 1;
  let lineEnd = code.indexOf("\n", at);
  if (lineEnd < 0) lineEnd = code.length;
  const current = code.slice(lineStart, lineEnd);
  let indent = current.match(/^\s*/)[0];
  let text;
  let from;
  let to;
  if (!current.trim()) {
    // An empty line: write the word on it, keeping its indent.
    text = indent + word.text;
    from = lineStart;
    to = lineEnd;
  } else {
    if (current.trimEnd().endsWith(":")) indent += "    ";
    text = "\n" + indent + word.text;
    from = lineEnd;
    to = lineEnd;
  }
  if (word.text.endsWith(":")) text += "\n" + indent + "    ";
  return { code: code.slice(0, from) + text + code.slice(to), at: from + text.length };
}
