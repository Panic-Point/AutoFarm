// The story and every quest, as plain data. Adding a quest needs no new code.
//
// A quest's field is a map, one string per row, north (top) row first:
//   G ripe grass   g young grass   . empty soil
//   W ripe wheat   w young wheat   C ripe carrot   c young carrot
//   L ripe lettuce   l young lettuce   R ripe strawberry   r young strawberry
//   B ripe blueberry bush   b young blueberry bush
//   P ripe pumpkin   p young pumpkin   x rotten pumpkin   M mushroom
//   K ripe corn   k young corn   q young corn on wet soil   O the well
//   F ripe sunflower   f young sunflower
// Bolt starts at `start` ([x, y], with [0, 0] in the south-west corner).
// `fog: true` hides every tile more than one step away from Bolt.
// `can` is how much water is in the watering can at the start (5 if not given).
//
// Test plots: `field` can be a list of 2 or 3 fields instead of one. The
// same program runs on each plot in turn, the run stops at the first plot
// that fails, and the star targets count the ticks of every plot together.
// A plot can have its own `goal` (added to the quest's goal) and `data`, facts
// the program can read about the plot (farm_api's _plot_data(key)).
//
// `starter` is code the quest starts with, for quests where the player fixes
// Bolt's code: a string, or { name, code } to choose the window's name
// (fix_1_6 for quest 1-6 otherwise). It opens in its own window.
//
// Goals (all that are given must be met):
//   gain:    { item: n }  harvest at least n of the item
//   exactly: { item: n }  harvest exactly n of the item
//   at:      [x, y]       end the run on this tile
//   pattern: [...]        a map the field must match at the end:
//                         G W C a tile with that crop, . empty soil,
//                         s any soil, ? anything
//   plants:  { crop: n }  exactly n tiles growing that crop at the end
//   noLoss:  true         never harvest an unripe crop
//   fresh:   true         never let a lettuce wilt
//   thirsty: true         water every young corn that starts on dry soil
//   noWaste: true         never pour water where nothing needs it
//   needs:   [[...]]      use one word from each inner list (see js/words.js)
//
// A quest with `bonus: true` gives stars, but isn't needed to finish its
// chapter. Each new crop has a bonus quest built around its special rule.
//
// Stars: finishing the goal gives 1 star. Finishing within `stars.two` ticks
// (cycles) gives 2, and within `stars.three` gives 3. tests/solutions.mjs
// holds a program for every quest that earns 3 stars.

import { GOLDEN } from "./postgame.js";
import { AFTER_FESTIVAL } from "./words.js";

export const CHAPTERS = [
  {
    n: 1,
    title: "First Steps",
    who: "Aunt Juniper",
    intro: "Welcome to Willow Creek Farm! I left you Bolt. Bolt only does what you write down.",
    badge: "Step Badge",
    starsToOpen: 0,
    quests: [
      {
        id: "1-1",
        title: "Wake Up, Bolt",
        who: "Bolt",
        story: "Beep! I'm Bolt. Tell me what to do, one word at a time.",
        goalText: "Harvest the grass Bolt is standing on.",
        field: { map: ["...", "...", "G.."] },
        goal: { gain: { hay: 1 } },
        stars: { two: 3, three: 1 },
        hints: [
          "Bolt is standing on ripe grass.",
          "The word for picking a crop is harvest.",
          "Write harvest() and press Run.",
        ],
      },
      {
        id: "1-2",
        title: "One Step",
        who: "Bolt",
        story: "I see grass next to me! Can I get it?",
        goalText: "Move east, then harvest the grass.",
        field: { map: ["...", "...", ".G."] },
        goal: { gain: { hay: 1 } },
        stars: { two: 4, three: 2 },
        hints: [
          "The grass is one step to the east.",
          "move(EAST) takes one step east.",
          "Write move(EAST) on one line and harvest() on the next.",
        ],
      },
      {
        id: "1-3",
        title: "Your Row",
        who: "Aunt Juniper",
        story: "The grass in the first row is ready to pick.",
        goalText: "Harvest all 3 grass tiles in the row.",
        field: { map: ["...", "...", "GGG"] },
        goal: { gain: { hay: 3 } },
        stars: { two: 7, three: 5 },
        hints: [
          "Harvest, step, harvest, step, harvest.",
          "Bolt reads your lines from top to bottom.",
          "harvest() then move(EAST), two times, then one more harvest().",
        ],
      },
      {
        id: "1-4",
        title: "Up the Hill",
        who: "Aunt Juniper",
        story: "Grass grows up on the hill too.",
        goalText: "Harvest the 2 grass tiles at the top.",
        field: { map: ["G.G", "...", "..."] },
        goal: { gain: { hay: 2 } },
        stars: { two: 9, three: 6 },
        hints: [
          "North is up.",
          "Go north two times, then harvest.",
          "After the first harvest, go east two times and harvest again.",
        ],
      },
      {
        id: "1-5",
        title: "Back to the Barn",
        who: "Aunt Juniper",
        story: "Fetch the far grass, then bring it home to the barn.",
        goalText: "Harvest the grass, then end where Bolt started.",
        field: { map: ["...", "...", "..G"] },
        goal: { gain: { hay: 1 }, at: [0, 0] },
        stars: { two: 8, three: 5 },
        hints: [
          "The barn is the corner where Bolt starts.",
          "After you harvest, walk back west.",
          "Go east 2 times, harvest, then go west 2 times.",
        ],
      },
      {
        id: "1-6",
        bonus: true,
        title: "Bolt's Wobbly Steps",
        who: "Bolt",
        story: "Bzzt! I wrote my own program, but I got mixed up. Can you fix it?",
        goalText: "Fix Bolt's code so it harvests both grass tiles. Two lines are wrong.",
        field: { map: ["....", "....", "....", ".G.G"] },
        starter: "move(NORTH)\nharvest()\nmove(EAST)\nharvest()\nmove(EAST)\n",
        goal: { gain: { hay: 2 } },
        stars: { two: 7, three: 5 },
        hints: [
          "Press Run and watch where Bolt goes. Where does it go wrong first?",
          "The grass is east of Bolt, not north.",
          "The second grass is 2 steps away. Bolt harvests after only 1 step. Swap the last two lines.",
        ],
      },
    ],
  },
  {
    n: 2,
    title: "Do It Again",
    who: "Daisy",
    intro: "Daisy the cow is hungry. Bolt learns to repeat.",
    badge: "Loop Badge",
    starsToOpen: 6,
    quests: [
      {
        id: "2-1",
        title: "Daisy's Breakfast",
        who: "Daisy",
        story: "Moo! I'm so hungry. Can you bring me 5 hay?",
        goalText: "Harvest 5 hay using repeat.",
        field: { map: [".....", ".....", ".....", ".....", "GGGGG"] },
        goal: { gain: { hay: 5 }, needs: [["repeat"]] },
        stars: { two: 10, three: 9 },
        hints: [
          "Do you see something you're doing over and over?",
          "repeat 4 times: runs the lines under it 4 times. Indent them with 4 spaces.",
          "repeat 4 times: harvest() and move(EAST), then one more harvest().",
        ],
      },
      {
        id: "2-2",
        title: "The Long Walk",
        who: "Daisy",
        story: "Come and see me in the far corner of the meadow!",
        goalText: "Walk to the north-east corner.",
        field: { map: ["......", "......", "......", "......", "......", "......"] },
        goal: { at: [5, 5], needs: [["repeat"]] },
        stars: { two: 12, three: 10 },
        hints: [
          "Daisy is 5 steps north and 5 steps east.",
          "You can have two repeats, one after the other.",
          "repeat 5 times: move(NORTH), then repeat 5 times: move(EAST).",
        ],
      },
      {
        id: "2-3",
        title: "Grass Grows Back",
        who: "Daisy",
        story: "Only one patch of grass is left. Don't worry, it grows back!",
        goalText: "Harvest 3 hay from the same patch.",
        field: { map: ["...", "...", "G.."] },
        goal: { gain: { hay: 3 } },
        stars: { two: 13, three: 9 },
        hints: [
          "wait() lets time pass for one tick.",
          "Grass is ripe again after a few ticks. Too early and you lose it!",
          "harvest(), wait 3 times, harvest(), wait 3 times, harvest().",
        ],
      },
      {
        id: "2-4",
        title: "First Seeds",
        who: "Bolt",
        story: "I learned two new words: till and plant!",
        goalText: "Plant wheat on every tile in the first row.",
        field: { map: ["ggggg", "ggggg", "ggggg", "ggggg", "ggggg"] },
        goal: { pattern: ["?????", "?????", "?????", "?????", "WWWWW"], needs: [["repeat"]] },
        stars: { two: 18, three: 14 },
        hints: [
          "Wheat needs soil. till() turns grass into soil.",
          "On each tile: till(), then plant(Crop.WHEAT).",
          "repeat 4 times: till, plant, move(EAST). Then till and plant once more.",
        ],
      },
      {
        id: "2-5",
        title: "Daisy's Big Lunch",
        who: "Daisy",
        story: "Lunch time! I could eat 10 hay.",
        goalText: "Harvest both rows of grass.",
        field: { map: [".....", ".....", ".....", "GGGGG", "GGGGG"] },
        goal: { gain: { hay: 10 }, needs: [["repeat"]] },
        stars: { two: 24, three: 19 },
        hints: [
          "Harvest the first row going east, then the second row going west.",
          "After the first row, take one step north.",
          "Two repeats: one going EAST, one going WEST, with move(NORTH) between.",
        ],
      },
      {
        id: "2-6",
        bonus: true,
        title: "One Step Too Many",
        who: "Daisy",
        story: "Bolt brings me my snack, but it always bumps the fence on the way. Ouch!",
        goalText: "Fix the number in Bolt's code so it stops at the fence instead of bumping it.",
        field: { map: ["......", "......", "......", "......", "......", ".....G"] },
        starter: "repeat 6 times:\n    move(EAST)\nharvest()\n",
        goal: { gain: { hay: 1 }, needs: [["repeat"]] },
        stars: { two: 7, three: 6 },
        hints: [
          "Run it and count the steps. Bumping the fence still takes a tick.",
          "The grass is in the 6th tile. How many steps does it take to get from the 1st tile to the 6th?",
          "6 tiles have only 5 gaps between them. Change 6 to 5.",
        ],
      },
    ],
  },
  {
    n: 3,
    title: "Loops in Loops",
    who: "Hazel",
    intro: "Hazel the baker needs wheat for festival bread. Bolt learns to put a loop inside a loop.",
    badge: "Nest Badge",
    starsToOpen: 12,
    quests: [
      {
        id: "3-1",
        title: "Hazel's Garden",
        who: "Hazel",
        story: "My garden is empty. Could you plant wheat everywhere?",
        goalText: "Plant wheat on the whole field with a loop inside a loop.",
        field: { map: ["....", "....", "....", "...."] },
        goal: { pattern: ["WWWW", "WWWW", "WWWW", "WWWW"], needs: [["nested"]] },
        stars: { two: 44, three: 32 },
        hints: [
          "Planting one row is a loop. Doing that for every row is another loop.",
          "Put a repeat inside a repeat. The inside one plants a row.",
          "Fastest: plant a row going east, step north, plant the next going west.",
        ],
      },
      {
        id: "3-2",
        title: "Bread Day",
        who: "Hazel",
        story: "The wheat is ripe! Bring me all 16.",
        goalText: "Harvest all the wheat.",
        field: { map: ["WWWW", "WWWW", "WWWW", "WWWW"] },
        goal: { gain: { wheat: 16 }, needs: [["nested"]] },
        stars: { two: 44, three: 32 },
        hints: [
          "This is like Hazel's Garden, with harvest instead of plant.",
          "repeat 4 times: (harvest a row, then go back and step north).",
          "For 3 stars, zig-zag: east on one row, west on the next.",
        ],
      },
      {
        id: "3-3",
        title: "The Big Hay Sweep",
        who: "Hazel",
        story: "The horses want hay too. Can you sweep the whole meadow?",
        goalText: "Harvest all 25 grass tiles.",
        field: { map: ["GGGGG", "GGGGG", "GGGGG", "GGGGG", "GGGGG"] },
        goal: { gain: { hay: 25 }, needs: [["nested"]] },
        stars: { two: 70, three: 49 },
        hints: [
          "There are 5 rows of 5.",
          "A zig-zag covers 2 rows each time round the outside loop.",
          "repeat 2 times: (row east, north, row west, north), then one more row east.",
        ],
      },
      {
        id: "3-4",
        title: "Festival Wheat",
        who: "Hazel",
        story: "For the festival I need a whole field of wheat!",
        goalText: "Plant wheat on the whole 5 by 5 field.",
        field: { map: [".....", ".....", ".....", ".....", "....."] },
        goal: { pattern: ["WWWWW", "WWWWW", "WWWWW", "WWWWW", "WWWWW"], needs: [["nested"]] },
        stars: { two: 70, three: 49 },
        hints: [
          "This is the Big Hay Sweep with plant instead of harvest.",
          "Plant the tile you're on before you step.",
          "Zig-zag 2 times, then plant one more row going east.",
        ],
      },
      {
        id: "3-5",
        bonus: true,
        title: "Berry Friends",
        who: "Hazel",
        story: "Strawberries love company! Each one gives an extra berry for every strawberry right next to it.",
        goalText: "You have wheat for 4 strawberries. Grow 12 strawberries with them.",
        field: { map: ["....", "....", "....", "...."], inventory: { wheat: 12 } },
        goal: { gain: { strawberry: 12 }, noLoss: true },
        stars: { two: 32, three: 25 },
        hints: [
          "A strawberry counts its friends (north, south, east and west) when it gets ripe. A row of 4 only makes 10. Try another shape!",
          "In a 2 by 2 square, every strawberry has 2 friends, so each one gives 3.",
          "Plant the square, wait until all 4 are ripe, then pick them. Picking one too soon leaves the others with fewer friends.",
        ],
      },
      {
        id: "3-6",
        bonus: true,
        title: "The Tangled Sweep",
        who: "Hazel",
        story: "Bolt tried to sweep my 2 rows of grass, but it only got some of it. The loops are all tangled!",
        goalText: "Fix Bolt's code so it harvests all 8 grass tiles.",
        field: { map: ["....", "....", "GGGG", "GGGG"] },
        starter: "repeat 3 times:\n    repeat 2 times:\n        harvest()\n        move(EAST)\n    harvest()\n    repeat 2 times:\n        move(WEST)\n    move(NORTH)\n    print(\"row done\")\n",
        goal: { gain: { hay: 8 }, needs: [["nested"]] },
        stars: { two: 26, three: 22 },
        hints: [
          "Run it and look at the console. How many times does it say \"row done\"? How many rows are there?",
          "The outside loop goes once for each row. The inside loop goes once for each step along a row.",
          "There are 2 rows, and each row takes 3 steps. The two numbers are swapped!",
        ],
      },
    ],
  },
  {
    n: 4,
    title: "Look Before You Act",
    who: "Pip",
    intro: "Pip the rabbit only wants ripe carrots. Bolt learns to look first with if.",
    badge: "If Badge",
    starsToOpen: 17,
    quests: [
      {
        id: "4-1",
        title: "Only the Ripe Ones",
        who: "Pip",
        story: "Only pick the big orange carrots. The little ones aren't ready!",
        goalText: "Harvest the 3 ripe carrots without losing any.",
        field: { map: [".....", ".....", ".....", ".....", "CcCcC"] },
        goal: { gain: { carrot: 3 }, noLoss: true, needs: [["if"]] },
        stars: { two: 9, three: 7 },
        hints: [
          "is_ripe() is True when the crop under Bolt is ready.",
          "if is_ripe(): runs the lines under it only when the crop is ripe.",
          "repeat 4 times: (if is_ripe(): harvest()), then move(EAST).",
        ],
      },
      {
        id: "4-2",
        title: "Pip's Garden",
        who: "Pip",
        story: "My whole garden is a mix of ripe and little carrots.",
        goalText: "Harvest every ripe carrot and lose none.",
        field: { map: ["ccCC", "CCcc", "cCcC", "CcCc"] },
        goal: { gain: { carrot: 8 }, noLoss: true },
        stars: { two: 40, three: 28 },
        hints: [
          "Check every tile with if is_ripe(): before you harvest.",
          "Use a loop inside a loop to visit every tile.",
          "Zig-zag for 3 stars: east on one row, west on the next.",
        ],
      },
      {
        id: "4-3",
        title: "Weed Patrol",
        who: "Pip",
        story: "Weeds are growing in my garden! Turn the grassy tiles into soil.",
        goalText: "Make every tile soil. Tilling soil turns it back into grass!",
        field: { map: ["g..g", ".gg.", "g.g.", ".g.g"] },
        goal: { pattern: ["ssss", "ssss", "ssss", "ssss"] },
        stars: { two: 34, three: 24 },
        hints: [
          "ground_here() tells you if Bolt is on \"grass\" or \"soil\".",
          "if ground_here() == \"grass\": till()",
          "Visit every tile and only till the grassy ones.",
        ],
      },
      {
        id: "4-4",
        title: "Pip's Choice",
        who: "Pip",
        story: "Pick the ripe carrots, and plant wheat in the empty spots.",
        goalText: "Harvest every carrot and plant wheat on every empty tile.",
        field: { map: ["....", "....", "....", "C.C."], inventory: {} },
        goal: { gain: { carrot: 2 }, pattern: ["????", "????", "????", "?W?W"], needs: [["if"]] },
        stars: { two: 10, three: 7 },
        hints: [
          "else: runs when the if was not true.",
          "if is_ripe(): harvest(), else: plant(Crop.WHEAT)",
          "Do that on each tile of the first row, stepping east between them.",
        ],
      },
      {
        id: "4-5",
        title: "Pip's Pumpkin Patch",
        who: "Pip",
        story: "My pumpkins! Some are ripe, some are still growing, and some went rotten. Yuck!",
        goalText: "Pick the ripe pumpkins, till away the rotten ones, and leave the young ones alone.",
        field: { map: [".....", ".....", ".....", ".....", "PpxPx"] },
        goal: { gain: { pumpkin: 2 }, pattern: ["?????", "?????", "?????", "?????", ".P..."], noLoss: true, needs: [["elif"]] },
        stars: { two: 11, three: 8 },
        hints: [
          "is_rotten() is True when the pumpkin under Bolt has gone rotten. Rotten pumpkins can't be picked, but till() clears them away.",
          "else if asks a second question when the first answer was no: if is_ripe(): harvest(), else if is_rotten(): till()",
          "Do that on every tile of the row, stepping east between them. Young pumpkins need nothing at all.",
        ],
      },
      {
        id: "4-6",
        bonus: true,
        title: "Crunchy Lettuce",
        who: "Pip",
        story: "Lettuce is quick, but it wilts if it waits too long! Plant me a row and pick it while it's crunchy.",
        goalText: "Plant 5 lettuce in the row, then pick all 5 before any of them wilt.",
        field: { map: [".....", ".....", ".....", ".....", "....."], inventory: { hay: 10 } },
        goal: { gain: { lettuce: 5 }, fresh: true, noLoss: true },
        stars: { two: 28, three: 22 },
        hints: [
          "Lettuce is ripe 6 ticks after it's planted, and wilts 8 ticks after that.",
          "The first lettuce you planted will wilt first. Pick it first too!",
          "Plant going east, walk back west, then go east again with if is_ripe(): harvest(), else: wait().",
        ],
      },
      {
        id: "4-7",
        bonus: true,
        title: "Pumpkin Patrol",
        who: "Pip",
        story: "I have two pumpkin patches, and they're all mixed up. Your program has to work on both!",
        goalText: "On both test plots: pick every ripe pumpkin, till every rotten one, and lose none.",
        field: [
          {
            map: ["PpxP", "xPpP", "pPxp", "PxPp"],
            goal: { gain: { pumpkin: 7 }, pattern: ["??.?", ".???", "??.?", "?.??"] },
          },
          {
            map: ["xPPp", "PpxP", "PxPp", "pPPx"],
            goal: { gain: { pumpkin: 8 }, pattern: [".???", "??.?", "?.??", "???."] },
          },
        ],
        goal: { noLoss: true, needs: [["elif"], ["nested"]] },
        stars: { two: 72, three: 59 },
        hints: [
          "The same program runs on both plots, so it has to look at every tile instead of knowing where things are.",
          "On each tile: if is_ripe(): harvest(), else if is_rotten(): till().",
          "Zig-zag: check and step east along one row, step north, then check and step west along the next.",
        ],
      },
    ],
  },
  {
    n: 5,
    title: "Until It's Done",
    who: "Wren",
    intro: "Fog rolls in and Bolt can't see the edge. Bolt learns to repeat until something is true.",
    badge: "Fog Badge",
    starsToOpen: 24,
    quests: [
      {
        id: "5-1",
        title: "Into the Fog",
        who: "Wren",
        story: "Hoo! The fog is thick. Walk east until you reach the fence.",
        goalText: "Walk to the east edge of the field.",
        field: { map: [".......", ".......", ".......", ".......", ".......", ".......", "......."], fog: true },
        goal: { at: [6, 0], needs: [["repeat_until", "repeat_while", "repeat_forever"]] },
        stars: { two: 7, three: 6 },
        hints: [
          "You don't know how far it is, so repeat 5 times won't do.",
          "can_move(EAST) is True while there's room to step east.",
          "repeat while can_move(EAST): move(EAST)",
        ],
      },
      {
        id: "5-2",
        title: "Wait for It",
        who: "Wren",
        story: "This carrot is still tiny. Wait until it's ripe, then pick it.",
        goalText: "Harvest the carrot when it is ripe.",
        field: { map: ["...", "...", "c.."] },
        goal: { gain: { carrot: 1 }, noLoss: true, needs: [["repeat_until", "repeat_while"]] },
        stars: { two: 17, three: 15 },
        hints: [
          "repeat until ...: keeps going until something is true.",
          "repeat until is_ripe(): wait()",
          "After the loop, harvest().",
        ],
      },
      {
        id: "5-3",
        title: "Fog Harvest",
        who: "Wren",
        story: "There's grass somewhere in the fog. Harvest the whole row.",
        goalText: "Harvest every grass tile in the row.",
        field: { map: [".......", ".......", ".......", ".......", ".......", ".......", "GGGGGGG"], fog: true },
        goal: { gain: { hay: 7 }, needs: [["repeat_until", "repeat_while", "repeat_forever"]] },
        stars: { two: 15, three: 13 },
        hints: [
          "Harvest, then step, until you can't step any more.",
          "repeat while can_move(EAST): harvest() and move(EAST).",
          "Don't forget the last tile after the loop!",
        ],
      },
      {
        id: "5-4",
        title: "Find the Carrot",
        who: "Wren",
        story: "I dropped a ripe carrot in the fog. Can you find it?",
        goalText: "Walk east until you find the ripe carrot, then harvest it.",
        field: { map: [".......", ".......", ".......", ".......", ".......", ".......", "....C.."], fog: true },
        goal: { gain: { carrot: 1 }, needs: [["repeat_until", "repeat_while"]] },
        stars: { two: 7, three: 5 },
        hints: [
          "Keep walking until Bolt is on something ripe.",
          "repeat until is_ripe(): move(EAST)",
          "Then harvest().",
        ],
      },
      {
        id: "5-5",
        title: "Home Through the Fog",
        who: "Wren",
        story: "Bolt is lost in the far corner. Find the way home!",
        goalText: "Walk to the south-west corner.",
        field: { map: [".......", ".......", ".......", ".......", ".......", ".......", "......."], start: [6, 6], fog: true },
        goal: { at: [0, 0], needs: [["repeat_until", "repeat_while", "repeat_forever"]] },
        stars: { two: 14, three: 12 },
        hints: [
          "Home is as far west and as far south as you can go.",
          "Walk west while you can, then south while you can.",
          "Two loops: repeat while can_move(WEST), then repeat while can_move(SOUTH).",
        ],
      },
      {
        id: "5-6",
        title: "Mushroom in the Fog",
        who: "Wren",
        story: "A mushroom pops up somewhere along this row on foggy days. Find it, then bring it home!",
        goalText: "On all 3 plots: walk east until you find the mushroom, pick it, then go home to the corner.",
        field: [
          { map: [".......", ".......", ".......", ".......", ".......", ".......", "...M..."], fog: true },
          { map: [".......", ".......", ".......", ".......", ".......", ".......", ".....M."], fog: true },
          { map: [".......", ".......", ".......", ".......", ".......", ".......", "..M...."], fog: true },
        ],
        goal: { gain: { mushroom: 1 }, at: [0, 0], needs: [["repeat_forever"], ["stop"]] },
        stars: { two: 30, three: 23 },
        hints: [
          "repeat forever: never stops by itself. break jumps out of the loop right away.",
          "Inside repeat forever: if crop_here() == Crop.MUSHROOM: harvest() and break. Otherwise move(EAST).",
          "After the loop, walk west until position() == (0, 0). Walking to the fence first wastes ticks!",
        ],
      },
      {
        id: "5-7",
        bonus: true,
        title: "Wheat Then Carrots",
        who: "Wren",
        story: "Carrots grow best where wheat just grew. Plant one where you picked wheat and it gives 2 carrots!",
        goalText: "Pick the wheat, plant carrots in the same spots, and harvest 8 carrots.",
        field: { map: ["....", "....", "....", "WWWW"], inventory: { wheat: 4 } },
        goal: { gain: { carrot: 8 }, noLoss: true, needs: [["repeat_until", "repeat_while"]] },
        stars: { two: 32, three: 25 },
        hints: [
          "After you pick wheat, the soil remembers. A carrot planted there right away gives 2.",
          "On each tile: harvest() the wheat, then plant(Crop.CARROT) in the same spot.",
          "The first carrot you planted is ripe first. Walk back to it, then repeat until is_ripe(): wait() before each harvest.",
        ],
      },
      {
        id: "5-8",
        bonus: true,
        title: "Wren's Basket",
        who: "Wren",
        story: "Now the mushroom could be on any row! Search the field row by row and stop the moment you find it.",
        goalText: "On all 3 plots: find the mushroom and pick it. Stop as soon as you have it.",
        field: [
          { map: [".....", ".....", ".....", ".....", "...M."], fog: true },
          { map: [".....", ".....", ".M...", ".....", "....."], fog: true },
          { map: [".....", "....M", ".....", ".....", "....."], fog: true },
        ],
        goal: { gain: { mushroom: 1 }, needs: [["stop"]] },
        stars: { two: 70, three: 56 },
        hints: [
          "One repeat forever: loop can do the whole search. Check for the mushroom first, every step.",
          "If you can move east, step east. If you can't, walk back west and step north to the next row.",
          "When crop_here() == Crop.MUSHROOM, harvest() and break.",
        ],
      },
    ],
  },
  {
    n: 6,
    title: "Keeping Count",
    who: "Mayor Maple",
    intro: "It's market day, and the mayor orders exact amounts. Bolt learns to keep count.",
    badge: "Counter Badge",
    starsToOpen: 32,
    quests: [
      {
        id: "6-1",
        title: "Seven Bales",
        who: "Mayor Maple",
        story: "I need exactly 7 hay for the market. Not 6, not 8!",
        goalText: "Harvest exactly 7 hay.",
        field: { map: ["........", "........", "........", "........", "........", "........", "........", "GGGGGGGG"] },
        goal: { exactly: { hay: 7 }, needs: [["variables", "count"]] },
        stars: { two: 15, three: 13 },
        hints: [
          "count(\"hay\") tells you how much hay Bolt has.",
          "repeat until count(\"hay\") == 7: harvest and step.",
          "For 3 stars, don't take a step after the last harvest.",
        ],
      },
      {
        id: "6-2",
        title: "Ten Carrots",
        who: "Mayor Maple",
        story: "Plant exactly 10 carrots, then stop. Here's some wheat to pay for them.",
        goalText: "Plant exactly 10 carrots.",
        field: { map: ["............", "............", "............", "............", "............", "............", "............", "............", "............", "............", "............", "............"], inventory: { wheat: 24 } },
        goal: { plants: { carrot: 10 }, needs: [["variables", "count_from"]] },
        stars: { two: 22, three: 19 },
        hints: [
          "set planted to 0 makes a counter. change planted by 1 adds one.",
          "repeat until planted == 10: plant, count it, and step east.",
          "Each carrot costs 2 wheat.",
        ],
      },
      {
        id: "6-3",
        title: "Wheat Stairs",
        who: "Mayor Maple",
        story: "Let's make wheat stairs: 1 in the first row, 2 in the next, and so on.",
        goalText: "Plant the wheat staircase.",
        field: { map: [".....", ".....", ".....", ".....", "....."] },
        goal: { pattern: ["WWWWW", "WWWW.", "WWW..", "WW...", "W...."], needs: [["count_from"]] },
        stars: { two: 50, three: 40 },
        hints: [
          "for row from 1 to 5: counts 1, 2, 3, 4, 5 and keeps the number in row.",
          "In each row, repeat row times: plant and step east.",
          "Then walk back west and step north for the next row.",
        ],
      },
      {
        id: "6-4",
        title: "Two Orders",
        who: "Mayor Maple",
        story: "Today's order: exactly 3 hay and exactly 4 wheat.",
        goalText: "Harvest exactly 3 hay and exactly 4 wheat.",
        field: { map: ["........", "........", "........", "........", "........", "........", "WWWWWWWW", "GGGGGGGG"] },
        goal: { exactly: { hay: 3, wheat: 4 }, needs: [["variables", "count"]] },
        stars: { two: 17, three: 13 },
        hints: [
          "Do the hay first, then the wheat.",
          "repeat until count(\"hay\") == 3: harvest and step.",
          "Then step north and do the same for wheat, still going east.",
        ],
      },
      {
        id: "6-5",
        title: "Thirsty Corn",
        who: "Mayor Maple",
        story: "Corn only grows on wet soil. Water the thirsty ones, but don't waste a drop! The ripe ones are done drinking.",
        goalText: "Harvest the ripe corn, and water only the young corn on dry soil.",
        field: { map: [".....", ".....", ".....", ".....", "KkqKk"] },
        goal: { gain: { corn: 4 }, thirsty: true, noWaste: true, noLoss: true, needs: [["logic"]] },
        stars: { two: 11, three: 8 },
        hints: [
          "is_dry() is True when the soil under Bolt is dry. Water on wet soil or on ripe corn is wasted.",
          "and joins two questions, and not flips an answer: if is_dry() and not is_ripe(): water()",
          "On each tile: water if it's dry and not ripe, then harvest if it's ripe, then step east.",
        ],
      },
      {
        id: "6-6",
        bonus: true,
        title: "Two Old Bushes",
        who: "Mayor Maple",
        story: "These blueberry bushes grow back after you pick them, and give more berries every time. Just never pick one early!",
        goalText: "Pick at least 14 blueberries from the two bushes without losing a bush.",
        field: { map: ["...", "...", "B.B"] },
        goal: { gain: { blueberry: 14 }, noLoss: true, needs: [["count", "variables"]] },
        stars: { two: 28, three: 21 },
        hints: [
          "A bush is ripe again 10 ticks after you pick it. Picking it early loses the whole bush.",
          "Walk back and forth between the bushes. Only harvest when is_ripe() says yes.",
          "repeat until count(\"blueberry\") >= 14: then harvest if ripe, or walk to the other bush.",
        ],
      },
      {
        id: "6-7",
        bonus: true,
        title: "Trips to the Well",
        who: "Mayor Maple",
        story: "Two rows of thirsty corn, and the watering can only holds 5. You'll need a trip to the well!",
        goalText: "Water every young corn on dry soil without wasting any. Refill the can at the well.",
        field: { map: ["......", "......", "......", ".kkKkk", ".kKkkk", "O....."], can: 0 },
        goal: { thirsty: true, noWaste: true, needs: [["logic"]] },
        stars: { two: 36, three: 29 },
        hints: [
          "The can starts empty. Bolt is on the well, so refill() first. water_left() says how much is in the can.",
          "Water only the corn that is dry and not ripe: if is_dry() and not is_ripe(): water()",
          "After the first row, go back to the well and refill before you start the next row.",
        ],
      },
    ],
  },
  {
    n: 7,
    title: "Teach Bolt",
    who: "Bolt",
    intro: "Bolt gets tired of long instructions. Teach Bolt new commands with define.",
    badge: "Teacher Badge",
    starsToOpen: 38,
    quests: [
      {
        id: "7-1",
        title: "Harvest Row",
        who: "Bolt",
        story: "Bzzt. So many words! Teach me one word for a whole row.",
        goalText: "Make a harvest_row command and use it 3 times.",
        field: { map: [".....", ".....", "GGGGG", "GGGGG", "GGGGG"] },
        goal: { gain: { hay: 15 }, needs: [["define"]] },
        stars: { two: 42, three: 29 },
        hints: [
          "define harvest_row: makes a new command. Indent its lines under it.",
          "Use it by writing harvest_row().",
          "For 3 stars, make two commands: one going east and one going west.",
        ],
      },
      {
        id: "7-2",
        title: "A Helper Window",
        who: "Bolt",
        story: "Let's keep my new commands in their own window.",
        goalText: "Put a command in another code window, use it, and plant two rows of wheat.",
        field: { map: [".....", ".....", ".....", ".....", "....."] },
        goal: { pattern: ["?????", "?????", "?????", "WWWWW", "WWWWW"], needs: [["use"]] },
        stars: { two: 26, three: 19 },
        hints: [
          "Make a new window with + New window and call it helper.",
          "Write your define in helper. In main, write use helper.",
          "Plant one row going east, step north, plant one going west.",
        ],
      },
      {
        id: "7-3",
        title: "Go Three Steps",
        who: "Bolt",
        story: "Teach me to go a number of steps, like go_east(3).",
        goalText: "Harvest the 3 grass tiles.",
        field: { map: [".......", ".......", "...G..G", ".......", ".......", ".......", "...G..."] },
        goal: { gain: { hay: 3 }, needs: [["define"]] },
        stars: { two: 16, three: 13 },
        hints: [
          "define go_east(steps): makes a command that takes a number.",
          "Inside it: repeat steps times: move(EAST)",
          "go_east(3), harvest, go north 4, harvest, go_east(3), harvest.",
        ],
      },
      {
        id: "7-4",
        title: "Sunflower Rows",
        who: "Bolt",
        story: "Sunflowers are so tall I can see them from anywhere! Only some rows are worth the walk.",
        goalText: "Teach Bolt ripe_in_row(y) that gives back how many sunflowers are ripe in a row. Only harvest rows with 3 or more.",
        field: { map: ["fFfFf", "FFfFF", "ffFff", "FfFFf", "....."] },
        goal: { gain: { sunflower: 7 }, noLoss: true, needs: [["define"], ["give_back"]] },
        stars: { two: 23, three: 18 },
        hints: [
          "ripe_at(x, y) is True if there's a ripe sunflower at (x, y), even far away.",
          "define ripe_in_row(y): count with set and change for x from 0 to 4, then give back the count.",
          "Walk north row by row. if ripe_in_row(y) >= 3: harvest that row. Otherwise keep walking.",
        ],
      },
      {
        id: "7-5",
        bonus: true,
        title: "The Best Row First",
        who: "Bolt",
        story: "I only need 5 sunflowers today. Which row has the most? Let's go straight there!",
        goalText: "Find the row with the most ripe sunflowers, walk there, and harvest 5.",
        field: { map: ["FfFFF", "FFFFF", "fFfFF", "FffFf", "....."] },
        goal: { gain: { sunflower: 5 }, noLoss: true, needs: [["give_back"], ["variables"]] },
        stars: { two: 16, three: 12 },
        hints: [
          "Use your ripe_in_row(y) command from Sunflower Rows.",
          "set best to 1, then for each other row: if ripe_in_row(y) > ripe_in_row(best): set best to y.",
          "Then repeat best times: move(NORTH), and harvest that whole row going east.",
        ],
      },
    ],
  },
  {
    n: 8,
    title: "Big Farm Plans",
    who: "Aunt Juniper",
    intro: "The Harvest Festival is coming! Bolt learns to follow a plan written as a list.",
    badge: "Festival Ribbon",
    starsToOpen: 44,
    quests: [
      {
        id: "8-1",
        title: "Festival Row",
        who: "Aunt Juniper",
        story: "I'm back for the festival! Plant this row from my list.",
        goalText: "Plant wheat, carrot, wheat, carrot, wheat.",
        field: { map: [".....", ".....", ".....", ".....", "....."], inventory: { wheat: 4 } },
        goal: { pattern: ["?????", "?????", "?????", "?????", "WCWCW"], needs: [["lists"]] },
        stars: { two: 10, three: 9 },
        hints: [
          "A list is written in square brackets: [Crop.WHEAT, Crop.CARROT].",
          "for each crop in plan: runs once for every crop in the list.",
          "Plant the crop, then move east.",
        ],
      },
      {
        id: "8-2",
        title: "Treasure Steps",
        who: "Aunt Juniper",
        story: "My map says: 1 step, harvest. 2 steps, harvest. 1 step, harvest.",
        goalText: "Follow the steps [1, 2, 1] and harvest after each.",
        field: { map: ["......", "......", "......", "......", "......", ".G.GG."] },
        goal: { gain: { hay: 3 }, noLoss: true, needs: [["lists"]] },
        stars: { two: 9, three: 7 },
        hints: [
          "set steps to [1, 2, 1] makes a list of numbers.",
          "for each n in steps: then repeat n times: move(EAST).",
          "Harvest after each walk.",
        ],
      },
      {
        id: "8-3",
        title: "The Festival Field",
        who: "Aunt Juniper",
        story: "The judges love patterns. Plant all three rows from my plan.",
        goalText: "Plant the checkered rows of wheat and carrots.",
        field: { map: [".....", ".....", ".....", ".....", "....."], inventory: { wheat: 14 } },
        goal: {
          pattern: ["?????", "?????", "WCWCW", "CWCWC", "WCWCW"],
          needs: [["lists"]],
        },
        stars: { two: 40, three: 29 },
        hints: [
          "A list can hold lists: one list for each row.",
          "for each row in plan: then for each crop in row: plant and step east.",
          "Walk back west and step north after each row.",
        ],
      },
      {
        id: "8-4",
        title: "The Mayor's Order",
        who: "Mayor Maple",
        story: "Market day! order() tells you what I want today, one of each. Bring exactly that, and nothing extra!",
        goalText: "On both test plots: walk the row and harvest one of each crop in order(). Keep a basket list of what you've picked, and stop when the basket is full.",
        field: [
          {
            map: ["......", "......", "......", "......", "......", "WCPWFC"],
            data: { order: ["carrot", "sunflower"] },
            goal: { exactly: { carrot: 1, sunflower: 1, wheat: 0, pumpkin: 0 } },
          },
          {
            map: ["......", "......", "......", "......", "......", "PWFCWP"],
            data: { order: ["wheat", "pumpkin", "carrot"] },
            goal: { exactly: { wheat: 1, pumpkin: 1, carrot: 1, sunflower: 0 } },
          },
        ],
        goal: { needs: [["add"]] },
        stars: { two: 15, three: 12 },
        hints: [
          "set basket to [] makes an empty list. add crop to basket puts a crop on the end of it.",
          "On each tile: if crop_here() in order() and crop_here() not in basket: harvest it and add it to the basket.",
          "When len(basket) == len(order()), the order is done: break out of your loop instead of walking to the end.",
        ],
      },
      // Festival Day: three events in a row, each on test plots and judged
      // by a neighbor. The chapter is done when all three have a star.
      {
        id: "8-5",
        title: "The Big Basket",
        who: "Daisy and Hazel",
        festival: { event: 1, name: "The Big Basket" },
        story: "Moo! Welcome to Festival Day! Fill our basket with every ripe crop. Pick the lettuce first, before it wilts!",
        goalText: "On both plots, harvest every ripe crop. Leave the young ones, and don't let the lettuce wilt.",
        field: [
          {
            map: ["CwcW", "wCWc", "cWwC", "LLLL"],
            goal: { gain: { lettuce: 4, wheat: 3, carrot: 3 } },
          },
          {
            map: ["WcCwWc", "cWwCcW", "CcWwCW", "wWcCcw", "WCwcWC", "LLLLcW"],
            goal: { gain: { lettuce: 4, wheat: 10, carrot: 7 } },
          },
        ],
        goal: { noLoss: true, fresh: true, needs: [["if"]] },
        stars: { two: 130, three: 101 },
        hints: [
          "The plots are different sizes. field_size() tells Bolt how big this one is.",
          "Make a command that only harvests when is_ripe(), and use it on every tile.",
          "Zig-zag: a row east, step north, a row west, step north. The lettuce row is first, so it gets picked in time.",
        ],
      },
      {
        id: "8-6",
        title: "The Fog Race",
        who: "Wren",
        festival: { event: 2, name: "The Fog Race" },
        story: "Hoo! A golden carrot is hidden in the fog, somewhere new on each plot. Find it and race it home to the barn!",
        goalText: "On all 3 plots, find the carrot, harvest it, and end back at the barn where Bolt started.",
        field: [
          { map: [".....", ".....", ".....", ".....", "...C."], fog: true },
          { map: [".....", ".....", ".C...", ".....", "....."], fog: true },
          { map: [".....", "..C..", ".....", ".....", "....."], fog: true },
        ],
        goal: { gain: { carrot: 1 }, at: [0, 0], needs: [["repeat_until", "repeat_while", "repeat_forever"]] },
        stars: { two: 60, three: 45 },
        hints: [
          "The carrot moves on every plot, so Bolt has to look: repeat until crop_here() == Crop.CARROT:",
          "Walk east along a row. When can_move(EAST) is False, step north and walk back west.",
          "To get home, repeat until position() == (0, 0): step west or south.",
        ],
      },
      {
        id: "8-7",
        title: "The Grand Display",
        who: "Aunt Juniper",
        festival: { event: 3, name: "The Grand Display" },
        story: "The last event! design() gives you my plan for each plot: a list of rows, each a list of crops, south row first.",
        goalText: "On both plots, plant the rows from design(), starting at the south row.",
        field: [
          {
            map: ["....", "....", "....", "...."],
            inventory: { wheat: 12 },
            data: { design: [["wheat", "carrot", "wheat", "carrot"], ["carrot", "wheat", "carrot", "wheat"]] },
          },
          {
            map: [".....", ".....", ".....", ".....", "....."],
            inventory: { wheat: 12 },
            data: {
              design: [
                ["carrot", "carrot", "wheat", "wheat", "carrot"],
                ["wheat", "wheat", "wheat", "wheat", "wheat"],
                ["carrot", "wheat", "carrot", "wheat", "carrot"],
              ],
            },
          },
        ],
        goal: { needs: [["lists"]] },
        stars: { two: 60, three: 46 },
        hints: [
          "set plan to design() gives the rows. for each row in plan: goes through them, south first.",
          "for each crop in row: plant(crop), then step on. A helper window is a good home for a plant_row command.",
          "Rows going west need the crops the other way round: reversed(row).",
        ],
      },
    ],
  },
];

// A plot whose data has a `design` (rows of crops, south row first) must
// end up planted like it.
const CROP_LETTERS = { grass: "G", wheat: "W", carrot: "C", lettuce: "L", strawberry: "R", blueberry: "B" };
for (const ch of CHAPTERS) {
  for (const q of ch.quests) {
    for (const plot of Array.isArray(q.field) ? q.field : [q.field]) {
      const rows = plot.data?.design;
      if (!rows) continue;
      const size = plot.map.length;
      const pattern = [];
      for (let y = size - 1; y >= 0; y--) {
        let line = "";
        for (let x = 0; x < size; x++) line += rows[y]?.[x] ? CROP_LETTERS[rows[y][x]] : "?";
        pattern.push(line);
      }
      plot.goal = { ...plot.goal, pattern };
    }
  }
}

// Golden quests (js/postgame.js) come after the festival, as chapter 9.
export const QUESTS = [
  ...CHAPTERS.flatMap((ch) => ch.quests.map((q) => ({ ...q, chapter: ch.n }))),
  ...GOLDEN.map((q) => ({ ...q, chapter: AFTER_FESTIVAL, golden: true })),
];

export function findQuest(id) {
  return QUESTS.find((q) => q.id === id) ?? null;
}

export function chapterOf(id) {
  const q = findQuest(id);
  return q ? CHAPTERS[q.chapter - 1] : null;
}
