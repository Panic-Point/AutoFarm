// A program for every quest that earns 3 stars. tests/quests.test.mjs runs
// each one with the real game and Python, so a quest's star targets can
// never be out of reach. A solution is the main window's code, or
// { main, ...other windows }.
export const SOLUTIONS = {
  "1-1": `harvest()`,
  "1-2": `move(EAST)\nharvest()`,
  "1-3": `harvest()\nmove(EAST)\nharvest()\nmove(EAST)\nharvest()`,
  "1-4": `move(NORTH)\nmove(NORTH)\nharvest()\nmove(EAST)\nmove(EAST)\nharvest()`,
  "1-5": `move(EAST)\nmove(EAST)\nharvest()\nmove(WEST)\nmove(WEST)`,

  "1-6": `move(EAST)\nharvest()\nmove(EAST)\nmove(EAST)\nharvest()`,
  "2-1": `
repeat 4 times:
    harvest()
    move(EAST)
harvest()`,
  "2-2": `
repeat 5 times:
    move(NORTH)
repeat 5 times:
    move(EAST)`,
  "2-3": `
harvest()
repeat 3 times:
    wait()
harvest()
repeat 3 times:
    wait()
harvest()`,
  "2-4": `
repeat 4 times:
    till()
    plant(Crop.WHEAT)
    move(EAST)
till()
plant(Crop.WHEAT)`,
  "2-5": `
repeat 4 times:
    harvest()
    move(EAST)
harvest()
move(NORTH)
repeat 4 times:
    harvest()
    move(WEST)
harvest()`,

  "2-6": `
repeat 5 times:
    move(EAST)
harvest()`,
  "3-1": `
repeat 2 times:
    repeat 3 times:
        plant(Crop.WHEAT)
        move(EAST)
    plant(Crop.WHEAT)
    move(NORTH)
    repeat 3 times:
        plant(Crop.WHEAT)
        move(WEST)
    plant(Crop.WHEAT)
    move(NORTH)`,
  "3-2": `
repeat 2 times:
    repeat 3 times:
        harvest()
        move(EAST)
    harvest()
    move(NORTH)
    repeat 3 times:
        harvest()
        move(WEST)
    harvest()
    move(NORTH)`,
  "3-3": `
repeat 2 times:
    repeat 4 times:
        harvest()
        move(EAST)
    harvest()
    move(NORTH)
    repeat 4 times:
        harvest()
        move(WEST)
    harvest()
    move(NORTH)
repeat 4 times:
    harvest()
    move(EAST)
harvest()`,
  "3-4": `
repeat 2 times:
    repeat 4 times:
        plant(Crop.WHEAT)
        move(EAST)
    plant(Crop.WHEAT)
    move(NORTH)
    repeat 4 times:
        plant(Crop.WHEAT)
        move(WEST)
    plant(Crop.WHEAT)
    move(NORTH)
repeat 4 times:
    plant(Crop.WHEAT)
    move(EAST)
plant(Crop.WHEAT)`,

  "3-5": `
plant(Crop.STRAWBERRY)
move(EAST)
plant(Crop.STRAWBERRY)
move(NORTH)
plant(Crop.STRAWBERRY)
move(WEST)
plant(Crop.STRAWBERRY)
repeat 11 times:
    wait()
harvest()
move(SOUTH)
harvest()
move(EAST)
harvest()
move(NORTH)
harvest()`,

  "3-6": `
repeat 2 times:
    repeat 3 times:
        harvest()
        move(EAST)
    harvest()
    repeat 3 times:
        move(WEST)
    move(NORTH)
    print("row done")`,
  "4-1": `
repeat 4 times:
    if is_ripe():
        harvest()
    move(EAST)
if is_ripe():
    harvest()`,
  "4-2": `
repeat 2 times:
    repeat 3 times:
        if is_ripe():
            harvest()
        move(EAST)
    if is_ripe():
        harvest()
    move(NORTH)
    repeat 3 times:
        if is_ripe():
            harvest()
        move(WEST)
    if is_ripe():
        harvest()
    move(NORTH)`,
  "4-3": `
repeat 2 times:
    repeat 3 times:
        if ground_here() == "grass":
            till()
        move(EAST)
    if ground_here() == "grass":
        till()
    move(NORTH)
    repeat 3 times:
        if ground_here() == "grass":
            till()
        move(WEST)
    if ground_here() == "grass":
        till()
    move(NORTH)`,
  "4-4": `
repeat 3 times:
    if is_ripe():
        harvest()
    else:
        plant(Crop.WHEAT)
    move(EAST)
plant(Crop.WHEAT)`,

  "4-5": `
repeat 4 times:
    if is_ripe():
        harvest()
    else if is_rotten():
        till()
    move(EAST)
if is_ripe():
    harvest()
else if is_rotten():
    till()`,
  "4-6": `
repeat 4 times:
    plant(Crop.LETTUCE)
    move(EAST)
plant(Crop.LETTUCE)
repeat 4 times:
    move(WEST)
repeat 4 times:
    if is_ripe():
        harvest()
    else:
        wait()
        harvest()
    move(EAST)
harvest()`,

  "4-7": `
repeat 2 times:
    repeat 3 times:
        if is_ripe():
            harvest()
        else if is_rotten():
            till()
        move(EAST)
    if is_ripe():
        harvest()
    else if is_rotten():
        till()
    move(NORTH)
    repeat 3 times:
        if is_ripe():
            harvest()
        else if is_rotten():
            till()
        move(WEST)
    if is_ripe():
        harvest()
    else if is_rotten():
        till()
    move(NORTH)`,
  "5-1": `
repeat while can_move(EAST):
    move(EAST)`,
  "5-2": `
repeat until is_ripe():
    wait()
harvest()`,
  "5-3": `
repeat while can_move(EAST):
    harvest()
    move(EAST)
harvest()`,
  "5-4": `
repeat until is_ripe():
    move(EAST)
harvest()`,
  "5-5": `
repeat while can_move(WEST):
    move(WEST)
repeat while can_move(SOUTH):
    move(SOUTH)`,

  "5-6": `
repeat forever:
    if crop_here() == Crop.MUSHROOM:
        harvest()
        break
    move(EAST)
repeat until position() == (0, 0):
    move(WEST)`,
  "5-7": `
repeat 3 times:
    harvest()
    plant(Crop.CARROT)
    move(EAST)
harvest()
plant(Crop.CARROT)
repeat 3 times:
    move(WEST)
repeat 3 times:
    repeat until is_ripe():
        wait()
    harvest()
    move(EAST)
repeat until is_ripe():
    wait()
harvest()`,

  "5-8": `
repeat forever:
    if crop_here() == Crop.MUSHROOM:
        harvest()
        break
    if can_move(EAST):
        move(EAST)
    else:
        repeat while can_move(WEST):
            move(WEST)
        move(NORTH)`,
  "6-1": `
harvest()
repeat until count("hay") == 7:
    move(EAST)
    harvest()`,
  "6-2": `
set planted to 0
repeat forever:
    plant(Crop.CARROT)
    change planted by 1
    if planted == 10:
        break
    move(EAST)`,
  "6-3": `
for row from 1 to 5:
    repeat row - 1 times:
        plant(Crop.WHEAT)
        move(EAST)
    plant(Crop.WHEAT)
    repeat row - 1 times:
        move(WEST)
    move(NORTH)`,
  "6-4": `
harvest()
repeat until count("hay") == 3:
    move(EAST)
    harvest()
move(NORTH)
harvest()
repeat until count("wheat") == 4:
    move(EAST)
    harvest()`,

  "6-5": `
repeat 5 times:
    if is_dry() and not is_ripe():
        water()
    else if is_ripe():
        harvest()
    if can_move(EAST):
        move(EAST)`,
  "6-6": `
set way to EAST
repeat until count("blueberry") >= 14:
    if is_ripe():
        harvest()
    else if can_move(way):
        move(way)
    else if way == EAST:
        set way to WEST
    else:
        set way to EAST`,

  "6-7": `
refill()
move(NORTH)
repeat 5 times:
    move(EAST)
    if is_dry() and not is_ripe():
        water()
repeat 5 times:
    move(WEST)
move(SOUTH)
refill()
move(NORTH)
move(NORTH)
repeat 5 times:
    move(EAST)
    if is_dry() and not is_ripe():
        water()`,
  "7-1": `
define row_east:
    repeat 4 times:
        harvest()
        move(EAST)
    harvest()

define row_west:
    repeat 4 times:
        harvest()
        move(WEST)
    harvest()

row_east()
move(NORTH)
row_west()
move(NORTH)
row_east()`,
  "7-2": {
    main: `
use helper
plant_row(EAST)
move(NORTH)
plant_row(WEST)`,
    helper: `
define plant_row(way):
    repeat 4 times:
        plant(Crop.WHEAT)
        move(way)
    plant(Crop.WHEAT)`,
  },
  "7-3": `
define go(way, steps):
    repeat steps times:
        move(way)

go(EAST, 3)
harvest()
go(NORTH, 4)
harvest()
go(EAST, 3)
harvest()`,

  "7-4": `
define ripe_in_row(y):
    set n to 0
    for x from 0 to 4:
        if ripe_at(x, y):
            change n by 1
    give back n

define pick_row(way):
    repeat 4 times:
        if is_ripe():
            harvest()
        move(way)
    if is_ripe():
        harvest()

for y from 1 to 3:
    move(NORTH)
    if ripe_in_row(y) >= 3:
        if can_move(EAST):
            pick_row(EAST)
        else:
            pick_row(WEST)`,
  "7-5": `
define ripe_in_row(y):
    set n to 0
    for x from 0 to 4:
        if ripe_at(x, y):
            change n by 1
    give back n

set best to 1
for y from 2 to 4:
    if ripe_in_row(y) > ripe_in_row(best):
        set best to y
repeat best times:
    move(NORTH)
repeat 4 times:
    if is_ripe():
        harvest()
    move(EAST)
if is_ripe():
    harvest()`,
  "8-1": `
set plan to [Crop.WHEAT, Crop.CARROT, Crop.WHEAT, Crop.CARROT, Crop.WHEAT]
for each crop in plan:
    plant(crop)
    if can_move(EAST):
        move(EAST)`,
  "8-2": `
for each n in [1, 2, 1]:
    repeat n times:
        move(EAST)
    harvest()`,
  "8-3": `
set a to [Crop.WHEAT, Crop.CARROT, Crop.WHEAT, Crop.CARROT, Crop.WHEAT]
set b to [Crop.CARROT, Crop.WHEAT, Crop.CARROT, Crop.WHEAT, Crop.CARROT]

define plant_row(plan, way):
    for each crop in plan:
        plant(crop)
        if can_move(way):
            move(way)

plant_row(a, EAST)
move(NORTH)
plant_row(b, WEST)
move(NORTH)
plant_row(a, EAST)`,
  "8-4": `
set basket to []
repeat forever:
    set crop to crop_here()
    if crop in order() and crop not in basket:
        harvest()
        add crop to basket
    if len(basket) == len(order()):
        break
    move(EAST)`,
  "8-5": `
set size to field_size()

define pick:
    if is_ripe():
        harvest()

define row(way):
    repeat size - 1 times:
        pick()
        move(way)
    pick()

repeat size / 2 times:
    row(EAST)
    move(NORTH)
    row(WEST)
    if can_move(NORTH):
        move(NORTH)`,
  "8-6": `
set way to EAST
repeat until crop_here() == Crop.CARROT:
    if can_move(way):
        move(way)
    else:
        move(NORTH)
        if way == EAST:
            set way to WEST
        else:
            set way to EAST
harvest()
repeat until position()[0] == 0:
    move(WEST)
repeat until position()[1] == 0:
    move(SOUTH)`,
  "8-7": {
    main: `
use helper
set way to EAST
for each row in design():
    if way == EAST:
        plant_row(row, EAST)
        set way to WEST
    else:
        plant_row(reversed(row), WEST)
        set way to EAST
    move(NORTH)`,
    helper: `
define plant_row(row, way):
    for each crop in row:
        plant(crop)
        if can_move(way):
            move(way)`,
  },

  "G-1": `
repeat while is_ripe():
    harvest()
    move(EAST)`,
  "G-2": `
set way to EAST
repeat while is_ripe():
    repeat 3 times:
        harvest()
        move(way)
    harvest()
    move(NORTH)
    if way == EAST:
        set way to WEST
    else:
        set way to EAST`,
  "G-3": `
set size to field_size()

define row(way):
    repeat size - 1 times:
        harvest()
        move(way)
    harvest()

set way to EAST
repeat size times:
    row(way)
    if can_move(NORTH):
        move(NORTH)
    if way == EAST:
        set way to WEST
    else:
        set way to EAST`,
  "G-4": `
set size to field_size()

define tend:
    if is_ripe():
        harvest()
    else if is_rotten():
        till()

define row(way):
    repeat size - 1 times:
        tend()
        move(way)
    tend()

repeat size / 2 times:
    row(EAST)
    move(NORTH)
    row(WEST)
    if can_move(NORTH):
        move(NORTH)`,
  "G-5": `
set way to EAST
repeat forever:
    if crop_here() == Crop.MUSHROOM:
        harvest()
        break
    if can_move(way):
        move(way)
    else:
        move(NORTH)
        if way == EAST:
            set way to WEST
        else:
            set way to EAST
repeat until position()[0] == 0:
    move(WEST)
repeat until position()[1] == 0:
    move(SOUTH)`,
  "G-6": `
refill()
if position()[1] == 0:
    move(NORTH)
else:
    move(SOUTH)
set way to EAST
if position()[0] > 0:
    set way to WEST
if is_dry() and not is_ripe():
    water()
repeat while can_move(way):
    move(way)
    if is_dry() and not is_ripe():
        water()`,
  "G-7": `
set size to field_size()

define ripe_in_row(y):
    set n to 0
    for x from 0 to size - 1:
        if ripe_at(x, y):
            change n by 1
    give back n

define pick_row(way):
    repeat size - 1 times:
        if is_ripe():
            harvest()
        move(way)
    if is_ripe():
        harvest()

for y from 1 to size - 1:
    move(NORTH)
    if ripe_in_row(y) >= 3:
        if can_move(EAST):
            pick_row(EAST)
        else:
            pick_row(WEST)`,
  "G-8": `
set basket to []
repeat forever:
    set crop to crop_here()
    if crop in order() and crop not in basket:
        harvest()
        add crop to basket
    if len(basket) == len(order()):
        break
    move(EAST)`,
};
