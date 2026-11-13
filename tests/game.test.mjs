import { test } from "node:test";
import assert from "node:assert/strict";
import { CAN_SIZE, CROPS, Game, WET_TICKS, newFarmState, ripeAt } from "../js/game.js";

test("moves are blocked at the edge and still take a tick", () => {
  const g = new Game(newFarmState(3));
  assert.equal(g.move("west"), false);
  assert.equal(g.tick, 1);
  assert.equal(g.move("north"), true);
  assert.deepEqual([g.x, g.y], [0, 1]);
});

test("ripe grass gives hay and grows back", () => {
  const g = new Game(newFarmState(3));
  assert.equal(g.isRipe(), true);
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.hay, 1);
  assert.equal(g.here.crop, "grass");
  assert.equal(g.isRipe(), false);
  for (let i = 0; i < CROPS.grass.growTicks; i++) g.wait();
  assert.equal(g.isRipe(), true);
});

test("wheat needs soil, grows, and harvesting early loses it", () => {
  const g = new Game(newFarmState(3));
  assert.equal(g.plant("wheat"), false); // grass is occupied and not soil
  g.till();
  assert.equal(g.here.ground, "soil");
  assert.equal(g.plant("wheat"), true);
  assert.equal(g.harvest(), false);
  assert.equal(g.here.crop, null);
  g.plant("wheat");
  for (let i = 0; i < CROPS.wheat.growTicks; i++) g.wait();
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.wheat, 1);
});

test("carrots cost wheat", () => {
  const g = new Game(newFarmState(3));
  g.till();
  assert.equal(g.plant("carrot"), false);
  g.inventory.wheat = 2;
  assert.equal(g.plant("carrot"), true);
  assert.equal(g.inventory.wheat, 0);
});

test("snapshots are independent copies", () => {
  const g = new Game(newFarmState(2));
  const s = g.snapshot();
  g.harvest();
  assert.equal(s.inventory.hay, 0);
  assert.equal(s.tiles[0].age, CROPS.grass.growTicks);
});

// A soil field with Bolt at (0, 0).
function soilGame(size = 3, inventory = {}) {
  const s = newFarmState(size, inventory);
  for (const t of s.tiles) Object.assign(t, { ground: "soil", crop: null, age: 0 });
  return new Game(s);
}

const waitTicks = (g, n) => {
  for (let i = 0; i < n; i++) g.wait();
};

test("lettuce costs hay, is ripe after 6 ticks, and wilts if it waits too long", () => {
  const g = soilGame(3, { hay: 4 });
  assert.equal(g.plant("lettuce"), true);
  assert.equal(g.inventory.hay, 2);
  waitTicks(g, CROPS.lettuce.growTicks - 1);
  assert.equal(g.isRipe(), true);
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.lettuce, 1);
  assert.equal(g.here.crop, null);

  g.plant("lettuce");
  waitTicks(g, CROPS.lettuce.growTicks - 1 + CROPS.lettuce.crispTicks - 1);
  assert.equal(g.isRipe(), true, "still crisp on its last tick");
  g.wait();
  assert.equal(g.isRipe(), false);
  assert.equal(g.isWilted(), true);
  assert.equal(g.wilted, 1);
  assert.equal(g.harvest(), false, "a wilted lettuce gives nothing");
  assert.equal(g.inventory.lettuce, 1);
  assert.equal(g.lost, 0, "wilting isn't the same as picking too early");
  assert.equal(g.here.crop, null);
  assert.equal(g.here.wilted, undefined);
});

test("strawberries cost wheat and give one more for each strawberry friend", () => {
  // Alone: 1 strawberry.
  const alone = soilGame(3, { wheat: 3 });
  assert.equal(alone.plant("strawberry"), true);
  assert.equal(alone.inventory.wheat, 0);
  waitTicks(alone, CROPS.strawberry.growTicks - 1);
  assert.equal(alone.harvest(), true);
  assert.equal(alone.inventory.strawberry, 1);

  // A 2 by 2 square: 2 friends each, so 3 each.
  const g = soilGame(3, { wheat: 12 });
  g.plant("strawberry");
  g.move("east");
  g.plant("strawberry");
  g.move("north");
  g.plant("strawberry");
  g.move("west");
  g.plant("strawberry");
  waitTicks(g, CROPS.strawberry.growTicks - 1);
  assert.deepEqual(g.tiles.filter((t) => t.crop).map((t) => t.friends), [2, 2, 2, 2]);
  for (const d of ["south", "east", "north"]) {
    assert.equal(g.harvest(), true);
    g.move(d);
  }
  g.harvest();
  assert.equal(g.inventory.strawberry, 12);
});

test("a strawberry counts its friends when it ripens, not when it's picked", () => {
  const g = soilGame(3, { wheat: 6 });
  g.plant("strawberry");
  g.move("east");
  g.plant("strawberry");
  // The first one ripens with 1 friend; picking it early leaves the second alone.
  waitTicks(g, CROPS.strawberry.growTicks - 3);
  g.move("west");
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.strawberry, 2);
  g.move("east");
  waitTicks(g, 1);
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.strawberry, 3);
});

test("a blueberry bush stays, regrows, and gives more each time", () => {
  const g = soilGame(3, { carrot: 4 });
  assert.equal(g.plant("blueberry"), true);
  assert.equal(g.inventory.carrot, 2);
  waitTicks(g, CROPS.blueberry.growTicks - 1);
  const got = [];
  for (let pick = 0; pick < 5; pick++) {
    assert.equal(g.isRipe(), true);
    const before = g.inventory.blueberry;
    assert.equal(g.harvest(), true);
    got.push(g.inventory.blueberry - before);
    assert.equal(g.here.crop, "blueberry", "the bush stays");
    assert.equal(g.isRipe(), false);
    waitTicks(g, CROPS.blueberry.regrowTicks - 1);
  }
  assert.deepEqual(got, [2, 3, 4, 5, 5]);
  assert.equal(g.tick, 1 + 23 + 5 * 10);
});

test("picking a blueberry bush early loses the whole bush", () => {
  const g = soilGame(3, { carrot: 2 });
  g.plant("blueberry");
  waitTicks(g, CROPS.blueberry.growTicks - 1);
  g.harvest();
  waitTicks(g, 3);
  assert.equal(g.harvest(), false);
  assert.equal(g.here.crop, null);
  assert.equal(g.lost, 1);
  // A new bush starts over: slow first harvest and 2 berries again.
  g.inventory.carrot = 2;
  g.plant("blueberry");
  assert.equal(g.here.picks, undefined);
});

test("a carrot planted where wheat was just picked gives 2", () => {
  const g = soilGame(3, { wheat: 8 });
  g.plant("wheat");
  waitTicks(g, CROPS.wheat.growTicks - 1);
  assert.equal(g.harvest(), true);
  assert.equal(g.here.last, "wheat", "the soil remembers the wheat");
  assert.equal(g.plant("carrot"), true);
  assert.equal(g.here.rotated, true);
  assert.equal(g.here.last, undefined, "planting uses it up");
  waitTicks(g, CROPS.carrot.growTicks - 1);
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.carrot, 2);

  // Carrot after carrot is an ordinary carrot.
  assert.equal(g.here.last, "carrot");
  g.plant("carrot");
  waitTicks(g, CROPS.carrot.growTicks - 1);
  g.harvest();
  assert.equal(g.inventory.carrot, 3);
});

test("tilling or losing the wheat means no carrot bonus", () => {
  const g = soilGame(3, { wheat: 4 });
  g.plant("wheat");
  g.harvest(); // unripe: lost, so the soil remembers nothing
  assert.equal(g.here.last, undefined);
  g.plant("wheat");
  waitTicks(g, CROPS.wheat.growTicks - 1);
  g.harvest();
  g.till();
  g.till();
  assert.equal(g.here.last, undefined);
});

test("pumpkins rot when left too long, and only till() clears a rotten one", () => {
  const g = soilGame(3, { carrot: 1 });
  assert.equal(g.plant("pumpkin"), true);
  for (let i = 0; i < CROPS.pumpkin.growTicks; i++) g.wait();
  assert.equal(g.isRipe(), true);
  for (let i = 0; i < CROPS.pumpkin.rotTicks; i++) g.wait();
  assert.equal(g.isRotten(), true);
  assert.equal(g.isRipe(), false);
  assert.equal(g.harvest(), false);
  assert.equal(g.here.crop, "pumpkin", "too squishy to pick");
  assert.equal(g.lost, 0);
  g.till();
  assert.equal(g.here.crop, null);
  assert.equal(g.here.ground, "soil", "tilling a rotten pumpkin leaves soil");
});

test("mushrooms can't be planted", () => {
  const g = soilGame();
  assert.equal(g.plant("mushroom"), false);
  assert.equal(g.here.crop, null);
});

test("corn only grows on wet soil, and the can runs out", () => {
  const g = soilGame(3, { wheat: 1 });
  g.plant("corn");
  g.wait();
  assert.equal(g.here.age, 0, "dry corn doesn't grow");
  assert.equal(g.isDry(), true);
  assert.equal(g.water(), true);
  assert.equal(g.can, CAN_SIZE - 1);
  assert.equal(g.isDry(), false);
  assert.equal(g.wasted, 0);
  for (let i = 0; i < 10; i++) g.wait();
  assert.equal(g.here.age, WET_TICKS, "it grew once for every wet tick");
  assert.equal(g.isDry(), true);
  g.water();
  g.water(); // already wet: wasted
  assert.equal(g.wasted, 1);
  for (let i = 0; i < 10; i++) g.wait();
  assert.equal(g.isRipe(), true);
  g.water(); // ripe: wasted
  assert.equal(g.wasted, 2);
  assert.equal(g.harvest(), true);
  assert.equal(g.inventory.corn, 2);
  g.water(); // nothing growing: wasted
  assert.equal(g.can, 0);
  assert.equal(g.water(), false, "the can is empty");
  assert.equal(g.refill(), false, "only at the well");
  g.here.ground = "well";
  assert.equal(g.refill(), true);
  assert.equal(g.can, CAN_SIZE);
});

test("ripe sunflowers can be seen from anywhere", () => {
  const g = soilGame(3);
  Object.assign(g.tileAt(2, 1), { crop: "sunflower", age: CROPS.sunflower.growTicks });
  Object.assign(g.tileAt(1, 1), { crop: "sunflower", age: 3 });
  Object.assign(g.tileAt(0, 1), { crop: "wheat", age: CROPS.wheat.growTicks });
  assert.equal(ripeAt(g, 2, 1), true);
  assert.equal(ripeAt(g, 1, 1), false, "not ripe yet");
  assert.equal(ripeAt(g, 0, 1), false, "wheat is too short to see");
  assert.equal(ripeAt(g, 5, 1), false, "off the field");
});
