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
  drawExtras(ctx, state, looks, cell, false);
  if (opts.fog) drawFog(ctx, state, cell);
}

// The things that sit on top of the field: the hive, Daisy and Bolt. Shop
// decorations aren't drawn, to keep the field clear.
function drawExtras(ctx, state, looks, cell, pixel) {
  const { size } = state;
  if (state.hive) drawHive(ctx, state.hive[0] * cell, (size - 1 - state.hive[1]) * cell, cell);
  if (state.dinner) {
    if (pixel) drawCowSprite(ctx, 0, (size - 1) * cell, cell, state.dinner.missed > 0);
    else drawCow(ctx, 0, (size - 1) * cell, cell, state.dinner.missed > 0);
  }
  const bx = state.x * cell;
  const by = (size - 1 - state.y) * cell;
  drawBolt(ctx, bx, by, cell, looks.hat);
}

// ---- Pixel art ----
// The sprite sheets are Liberated Pixel Cup (LPC) art from OpenGameArt, in
// assets/sprites (credits and licenses in assets/CREDITS.md). Its tiles are
// 32 pixels. The field is drawn small, one tile to TILE pixels, inside a
// grass border, then scaled up to the canvas without smoothing so
// every pixel stays crisp.

const TILE = 32;
const SHEETS = {
  grass: "grass.png",
  soil: "soil.png",
  wheat: "wheat.png",
  youngWheat: "young-wheat.png",
  tallGrass: "tall-grass.png",
  crops: "crops.png",
  cow: "cow.png",
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
      makeRecolors();
      for (const [ctx, state, opts] of waiting.values()) drawPixelFarm(ctx, state, opts);
      waiting.clear();
    };
    img.src = new URL(file, base).href;
  }
}

function spritesReady() {
  return loaded === Object.keys(SHEETS).length;
}

// A copy of a sheet with every pixel passed through `fn(r, g, b)`.
function recolor(img, fn) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    [d[i], d[i + 1], d[i + 2]] = fn(d[i], d[i + 1], d[i + 2]);
  }
  g.putImageData(data, 0, 0);
  return c;
}

// Watered soil (only the brown earth darkens, not the grass round it), and
// brown wilted or rotten crops.
function makeRecolors() {
  sheets.wetSoil = recolor(sheets.soil, (r, g, b) => (r > g ? [r * 0.68, g * 0.64, b * 0.66] : [r, g, b]));
  sheets.deadCrops = recolor(sheets.crops, (r, g, b) => {
    const l = 0.3 * r + 0.55 * g + 0.15 * b;
    return [l * 0.95 + 25, l * 0.78 + 10, l * 0.5];
  });
}

// Crops from the LPC crops sheet: its column, and whether it's in the top or
// bottom half. Each crop has four growth stages, 64 pixels tall each.
const CROP_SPRITES = {
  carrot: [6, 0],
  pumpkin: [27, 0],
  corn: [31, 0],
  lettuce: [2, 320],
  strawberry: [20, 320],
  blueberry: [23, 320],
};

// A little reusable canvas the field is drawn on before it's scaled up.
let buffer = null;
function bufferOf(width, height) {
  if (!buffer || buffer.width !== width || buffer.height !== height) {
    buffer = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
  }
  return buffer;
}

// A number from 0 to 1 that's always the same for a tile, for decorations.
function noise(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function sprite(ctx, sheet, sx, sy, sw, sh, dx, dy) {
  ctx.drawImage(sheets[sheet], sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw, sh);
}

// A rounded square a little inside the tile, for each tile's own bed or
// patch, so there's a strip of grass between neighbours.
function insetPath(ctx, px, py) {
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 1);
  ctx.lineTo(px + TILE - 4, py + 1);
  ctx.lineTo(px + TILE - 1, py + 4);
  ctx.lineTo(px + TILE - 1, py + TILE - 4);
  ctx.lineTo(px + TILE - 4, py + TILE - 1);
  ctx.lineTo(px + 4, py + TILE - 1);
  ctx.lineTo(px + 1, py + TILE - 4);
  ctx.lineTo(px + 1, py + 4);
  ctx.closePath();
}

// A bed of tilled soil: the soil sheet's plain furrows (row 5 has three), cut
// to the rounded square, with a darker rim.
function drawBed(ctx, sheet, px, py, variant) {
  ctx.save();
  insetPath(ctx, px, py);
  ctx.clip();
  sprite(ctx, sheet, variant * TILE, 5 * TILE, TILE, TILE, px, py);
  ctx.restore();
  ctx.strokeStyle = "rgba(60, 34, 18, 0.55)";
  ctx.lineWidth = 1;
  ctx.save();
  ctx.translate(0.5, 0.5);
  insetPath(ctx, px, py);
  ctx.restore();
  ctx.stroke();
}

// A patch of tall wheat or grass: the middle of the field from its sheet, with
// the front row of stalks along the bottom.
function drawPatch(ctx, sheet, px, py) {
  ctx.save();
  insetPath(ctx, px, py);
  ctx.clip();
  sprite(ctx, sheet, TILE, 3 * TILE, TILE, TILE, px, py);
  sprite(ctx, sheet, TILE, 4 * TILE + 18, TILE, 11, px, py + TILE - 12);
  ctx.restore();
}

function drawPixelFarm(ctx, state, opts) {
  const { size } = state;
  const looks = opts.looks ?? { hat: "straw_hat" };
  // Half a tile of grass round the field, or a whole tile when Daisy needs
  // room to stand beside the barn tile.
  const margin = state.dinner ? TILE : TILE / 2;
  const side = size * TILE + 2 * margin;
  const buf = bufferOf(side, side);
  const b = buf.getContext("2d");
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, side, side);

  const tileAt = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? null : state.tiles[y * size + x]);
  const growthOf = (t) => Math.min(1, t.age / CROPS[t.crop].growTicks);

  // Grass everywhere, with a few light blades.
  for (let gy = 0; gy * TILE < side; gy++) {
    for (let gx = 0; gx * TILE < side; gx++) {
      const px = gx * TILE;
      const py = gy * TILE;
      sprite(b, "grass", 0, 0, TILE, TILE, px, py);
      b.fillStyle = "#64a42c";
      for (let i = 0; i < 4; i++) {
        const bx = px + 2 + Math.floor(noise(gx, gy, i) * 27);
        const by = py + 2 + Math.floor(noise(gx, gy, i + 9) * 27);
        b.fillRect(bx, by, 1, 3);
        b.fillRect(bx + 2, by + 1, 1, 2);
      }
    }
  }

  b.save();
  b.translate(margin, margin);
  const screenY = (y) => (size - 1 - y) * TILE;

  // Tilled soil, joined up into beds.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = tileAt(x, y);
      if (tile.ground !== "soil") continue;
      // Each tile is its own bed, so the tiles are easy to tell apart.
      drawBed(b, tile.wet > 0 ? "wetSoil" : "soil", x * TILE, screenY(y), Math.floor(noise(x, y, 3) * 3));
      if (tile.last === "wheat" && !tile.crop) drawStubble(b, x * TILE, screenY(y));
    }
  }

  // Crops, from the back row to the front, since tall ones reach up into the
  // tile behind them.
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const tile = tileAt(x, y);
      const px = x * TILE;
      const py = screenY(y);
      if (tile.ground === "well") drawWell(b, px, py);
      if (!tile.crop) continue;
      const ripe = isTileRipe(tile);
      // Wheat and grass: sprouts, then short and tall growth, then a ripe
      // patch. Each is kept a little inside its tile, so a field of them
      // still shows where one tile ends and the next begins.
      if (tile.crop === "wheat" || tile.crop === "grass") {
        const young = tile.crop === "wheat" ? "youngWheat" : "tallGrass";
        const g = growthOf(tile);
        if (ripe) {
          drawPatch(b, tile.crop === "wheat" ? "wheat" : "tallGrass", px, py);
        } else {
          b.save();
          b.beginPath();
          b.rect(px + 3, py + 3, TILE - 6, TILE - 6);
          b.clip();
          sprite(b, young, (g < 0.25 ? 0 : g < 0.5 ? 1 : 2) * TILE, 5 * TILE, TILE, TILE, px, py);
          b.restore();
        }
        continue;
      }
      const spot = CROP_SPRITES[tile.crop];
      if (!spot) {
        // No sprite for this one: draw it with shapes at the same size.
        drawCrop(b, state, x, y, px, py, TILE, false);
        if (ripe) drawTwinkle(b, px, py);
        continue;
      }
      const growth = growthOf(tile);
      const step = ripe ? 3 : Math.min(2, Math.floor(growth * 3));
      const dead = tile.wilted || tile.rotten;
      sprite(b, dead ? "deadCrops" : "crops", spot[0] * TILE, spot[1] + step * 64, TILE, 64, px, py - TILE + 2);
      if (tile.crop === "strawberry" && ripe) drawBerryCount(b, px, py, harvestYield(state, x, y).strawberry);
      if (ripe && !dead) drawTwinkle(b, px, py);
    }
  }
  b.restore();


  b.save();
  b.translate(margin, margin);
  if (opts.goal) drawGoal(b, state, opts.goal, TILE);
  drawExtras(b, state, looks, TILE, true);
  if (opts.fog) drawFog(b, state, TILE);
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

// A small sparkle in the corner of a ripe crop, so ripe crops are easy to spot.
function drawTwinkle(ctx, px, py) {
  ctx.fillStyle = "rgba(255, 251, 224, 0.95)";
  ctx.fillRect(px + 25, py + 1, 2, 7);
  ctx.fillRect(px + 22, py + 4, 8, 1);
  ctx.fillStyle = "rgba(255, 251, 224, 0.5)";
  ctx.fillRect(px + 23, py + 3, 1, 1);
  ctx.fillRect(px + 28, py + 6, 1, 1);
}

// A strawberry plant with friends next to it gives more than one: a little
// berry for each extra one in front of it.
function drawBerryCount(ctx, px, py, berries) {
  const spots = [[2, 25], [24, 26], [8, 28], [18, 28]];
  for (let i = 0; i < Math.min(berries - 1, spots.length); i++) {
    const [x, y] = spots[i];
    ctx.fillStyle = "#5e0f1a";
    ctx.fillRect(px + x - 1, py + y - 1, 7, 6);
    ctx.fillStyle = COLORS.berryRed;
    ctx.fillRect(px + x, py + y, 5, 4);
    ctx.fillStyle = COLORS.berrySeed;
    ctx.fillRect(px + x + 1, py + y + 1, 1, 1);
    ctx.fillRect(px + x + 3, py + y + 2, 1, 1);
    ctx.fillStyle = COLORS.berryLeaf;
    ctx.fillRect(px + x + 1, py + y - 2, 3, 2);
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

// Daisy, waiting at the barn for dinner. She cries once she misses a meal.
// She's bigger than a tile, so she stands mostly in the border below it.
function drawCowSprite(ctx, px, py, cell, sad) {
  sprite(ctx, "cow", 0, 0, 71, 44, px - 20, py + cell - 12);
  if (sad) {
    ctx.fillStyle = "#4aa3df";
    ctx.fillRect(px + 42, py + cell + 2, 2, 3);
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
// glow: false leaves out the pale circle under a ripe crop.
function drawCrop(ctx, state, tx, ty, px, py, cell, glow = true) {
  const tile = state.tiles[ty * state.size + tx];
  const info = CROPS[tile.crop];
  const growth = Math.min(1, tile.age / info.growTicks);
  const ripe = isTileRipe(tile);
  const cx = px + cell / 2;
  const base = py + cell * 0.82;
  const h = cell * (0.15 + 0.5 * growth);

  if (glow && ripe && tile.crop !== "grass") {
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
    drawStrawberry(ctx, cx, base, cell, growth, ripe, berries);
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
