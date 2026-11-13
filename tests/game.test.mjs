import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, newFarmState, CROPS } from "../js/game.js";

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
