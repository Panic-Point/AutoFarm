// Draws a farm snapshot onto a canvas.
import { CROPS, harvestYield, isTileRipe } from "./game.js";

const COLORS = {
  grass: "#7fb069",
  grassEdge: "#6a9a57",
  soil: "#8a5a3b",
  soilFurrow: "#74482d",
  wheat: "#e3b448",
  wheatStem: "#9c8a3a",
  carrotTop: "#4f9a43",
  carrot: "#ef7d2d",
  hay: "#c9d36b",
  ripe: "#fff4b8",
  bolt: "#9fb4c7",
  boltDark: "#4d6275",
  boltEye: "#20303f",
  shadow: "rgba(0,0,0,0.18)",
  fog: "rgba(232, 236, 240, 0.93)",
  target: "#d93b3b",
  wood: "#a0703f",
  lettuce: "#7cc05a",
  lettuceVein: "#4f8a3a",
  wiltedLeaf: "#a08a4a",
  berryRed: "#d7263d",
  berrySeed: "#f2d16b",
  berryLeaf: "#4f9a43",
  bush: "#3f7d4a",
  blueberry: "#4a5fc1",
  blueberryYoung: "#a7b0d8",
  pumpkin: "#f28c28",
  pumpkinYoung: "#c9c56a",
  rotten: "#6b5a3a",
  vine: "#4f8a3a",
  mushroomCap: "#c0392b",
  mushroomStem: "#f3ead8",
  corn: "#f4d03f",
  cornLeaf: "#5aa04a",
  wetSoil: "#5e3b26",
  petal: "#f7c600",
  sunCenter: "#6b4423",
  stone: "#9aa3ab",
  stoneDark: "#6d7780",
  water: "#4aa3df",
};

// Hats Bolt can wear: [brim color, crown color, style].
const HATS = {
  straw_hat: ["#d9a441", "#e8bd5c", "brim"],
  red_cap: ["#c8322b", "#e0473f", "cap"],
  cowboy_hat: ["#7a4b26", "#8f5a2f", "brim"],
  flower_crown: ["#5f9e4a", "#f2d0e4", "flowers"],
  berry_hat: ["#e9c98a", "#f3dca8", "berries"],
  mushroom_hat: ["#f3ead8", "#c0392b", "mushroom"],
  sunflower_hat: ["#6b4423", "#f7c600", "sunflower"],
};

// The golden crowns, one per chapter, each with its chapter's crop as the gem.
const GEMS = {
  crown_1: ["#b5c44f"], // hay
  crown_2: ["#b8862a"], // wheat
  crown_3: ["#d9363e"], // strawberry
  crown_4: ["#e8761e"], // pumpkin
  crown_5: ["#a0522d"], // mushroom
  crown_6: ["#5f9e4a"], // corn
  crown_7: ["#6b3e1e"], // sunflower
  crown_8: ["#d9363e", "#3f6fd9", "#3f9e4a"], // festival
};
for (const id of Object.keys(GEMS)) HATS[id] = ["#e6b422", "#f6cf3a", "crown"];

// Thank-you hats from the contract board.
Object.assign(HATS, {
  blue_cap: ["#2f6fc4", "#4a8ae0", "cap"],
  baker_hat: ["#e9e6dc", "#ffffff", "brim"],
  orange_cap: ["#e0701e", "#f28a35", "cap"],
  green_beanie: ["#3d7d3a", "#56a052", "cap"],
  top_hat: ["#1f1f1f", "#333333", "brim"],
  honey_hat: ["#d99a12", "#f2be3a", "brim"],
  purple_cap: ["#5b3f9e", "#7656c0", "cap"],
  sun_hat: ["#f0d264", "#f7e08a", "brim"],
  ribbon_hat: ["#c8322b", "#f2d0e4", "berries"],
  farmer_hat: ["#6b4a2b", "#8a6238", "brim"],
});

// Draw Bolt alone, wearing `hat`, filling the canvas. For the shelf and the
// festival.
export function drawBoltIcon(ctx, hat) {
  const W = ctx.canvas.width;
  ctx.clearRect(0, 0, W, W);
  const cell = W * 1.9;
  drawBolt(ctx, (W - cell) / 2, (W - cell) / 2 + W * 0.12, cell, hat);
}

// opts: { looks: { hat, scarecrow, fence, dog }, fog, goal: { at, pattern } }
// Once the sprite sheets have loaded the farm is drawn as pixel art (see
// drawPixelFarm). Before that, and in Node, it's drawn with plain shapes.
export function drawFarm(ctx, state, opts = {}) {
  if (spritesReady()) {
    drawPixelFarm(ctx, state, opts);
    return;
  }
  // Draw it again as pixel art once the sheets arrive.
  waiting.set(ctx.canvas, [ctx, state, opts]);
  drawFlatFarm(ctx, state, opts);
}

function drawFlatFarm(ctx, state, opts) {
  const { size } = state;
  const W = ctx.canvas.width;
  const cell = W / size;
  const looks = opts.looks ?? { hat: "straw_hat" };
  ctx.clearRect(0, 0, W, W);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = state.tiles[y * size + x];
      // Screen y is flipped so north is up.
      const px = x * cell;
      const py = (size - 1 - y) * cell;
      drawGround(ctx, tile, px, py, cell);
      if (tile.crop) drawCrop(ctx, state, x, y, px, py, cell);
    }
  }
  if (opts.goal) drawGoal(ctx, state, opts.goal, cell);
  if (looks.fence) drawFence(ctx, W);
  drawExtras(ctx, state, looks, cell, false);
  if (opts.fog) drawFog(ctx, state, cell);
}

// The things that sit on top of the field: shop decorations, the hive, Daisy,
// the dog and Bolt.
function drawExtras(ctx, state, looks, cell, pixel) {
  const { size } = state;
  if (looks.scarecrow) drawScarecrow(ctx, (size - 1) * cell, 0, cell);
  if (looks.jackOLantern) drawJackOLantern(ctx, 0, 0, cell);
  if (state.hive) drawHive(ctx, state.hive[0] * cell, (size - 1 - state.hive[1]) * cell, cell);
  if (looks.dinnerBell) drawBell(ctx, 0, (size - 1) * cell, cell);
  if (state.dinner) {
    if (pixel) drawCowSprite(ctx, 0, (size - 1) * cell, cell, state.dinner.missed > 0);
    else drawCow(ctx, 0, (size - 1) * cell, cell, state.dinner.missed > 0);
  }
  const bx = state.x * cell;
  const by = (size - 1 - state.y) * cell;
  if (looks.dog) drawDog(ctx, bx, by, cell, state.x === size - 1);
  drawBolt(ctx, bx, by, cell, looks.hat);
}

// ---- Pixel art ----
// The sprite sheets come from the free farm asset pack in assets/sprites
// (credits in assets/CREDITS.md). Its tiles are 16 pixels, drawn at twice
// that size. The field is drawn small, one tile to TILE pixels, inside a
// one-tile border of grass, then scaled up to the canvas without smoothing so
// everything shares the same chunky pixels.

const TILE = 32;
const SHEETS = {
  grass: "grass.png",
  crops: "crops.png",
  fence: "fence.png",
  stones: "stones.png",
  tree: "tree.png",
  cow: "cow.png",
  chicken: "chicken.png",
  chick: "chick.png",
};
const sheets = {};
const waiting = new Map();
let loaded = 0;

if (typeof Image !== "undefined") {
  const base = new URL("../assets/sprites/", import.meta.url);
  for (const [name, file] of Object.entries(SHEETS)) {
    const img = new Image();
    img.onload = () => {
      sheets[name] = img;
      loaded += 1;
      if (!spritesReady()) return;
      for (const [ctx, state, opts] of waiting.values()) drawPixelFarm(ctx, state, opts);
      waiting.clear();
    };
    img.src = new URL(file, base).href;
  }
}

function spritesReady() {
  return loaded === Object.keys(SHEETS).length;
}

// Which grass tile to use, from which sides have grass too: N, E, S, W.
// The grass sheet is drawn over bare earth, so its ragged edges show soil.
const GRASS_TILES = {
  "0000": [0, 3], "1000": [0, 2], "0010": [0, 0], "1010": [0, 1],
  "0100": [1, 3], "0001": [3, 3], "0101": [2, 3],
  "0110": [1, 0], "0111": [2, 0], "0011": [3, 0],
  "1110": [1, 1], "1111": [2, 1], "1011": [3, 1],
  "1100": [1, 2], "1101": [2, 2], "1001": [3, 2],
};
const GRASS_FULL = [9, 2];

const EARTH = { base: "#a8703f", dark: "#8a5530", light: "#c08752", speck: "#7a4a2a" };
const WET_EARTH = { base: "#6f4528", dark: "#56331d", light: "#83553a", speck: "#4a2b18" };

// A little reusable canvas the field is drawn on before it's scaled up.
let buffer = null;
function bufferOf(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    if (!buffer || buffer.width !== size) buffer = new OffscreenCanvas(size, size);
  } else if (!buffer || buffer.width !== size) {
    buffer = document.createElement("canvas");
    buffer.width = buffer.height = size;
  }
  return buffer;
}

// A number from 0 to 1 that's always the same for a tile, for decorations.
function noise(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function sprite(ctx, sheet, sx, sy, sw, sh, dx, dy, scale = 2) {
  ctx.drawImage(sheets[sheet], sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw * scale, sh * scale);
}

function drawPixelFarm(ctx, state, opts) {
  const { size } = state;
  const looks = opts.looks ?? { hat: "straw_hat" };
  const side = (size + 2) * TILE;
  const buf = bufferOf(side);
  const b = buf.getContext("2d");
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, side, side);

  // Grid cells include the border, so the field's tile (x, y) is cell (x+1, y+1).
  const groundAt = (gx, gy) => {
    const x = gx - 1;
    const y = gy - 1;
    if (x < 0 || y < 0 || x >= size || y >= size) return "border";
    return state.tiles[y * size + x].ground;
  };
  const isGrass = (gx, gy) => groundAt(gx, gy) !== "soil";

  for (let gy = 0; gy < size + 2; gy++) {
    for (let gx = 0; gx < size + 2; gx++) {
      const px = gx * TILE;
      const py = (size + 1 - gy) * TILE;
      const ground = groundAt(gx, gy);
      const tile = ground === "border" ? null : state.tiles[(gy - 1) * size + gx - 1];
      drawEarth(b, px, py, tile && tile.wet > 0 ? WET_EARTH : EARTH, gx, gy, ground === "soil");
      if (ground === "soil") continue;
      const key = [isGrass(gx, gy + 1), isGrass(gx + 1, gy), isGrass(gx, gy - 1), isGrass(gx - 1, gy)]
        .map((g) => (g ? "1" : "0")).join("");
      const [tx, ty] = GRASS_TILES[key];
      // Each quarter of the tile: where grass is on both sides and the
      // corner, use solid grass, so soil only peeks through at real corners.
      for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const dx = qx ? 1 : -1;
        const dy = qy ? -1 : 1;
        const solid = isGrass(gx + dx, gy) && isGrass(gx, gy + dy) && isGrass(gx + dx, gy + dy);
        const [sx, sy] = solid ? GRASS_FULL : [tx, ty];
        sprite(b, "grass", sx * 16 + qx * 8, sy * 16 + qy * 8, 8, 8, px + qx * 16, py + qy * 16);
      }
    }
  }

  drawBorder(b, state, looks, side);

  b.save();
  b.translate(TILE, TILE);
  const cell = TILE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = state.tiles[y * size + x];
      const px = x * cell;
      const py = (size - 1 - y) * cell;
      if (tile.ground === "well") drawWell(b, px, py);
      if (tile.ground === "soil" && tile.last === "wheat" && !tile.crop) drawStubble(b, px, py, cell);
      if (tile.crop) drawCrop(b, state, x, y, px, py, cell, true);
    }
  }
  if (opts.goal) drawGoal(b, state, opts.goal, cell);
  drawExtras(b, state, looks, cell, true);
  if (opts.fog) drawFog(b, state, cell);
  b.restore();

  // Scale up by a whole number, so every pixel is the same size, to about
  // twice the canvas's first size. The page shrinks it smoothly to fit, which
  // stays sharp on high-density screens too.
  const canvas = ctx.canvas;
  canvas.dataset.size ??= canvas.width;
  const W = side * Math.max(1, Math.ceil((2 * canvas.dataset.size) / side));
  if (canvas.width !== W) canvas.width = canvas.height = W;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, W);
  ctx.drawImage(buf, 0, 0, side, side, 0, 0, W, W);
}

// Bare earth, or tilled soil with furrows.
function drawEarth(ctx, px, py, earth, gx, gy, tilled) {
  ctx.fillStyle = earth.base;
  ctx.fillRect(px, py, TILE, TILE);
  if (tilled) {
    for (const fy of [4, 14, 24]) {
      ctx.fillStyle = earth.light;
      ctx.fillRect(px + 2, py + fy, TILE - 4, 2);
      ctx.fillStyle = earth.dark;
      ctx.fillRect(px + 2, py + fy + 2, TILE - 4, 3);
    }
  }
  ctx.fillStyle = earth.speck;
  for (let i = 0; i < 3; i++) {
    const sx = Math.floor(noise(gx, gy, i) * (TILE - 4)) + 2;
    const sy = Math.floor(noise(gx, gy, i + 7) * (TILE - 4)) + 2;
    ctx.fillRect(px + sx, py + sy, 2, 2);
  }
}

// Short yellow stalks left where wheat was just picked: carrots love it here.
function drawStubble(ctx, px, py) {
  ctx.fillStyle = "#d9c06a";
  for (const [dx, dy] of [[6, 8], [16, 10], [24, 6], [10, 20], [22, 22]]) {
    ctx.fillRect(px + dx, py + dy, 2, 4);
  }
}

// A round stone well with water in it.
function drawWell(ctx, px, py) {
  const ring = (inset, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + inset + 4, py + inset, 24 - 2 * inset, 28 - 2 * inset);
    ctx.fillRect(px + inset, py + inset + 4, 32 - 2 * inset, 20 - 2 * inset);
    ctx.fillRect(px + inset + 2, py + inset + 2, 28 - 2 * inset, 24 - 2 * inset);
  };
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(px + 4, py + 26, 24, 4);
  ring(1, "#4d555c");
  ring(2, COLORS.stoneDark);
  ring(3, COLORS.stone);
  ring(8, "#2f5f80");
  ring(9, COLORS.water);
  ctx.fillStyle = "#bfe6ff";
  ctx.fillRect(px + 12, py + 12, 4, 2);
  ctx.fillRect(px + 18, py + 16, 2, 2);
  ctx.fillStyle = COLORS.stoneDark;
  for (const [x, y] of [[8, 6], [20, 5], [5, 15], [26, 14], [10, 24], [21, 25]]) ctx.fillRect(px + x, py + y, 3, 1);
}

// The grass border round the field: trees in the top corners, stepping stones,
// a hen and her chick, and the fence once it's bought.
function drawBorder(ctx, state, looks, side) {
  const n = state.size + 2;
  // Stepping stones along the bottom path.
  const stones = [[2, 1, 12, 12], [18, 2, 12, 12], [34, 3, 12, 12], [49, 2, 7, 7], [55, 8, 7, 6]];
  for (let gx = 1; gx < n - 1; gx++) {
    if (noise(gx, 0, 3) < 0.45) continue;
    const [sx, sy, sw, sh] = stones[Math.floor(noise(gx, 0, 4) * stones.length)];
    sprite(ctx, "stones", sx, sy, sw + 1, sh + 1, gx * TILE + (TILE - sw * 2) / 2, side - TILE + (TILE - sh * 2) / 2 + 2);
  }
  // Little flowers on the side borders.
  for (let gy = 1; gy < n - 1; gy++) {
    for (const gx of [0, n - 1]) {
      if (noise(gx, gy, 5) < 0.5) continue;
      const fx = gx * TILE + 8 + Math.floor(noise(gx, gy, 6) * 14);
      const fy = gy * TILE + 6 + Math.floor(noise(gx, gy, 8) * 18);
      ctx.fillStyle = noise(gx, gy, 9) < 0.5 ? "#f7f3e8" : "#f2c94c";
      ctx.fillRect(fx, fy, 2, 2);
      ctx.fillRect(fx + 4, fy + 2, 2, 2);
      ctx.fillRect(fx + 1, fy + 5, 2, 2);
    }
  }
  if (looks.fence) drawFenceSprites(ctx, side);
  // A hen and her chick wander the bottom border; where depends on the field.
  const hx = TILE * (1 + Math.floor(noise(state.size, 1, 2) * (n - 3)));
  sprite(ctx, "chicken", 0, 0, 16, 16, hx + 6, side - TILE + 10, 1);
  sprite(ctx, "chick", 0, 0, 16, 16, hx + 20, side - TILE + 12, 1);
  // Maple trees peek in from the top corners.
  sprite(ctx, "tree", 96, 0, 32, 48, -TILE / 2 - 8, -64);
  sprite(ctx, "tree", 96, 0, 32, 48, side - TILE - 24, -64);
}

// The wooden fence from the shop, round the outside of the border.
function drawFenceSprites(ctx, side) {
  const n = side / TILE;
  // A post with rails to its right is 16 pixels; the last post has no rails.
  for (const y of [-6, side - TILE + 2]) {
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      sprite(ctx, "fence", 5, 32, last ? 6 : 16, 16, 4 + i * TILE, y);
    }
  }
  for (const x of [4, side - 16]) {
    for (let y = 20; y < side - TILE + 4; y += TILE) sprite(ctx, "fence", 5, 14, 6, 16, x, y);
  }
}

// Daisy, waiting at the barn for dinner. She cries once she misses a meal.
function drawCowSprite(ctx, px, py, cell, sad) {
  sprite(ctx, "cow", 0, 8, 32, 24, px - 2, py + cell - 26, 1);
  if (sad) {
    ctx.fillStyle = "#4aa3df";
    ctx.fillRect(px + 6, py + cell - 12, 2, 3);
  }
}

// A striped bee hive in the top right of its tile, with a bee beside it.
function drawHive(ctx, px, py, cell) {
  const cx = px + cell * 0.72;
  const cy = py + cell * 0.3;
  const r = cell * 0.17;
  const bands = ["#e8b830", "#c9921a", "#e8b830", "#c9921a"];
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.6 + i * r * 0.42, r * (0.65 + i * 0.12), r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#5a3b12";
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.55, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // A bee.
  const bx = px + cell * 0.36;
  const by = py + cell * 0.22;
  ctx.fillStyle = "#f2c230";
  ctx.beginPath();
  ctx.ellipse(bx, by, cell * 0.05, cell * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2a26";
  ctx.fillRect(bx - cell * 0.008, by - cell * 0.035, cell * 0.016, cell * 0.07);
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.ellipse(bx, by - cell * 0.05, cell * 0.03, cell * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A dinner bell on a post in the top left of the barn tile.
function drawBell(ctx, px, py, cell) {
  const x = px + cell * 0.14;
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(x - cell * 0.015, py + cell * 0.12, cell * 0.03, cell * 0.36);
  ctx.fillStyle = "#e6b422";
  ctx.beginPath();
  ctx.moveTo(x - cell * 0.07, py + cell * 0.26);
  ctx.quadraticCurveTo(x, py + cell * 0.06, x + cell * 0.07, py + cell * 0.26);
  ctx.closePath();
  ctx.fill();
}

// Daisy waiting at the barn for dinner. She looks sad once she misses a meal.
function drawCow(ctx, px, py, cell, sad) {
  const cx = px + cell * 0.3;
  const cy = py + cell * 0.74;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#2b2a26";
  ctx.lineWidth = Math.max(1, cell / 70);
  ctx.beginPath();
  ctx.ellipse(cx, cy, cell * 0.17, cell * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2b2a26";
  ctx.beginPath();
  ctx.arc(cx - cell * 0.05, cy - cell * 0.02, cell * 0.035, 0, Math.PI * 2);
  ctx.arc(cx + cell * 0.07, cy + cell * 0.03, cell * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c4c4";
  ctx.beginPath();
  ctx.ellipse(cx + cell * 0.19, cy - cell * 0.05, cell * 0.06, cell * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (sad) {
    ctx.fillStyle = "#3f6fd9";
    ctx.beginPath();
    ctx.arc(cx + cell * 0.2, cy - cell * 0.15, cell * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Tiles more than one step from Bolt are hidden.
function drawFog(ctx, state, cell) {
  ctx.fillStyle = COLORS.fog;
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      if (Math.abs(x - state.x) <= 1 && Math.abs(y - state.y) <= 1) continue;
      ctx.fillRect(x * cell, (state.size - 1 - y) * cell, cell + 0.5, cell + 0.5);
    }
  }
}

// A flag on the tile Bolt must finish on, and dotted squares on tiles that
// don't match the goal pattern yet.
function drawGoal(ctx, state, goal, cell) {
  const { size } = state;
  if (goal.misses) {
    ctx.save();
    ctx.setLineDash([cell / 10, cell / 12]);
    ctx.lineWidth = Math.max(2, cell / 26);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    for (const [x, y] of goal.misses) {
      const pad = cell * 0.08;
      ctx.strokeRect(x * cell + pad, (size - 1 - y) * cell + pad, cell - 2 * pad, cell - 2 * pad);
    }
    ctx.restore();
  }
  if (goal.at) {
    const px = goal.at[0] * cell;
    const py = (size - 1 - goal.at[1]) * cell;
    ctx.strokeStyle = COLORS.wood;
    ctx.lineWidth = Math.max(2, cell / 24);
    ctx.beginPath();
    ctx.moveTo(px + cell * 0.72, py + cell * 0.85);
    ctx.lineTo(px + cell * 0.72, py + cell * 0.15);
    ctx.stroke();
    ctx.fillStyle = COLORS.target;
    ctx.beginPath();
    ctx.moveTo(px + cell * 0.72, py + cell * 0.15);
    ctx.lineTo(px + cell * 0.95, py + cell * 0.25);
    ctx.lineTo(px + cell * 0.72, py + cell * 0.36);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFence(ctx, W) {
  const t = Math.max(4, W / 80);
  ctx.strokeStyle = COLORS.wood;
  ctx.lineWidth = t;
  ctx.strokeRect(t / 2, t / 2, W - t, W - t);
  ctx.fillStyle = "#7a5230";
  const step = W / 12;
  for (let i = 0; i <= 12; i++) {
    const p = Math.min(W - t * 1.5, i * step);
    for (const [x, y] of [[p, 0], [p, W - t * 1.5], [0, p], [W - t * 1.5, p]]) ctx.fillRect(x, y, t * 1.5, t * 1.5);
  }
}

function drawScarecrow(ctx, px, py, cell) {
  const cx = px + cell * 0.78;
  const top = py + cell * 0.12;
  const s = cell * 0.22;
  ctx.strokeStyle = COLORS.wood;
  ctx.lineWidth = Math.max(2, cell / 30);
  ctx.beginPath();
  ctx.moveTo(cx, top + s * 0.5);
  ctx.lineTo(cx, top + s * 2.4);
  ctx.moveTo(cx - s * 0.8, top + s * 1.1);
  ctx.lineTo(cx + s * 0.8, top + s * 1.1);
  ctx.stroke();
  ctx.fillStyle = "#3e6fb0";
  ctx.fillRect(cx - s * 0.4, top + s * 0.9, s * 0.8, s * 0.8);
  ctx.fillStyle = "#f1d9a6";
  ctx.beginPath();
  ctx.arc(cx, top + s * 0.55, s * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9a441";
  ctx.fillRect(cx - s * 0.6, top + s * 0.18, s * 1.2, s * 0.14);
}

// A carved pumpkin in the north-west corner.
function drawJackOLantern(ctx, px, py, cell) {
  const cx = px + cell * 0.2;
  const cy = py + cell * 0.22;
  const r = cell * 0.12;
  ctx.fillStyle = COLORS.pumpkin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.1, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b2a12";
  for (const dx of [-0.4, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * r - r * 0.18, cy - r * 0.1);
    ctx.lineTo(cx + dx * r + r * 0.18, cy - r * 0.1);
    ctx.lineTo(cx + dx * r, cy - r * 0.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.35, r * 0.5, r * 0.18, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = COLORS.vine;
  ctx.fillRect(cx - r * 0.1, cy - r * 1.25, r * 0.2, r * 0.3);
}

function drawDog(ctx, bx, by, cell, atEastEdge) {
  // Sit beside Bolt, on whichever side has room.
  const cx = bx + cell * (atEastEdge ? 0.14 : 0.86);
  const cy = by + cell * 0.72;
  const r = cell * 0.09;
  ctx.fillStyle = "#9b6a3c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.3, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 1.2, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5e3d1f";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.7, cy - r * 1.4, r * 0.3, r * 0.55, 0.4, 0, Math.PI * 2);
  ctx.ellipse(cx + r * 0.7, cy - r * 1.4, r * 0.3, r * 0.55, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx, tile, px, py, cell) {
  if (tile.ground === "well") {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(px, py, cell, cell);
    const cx = px + cell / 2;
    const cy = py + cell / 2;
    ctx.fillStyle = COLORS.stone;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.stoneDark;
    ctx.lineWidth = Math.max(1.5, cell / 40);
    ctx.stroke();
    ctx.fillStyle = COLORS.water;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (tile.ground === "grass") {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(px, py, cell, cell);
    ctx.strokeStyle = COLORS.grassEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
  } else {
    ctx.fillStyle = tile.wet > 0 ? COLORS.wetSoil : COLORS.soil;
    ctx.fillRect(px, py, cell, cell);
    ctx.strokeStyle = COLORS.soilFurrow;
    ctx.lineWidth = Math.max(2, cell / 30);
    for (let i = 1; i < 4; i++) {
      const fy = py + (cell * i) / 4;
      ctx.beginPath();
      ctx.moveTo(px + cell * 0.1, fy);
      ctx.lineTo(px + cell * 0.9, fy);
      ctx.stroke();
    }
    // Stubble left behind where wheat was just picked: carrots love it here.
    if (tile.last === "wheat" && !tile.crop) {
      ctx.strokeStyle = COLORS.wheatStem;
      ctx.lineWidth = Math.max(1.5, cell / 40);
      for (const [dx, dy] of [[0.25, 0.3], [0.5, 0.55], [0.72, 0.3], [0.35, 0.8], [0.68, 0.78]]) {
        ctx.beginPath();
        ctx.moveTo(px + dx * cell, py + dy * cell);
        ctx.lineTo(px + dx * cell + cell * 0.02, py + dy * cell - cell * 0.08);
        ctx.stroke();
      }
    }
  }
}

// tx, ty: the tile's place on the field, so berries can count their friends.
// pixel: draw with the sprite sheets where the pack has the crop.
function drawCrop(ctx, state, tx, ty, px, py, cell, pixel = false) {
  const tile = state.tiles[ty * state.size + tx];
  const info = CROPS[tile.crop];
  const growth = Math.min(1, tile.age / info.growTicks);
  const ripe = isTileRipe(tile);
  const cx = px + cell / 2;
  const base = py + cell * 0.82;
  const h = cell * (0.15 + 0.5 * growth);

  if (pixel && tile.crop === "grass") {
    drawGrassTufts(ctx, px, py, growth, ripe);
    return;
  }
  if (pixel && ripe) {
    drawRipeGlow(ctx, px, py);
  } else if (ripe && tile.crop !== "grass") {
    ctx.fillStyle = COLORS.ripe;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, py + cell / 2, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (tile.crop === "grass") {
    ctx.strokeStyle = ripe ? COLORS.hay : "#5d8f4a";
    ctx.lineWidth = Math.max(2, cell / 22);
    for (const dx of [-0.22, -0.08, 0.06, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cell, base);
      ctx.lineTo(cx + dx * cell + cell * 0.04, base - h * 0.8);
      ctx.stroke();
    }
  } else if (tile.crop === "wheat") {
    for (const dx of [-0.18, 0, 0.18]) {
      const sx = cx + dx * cell;
      ctx.strokeStyle = COLORS.wheatStem;
      ctx.lineWidth = Math.max(2, cell / 30);
      ctx.beginPath();
      ctx.moveTo(sx, base);
      ctx.lineTo(sx, base - h);
      ctx.stroke();
      if (growth > 0.4) {
        ctx.fillStyle = ripe ? COLORS.wheat : "#b9b46a";
        ctx.beginPath();
        ctx.ellipse(sx, base - h, cell * 0.05, cell * 0.11 * growth, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (tile.crop === "carrot") {
    ctx.fillStyle = COLORS.carrotTop;
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(cx + a * cell * 0.15, base - h * 0.6, cell * 0.05, h * 0.45, a, 0, Math.PI * 2);
      ctx.fill();
    }
    if (growth > 0.5) {
      // A carrot planted after wheat grows two roots.
      ctx.fillStyle = COLORS.carrot;
      for (const dx of tile.rotated ? [-0.12, 0.12] : [0]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cell - cell * 0.1, base - cell * 0.05);
        ctx.lineTo(cx + dx * cell + cell * 0.1, base - cell * 0.05);
        ctx.lineTo(cx + dx * cell, base + cell * 0.12 * growth);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (tile.crop === "lettuce") {
    drawLettuce(ctx, cx, base, cell, growth, tile.wilted);
  } else if (tile.crop === "strawberry") {
    // A ripe plant shows one berry for each strawberry it will give.
    const berries = ripe ? harvestYield(state, tx, ty).strawberry : growth > 0.5 ? 1 : 0;
    if (pixel) drawStrawberrySprite(ctx, px, py, growth, ripe, berries);
    else drawStrawberry(ctx, cx, base, cell, growth, ripe, berries);
  } else if (tile.crop === "blueberry") {
    // The bush grows a little bigger each time it's picked.
    const berries = ripe ? harvestYield(state, tx, ty).blueberry : growth > 0.4 ? 3 : 0;
    drawBlueberry(ctx, cx, base, cell, growth, ripe, berries, tile.picks ?? 0);
  } else if (tile.crop === "pumpkin") {
    drawPumpkin(ctx, cx, base, cell, growth, ripe, tile.rotten);
  } else if (tile.crop === "mushroom") {
    drawMushroom(ctx, cx, base, cell);
  } else if (tile.crop === "corn") {
    drawCorn(ctx, cx, base, cell, growth, ripe);
  } else if (tile.crop === "sunflower") {
    drawSunflower(ctx, cx, base, cell, growth, ripe);
  }
}

// A round pumpkin on a vine. A rotten one sags and goes brown.
function drawPumpkin(ctx, cx, base, cell, growth, ripe, rotten) {
  ctx.strokeStyle = COLORS.vine;
  ctx.lineWidth = Math.max(2, cell / 30);
  ctx.beginPath();
  ctx.moveTo(cx - cell * 0.3, base);
  ctx.quadraticCurveTo(cx, base - cell * 0.1, cx + cell * 0.3, base - cell * 0.02);
  ctx.stroke();
  const r = cell * (0.06 + 0.16 * Math.min(1, growth));
  const cy = base - r * (rotten ? 0.6 : 0.9);
  ctx.fillStyle = rotten ? COLORS.rotten : ripe ? COLORS.pumpkin : COLORS.pumpkinYoung;
  for (const dx of [-0.45, 0.45, 0]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * r, cy, r * 0.65, r * (rotten ? 0.6 : 0.85), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!rotten) {
    ctx.fillStyle = COLORS.vine;
    ctx.fillRect(cx - cell * 0.015, cy - r * 1.05, cell * 0.03, r * 0.3);
  }
}

function drawMushroom(ctx, cx, base, cell) {
  ctx.fillStyle = COLORS.mushroomStem;
  ctx.fillRect(cx - cell * 0.05, base - cell * 0.22, cell * 0.1, cell * 0.22);
  ctx.fillStyle = COLORS.mushroomCap;
  ctx.beginPath();
  ctx.ellipse(cx, base - cell * 0.22, cell * 0.2, cell * 0.13, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = COLORS.mushroomStem;
  for (const [dx, dy] of [[-0.1, -0.27], [0.06, -0.31], [0.12, -0.25]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * cell, base + dy * cell, cell * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A tall stalk with leaves. Ripe corn shows two yellow cobs (it gives 2).
function drawCorn(ctx, cx, base, cell, growth, ripe) {
  const h = cell * (0.15 + 0.6 * growth);
  ctx.strokeStyle = COLORS.cornLeaf;
  ctx.lineWidth = Math.max(2, cell / 24);
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.lineTo(cx, base - h);
  ctx.stroke();
  ctx.fillStyle = COLORS.cornLeaf;
  for (const [side, at] of [[-1, 0.3], [1, 0.55]]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * cell * 0.1, base - h * at, cell * 0.12, cell * 0.035, side * -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ripe) {
    ctx.fillStyle = COLORS.corn;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * cell * 0.07, base - h * 0.6, cell * 0.045, cell * 0.11, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// A tall stem with a flower head that opens yellow when it's ripe.
function drawSunflower(ctx, cx, base, cell, growth, ripe) {
  const h = cell * (0.15 + 0.4 * growth);
  ctx.strokeStyle = COLORS.cornLeaf;
  ctx.lineWidth = Math.max(2, cell / 26);
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.lineTo(cx, base - h);
  ctx.stroke();
  const r = cell * (0.04 + 0.08 * growth);
  const cy = base - h;
  if (ripe) {
    ctx.fillStyle = COLORS.petal;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3, r * 0.6, r * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = ripe ? COLORS.sunCenter : COLORS.cornLeaf;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// A low rosette of round leaves that widens as it grows. Wilted lettuce
// flops over and turns brown.
function drawLettuce(ctx, cx, base, cell, growth, wilted) {
  const r = cell * (0.06 + 0.1 * growth);
  const cy = base - r * (wilted ? 0.5 : 0.9);
  const leaves = [[-0.9, 0.2], [0.9, 0.2], [-0.45, -0.4], [0.45, -0.4], [0, 0]];
  for (const [dx, dy] of leaves) {
    ctx.fillStyle = wilted ? COLORS.wiltedLeaf : COLORS.lettuce;
    ctx.beginPath();
    ctx.ellipse(cx + dx * r, cy + dy * r, r * 0.75, r * (wilted ? 0.45 : 0.7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = wilted ? "#7a6a38" : COLORS.lettuceVein;
    ctx.lineWidth = Math.max(1, cell / 70);
    ctx.stroke();
  }
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.4, y + s * 0.1, x - s * 0.9, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.4, y + s * 0.1, x, y + s);
  ctx.fill();
}

// A pale patch under a ripe crop and a twinkle beside it, so ripe crops are
// easy to spot.
function drawRipeGlow(ctx, px, py) {
  ctx.fillStyle = "rgba(255, 244, 184, 0.3)";
  ctx.fillRect(px + 7, py + 3, 18, 26);
  ctx.fillRect(px + 3, py + 7, 26, 18);
  ctx.fillRect(px + 5, py + 5, 22, 22);
  ctx.fillStyle = "#fffbe0";
  ctx.fillRect(px + 25, py + 2, 2, 6);
  ctx.fillRect(px + 23, py + 4, 6, 2);
}

// Grass grows in tufts. Ripe grass turns to golden hay.
function drawGrassTufts(ctx, px, py, growth, ripe) {
  const h = 2 + Math.round(5 * growth);
  const [dark, light] = ripe ? ["#b89b3c", "#e6d27a"] : ["#3f7d3a", "#5f9e4a"];
  for (const [dx, dy] of [[7, 12], [19, 9], [12, 24], [24, 22]]) {
    const by = py + dy + 4;
    ctx.fillStyle = dark;
    ctx.fillRect(px + dx, by - h, 2, h);
    ctx.fillRect(px + dx + 4, by - h + 1, 2, h - 1);
    ctx.fillStyle = light;
    ctx.fillRect(px + dx + 2, by - h - 2, 2, h + 2);
    ctx.fillRect(px + dx - 1, by - 1, 8, 1);
  }
}

// The pack's strawberry plant, one picture per stage, with a little berry in
// front for each strawberry a ripe plant will give.
function drawStrawberrySprite(ctx, px, py, growth, ripe, berries) {
  const stage = ripe ? 5 : Math.min(4, Math.floor(growth * 5));
  sprite(ctx, "crops", stage * 16, 16, 16, 16, px, py - 2);
  if (!ripe) return;
  const spots = [[13, 25], [5, 24], [21, 24], [9, 28], [17, 28]];
  for (let i = 0; i < Math.min(berries, spots.length); i++) {
    const [x, y] = spots[i];
    ctx.fillStyle = "#7a1020";
    ctx.fillRect(px + x - 1, py + y - 1, 7, 6);
    ctx.fillStyle = COLORS.berryRed;
    ctx.fillRect(px + x, py + y, 5, 4);
    ctx.fillStyle = COLORS.berrySeed;
    ctx.fillRect(px + x + 1, py + y + 1, 1, 1);
    ctx.fillStyle = COLORS.berryLeaf;
    ctx.fillRect(px + x + 1, py + y - 2, 3, 2);
  }
}

function drawStrawberry(ctx, cx, base, cell, growth, ripe, berries) {
  ctx.fillStyle = COLORS.berryLeaf;
  const lr = cell * (0.05 + 0.08 * growth);
  for (const dx of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * lr * 1.2, base - lr * 1.3, lr * 0.8, lr * 0.6, dx * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const spots = [[0, 0], [-0.2, -0.05], [0.2, -0.05], [-0.1, -0.22], [0.1, -0.22]];
  const s = cell * 0.07;
  for (let i = 0; i < Math.min(berries, spots.length); i++) {
    const [dx, dy] = spots[i];
    const x = cx + dx * cell;
    const y = base - cell * 0.02 + dy * cell;
    ctx.fillStyle = ripe ? COLORS.berryRed : "#e6f0d8";
    heart(ctx, x, y, s);
    if (ripe) {
      ctx.fillStyle = COLORS.berrySeed;
      ctx.fillRect(x - s * 0.3, y, 1.5, 1.5);
      ctx.fillRect(x + s * 0.2, y + s * 0.2, 1.5, 1.5);
    }
  }
}

function drawBlueberry(ctx, cx, base, cell, growth, ripe, berries, picks) {
  const r = cell * (0.1 + 0.18 * growth + 0.02 * Math.min(picks, 3));
  const cy = base - r * 0.9;
  ctx.fillStyle = COLORS.bush;
  for (const [dx, dy] of [[-0.5, 0.2], [0.5, 0.2], [0, -0.3]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const spots = [[-0.45, 0.1], [0.4, 0.15], [0, -0.35], [-0.15, 0.35], [0.25, -0.1]];
  ctx.fillStyle = ripe ? COLORS.blueberry : COLORS.blueberryYoung;
  for (let i = 0; i < Math.min(berries, spots.length); i++) {
    const [dx, dy] = spots[i];
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, cell * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Bolt, the farm robot, wearing a hat.
function drawBolt(ctx, px, py, cell, hat = "straw_hat") {
  const cx = px + cell / 2;
  const cy = py + cell / 2 + cell * 0.04;
  const w = cell * 0.4;
  const h = cell * 0.32;
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.75, w * 0.6, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wheels, body and face.
  ctx.fillStyle = COLORS.boltDark;
  ctx.fillRect(cx - w * 0.45, cy + h * 0.38, w * 0.25, h * 0.25);
  ctx.fillRect(cx + w * 0.2, cy + h * 0.38, w * 0.25, h * 0.25);
  ctx.fillStyle = COLORS.bolt;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, cell * 0.06);
  ctx.fill();
  ctx.strokeStyle = COLORS.boltDark;
  ctx.lineWidth = Math.max(1.5, cell / 40);
  ctx.stroke();
  ctx.fillStyle = COLORS.boltEye;
  for (const dx of [-0.2, 0.2]) {
    ctx.beginPath();
    ctx.arc(cx + dx * w, cy - h * 0.08, cell * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.boltEye;
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.08, w * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  drawHat(ctx, cx, cy - h / 2, w, cell, hat);
}

function drawHat(ctx, cx, top, w, cell, hat) {
  const [brim, crown, style] = HATS[hat] ?? HATS.straw_hat;
  if (style === "flowers") {
    ctx.strokeStyle = brim;
    ctx.lineWidth = Math.max(2, cell / 30);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, top);
    ctx.lineTo(cx + w * 0.5, top);
    ctx.stroke();
    for (const [dx, color] of [[-0.35, "#f2d0e4"], [0, "#ffe066"], [0.35, "#f2d0e4"]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + dx * w, top - cell * 0.02, cell * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (style === "berries") {
    ctx.fillStyle = brim;
    ctx.beginPath();
    ctx.ellipse(cx, top, w * 0.75, cell * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = crown;
    roundRect(ctx, cx - w * 0.3, top - cell * 0.1, w * 0.6, cell * 0.1, cell * 0.03);
    ctx.fill();
    ctx.fillStyle = COLORS.berryRed;
    heart(ctx, cx - w * 0.15, top - cell * 0.06, cell * 0.03);
    ctx.fillStyle = COLORS.blueberry;
    for (const dx of [0.08, 0.2]) {
      ctx.beginPath();
      ctx.arc(cx + dx * w, top - cell * 0.06, cell * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (style === "mushroom") {
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.ellipse(cx, top, w * 0.55, cell * 0.12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = brim;
    for (const [dx, dy] of [[-0.25, 0.05], [0.05, 0.09], [0.3, 0.04]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * w, top - dy * cell, cell * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (style === "sunflower") {
    ctx.fillStyle = crown;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * cell * 0.07, top - cell * 0.06 + Math.sin(a) * cell * 0.07, cell * 0.035, cell * 0.018, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = brim;
    ctx.beginPath();
    ctx.arc(cx, top - cell * 0.06, cell * 0.045, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (style === "crown") {
    const tall = hat === "crown_8" ? 1.35 : 1;
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, top);
    ctx.lineTo(cx - w * 0.4, top - cell * 0.12 * tall);
    ctx.lineTo(cx - w * 0.2, top - cell * 0.05 * tall);
    ctx.lineTo(cx, top - cell * 0.14 * tall);
    ctx.lineTo(cx + w * 0.2, top - cell * 0.05 * tall);
    ctx.lineTo(cx + w * 0.4, top - cell * 0.12 * tall);
    ctx.lineTo(cx + w * 0.4, top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a87b0c";
    ctx.lineWidth = Math.max(1, cell / 80);
    ctx.stroke();
    const gems = GEMS[hat] ?? [];
    const spots = gems.length === 1 ? [0] : [-0.22, 0, 0.22];
    gems.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + spots[i] * w, top - cell * 0.04, cell * (gems.length === 1 ? 0.03 : 0.024), 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }
  ctx.fillStyle = brim;
  if (style === "cap") {
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.3, top, w * 0.35, cell * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, top, w * 0.75, cell * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = crown;
  roundRect(ctx, cx - w * 0.3, top - cell * 0.11, w * 0.6, cell * 0.11, cell * 0.03);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
