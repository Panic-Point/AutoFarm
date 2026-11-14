// The coding words Bolt learns, and the chapter that teaches each one.
// py/words.py finds which words a program uses; until a word's chapter opens,
// using it stops the run with a friendly note from Bolt.

// chapter 9 means "after the Harvest Festival", once chapter 8 is finished.
export const AFTER_FESTIVAL = 9;

export const WORDS = {
  move: { chapter: 1, label: "move" },
  harvest: { chapter: 1, label: "harvest" },
  till: { chapter: 2, label: "till" },
  plant: { chapter: 2, label: "plant" },
  wait: { chapter: 2, label: "wait" },
  repeat: { chapter: 2, label: "repeat" },
  nested: { chapter: 3, label: "a loop inside a loop" },
  if: { chapter: 4, label: "if and else" },
  elif: { chapter: 4, label: "else if" },
  compare: { chapter: 4, label: "comparing with == and <" },
  is_ripe: { chapter: 4, label: "is_ripe" },
  is_rotten: { chapter: 4, label: "is_rotten" },
  crop_here: { chapter: 4, label: "crop_here" },
  ground_here: { chapter: 4, label: "ground_here" },
  repeat_until: { chapter: 5, label: "repeat until" },
  repeat_while: { chapter: 5, label: "repeat while" },
  repeat_forever: { chapter: 5, label: "repeat forever" },
  stop: { chapter: 5, label: "break" },
  can_move: { chapter: 5, label: "can_move" },
  position: { chapter: 5, label: "position" },
  field_size: { chapter: 5, label: "field_size" },
  variables: { chapter: 6, label: "set and change" },
  count: { chapter: 6, label: "count" },
  ticks: { chapter: 6, label: "ticks" },
  count_from: { chapter: 6, label: "for ... from ... to" },
  logic: { chapter: 6, label: "and, or and not" },
  water: { chapter: 6, label: "the watering can" },
  define: { chapter: 7, label: "define" },
  use: { chapter: 7, label: "use" },
  give_back: { chapter: 7, label: "give back" },
  ripe_at: { chapter: 7, label: "ripe_at" },
  lists: { chapter: 8, label: "lists" },
  add: { chapter: 8, label: "add ... to" },
  order: { chapter: 8, label: "order" },
  advanced: { chapter: AFTER_FESTIVAL, label: "this kind of code" },
};

export function lockedMessage(id) {
  const word = WORDS[id];
  const when = word.chapter === AFTER_FESTIVAL
    ? "It opens after the Harvest Festival!"
    : `You'll learn it in chapter ${word.chapter}!`;
  return `Bolt doesn't know ${word.label} yet. ${when}`;
}

// { word: what Bolt says } for every word whose chapter isn't open.
// isOpen(chapterNumber) says whether a chapter is open.
export function lockedWords(isOpen) {
  const locked = {};
  for (const [id, word] of Object.entries(WORDS)) {
    if (!isOpen(word.chapter)) locked[id] = lockedMessage(id);
  }
  return locked;
}

export function wordsInChapter(n) {
  return Object.keys(WORDS).filter((id) => WORDS[id].chapter === n);
}
