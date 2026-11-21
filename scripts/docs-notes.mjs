// Hand-written text for the docs that scripts/build-docs.mjs generates.
// The quest data, the coding words and the solutions come from the game and
// tests/solutions.mjs; this file only adds the plain-language explanations.
// tests/docs.test.mjs fails if a word or a solution has no note here.

// Every coding word in js/words.js: what it means, in plain words, and a tiny
// example. `forms` lists every way to write it.
export const WORD_NOTES = {
  move: {
    text: "Bolt takes one step NORTH, SOUTH, EAST or WEST. Each step takes one tick.",
    example: "move(EAST)",
  },
  harvest: {
    text: "Bolt picks the crop on its tile. Picking a crop before it's ripe loses it.",
    example: "harvest()",
  },
  till: {
    text: "Turns grass into soil, or soil back into grass. Crops (except grass) need soil, and `till()` also clears a rotten pumpkin.",
    example: "till()",
  },
  plant: {
    text: "Plants a seed on Bolt's tile. Wheat seeds are free; other seeds cost crops from the barn.",
    example: "plant(WHEAT)",
    forms: ["plant(WHEAT)", "plant(Crop.WHEAT)"],
  },
  wait: {
    text: "Bolt does nothing for one tick while the crops keep growing.",
    example: "wait()",
  },
  repeat: {
    text: "Runs the lines under it a set number of times. The number can be a sum or a name, like `size - 1`.",
    forms: ["repeat 5 times:", "for 5 times:", "for _ in range(5):", "for i in range(5): (when the loop doesn't use i)"],
    example: "repeat 4 times:\n    harvest()\n    move(EAST)",
  },
  nested: {
    text: "A loop inside a loop: the inside loop runs all the way through every time the outside loop goes round once. Good for whole fields: rows inside the field.",
    example: "repeat 2 times:\n    repeat 3 times:\n        move(EAST)\n    move(NORTH)",
  },
  if: {
    text: "Bolt looks first, and only does the lines under `if` when the check is true. The lines under `else` run when it's false.",
    forms: ["if ...:", "else:"],
    example: "if is_ripe():\n    harvest()\nelse:\n    wait()",
  },
  elif: {
    text: "A second check, tried only when the first one was false. Good for three-way choices.",
    forms: ["else if ...:", "elif ...:"],
    example: "if is_ripe():\n    harvest()\nelse if is_rotten():\n    till()",
  },
  compare: {
    text: "Compares two things, and is true or false: `==` same, `!=` different, `<` less, `>` more, `<=` and `>=` less or more, or the same.",
    forms: ["==", "!=", "<", ">", "<=", ">="],
    example: "if crop_here() == CARROT:\n    harvest()",
  },
  is_ripe: {
    text: "Checks whether the crop on Bolt's tile is ready to pick. Looking is free: it takes no ticks.",
    example: "if is_ripe():\n    harvest()",
  },
  is_rotten: {
    text: "Checks whether the pumpkin on Bolt's tile has rotted. A rotten pumpkin can't be picked, only tilled away.",
    example: "if is_rotten():\n    till()",
  },
  crop_here: {
    text: "Gives back the crop on Bolt's tile, like `CARROT`, or `None` when there isn't one. (`Crop.CARROT` means the same.)",
    example: "if crop_here() == MUSHROOM:\n    harvest()",
  },
  ground_here: {
    text: "Gives back `GRASS` or `SOIL` for Bolt's tile.",
    example: "if ground_here() == GRASS:\n    till()",
  },
  repeat_until: {
    text: "Keeps going round until the check becomes true. Good when you don't know how many times it will take.",
    forms: ["repeat until ...:", "while not ...:"],
    example: "repeat until is_ripe():\n    wait()",
  },
  repeat_while: {
    text: "Keeps going round as long as the check stays true.",
    forms: ["repeat while ...:", "while ...:"],
    example: "repeat while can_move(EAST):\n    move(EAST)",
  },
  repeat_forever: {
    text: "Goes round and round with no end, so it needs a `break` inside to stop.",
    forms: ["repeat forever:", "while True:"],
    example: "repeat forever:\n    if is_ripe():\n        break\n    move(EAST)",
  },
  stop: {
    text: "Jumps out of the loop Bolt is in, straight away. (`continue`, which skips to the next time round, counts as the same word.)",
    forms: ["break", "continue"],
    example: "repeat forever:\n    if crop_here() == MUSHROOM:\n        break\n    move(EAST)",
  },
  can_move: {
    text: "Checks whether Bolt can step that way. It's false at the edge of the field.",
    example: "if can_move(NORTH):\n    move(NORTH)",
  },
  position: {
    text: "Gives back where Bolt is, as `(x, y)`. `(0, 0)` is the south-west corner. `position()[0]` is just x, and `position()[1]` is just y.",
    example: "repeat until position() == (0, 0):\n    move(WEST)",
  },
  field_size: {
    text: "Gives back how many tiles wide (and tall) the field is, so one program can work on any size.",
    example: "repeat field_size() - 1 times:\n    move(EAST)",
  },
  variables: {
    text: "A name that remembers a number (or anything else). `set` gives it a value and `change` adds to it.",
    forms: ["set total to 0", "change total by 1", "total = 0", "total += 1"],
    example: "set planted to 0\nchange planted by 1",
  },
  count: {
    text: "Gives back how many of an item Bolt has picked in this run.",
    example: "repeat until count(\"hay\") == 7:\n    harvest()\n    move(EAST)",
  },
  ticks: {
    text: "Gives back how many ticks this run has used so far.",
    example: "if ticks() > 20:\n    print(\"slow!\")",
  },
  count_from: {
    text: "Counts with a name, one number at a time, from the first number to the last (the last one included). It counts down if the first number is bigger.",
    forms: ["for x from 1 to 5:", "for x in range(1, 6): (when the loop uses x)"],
    example: "for row from 1 to 5:\n    repeat row times:\n        move(EAST)",
  },
  logic: {
    text: "Puts checks together: `and` needs both to be true, `or` needs either one, and `not` flips a check.",
    forms: ["and", "or", "not"],
    example: "if is_dry() and not is_ripe():\n    water()",
  },
  water: {
    text: "The watering can: `water()` wets Bolt's tile for 6 ticks and uses one of its 5 drops, `refill()` fills it at the well, `is_dry()` checks the soil, and `water_left()` gives back the drops left.",
    forms: ["water()", "refill()", "is_dry()", "water_left()"],
    example: "if is_dry():\n    water()",
  },
  define: {
    text: "Teaches Bolt a new command made of other commands. It can take inputs in brackets.",
    forms: ["define sweep:", "define go(steps):", "def go(steps):"],
    example: "define go(steps):\n    repeat steps times:\n        move(EAST)\n\ngo(3)",
  },
  use: {
    text: "Lets one code window use the commands another window defines.",
    forms: ["use helper", "use helper, crops", "use go_home from helper", "from helper import *", "import helper"],
    example: "use helper\nplant_row(EAST)",
  },
  give_back: {
    text: "Ends a command you defined and hands an answer back to whoever used it.",
    forms: ["give back n", "return n"],
    example: "define double(n):\n    give back n * 2",
  },
  ripe_at: {
    text: "Checks whether the sunflower at `(x, y)` is ripe. Sunflowers are tall, so Bolt can see them from anywhere.",
    example: "if ripe_at(2, 3):\n    print(\"ripe!\")",
  },
  lists: {
    text: "A list keeps several things in order, in square brackets. `for each` goes through it one thing at a time, `in` checks whether something is in it, and `len` says how long it is.",
    forms: ["[1, 2, 3]", "for each crop in plan:", "for crop in plan:", "plan[0]", "crop in plan", "len(plan)", "reversed(plan)", "[c for c in plan]"],
    example: "for each crop in [WHEAT, CARROT]:\n    plant(crop)\n    move(EAST)",
  },
  add: {
    text: "Puts one more thing on the end of a list.",
    forms: ["add crop to basket", "basket.append(crop)"],
    example: "set basket to []\nadd WHEAT to basket",
  },
  order: {
    text: "Gives back the Mayor's market order for this plot: a list of the crops to bring.",
    example: "if crop_here() in order():\n    harvest()",
  },
  advanced: {
    text: "Python that no chapter teaches, like classes, `lambda`, `try` and dictionaries. It opens after the festival.",
    example: "class Basket:\n    pass",
  },
};

// New crops, rules and ideas each chapter brings in, beyond its coding words.
export const CHAPTER_NOTES = {
  1: "Grass is the first crop: it's ripe after 4 ticks and gives 1 hay. Each line runs once, in order from top to bottom, and every action (`move`, `harvest`) takes one tick. Quest 1-6 is the first **Fix Bolt's code** quest: it starts with a program that almost works.",
  2: "Grass grows back by itself after it's picked, and wheat (free, ripe after 8 ticks) is the first seed. `wait()` lets crops grow while Bolt stands still. Quest 2-6 is a Fix Bolt's code quest.",
  3: "Strawberries (3 wheat, ripe after 12 ticks) arrive with the **Friends** rule: each one gives 1 more for every strawberry right next to it when it ripens, so a 2 by 2 square of 4 makes 12 (3-5, 3-9). Quests 3-6 and 3-11 are Fix Bolt's code quests. Quest 3-10 is the first with an **exact** goal: harvesting too much fails it.",
  4: "Crops can now be picked too early, so `noLoss` quests fail if Bolt picks an unripe crop. **Pumpkins** rot 30 ticks after ripening (4-5, 4-7). **Lettuce** wilts 8 ticks after it's ripe and gives nothing, so the first planted must be the first picked (4-6). Quest 4-7 is the first with **test plots**: the same program runs on 2 different fields. Quest 4-11 is a Fix Bolt's code quest.",
  5: "**Fog** hides every tile more than one step from Bolt (5-1, 5-3 to 5-5), so counting steps stops working. **Mushrooms** grow wild in the fog, in a different spot on each test plot (5-6, 5-8). **Crop swap:** carrots planted where wheat was just picked give 2 (5-7).",
  6: "More goals now ask for an *exact* number. **Corn** only grows while its soil is wet, so it needs the watering can and trips to the well (6-5, 6-7). **Blueberry bushes** stay after a ripe harvest and are ripe again 10 ticks later, giving more each time (6-6).",
  7: "Code can be split across several named **code windows**, and one window can use another (7-2). **Sunflowers** are tall, so `ripe_at(x, y)` can check any of them from anywhere (7-4, 7-5).",
  8: "Chapter 8 ends with **Festival Day**: The Big Basket (8-5), The Fog Race (8-6) and The Grand Display (8-7), each on test plots and judged by a neighbor. `design()` gives the rows to plant on each plot in 8-7. Finishing all three plays the festival.",
};

export const AFTER_FESTIVAL_NOTE = "After chapter 8 the map gets a ninth page. No new words are taught here, but anything no chapter teaches (classes, `lambda`, `try` and so on) opens. Golden quests take one old quest's idea per chapter and run it on 2 or 3 test plots the player hasn't seen, so the program has to look around rather than count. Each gives a golden star (they don't count toward chapter stars) and a trophy. The contract board has 12 orders from the neighbors, 3 at a time, filled on the home farm with the player's own seeds within a tick budget. Contracts have no fixed answer, so they aren't in the solutions doc.";

// Why each 3-star solution works, and what makes it fast enough.
export const SOLUTION_NOTES = {
  "1-1": "Bolt is already standing on ripe grass, so a single harvest is the whole program: 1 tick.",
  "1-2": "One step east puts Bolt on the grass, then it picks it. Two lines, two ticks.",
  "1-3": "Harvest, step, harvest, step, harvest. There's no wasted step after the last tile, which is what keeps it to 5 ticks.",
  "1-4": "Bolt walks straight up the west side to the top row, picks, then walks along the top to the other tile. Going up first means no step is ever walked back.",
  "1-5": "Walk out, pick, and walk the same steps back. The `at` goal checks where Bolt ends, so the walk home is part of the answer.",
  "1-6": "The fixed version of Bolt's code. The starter stepped north instead of east first, and picked the second tile one step too soon; here Bolt steps east to the first grass, then two more steps to the second.",
  "2-1": "The loop picks and steps 4 times, and one last `harvest()` after the loop picks the fifth tile without stepping off the edge.",
  "2-2": "Two loops of 5 steps reach the north-east corner of the 6 by 6 field. Every step is useful, so it's the fewest ticks possible.",
  "2-3": "Grass grows back 4 ticks after it's picked. The harvest itself is one tick, so 3 waits are exactly enough before the next pick.",
  "2-4": "Each tile needs tilling (grass to soil) and then planting. The last tile is done after the loop so Bolt doesn't step off the edge.",
  "2-5": "Pick the first row going east, step north, and pick the second row coming back west. Walking back and forth like this (a *snake*) means no empty walks.",
  "2-6": "The starter repeated one step too many and bumped the fence. The fence is 5 steps away, so `repeat 5 times` is the fix.",
  "3-1": "The outside loop does two pairs of rows; the inside loops plant along a row east, then west on the way back. Snaking means Bolt never walks a row empty.",
  "3-2": "The same snake as 3-1, with `harvest()` in place of `plant`.",
  "3-3": "A snake over 5 rows: the outside loop does 2 pairs of rows, and the fifth row is picked after the loop. All 25 tiles in 49 ticks: 25 picks and 24 steps.",
  "3-4": "The 3-3 snake again, planting instead of picking. Empty soil needs no tilling, so it's 25 plants and 24 steps.",
  "3-5": "Four strawberries in a 2 by 2 square each have 2 friends, so each gives 3: 12 from wheat for only 4. Waiting until they're all ripe before picking any keeps every friend in place.",
  "3-6": "The starter had its numbers swapped: the field is 2 rows of 4, so the outside loop goes round 2 times and the inside loops take 3 steps. The `print` is from Bolt's original code and costs no ticks.",
  "3-7": "Grass is ripe again 4 ticks after it's picked. Going back and forth along the row, picking on the way out and on the way back, Bolt never walks a step without picking: 12 picks and 12 steps, and the last step west lands on the barn.",
  "3-8": "The 3-1 snake with three actions on every tile: `harvest()` for the hay, `till()` to turn grass into soil, and `plant(WHEAT)`. 48 actions and 16 steps (the last step north bumps the fence).",
  "3-9": "A block 2 wide and 4 tall has 10 pairs of neighbors, so the 8 strawberries make 8 + 20 = 28. Planting it as a zig-zag going up keeps the first and last planted far apart, so Bolt can walk back down and start picking the first ones while the last ones are still growing. Each one is picked only after all its neighbors have ripened, so no friends are lost.",
  "3-10": "4 rows of 3 makes 12. Snaking 3 tiles along each of the 4 rows fits a loop inside a loop exactly, and the fourth column of wheat is never touched.",
  "3-11": "The fixed version of Bolt's code. In the loop going west the starter planted before tilling, so the wheat had nowhere to grow; tilling first turns the grass into soil.",
  "4-1": "Bolt checks every tile and only picks the ripe ones, so no young carrot is lost. Looking with `is_ripe()` is free, so the checks cost no ticks.",
  "4-2": "The 3-2 snake with a check before every pick.",
  "4-3": "Tilling soil turns it back into grass, so Bolt only tills where `ground_here()` says grass. A snake covers the field.",
  "4-4": "`if` / `else`: a ripe carrot gets picked; anything else is an empty tile that gets wheat. The last tile is always empty, so it's planted after the loop with no check.",
  "4-5": "A three-way choice: pick ripe, till rotten, and leave young pumpkins alone. `else if` is only checked when the first check was false.",
  "4-6": "Lettuce is ripe 6 ticks after planting and wilts 8 ticks after that. Planting west to east and then picking west to east means the first planted is the first picked, so none wilt. If the first one isn't quite ripe, one `wait()` is enough.",
  "4-7": "The 4-5 choice inside the 4-2 snake. Because it checks every tile, the same program works on both test plots.",
  "4-8": "Ripe wheat is ripe too, so Bolt asks two questions, one inside the other: is it a carrot, and is it ripe? Young carrots that ripen before Bolt gets to them are picked too. Both plots in 44 ticks.",
  "4-9": "Each carrot picked pays for the pumpkin seed planted in its place (1 carrot each), and every other tile was bare, so `else` plants wheat. The carrots are in different places on the two plots, so the program looks at every tile.",
  "4-10": "Lettuce is ripe 6 ticks after planting and wilts 8 ticks after that. After planting the row, Bolt walks back to the first lettuce and goes east again, picking each one and planting a new one in its place. Doing that twice gives 8 lettuce and leaves the row growing. Only the first row is planted without the loop, so Bolt never walks back from the west edge for nothing.",
  "4-11": "The fixed version of Bolt's code. Young and rotten pumpkins are pumpkins too, so the starter's `crop_here() == PUMPKIN` picked the young ones and never reached the `else if`. Asking `is_ripe()` instead lets the rotten ones fall through to `till()`.",
  "4-12": "Two checks in a row: the first picks a ripe crop or tills a rotten one, and the second plants wheat whenever the tile is now bare (`crop_here() == None`). A young crop isn't bare, so it's left alone. Ripe pumpkins sit near the start of each plot, so they're picked well before they rot.",
  "5-1": "In the fog Bolt can't count the steps, so it keeps stepping while there's room. It stops right at the east edge.",
  "5-2": "Bolt waits until the carrot is ripe, then picks it. Not one tick is wasted, and picking early (which would lose the carrot) can't happen.",
  "5-3": "Pick and step while there's room, and the last pick after the loop gets the tile at the edge.",
  "5-4": "Bolt walks east until it's standing on something ripe, then picks it. The loop stops on exactly the right tile.",
  "5-5": "Walk west to the edge, then south to the edge, and that's the corner.",
  "5-6": "`repeat forever` with a `break` the moment the mushroom is found and picked; then `repeat until position() == (0, 0)` walks home. It never needs to know where the mushroom is, so it works on all 3 plots.",
  "5-7": "Picking wheat and planting a carrot on the same tile straight away gets the crop swap, so each carrot gives 2. Then Bolt walks back and waits for each carrot in planting order.",
  "5-8": "A search over the whole field: east along each row, and at the east edge walk back to the west edge and step north. It stops as soon as the mushroom is picked.",
  "6-1": "`count(\"hay\")` keeps track of how many have been picked, so Bolt stops at exactly 7 even though the row has 8.",
  "6-2": "`planted` counts each carrot, and the loop stops when it reaches 10. The check comes before the step, so Bolt doesn't walk an extra tile.",
  "6-3": "`for row from 1 to 5` counts the rows; row 1 gets 1 wheat, row 2 gets 2, and so on, making the staircase. Bolt walks back to the west edge before going up.",
  "6-4": "Two `repeat until count(...)` loops: one for exactly 3 hay on the grass row, then one for exactly 4 wheat on the row above.",
  "6-5": "Water only where it's needed: dry *and* not ripe. Ripe corn gets picked. The `can_move` check stops Bolt bumping the fence after the last tile.",
  "6-6": "Bolt patrols between the two bushes and picks whenever one is ripe, never early, so each bush keeps giving more. `way` remembers which way it's walking, and turns round at each end.",
  "6-7": "The can holds 5 drops, and each row has 5 tiles to look at. Bolt fills up at the well, waters the dry young corn in the first row, comes back to refill, and does the second row.",
  "7-1": "`row_east` and `row_west` are taught once and used three times, so the program is much shorter than writing every row out.",
  "7-2": "`plant_row(way)` lives in the helper window and takes the direction as an input, so the same command plants the row going east and the one coming back west.",
  "7-3": "`go(way, steps)` takes two inputs, so one command does every walk.",
  "7-4": "`ripe_in_row(y)` uses `ripe_at` to count the ripe sunflowers in a row without walking it, and gives the number back. Bolt only walks along rows that have 3 or more, and `can_move(EAST)` tells it which way it's facing the row from.",
  "7-5": "Bolt counts each row from where it stands, keeps the best row in `best`, and only then walks there, so no ticks are spent walking rows it won't pick.",
  "8-1": "The plan is a list, and `for each` plants its crops in order. The `can_move` check stops Bolt bumping the fence after the last one.",
  "8-2": "The list `[1, 2, 1]` is how many steps to take before each harvest.",
  "8-3": "Two lists hold the two row patterns, and one `plant_row(plan, way)` command plants either one in either direction.",
  "8-4": "`basket` remembers what's been picked. Bolt only picks a crop that's in the order and not in the basket yet, and stops as soon as the basket is as long as the order, so it works for each plot's different order.",
  "8-5": "`size` comes from `field_size()`, so the same snake fits both plot sizes. `pick` only picks ripe crops, and the snake reaches the lettuce row first, before any of it can wilt.",
  "8-6": "A snake search for the carrot (east along a row, north at the edge, then west), then home: walk west until x is 0, then south until y is 0. It works wherever the carrot is.",
  "8-7": "`design()` gives a list of rows. Bolt plants each row with a helper command, snaking: rows going west are planted from a reversed copy, so the crops still land in the right places.",
  "G-1": "Bolt keeps picking and stepping east for as long as there's ripe grass under it, so it fits every row length.",
  "G-2": "Each time round picks a whole row and steps north, snaking. The loop stops when Bolt steps onto a row with no ripe grass, so it fits any number of rows.",
  "G-3": "A snake sized by `field_size()`, so one program fits the 3, 4 and 5 tile fields. Every crop on these fields starts ripe.",
  "G-4": "The 4-7 three-way choice in a `tend` command, inside a snake sized by `field_size()`.",
  "G-5": "The 8-6 snake search, looking for a mushroom instead of a carrot, then home to the corner.",
  "G-6": "The well and the corn row move about on each plot, so Bolt looks: it refills, steps to the corn row (north or south), picks the way to walk from which side it's on, then waters every dry young corn along the row.",
  "G-7": "The 7-4 program with every 4 replaced by `size - 1`, so it fits any field.",
  "G-8": "The 8-4 basket program, on three new market days.",
};

// The programming concepts each chapter teaches, in general terms: what the
// idea is called outside the game, what it means, how the game shows it, and
// what it looks like in everyday Python. Each point starts with its concept's
// name in bold, which the overview table lists.
export const CHAPTER_CONCEPTS = {
  1: {
    points: [
      "**Sequencing.** A program is a list of instructions that run one at a time, top to bottom, in exactly the order they're written. The computer doesn't guess what you meant: if `harvest()` comes before `move(EAST)`, Bolt picks before it walks. This is the first and most important idea in programming.",
      "**Commands (function calls).** `move(EAST)` and `harvest()` are *calls*: the name says what to do, and the brackets hold any extra information the command needs, called an *argument*. `EAST` is the argument to `move`. Even a command with nothing to say still needs its brackets, which is why `harvest` on its own doesn't run.",
      "**Algorithms.** Getting the grass in the fewest ticks means planning the shortest path before writing it. A step-by-step plan for solving a problem is an *algorithm*, and the star targets reward a good one.",
      "**Debugging.** Quest 1-6 starts with code that's wrong, and the player finds and fixes the mistakes. Reading code to find where it goes wrong is a skill of its own, and the game helps by lighting up each line as it runs.",
    ],
  },
  2: {
    points: [
      "**Loops.** Instead of writing `harvest()` and `move(EAST)` five times, `repeat 5 times:` runs the lines under it again and again. A loop that runs a known number of times is called *definite iteration*; in Python it's `for _ in range(5):`. Loops are how short programs do big jobs.",
      "**The loop body and indentation.** The lines that belong to a loop are indented under it (4 spaces). Indentation is how Python knows where a block starts and ends, so a line indented by mistake is inside the loop, and a line not indented is after it.",
      "**Off-by-one.** Five tiles need five picks but only four steps between them, which is why the solutions repeat 4 times and pick once more after the loop. Being one too many or one too few is one of the most common bugs in programming, and quest 2-6 is built around it.",
      "**State changes over time.** `wait()` does nothing, but the world keeps changing: crops grow every tick. A program runs against a world that has *state*, and the same line can do different things depending on when it runs.",
    ],
  },
  3: {
    points: [
      "**Nested loops.** A loop can hold another loop. The inside loop runs all the way through every time the outside loop goes round once, so 2 times round the outside and 3 times round the inside does the inside lines 6 times. This is how programs work through anything with rows and columns: a grid, a table, an image.",
      "**Finding the pattern.** A whole field is rows, and a row is tiles. Breaking a big job into a repeated smaller job (*decomposition*) and spotting the part that repeats (*pattern recognition*) is how the solutions get from 25 tiles to a few lines of code.",
      "**Coordinates and grids.** The field is a 2D grid: east-west is x, north-south is y. Walking it row by row and turning at each end (a *snake*) is a classic way to visit every cell of a grid.",
    ],
  },
  4: {
    points: [
      "**Conditionals.** `if` lets a program make a choice: the lines under it only run when the check is true, and the lines under `else` run when it's false. `else if` (Python's `elif`) adds more choices, tried in order until one is true. Until now Bolt did the same thing every time; now it can react.",
      "**Booleans.** A check like `is_ripe()` gives back one of two values: `True` or `False`. These are called *Boolean* values, and every `if` and every loop condition is a Boolean in the end.",
      "**Comparison.** `==` asks whether two things are the same (`crop_here() == CARROT`), and `!=`, `<`, `>`, `<=` and `>=` compare in other ways. Each comparison gives back a Boolean. Note that `==` compares, while a single `=` (in Python) stores a value.",
      "**Sensing (input).** `is_ripe()`, `crop_here()` and `ground_here()` let the program look at the world before it acts. Reading input and deciding what to do with it is how programs handle situations the programmer didn't see in advance. Test plots (4-7) prove it: the same program has to work on fields it's never seen.",
    ],
  },
  5: {
    points: [
      "**Loops that stop on a condition.** `repeat until` and `repeat while` (Python's `while`) keep going until something becomes true, rather than a set number of times. This is *indefinite iteration*: you use it when you don't know in advance how many steps it will take, like walking to the edge in the fog.",
      "**Infinite loops and `break`.** `repeat forever` (`while True:`) never stops on its own. `break` jumps straight out of the loop when the job is done. Forgetting the way out is the classic *infinite loop* bug, and the game stops a run that goes too long.",
      "**Searching.** Finding the mushroom in the fog means checking places one at a time until it turns up: a *search*. Walking every tile in order is a *linear search*, and the golden version (G-5) searches a whole grid.",
      "**Generalising.** `can_move()`, `position()` and `field_size()` replace fixed numbers with things the program finds out for itself, so one program fits any field. Code that doesn't hard-code its numbers is more general and easier to reuse.",
    ],
  },
  6: {
    points: [
      "**Variables.** A variable is a name that remembers a value. `set planted to 0` (`planted = 0`) creates it, and `change planted by 1` (`planted += 1`) updates it. Variables let a program keep track of things: how many, which way, what's best so far.",
      "**Counters and accumulators.** Starting at 0 and adding 1 each time something happens is a *counter*, one of the most common patterns in programming. `count(\"hay\")` and `ticks()` are counters the game keeps for you.",
      "**Counting loops.** `for x from 1 to 5:` (`for x in range(1, 6):`) is a loop with a variable that changes each time round, so the loop body can use the number. The wheat staircase (6-3) plants a longer row each time because the row number grows.",
      "**Boolean logic.** `and`, `or` and `not` combine checks: `is_dry() and not is_ripe()` is only true when both parts are. These are the *logical operators*, and with them one `if` can express a precise rule.",
      "**Resources and constraints.** The watering can holds 5 drops. Planning around a limited resource (refilling before you run out, never wasting a drop) is a small version of what real programs do with memory, time and money.",
    ],
  },
  7: {
    points: [
      "**Functions.** `define harvest_row:` (Python's `def`) teaches Bolt a new command made from other commands. Writing it once and using it many times keeps programs short, avoids copy-and-paste mistakes, and gives a chunk of code a name that says what it does.",
      "**Parameters and arguments.** `define go(way, steps):` takes inputs. `way` and `steps` are *parameters*, placeholders inside the function, and `go(EAST, 3)` passes *arguments*, the actual values. One function can then do many similar jobs.",
      "**Return values.** `give back n` (`return n`) hands an answer back to the code that called the function, so `ripe_in_row(2)` can be used like a number: `if ripe_in_row(2) >= 3:`. Functions that work something out and return it are the building blocks of bigger programs.",
      "**Abstraction.** Once `ripe_in_row` works, the rest of the program can use it without thinking about how it counts. Hiding the details behind a good name is called *abstraction*, and it's how programmers manage big programs.",
      "**Modules.** `use helper` (`import helper`) lets one code window use the functions from another. Splitting code into files, or *modules*, is how real projects are organised.",
    ],
  },
  8: {
    points: [
      "**Lists.** A list keeps several values in order: `[WHEAT, CARROT, WHEAT]`. Lists (called *arrays* in many languages) are the most common way to hold a collection of things in a program.",
      "**Iterating over a list.** `for each crop in plan:` (`for crop in plan:`) runs the loop once per item, with the variable holding each item in turn. No counting is needed: the list says how many times.",
      "**Building and checking lists.** `add crop to basket` (`basket.append(crop)`) grows a list as the program runs. `crop in basket` checks whether something is already there, and `len(basket)` says how many items it holds. The Mayor's Order (8-4) uses all three to pick exactly one of each crop.",
      "**Data-driven programs.** `order()` and `design()` hand the program a list that's different on each plot. The program's job is to follow the data, not to know the answer in advance. Separating *what to do* (the data) from *how to do it* (the code) is how most real software works.",
      "**Putting it together.** Festival Day combines everything: loops, choices, variables, functions and lists in one program that has to work on several fields.",
    ],
  },
};

export const AFTER_FESTIVAL_CONCEPTS = {
  points: [
    "**Generalisation and testing.** Golden quests run an old idea on 2 or 3 fields the player hasn't seen. A program that only works on one field is fragile; one that looks around works everywhere. Running the same code on several inputs is exactly how programmers *test* their work.",
    "**Optimisation and planning.** Contracts give a goal and a tick budget with no fixed answer, on the player's own farm. Choosing what to plant, where and in what order, then making the program fast enough, is open-ended problem solving, like a real programming project.",
    "**More Python.** Everything no chapter teaches (classes, `lambda`, `try`, dictionaries) opens after the festival, as the next step towards writing ordinary Python.",
  ],
};
