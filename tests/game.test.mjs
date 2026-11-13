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
