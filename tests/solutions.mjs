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
define row(way):
    repeat 4 times:
        harvest()
        move(way)
    harvest()

repeat 2 times:
    row(EAST)
    move(NORTH)
    row(WEST)
    move(NORTH)
row(EAST)`,
};
