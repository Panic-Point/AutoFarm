// After the Harvest Festival: golden quests and the contract board, as plain
// data. No DOM code here.
//
// Golden quests are old quests on test plots, one per chapter, so the same
// idea has to work on fields the player hasn't seen. They use the same quest
// format as js/chapters.js, plus `from`: the chapter whose idea they test.
// Each one finished gives a golden star and a trophy on the shelf.

export const GOLDEN = [
  {
    id: "G-1",
    from: 1,
    title: "Golden Row",
    who: "Aunt Juniper",
    story: "The same row as your very first day, but the rows are all different lengths now.",
    goalText: "On all 3 plots, harvest the whole grass row.",
    field: [
      { map: [".....", ".....", ".....", ".....", "GGG.."], goal: { gain: { hay: 3 } } },
      { map: [".....", ".....", ".....", ".....", "GGGGG"], goal: { gain: { hay: 5 } } },
      { map: [".....", ".....", ".....", ".....", "GGGG."], goal: { gain: { hay: 4 } } },
    ],
    goal: {},
    stars: { two: 32, three: 24 },
    hints: [
      "Counting steps won't work: every row is a different length.",
      "Keep going while the grass under Bolt is ripe.",
      "repeat while is_ripe(): harvest, then step east.",
    ],
  },
  {
    id: "G-2",
    from: 2,
    title: "Golden Lunch",
    who: "Daisy",
    story: "Moo! Lunch again, but the grass grew in a different number of rows on each plot.",
    goalText: "On all 3 plots, harvest every row of grass.",
    field: [
      { map: ["....", "....", "GGGG", "GGGG"], goal: { gain: { hay: 8 } } },
      { map: ["....", "....", "....", "GGGG"], goal: { gain: { hay: 4 } } },
      { map: ["....", "GGGG", "GGGG", "GGGG"], goal: { gain: { hay: 12 } } },
    ],
    goal: {},
    stars: { two: 64, three: 48 },
    hints: [
      "Each row is 4 long, but the number of rows changes.",
      "After each row, step north and look: is there ripe grass here?",
      "Zig-zag while is_ripe(): a row one way, step north, the next row the other way.",
    ],
  },
  {
    id: "G-3",
    from: 3,
    title: "Golden Sweep",
    who: "Hazel",
    story: "The old festival field, now in three sizes. One sweep has to fit them all.",
    goalText: "On all 3 plots, harvest every crop.",
    field: [
      { map: ["GWC", "WCG", "CGW"], goal: { gain: { hay: 3, wheat: 3, carrot: 3 } } },
      { map: ["GWCW", "WCGC", "CGWG", "WCGC"], goal: { gain: { hay: 5, wheat: 5, carrot: 6 } } },
      { map: ["GWCWG", "WCGCW", "CGWGC", "WCGCW", "GWCWG"], goal: { gain: { hay: 8, wheat: 9, carrot: 8 } } },
    ],
    goal: { noLoss: true },
    stars: { two: 130, three: 97 },
    hints: [
      "field_size() says how big this plot is.",
      "Make a row command that uses field_size() instead of a number.",
      "Zig-zag: row east, step north, row west, and so on, field_size() rows in all.",
    ],
  },
  {
    id: "G-4",
    from: 4,
    title: "Golden Pumpkins",
    who: "Pip",
    story: "My patch again! Ripe, young and rotten pumpkins, all in new places on each plot.",
    goalText: "On both plots: pick every ripe pumpkin, till every rotten one, and leave the young ones alone.",
    field: [
      { map: ["PpxP", "xPpP", "pxPp", "PPxp"], goal: { gain: { pumpkin: 7 }, pattern: [".?..", "..?.", "?..?", "...?"] } },
      { map: ["xPPp", "PpxP", "PxpP", "pPPx"], goal: { gain: { pumpkin: 8 }, pattern: ["...?", ".?..", "..?.", "?..."] } },
    ],
    goal: { noLoss: true },
    stars: { two: 75, three: 57 },
    hints: [
      "Every tile needs a choice: pick it, till it, or leave it.",
      "if is_ripe(): harvest(). else if is_rotten(): till().",
      "Put that choice in a command and zig-zag across the patch with it.",
    ],
  },
  {
    id: "G-5",
    from: 5,
    title: "Golden Mushroom",
    who: "Wren",
    story: "Hoo! One mushroom, anywhere on a big foggy field. Stop the moment you find it.",
    goalText: "On all 3 plots: find the mushroom, pick it, and go home to the corner.",
    field: [
      { map: [".......", ".......", ".......", ".......", ".....M.", ".......", "......."], fog: true },
      { map: [".......", ".......", ".M.....", ".......", ".......", ".......", "......."], fog: true },
      { map: ["...M...", ".......", ".......", ".......", ".......", ".......", "......."], fog: true },
    ],
    goal: { gain: { mushroom: 1 }, at: [0, 0] },
    stars: { two: 155, three: 117 },
    hints: [
      "Sweep row by row: east to the fence, step north, west to the fence...",
      "repeat forever: and break the moment crop_here() == MUSHROOM.",
      "Then walk west until x is 0, and south until y is 0.",
    ],
  },
  {
    id: "G-6",
    from: 6,
    title: "Golden Corn",
    who: "Mayor Maple",
    story: "Bolt starts on the well, but the well is in a different corner on each plot. The thirsty corn is in the row next to it.",
    goalText: "On all 3 plots: fill the can, then water every young corn on dry soil, and waste none.",
    field: [
      { map: [".....", ".....", ".....", "kkKkk", "O...."], start: [0, 0], can: 0 },
      { map: ["....O", "kKkkk", ".....", ".....", "....."], start: [4, 4], can: 0 },
      { map: [".....", ".....", ".....", "kkkKk", "....O"], start: [4, 0], can: 0 },
    ],
    goal: { thirsty: true, noWaste: true },
    stars: { two: 40, three: 30 },
    hints: [
      "refill() first, then step toward the middle of the field: north if Bolt is on the south edge, south if not.",
      "Walk away from the corner: east if Bolt is on the west edge, west if not.",
      "On each tile: if is_dry() and not is_ripe(): water().",
    ],
  },
  {
    id: "G-7",
    from: 7,
    title: "Golden Sunflowers",
    who: "Bolt",
    story: "Different rows are ripe on each plot. Only rows with 3 or more ripe sunflowers are worth the walk.",
    goalText: "On both plots: harvest only the rows with 3 or more ripe sunflowers, and pick nothing unripe.",
    field: [
      { map: ["fFfFf", "FFfFF", "ffFff", "FfFFf", "....."], goal: { gain: { sunflower: 7 } } },
      { map: ["FFFff", "fFfff", "FfFFF", "FFfFf", "....."], goal: { gain: { sunflower: 10 } } },
    ],
    goal: { noLoss: true },
    stars: { two: 60, three: 45 },
    hints: [
      "Teach Bolt ripe_in_row(y) that gives back how many sunflowers in row y are ripe.",
      "Go north one row at a time, all the way to the top.",
      "Only sweep a row when ripe_in_row(y) >= 3.",
    ],
  },
  {
    id: "G-8",
    from: 8,
    title: "Golden Order",
    who: "Mayor Maple",
    story: "Three market days, three different orders. One of each crop in order(), and nothing extra!",
    goalText: "On all 3 plots: walk the row and harvest exactly one of each crop in order().",
    field: [
      {
        map: ["......", "......", "......", "......", "......", "CWFPCW"],
        data: { order: ["wheat", "pumpkin"] },
        goal: { exactly: { wheat: 1, pumpkin: 1, carrot: 0, sunflower: 0 } },
      },
      {
        map: ["......", "......", "......", "......", "......", "FPWCPF"],
        data: { order: ["sunflower", "carrot", "wheat"] },
        goal: { exactly: { sunflower: 1, carrot: 1, wheat: 1, pumpkin: 0 } },
      },
      {
        map: ["......", "......", "......", "......", "......", "WWCPFC"],
        data: { order: ["pumpkin", "carrot", "wheat", "sunflower"] },
        goal: { exactly: { pumpkin: 1, carrot: 1, wheat: 1, sunflower: 1 } },
      },
    ],
    goal: {},
    stars: { two: 25, three: 19 },
    hints: [
      "set basket to [] and add each crop you pick to it.",
      "Only harvest a crop that's in order() and not in the basket yet.",
      "Stop as soon as len(basket) == len(order()).",
    ],
  },
];

// ---- The contract board ----
// A fixed list of orders from the neighbors, played on the home farm with the
// player's own seeds. The board shows the first 3 not done yet (that the
// player can take on: `needs` lists shop items they must own first).
//
//   order:  { item: n }  harvest at least this much in one run (net, after
//                        paying for seeds)
//   ticks:  the run's tick budget
//   dinner: true         Daisy waits at the barn (0, 0) and has to be visited
//                        at least once every 20 ticks
//   reward: the shop item this contract opens
//
// Finishing a contract gives a ribbon.

export const DINNER_EVERY = 20;

export const CONTRACTS = [
  { id: "c-1", who: "Daisy", order: { hay: 20 }, ticks: 60, reward: "blue_cap" },
  { id: "c-2", who: "Hazel", order: { wheat: 15 }, ticks: 80, reward: "baker_hat" },
  { id: "c-3", who: "Pip", order: { carrot: 10 }, ticks: 150, reward: "orange_cap" },
  { id: "c-4", who: "Wren", order: { lettuce: 12 }, ticks: 100, reward: "green_beanie" },
  {
    id: "c-5", who: "Daisy", title: "Daisy's dinner time", order: { hay: 15, wheat: 10 }, ticks: 200, dinner: true,
    reward: "dinner_bell",
  },
  { id: "c-6", who: "Mayor Maple", order: { lettuce: 20, strawberry: 10 }, ticks: 300, reward: "top_hat" },
  { id: "c-7", who: "Hazel", order: { strawberry: 20 }, ticks: 200, reward: "bee_hive" },
  {
    id: "c-8", who: "Hazel", title: "Busy bees", order: { strawberry: 30 }, ticks: 200, needs: ["bee_hive"],
    reward: "honey_hat",
  },
  { id: "c-9", who: "Pip", order: { blueberry: 10 }, ticks: 250, reward: "purple_cap" },
  { id: "c-10", who: "Wren", order: { wheat: 30, carrot: 10 }, ticks: 300, reward: "sun_hat" },
  { id: "c-11", who: "Mayor Maple", order: { blueberry: 15, strawberry: 15 }, ticks: 400, reward: "ribbon_hat" },
  { id: "c-12", who: "Aunt Juniper", order: { hay: 50, wheat: 30, carrot: 20 }, ticks: 500, reward: "farmer_hat" },
];

export function findContract(id) {
  return CONTRACTS.find((c) => c.id === id) ?? null;
}
