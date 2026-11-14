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
  3: "Strawberries (3 wheat, ripe after 12 ticks) arrive with the **Friends** rule: each one gives 1 more for every strawberry right next to it when it ripens, so a 2 by 2 square of 4 makes 12 (3-5). Quest 3-6 is a Fix Bolt's code quest.",
  4: "Crops can now be picked too early, so `noLoss` quests fail if Bolt picks an unripe crop. **Pumpkins** rot 30 ticks after ripening (4-5, 4-7). **Lettuce** wilts 8 ticks after it's ripe and gives nothing, so the first planted must be the first picked (4-6). Quest 4-7 is the first with **test plots**: the same program runs on 2 different fields.",
  5: "**Fog** hides every tile more than one step from Bolt (5-1, 5-3 to 5-5), so counting steps stops working. **Mushrooms** grow wild in the fog, in a different spot on each test plot (5-6, 5-8). **Crop swap:** carrots planted where wheat was just picked give 2 (5-7).",
  6: "Some goals now ask for an *exact* number. **Corn** only grows while its soil is wet, so it needs the watering can and trips to the well (6-5, 6-7). **Blueberry bushes** stay after a ripe harvest and are ripe again 10 ticks later, giving more each time (6-6).",
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
  "4-1": "Bolt checks every tile and only picks the ripe ones, so no young carrot is lost. Looking with `is_ripe()` is free, so the checks cost no ticks.",
  "4-2": "The 3-2 snake with a check before every pick.",
  "4-3": "Tilling soil turns it back into grass, so Bolt only tills where `ground_here()` says grass. A snake covers the field.",
  "4-4": "`if` / `else`: a ripe carrot gets picked; anything else is an empty tile that gets wheat. The last tile is always empty, so it's planted after the loop with no check.",
  "4-5": "A three-way choice: pick ripe, till rotten, and leave young pumpkins alone. `else if` is only checked when the first check was false.",
  "4-6": "Lettuce is ripe 6 ticks after planting and wilts 8 ticks after that. Planting west to east and then picking west to east means the first planted is the first picked, so none wilt. If the first one isn't quite ripe, one `wait()` is enough.",
  "4-7": "The 4-5 choice inside the 4-2 snake. Because it checks every tile, the same program works on both test plots.",
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
