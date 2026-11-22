// Every command and coding idea Bolt learns, as plain data. One entry feeds
// two places:
//   - the lesson card shown before the quest that first needs it (`learned`),
//   - the Farm Book, the encyclopedia of what the player has unlocked,
//
// An entry:
//   id       a name for the entry (saved in progress.seen once it's been read)
//   group    which section it's in (see GROUPS)
//   name     its title, like "harvest()"
//   word     the word in js/words.js that locks it, or null if it's never locked
//   also     other words the entry covers, which open in the same chapter
//   learned  the quest that first needs it: its lesson shows before that quest,
//            and the book links back to it. null if no quest needs it.
//   short    one line summary, shown when hovering its name in the Farm Book
//   does     what it does, in a sentence or two
//   gives    what it gives back, or null
//   forms    every way of writing it (plain words and Python unlock together)
//   watch    things to watch out for
//   example  a short program that shows it working, on its own little field:
//            { code, python, files, field: { map, start, inventory, can, data } }
//            `python` is the same program in Python, when that looks different.
//            `files` are other code windows it uses. The field is written like
//            a quest's field (see js/chapters.js). The example must not solve
//            the quest it comes before (tests/concepts.test.mjs checks).
//
// Crop entries have `crop` (the item it gives) and no example. They open
// when the player reaches the quest that first has that crop, or picks one.

import { WORDS } from "./words.js";
import { plotData, questField } from "./quests.js";

export const GROUPS = [
  { id: "basics", title: "Getting started" },
  { id: "actions", title: "Actions" },
  { id: "looking", title: "Looking" },
  { id: "loops", title: "Loops and choices" },
  { id: "commands", title: "Commands and windows" },
  { id: "lists", title: "Lists" },
  { id: "crops", title: "Crops" },
];

// Tips that aren't entries of their own, shown on every Farm Book page in
// their group under "Good to know".
export const TIPS = {
  basics: ["Each action takes one tick. Crops grow every tick. Looking around is free."],
  loops: ["Lines inside a loop, choice or command are indented by 4 spaces."],
  commands: [
    "Split your code into windows. Make one with **+ New window**, and double-click a window's name to rename it.",
    "Each window has its own ▶ button. **Run** at the top runs the window you used last.",
    "Drag a window by its title bar, and resize it from its bottom-right corner.",
  ],
};

const DIRECTIONS = "`NORTH`, `SOUTH`, `EAST` or `WEST` (or `UP`, `DOWN`, `LEFT` or `RIGHT`)";

export const CONCEPTS = [
  // ---- Getting started ----
  {
    id: "in_order",
    group: "basics",
    name: "Lines run in order",
    word: null,
    learned: "1-3",
    short: "Bolt does your lines one at a time, from the top down.",
    does: "Bolt reads your program from the top line to the bottom, and does each line before the next one.",
    gives: null,
    forms: ["one command on each line"],
    watch: ["Swap two lines and Bolt does them the other way round. Moving before harvesting is not the same as harvesting before moving."],
    example: {
      code: "harvest()\nmove(NORTH)\nmove(EAST)\nharvest()",
      field: { map: ["...", ".G.", "G.."] },
    },
  },
  {
    id: "print",
    group: "basics",
    name: "print()",
    word: null,
    learned: "3-6",
    short: "`print(...)` writes to the console below your code.",
    does: "Writes words or numbers in the console under your code, so you can see what Bolt is thinking.",
    gives: null,
    forms: ['print("Hello!")', "print(count(WHEAT))", "print(position())"],
    watch: ["Printing doesn't take a tick, so you can print as much as you like.", "Words go in quotes: `print(\"hi\")`. Without quotes Bolt looks for a name."],
    example: {
      code: 'print("Good morning!")\nmove(EAST)\nprint("One step done")',
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "compare",
    group: "basics",
    name: "Comparing: == and <",
    word: "compare",
    learned: "4-3",
    short: "`==` asks if two things are the same, `!=` if they're different. `<`, `>`, `<=` and `>=` compare numbers.",
    does: "Asks a yes-or-no question about two things, so an `if` or a loop can use the answer.",
    gives: "`True` or `False`.",
    forms: ["a == b  (the same)", "a != b  (not the same)", "a < b   (smaller)", "a > b   (bigger)", "a <= b  (smaller or the same)", "a >= b  (bigger or the same)"],
    watch: ["Two equals signs ask a question. One equals sign (`x = 5`) sets a variable.", "`ground_here() == SOIL` and `crop_here() == CARROT` compare names, so check the spelling."],
    example: {
      code: "if ground_here() == GRASS:\n    till()\nmove(EAST)\nif ground_here() != GRASS:\n    plant(WHEAT)",
      field: { map: ["...", "...", "g.."] },
    },
  },

  // ---- Actions ----
  {
    id: "harvest",
    group: "actions",
    name: "harvest()",
    word: "harvest",
    learned: "1-1",
    short: "`harvest()` collects a ripe crop. An unripe crop is lost.",
    does: "Picks the crop Bolt is standing on and puts it in the barn. Takes 1 tick.",
    gives: "`True` if Bolt picked something ripe, `False` if not.",
    forms: ["harvest()"],
    watch: ["Harvesting a crop that isn't ripe yet loses it, and you get nothing.", "Harvesting bare soil just uses a tick.", "Grass grows back by itself after you pick it."],
    example: {
      code: "harvest()",
      field: { map: ["...", "...", "W.."] },
    },
  },
  {
    id: "move",
    group: "actions",
    name: "move()",
    word: "move",
    learned: "1-2",
    short: "`move(NORTH)`, `SOUTH`, `EAST` or `WEST` takes one step. Gives back `False` at the edge.",
    does: "Bolt takes one step that way. North is up the field, east is to the right. Takes 1 tick.",
    gives: "`True` if Bolt moved, `False` if the fence was in the way.",
    forms: ["move(NORTH)", "move(SOUTH)", "move(EAST)", "move(WEST)", "move(UP)", "move(DOWN)", "move(LEFT)", "move(RIGHT)"],
    watch: [
      "Bumping into the fence still uses a tick.",
      "The direction is in capital letters, inside the brackets.",
      "`UP`, `DOWN`, `LEFT` and `RIGHT` are other names for `NORTH`, `SOUTH`, `WEST` and `EAST`. Use whichever you like.",
    ],
    example: {
      code: "move(NORTH)\nmove(NORTH)\nmove(EAST)\nmove(SOUTH)",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "wait",
    group: "actions",
    name: "wait()",
    word: "wait",
    learned: "2-3",
    short: "`wait()` does nothing for one tick, while crops grow.",
    does: "Bolt stays still for 1 tick. Crops keep growing while Bolt waits.",
    gives: null,
    forms: ["wait()"],
    watch: ["Every wait is a tick, so waiting too long costs stars."],
    example: {
      code: "repeat 4 times:\n    wait()\nharvest()",
      python: "for i in range(4):\n    wait()\nharvest()",
      field: { map: ["...", "...", "g.."] },
    },
  },
  {
    id: "till",
    group: "actions",
    name: "till()",
    word: "till",
    learned: "2-4",
    short: "`till()` turns grass into soil, or soil back into grass.",
    does: "Digs up the tile under Bolt. Grass becomes soil you can plant on. Takes 1 tick.",
    gives: null,
    forms: ["till()"],
    watch: ["Tilling soil turns it back into grass!", "Tilling a tile with a crop on it clears the crop away. That's how to get rid of a rotten pumpkin."],
    example: {
      code: "till()\nmove(EAST)\ntill()",
      field: { map: ["...", "...", "g.."] },
    },
  },
  {
    id: "plant",
    group: "actions",
    name: "plant()",
    word: "plant",
    learned: "2-4",
    short: "`plant(WHEAT)` on soil. `CARROT` costs 2 wheat, `LETTUCE` 2 hay, `STRAWBERRY` 3 wheat, `BLUEBERRY` 2 carrots, `PUMPKIN` 1 carrot, `CORN` 1 wheat and `SUNFLOWER` 2 wheat.",
    does: "Plants a seed on the soil under Bolt. Takes 1 tick.",
    gives: "`True` if it planted, `False` if it couldn't.",
    forms: ["plant(GRASS)", "plant(WHEAT)", "plant(CARROT)", "plant(LETTUCE)", "plant(STRAWBERRY)", "plant(BLUEBERRY)", "plant(PUMPKIN)", "plant(CORN)", "plant(SUNFLOWER)"],
    watch: ["Plant on soil, not grass. Use `till()` first.", "Some seeds cost produce from the barn. Without enough, nothing is planted.", "Mushrooms can't be planted. They grow wild.", "`Crop.WHEAT` works too."],
    example: {
      code: "plant(WHEAT)\nmove(EAST)\nplant(WHEAT)",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "water",
    group: "actions",
    name: "water() and is_dry()",
    word: "water",
    learned: "6-5",
    short: "`water()` wets the soil for 6 ticks and uses 1 drop from the can. `is_dry()` is `True` when the soil under Bolt is dry.",
    does: "`water()` pours a drop on the soil under Bolt, so corn can grow there for 6 ticks. `is_dry()` checks the soil first. Watering takes 1 tick, looking is free.",
    gives: "`is_dry()` gives `True` or `False`. `water()` gives `True` if it poured.",
    forms: ["water()", "is_dry()"],
    watch: ["Corn only grows while its soil is wet.", "Watering wet soil, ripe corn or bare ground wastes a drop.", "The can holds 5 drops."],
    example: {
      code: "if is_dry():\n    water()\nprint(is_dry())",
      field: { map: ["...", "...", "k.."] },
    },
  },
  {
    id: "refill",
    group: "actions",
    name: "refill() and water_left()",
    word: "water",
    learned: "6-7",
    short: "`refill()` fills the can (it holds 5) when Bolt is on the well. `water_left()` says how much water is in the can.",
    does: "`refill()` fills the watering can back up to 5 drops. Bolt has to be standing on the well. Takes 1 tick.",
    gives: "`water_left()` gives a number from 0 to 5.",
    forms: ["refill()", "water_left()"],
    watch: ["Refilling anywhere but the well does nothing and still uses a tick."],
    example: {
      code: "print(water_left())\nrefill()\nprint(water_left())",
      field: { map: ["...", "...", "O.."], can: 1 },
    },
  },

  // ---- Looking ----
  {
    id: "is_ripe",
    group: "looking",
    name: "is_ripe()",
    word: "is_ripe",
    learned: "4-1",
    short: "`is_ripe()` is `True` when the crop under Bolt is ready.",
    does: "Looks at the crop under Bolt and says if it's ready to pick. Looking is free: no tick.",
    gives: "`True` or `False`. Bare soil is `False`.",
    forms: ["is_ripe()", "not is_ripe()"],
    watch: ["Remember the brackets. `if is_ripe:` without them is always yes."],
    example: {
      code: "print(is_ripe())\nmove(EAST)\nprint(is_ripe())",
      field: { map: ["...", "...", "wW."] },
    },
  },
  {
    id: "ground_here",
    group: "looking",
    name: "ground_here()",
    word: "ground_here",
    learned: "4-3",
    short: "`ground_here()` says if Bolt is on `GRASS` or `SOIL`.",
    does: "Tells you what the ground under Bolt is. Looking is free.",
    gives: "`GRASS` or `SOIL` (the well counts as its own ground).",
    forms: ["ground_here()", "ground_here() == GRASS", "ground_here() == SOIL"],
    watch: ["It's about the ground, not the crop. Use `crop_here()` for the crop."],
    example: {
      code: "print(ground_here())\ntill()\nprint(ground_here())",
      field: { map: ["...", "...", "g.."] },
    },
  },
  {
    id: "is_rotten",
    group: "looking",
    name: "is_rotten()",
    word: "is_rotten",
    learned: "4-5",
    short: "`is_rotten()` is `True` when the pumpkin under Bolt has rotted.",
    does: "Checks if the pumpkin under Bolt has gone rotten. Looking is free.",
    gives: "`True` or `False`.",
    forms: ["is_rotten()"],
    watch: ["A rotten pumpkin can't be picked, and isn't ripe. `till()` clears it away."],
    example: {
      code: "print(is_rotten())\nmove(EAST)\nprint(is_rotten())",
      field: { map: ["...", "...", "xP."] },
    },
  },
  {
    id: "crop_here",
    group: "looking",
    name: "crop_here()",
    word: "crop_here",
    learned: "5-6",
    short: "`crop_here()` says which crop is under Bolt: `crop_here() == CARROT`.",
    does: "Tells you which crop is under Bolt, ripe or not. Looking is free.",
    gives: "A crop like `WHEAT` or `CARROT`, or `None` on bare soil.",
    forms: ["crop_here()", "crop_here() == CARROT", "crop_here() == None"],
    watch: ["Grass is a crop too: `crop_here() == GRASS`."],
    example: {
      code: "print(crop_here())\nmove(EAST)\nif crop_here() == CARROT:\n    harvest()",
      field: { map: ["...", "...", "WC."] },
    },
  },
  {
    id: "can_move",
    group: "looking",
    name: "can_move()",
    word: "can_move",
    learned: "5-1",
    short: "`can_move(EAST)` is `True` if Bolt can step that way.",
    does: "Checks if Bolt could take a step that way without bumping the fence. Looking is free.",
    gives: "`True` or `False`.",
    forms: [`can_move(DIR) with ${DIRECTIONS}`],
    watch: ["It only looks. Bolt still has to `move()`."],
    example: {
      code: "print(can_move(WEST))\nprint(can_move(EAST))",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "position",
    group: "looking",
    name: "position()",
    word: "position",
    learned: "5-6",
    short: "`position()` gives `(x, y)`, with `(0, 0)` in the south-west corner.",
    does: "Tells you where Bolt is. x counts steps east, y counts steps north. Looking is free.",
    gives: "Two numbers, like `(2, 0)`.",
    forms: ["position()", "position() == (0, 0)"],
    watch: ["Counting starts at 0, so the corner is `(0, 0)`, not `(1, 1)`."],
    example: {
      code: "print(position())\nmove(NORTH)\nmove(EAST)\nprint(position())",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "field_size",
    group: "looking",
    name: "field_size()",
    word: "field_size",
    learned: "8-5",
    short: "`field_size()` is how many tiles wide the field is.",
    does: "Tells you how wide (and tall) the field is, so one program can work on any size. Looking is free.",
    gives: "A number, like `5`.",
    forms: ["field_size()", "repeat field_size() - 1 times:"],
    watch: ["To walk across, Bolt takes one step fewer than the size."],
    example: {
      code: "print(field_size())\nrepeat field_size() - 1 times:\n    move(EAST)",
      python: "print(field_size())\nfor i in range(field_size() - 1):\n    move(EAST)",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "count",
    group: "looking",
    name: "count()",
    word: "count",
    learned: "6-1",
    short: '`count(WHEAT)` says how many Bolt has, and `count("hay")` how much hay.',
    does: "Tells you how many of something Bolt has picked in this run. Looking is free.",
    gives: "A number.",
    forms: ["count(WHEAT)", "count(CARROT)", 'count("hay")', "count(GRASS) (counts hay)"],
    watch: ["Grass gives hay, so `count(GRASS)` and `count(\"hay\")` are the same."],
    example: {
      code: 'harvest()\nprint(count("hay"))\nmove(EAST)\nharvest()\nprint(count(WHEAT))',
      field: { map: ["...", "...", "GW."] },
    },
  },
  {
    id: "ticks",
    group: "looking",
    name: "ticks()",
    word: "ticks",
    learned: null,
    short: "`ticks()` counts the ticks used so far.",
    does: "Tells you how many ticks this run has used. Looking is free.",
    gives: "A number.",
    forms: ["ticks()"],
    watch: ["Only actions use ticks. Looking around and printing don't."],
    example: {
      code: "move(EAST)\nmove(EAST)\nprint(ticks())",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "ripe_at",
    group: "looking",
    name: "ripe_at()",
    word: "ripe_at",
    learned: "7-4",
    short: "`ripe_at(x, y)` is `True` if there's a ripe sunflower at `(x, y)`. Sunflowers are tall, so Bolt can see them from anywhere.",
    does: "Looks across the field at the tile `(x, y)` and says if a ripe sunflower is there. Looking is free.",
    gives: "`True` or `False`.",
    forms: ["ripe_at(x, y)"],
    watch: ["It only sees sunflowers. Every other crop is too short."],
    example: {
      code: "print(ripe_at(0, 2))\nprint(ripe_at(1, 2))",
      field: { map: ["Ff.", "...", "..."] },
    },
  },

  // ---- Loops and choices ----
  {
    id: "repeat",
    group: "loops",
    name: "repeat 5 times",
    word: "repeat",
    learned: "2-1",
    short: "`repeat 5 times:` runs the indented lines below it that many times. In Python it's `for i in range(5):`",
    does: "Does the lines under it again and again, as many times as you say.",
    gives: null,
    forms: ["repeat 5 times:", "for 5 times:", "for i in range(5):", "for _ in range(5):"],
    watch: [
      "Put a colon at the end of the line.",
      "The lines to repeat are pushed in by 4 spaces. Lines that aren't pushed in run once, after the loop.",
      "After a loop line, Enter pushes the next line in for you. To come back out of the loop, press **Backspace**, or press Enter again on the empty line.",
      "Highlight lines and press **Tab** to push them into the loop, or **Shift+Tab** to pull them out.",
    ],
    example: {
      code: "repeat 3 times:\n    move(NORTH)",
      python: "for i in range(3):\n    move(NORTH)",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "one_after_another",
    group: "loops",
    name: "One loop after another",
    word: "repeat",
    learned: "2-2",
    short: "Two loops in a row: the first one finishes, then the second one starts.",
    does: "When a loop is done, Bolt goes on to the next line. That can be another loop.",
    gives: null,
    forms: ["repeat 2 times:\n    ...\nrepeat 3 times:\n    ..."],
    watch: ["The second loop isn't indented, so it isn't inside the first one."],
    example: {
      code: "repeat 2 times:\n    move(EAST)\nharvest()\nrepeat 2 times:\n    move(NORTH)",
      python: "for i in range(2):\n    move(EAST)\nharvest()\nfor i in range(2):\n    move(NORTH)",
      field: { map: ["....", "....", "....", "..G."] },
    },
  },
  {
    id: "nested",
    group: "loops",
    name: "A loop inside a loop",
    word: "nested",
    learned: "3-1",
    short: "A `repeat` inside a `repeat` does a whole loop each time round.",
    does: "The inner loop runs all the way through, every time the outer loop goes round once.",
    gives: null,
    forms: ["repeat 2 times:\n    repeat 3 times:\n        ..."],
    watch: ["The inner loop's lines are indented twice: 8 spaces.", "2 times round a loop of 3 is 6 steps."],
    example: {
      code: "repeat 2 times:\n    repeat 2 times:\n        move(EAST)\n    move(NORTH)",
      python: "for i in range(2):\n    for j in range(2):\n        move(EAST)\n    move(NORTH)",
      field: { map: [".....", ".....", ".....", ".....", "....."] },
    },
  },
  {
    id: "if",
    group: "loops",
    name: "if",
    word: "if",
    learned: "4-1",
    short: "`if ...:` runs the indented lines only when the answer is yes.",
    does: "Asks a question. If the answer is `True`, Bolt does the indented lines. If not, Bolt skips them.",
    gives: null,
    forms: ["if is_ripe():"],
    watch: ["Put a colon at the end, and indent the lines that belong to it."],
    example: {
      code: "if is_ripe():\n    harvest()\nmove(EAST)\nif is_ripe():\n    harvest()",
      field: { map: ["...", "...", "Ww."] },
    },
  },
  {
    id: "else",
    group: "loops",
    name: "else",
    word: "if",
    learned: "4-4",
    short: "`else:` after an `if` runs when the answer was no.",
    does: "Gives Bolt something else to do when the `if` question was `False`. One of the two always runs.",
    gives: null,
    forms: ["if ...:\n    ...\nelse:\n    ..."],
    watch: ["`else` lines up with its `if`, and has no question of its own."],
    example: {
      code: "repeat 2 times:\n    if ground_here() == GRASS:\n        till()\n    else:\n        plant(WHEAT)",
      python: "for i in range(2):\n    if ground_here() == GRASS:\n        till()\n    else:\n        plant(WHEAT)",
      field: { map: ["...", "...", "g.."] },
    },
  },
  {
    id: "elif",
    group: "loops",
    name: "else if",
    word: "elif",
    learned: "4-5",
    short: "`else if ...:` (or `elif ...:`) asks another question when the first answer was no.",
    does: "Lets Bolt choose between three or more things. Bolt asks each question in turn and does the first one that's `True`.",
    gives: null,
    forms: ["else if ...:", "elif ...:"],
    watch: ["Only the first `True` one runs, so put the most important question first."],
    example: {
      code: "repeat 3 times:\n    if is_ripe():\n        harvest()\n    else if ground_here() == GRASS:\n        till()\n    else:\n        plant(WHEAT)\n    move(EAST)",
      python: "for i in range(3):\n    if is_ripe():\n        harvest()\n    elif ground_here() == GRASS:\n        till()\n    else:\n        plant(WHEAT)\n    move(EAST)",
      field: { map: ["....", "....", "....", "Wg.."] },
    },
  },
  {
    id: "repeat_while",
    group: "loops",
    name: "repeat while",
    word: "repeat_while",
    learned: "5-1",
    short: "`repeat while ...:` keeps going while something is true. In Python: `while ...:`",
    does: "Asks the question before each time round, and keeps looping as long as the answer is `True`.",
    gives: null,
    forms: ["repeat while can_move(NORTH):", "while can_move(NORTH):"],
    watch: ["If the answer never changes, the loop never stops. Bolt gets tired after a while."],
    example: {
      code: "repeat while can_move(NORTH):\n    move(NORTH)",
      python: "while can_move(NORTH):\n    move(NORTH)",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "repeat_until",
    group: "loops",
    name: "repeat until",
    word: "repeat_until",
    learned: "5-2",
    short: "`repeat until is_ripe():` keeps going until something is true. In Python: `while not is_ripe():`",
    does: "Asks the question before each time round, and stops as soon as the answer is `True`.",
    gives: null,
    forms: ["repeat until is_ripe():", "while not is_ripe():"],
    watch: ["If it's already true at the start, the loop doesn't run at all."],
    example: {
      code: "repeat until is_ripe():\n    move(EAST)\nharvest()",
      python: "while not is_ripe():\n    move(EAST)\nharvest()",
      field: { map: ["....", "....", "....", "...W"] },
    },
  },
  {
    id: "repeat_forever",
    group: "loops",
    name: "repeat forever and break",
    word: "repeat_forever",
    also: ["stop"],
    learned: "5-6",
    short: "`repeat forever:` never stops on its own, and `break` jumps out. In Python: `while True:`",
    does: "Loops for good. Put an `if` with `break` inside, and Bolt jumps out of the loop when it's done.",
    gives: null,
    forms: ["repeat forever:", "while True:", "break", "continue (skip to the next time round)"],
    watch: ["Without a `break`, Bolt keeps going until it gets tired.", "`break` only jumps out of the loop it's in."],
    example: {
      code: "repeat forever:\n    move(NORTH)\n    if is_ripe():\n        harvest()\n        break",
      python: "while True:\n    move(NORTH)\n    if is_ripe():\n        harvest()\n        break",
      field: { map: ["....", "W...", "....", "...."] },
    },
  },
  {
    id: "variables",
    group: "loops",
    name: "set and change",
    word: "variables",
    learned: "6-2",
    short: "`set total to 0` and `change total by 1` make and update variables (`total = 0` and `total += 1` in Python).",
    does: "A variable is a name that remembers a number (or anything else). `set` gives it a value, `change` adds to it.",
    gives: null,
    forms: ["set steps to 0", "change steps by 1", "steps = 0", "steps += 1"],
    watch: ["Set a variable before you change it.", "`change steps by -1` takes one away."],
    example: {
      code: "set steps to 0\nrepeat 3 times:\n    move(NORTH)\n    change steps by 1\nprint(steps)",
      python: "steps = 0\nfor i in range(3):\n    move(NORTH)\n    steps += 1\nprint(steps)",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "count_from",
    group: "loops",
    name: "for x from 1 to 5",
    word: "count_from",
    learned: "6-3",
    short: "`for x from 1 to 10:` counts, like `for x in range(1, 11):`",
    does: "Goes round once for each number, and the variable holds the number each time.",
    gives: null,
    forms: ["for x from 1 to 5:", "for x in range(1, 6):"],
    watch: ["`from 1 to 5` includes 5. Python's `range(1, 6)` stops just before 6.", "It counts down too: `for x from 5 to 1:`."],
    example: {
      code: "for x from 1 to 3:\n    print(x)\n    move(EAST)",
      python: "for x in range(1, 4):\n    print(x)\n    move(EAST)",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "logic",
    group: "loops",
    name: "and, or, not",
    word: "logic",
    learned: "6-5",
    short: "`and`, `or` and `not` join questions: `if is_dry() and not is_ripe():`",
    does: "`and` is yes when both answers are yes. `or` is yes when either one is. `not` turns yes into no.",
    gives: "`True` or `False`.",
    forms: ["a and b", "a or b", "not a"],
    watch: ["`not` goes before the question: `not is_ripe()`."],
    example: {
      code: 'repeat 3 times:\n    if crop_here() == WHEAT and not is_ripe():\n        print("Wheat, but not ripe yet")\n    if is_ripe() or crop_here() == GRASS:\n        harvest()\n    move(EAST)',
      python: 'for i in range(3):\n    if crop_here() == WHEAT and not is_ripe():\n        print("Wheat, but not ripe yet")\n    if is_ripe() or crop_here() == GRASS:\n        harvest()\n    move(EAST)',
      field: { map: ["....", "....", "....", "WwG."] },
    },
  },

  // ---- Commands and windows ----
  {
    id: "define",
    group: "commands",
    name: "define",
    word: "define",
    learned: "7-1",
    short: "`define sweep_row:` (or `def sweep_row():`) makes your own command. Run it with `sweep_row()`.",
    does: "Teaches Bolt a new command made of other commands. Defining it does nothing yet. Bolt does it each time you use its name.",
    gives: null,
    forms: ["define hop:", "def hop():", "hop()"],
    watch: ["Use it with brackets: `hop()`.", "Define a command above the lines that use it."],
    example: {
      code: "define hop:\n    move(EAST)\n    move(NORTH)\n\nhop()\nhop()",
      python: "def hop():\n    move(EAST)\n    move(NORTH)\n\nhop()\nhop()",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "inputs",
    group: "commands",
    name: "Commands that take a number",
    word: "define",
    learned: "7-3",
    short: "`define go_east(steps):` makes a command that takes a number: `go_east(3)`.",
    does: "A name in the brackets is an input. Each time you use the command, the number you give goes into that name.",
    gives: null,
    forms: ["define go_north(steps):", "def go_north(steps):", "go_north(2)"],
    watch: ["Give it as many numbers as it has inputs."],
    example: {
      code: "define go_north(steps):\n    repeat steps times:\n        move(NORTH)\n\ngo_north(2)\nmove(EAST)\ngo_north(1)",
      python: "def go_north(steps):\n    for i in range(steps):\n        move(NORTH)\n\ngo_north(2)\nmove(EAST)\ngo_north(1)",
      field: { map: ["....", "....", "....", "...."] },
    },
  },
  {
    id: "give_back",
    group: "commands",
    name: "give back",
    word: "give_back",
    learned: "7-4",
    short: "`give back total` (or `return total`) ends your command and hands back an answer: `set n to ripe_in_row(2)`.",
    does: "Ends your command and hands an answer back to the line that used it, like `is_ripe()` does.",
    gives: "Whatever you give back.",
    forms: ["give back total", "return total"],
    watch: ["Bolt leaves the command as soon as it gives something back. Lines after it don't run."],
    example: {
      code: "define ripe_here:\n    if is_ripe():\n        give back 1\n    give back 0\n\nset total to 0\nchange total by ripe_here()\nmove(EAST)\nchange total by ripe_here()\nprint(total)",
      python: "def ripe_here():\n    if is_ripe():\n        return 1\n    return 0\n\ntotal = 0\ntotal += ripe_here()\nmove(EAST)\ntotal += ripe_here()\nprint(total)",
      field: { map: ["...", "...", "Ww."] },
    },
  },
  {
    id: "use",
    group: "commands",
    name: "use helper",
    word: "use",
    learned: "7-2",
    short: "`use helper` lets a window use every command made in the window called `helper`. `use go_home from helper` takes just one. In Python: `from helper import *`",
    does: "Lets one code window use the commands you defined in another. Keep your handy commands in one window and use them anywhere.",
    gives: null,
    forms: ["use helper", "use helper, crops", "use go_home from helper", "from helper import *", "import helper"],
    watch: ["The name after `use` is the window's name.", "A window you use runs once, the first time it's used."],
    example: {
      code: "use helper\n\ntwo_steps()\nmove(NORTH)",
      python: "from helper import *\n\ntwo_steps()\nmove(NORTH)",
      files: { helper: "define two_steps:\n    move(EAST)\n    move(EAST)" },
      field: { map: ["...", "...", "..."] },
    },
  },

  // ---- Lists ----
  {
    id: "lists",
    group: "lists",
    name: "Lists and for each",
    word: "lists",
    learned: "8-1",
    short: "`[WHEAT, CARROT]` is a list. `plan[0]` is its first item. `for each crop in plan:` (or `for crop in plan:`) goes through it.",
    does: "A list keeps things in order. `for each` goes round once for every item, with the item in a variable.",
    gives: null,
    forms: ["[NORTH, EAST, NORTH]", "steps[0]", "for each way in steps:", "for way in steps:"],
    watch: ["The first item is number 0, not 1.", "Items are split by commas, inside square brackets."],
    example: {
      code: "set steps to [NORTH, EAST, NORTH]\nprint(steps[0])\nfor each way in steps:\n    move(way)",
      python: "steps = [NORTH, EAST, NORTH]\nprint(steps[0])\nfor way in steps:\n    move(way)",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "list_of_lists",
    group: "lists",
    name: "A list of lists",
    word: "lists",
    learned: "8-3",
    short: "A list can hold lists, like the rows of a field: `rows[1][0]`.",
    does: "Each item of the big list is a list of its own, like one row of a field. `rows[1]` is a whole row, and `rows[1][0]` is the first thing in it.",
    gives: null,
    forms: ["[[WHEAT, GRASS], [CARROT, WHEAT]]", "rows[1]", "rows[1][0]", "for each row in rows:\n    for each crop in row:"],
    watch: ["Two loops, one inside the other, go through every item."],
    example: {
      code: "set rows to [[WHEAT, GRASS], [CARROT, WHEAT]]\nprint(rows[1])\nprint(rows[1][0])",
      python: "rows = [[WHEAT, GRASS], [CARROT, WHEAT]]\nprint(rows[1])\nprint(rows[1][0])",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "add",
    group: "lists",
    name: "add ... to",
    word: "add",
    learned: "8-4",
    short: "`add crop to basket` (or `basket.append(crop)`) puts something on the end of a list.",
    does: "Puts a new item on the end of a list. Start with an empty list, `[]`, and add to it as you go.",
    gives: null,
    forms: ["add WHEAT to basket", "basket.append(WHEAT)"],
    watch: ["The list has to exist first: `set basket to []`."],
    example: {
      code: "set basket to []\nadd WHEAT to basket\nadd CARROT to basket\nprint(basket)",
      python: "basket = []\nbasket.append(WHEAT)\nbasket.append(CARROT)\nprint(basket)",
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "in_len",
    group: "lists",
    name: "in, not in and len()",
    word: "lists",
    learned: "8-4",
    short: "`crop in basket` checks whether a list has something, `not in` whether it doesn't. `len(basket)` is how many things it has.",
    does: "`in` and `not in` ask whether something is in a list. `len()` counts the items.",
    gives: "`in` gives `True` or `False`. `len()` gives a number.",
    forms: ["CARROT in basket", "CARROT not in basket", "len(basket)"],
    watch: ["An empty list has `len()` 0."],
    example: {
      code: 'set basket to [WHEAT]\nif CARROT not in basket:\n    print("No carrot yet")\nprint(len(basket))',
      python: 'basket = [WHEAT]\nif CARROT not in basket:\n    print("No carrot yet")\nprint(len(basket))',
      field: { map: ["...", "...", "..."] },
    },
  },
  {
    id: "order",
    group: "lists",
    name: "order()",
    word: "order",
    learned: "8-4",
    short: "On market days, `order()` gives the list of crops Mayor Maple wants, one of each.",
    does: "Gives Mayor Maple's market order for this field: a list of crops to bring.",
    gives: "A list of crops, like `[CARROT, WHEAT]`. It's different on each test plot.",
    forms: ["order()"],
    watch: ["Only market quests have an order. Anywhere else it stops with a note."],
    example: {
      code: "set wanted to order()\nprint(wanted)\nprint(len(wanted))",
      python: "wanted = order()\nprint(wanted)\nprint(len(wanted))",
      field: { map: ["...", "...", "..."], data: { order: ["carrot", "wheat"] } },
    },
  },
  {
    id: "design",
    group: "lists",
    name: "design()",
    word: "lists",
    learned: "8-7",
    short: "At the festival, `design()` gives a list of rows to plant, south row first.",
    does: "Gives Aunt Juniper's design for the field: a list of rows, south row first, each a list of crops.",
    gives: "A list of lists, like `[[WHEAT, CARROT], [CARROT, WHEAT]]`.",
    forms: ["design()", "design()[0]"],
    watch: ["Only the Grand Display has a design. Anywhere else it stops with a note."],
    example: {
      code: "set rows to design()\nprint(rows[0])",
      python: "rows = design()\nprint(rows[0])",
      field: { map: ["...", "...", "..."], data: { design: [["wheat", "carrot"], ["carrot", "wheat"]] } },
    },
  },
  {
    id: "reversed",
    group: "lists",
    name: "reversed()",
    word: "lists",
    learned: "8-7",
    short: "`reversed(row)` goes through a list from the end to the start.",
    does: "Gives the items of a list backwards, last one first. Handy when Bolt walks a row the other way.",
    gives: "The same items, back to front.",
    forms: ["reversed(row)", "for each crop in reversed(row):"],
    watch: ["It doesn't change the list itself."],
    example: {
      code: "set row to [WHEAT, CARROT, GRASS]\nfor each crop in reversed(row):\n    print(crop)",
      python: "row = [WHEAT, CARROT, GRASS]\nfor crop in reversed(row):\n    print(crop)",
      field: { map: ["...", "...", "..."] },
    },
  },

  // ---- Crops ----
  crop("grass", "Grass", "1-1", "Grass: grows back by itself, ripe after 4 ticks, gives hay.",
    "Free. Ripe after 4 ticks. Gives 1 hay.", "Grows back by itself after you pick it, so you can pick the same tile again."),
  crop("wheat", "Wheat", "2-4", "Wheat: ripe after 8 ticks, gives wheat.",
    "Free. Ripe after 8 ticks. Gives 1 wheat.", "Wheat pays for most other seeds."),
  crop("strawberry", "Strawberry", "3-5", "Strawberry: costs 3 wheat, ripe after 12 ticks. Gives 1 strawberry, plus 1 more for each strawberry right next to it when it gets ripe.",
    "Costs 3 wheat. Ripe after 12 ticks. Gives 1, plus 1 for each friend.", "Friends: when it ripens it counts the strawberries right next to it, and gives 1 more for each. A 2 by 2 square makes 12."),
  crop("carrot", "Carrot", "4-1", "Carrot: costs 2 wheat, ripe after 14 ticks, gives a carrot. Plant it where wheat was just picked and it gives 2!",
    "Costs 2 wheat. Ripe after 14 ticks. Gives 1, or 2 after wheat.", "Crop swap: planted on soil where wheat was just picked, it gives 2."),
  crop("pumpkin", "Pumpkin", "4-5", "Pumpkin: costs 1 carrot, ripe after 16 ticks. It rots 30 ticks after that. A rotten pumpkin can't be picked, but `till()` clears it away.",
    "Costs 1 carrot. Ripe after 16 ticks. Gives 1 pumpkin.", "Rots: 30 ticks after it's ripe it rots. A rotten pumpkin can't be picked, and `till()` clears it."),
  crop("lettuce", "Lettuce", "4-6", "Lettuce: costs 2 hay, ripe after 6 ticks, gives a lettuce. It wilts 8 ticks after it's ripe, so pick the first one you planted first!",
    "Costs 2 hay. Ripe after 6 ticks. Gives 1 lettuce.", "Wilts: it stays crisp for 8 ticks, then wilts and gives nothing. First planted, first picked."),
  crop("mushroom", "Mushroom", "5-6", "Mushroom: grows by itself in the fog, and can't be planted.",
    "Can't be planted. Gives 1 mushroom.", "Wild: it grows by itself in the fog, somewhere different each time."),
  crop("corn", "Corn", "6-5", "Corn: costs 1 wheat, and only grows while its soil is wet. Ripe after 10 wet ticks, gives 2 corn.",
    "Costs 1 wheat. Ripe after 10 wet ticks. Gives 2 corn.", "Thirsty: it only grows while its soil is wet. `water()` wets it for 6 ticks."),
  crop("blueberry", "Blueberry", "6-6", "Blueberry: costs 2 carrots, ripe after 24 ticks. The bush stays when you pick it and is ripe again 10 ticks later. It gives 2 blueberries, then 1 more each time, up to 5. Picking it early loses the whole bush.",
    "Costs 2 carrots. Ripe after 24 ticks. Gives 2, then 3, 4, 5, 5...", "Bush: it stays after a ripe harvest and is ripe again 10 ticks later. Picking it early loses the whole bush."),
  crop("sunflower", "Sunflower", "7-4", "Sunflower: costs 2 wheat, ripe after 40 ticks. So tall Bolt can see it from anywhere.",
    "Costs 2 wheat. Ripe after 40 ticks. Gives 1 sunflower.", "Tall: Bolt can see it from anywhere with `ripe_at(x, y)`."),
];

function crop(item, name, learned, short, does, rule) {
  return {
    id: `crop_${item}`, group: "crops", name, word: null, learned, crop: item, short, does,
    gives: null, forms: [`plant(${item.toUpperCase()})`], watch: [rule], example: null,
  };
}

export function findConcept(id) {
  return CONCEPTS.find((c) => c.id === id) ?? null;
}

// The lessons to show before a quest: every concept it's the first to need.
export function lessonsFor(questId) {
  return CONCEPTS.filter((c) => c.learned === questId && c.example);
}

// An example's own little field, as a fresh farm state, and its plot data.
export function exampleField(c) {
  return questField({ id: c.id, field: c.example.field });
}

export function exampleData(c) {
  return plotData({ field: c.example.field });
}

// The chapter an entry opens in: its word's chapter, or else the chapter of
// the quest that first needs it.
export function conceptChapter(c, chapterOfQuest) {
  if (c.word) return WORDS[c.word].chapter;
  return chapterOfQuest(c.learned);
}

// Text with `code` and **bold** in it, split into pieces for the page:
// [{ text, code: true }, { text, bold: true }, { text }].
export function richText(text) {
  const parts = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push(m[1] != null ? { text: m[1], code: true } : { text: m[2], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
