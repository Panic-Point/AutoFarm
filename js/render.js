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
  crown_carrot: ["#f59a23"], // carrot
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
export function drawFarm(ctx, state, opts = {}) {
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
  if (looks.scarecrow) drawScarecrow(ctx, (size - 1) * cell, 0, cell);
  if (looks.jackOLantern) drawJackOLantern(ctx, 0, 0, cell);
  if (state.hive) drawHive(ctx, state.hive[0] * cell, (size - 1 - state.hive[1]) * cell, cell);
  if (looks.dinnerBell) drawBell(ctx, 0, (size - 1) * cell, cell);
  if (state.dinner) drawCow(ctx, 0, (size - 1) * cell, cell, state.dinner.missed > 0);
  const bx = state.x * cell;
  const by = (size - 1 - state.y) * cell;
  if (looks.dog) drawDog(ctx, bx, by, cell, state.x === size - 1);
  const [jx, jy] = opts.bonk ? bonkOffset(opts.bonk, cell) : [0, 0];
  drawBolt(ctx, bx + jx, by + jy, cell, looks.hat);
  if (opts.bonk) drawBonk(ctx, bx, by, cell, opts.bonk);
  if (opts.fog) drawFog(ctx, state, cell);
}

// Bolt bumped the fence. bonk: { dir: [dx, dy] the way Bolt tried to go,
// t: 0 to 1 through the bump }. Bolt lunges at the fence, jolts back and
// wobbles, and a "bonk!" puff pops up where Bolt hit it.
const screenDir = ([dx, dy]) => [dx, -dy];

function bonkOffset({ dir, t }, cell) {
  const [sx, sy] = screenDir(dir);
  // A quick lunge (first fifth), then a shake that dies away.
  const push = t < 0.2 ? Math.sin((t / 0.2) * Math.PI) * 0.22 : 0;
  const shake = t < 0.2 ? 0 : Math.sin(t * 40) * 0.05 * (1 - t);
  return [(sx * push + sy * shake) * cell, (sy * push + sx * shake) * cell];
}

function drawBonk(ctx, px, py, cell, { dir, t }) {
  const [sx, sy] = screenDir(dir);
  // At the fence, but kept inside the field so the whole puff shows.
  const W = ctx.canvas.width;
  const keep = (v, rx) => Math.min(W - rx, Math.max(rx, v));
  const cx = keep(px + cell / 2 + sx * cell * 0.45, cell * 0.34);
  const cy = keep(py + cell * 0.25 + sy * cell * 0.45, cell * 0.28) - t * cell * 0.15;
  const pop = Math.min(1, t * 6);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.5) * 2);
  // A spiky puff.
  ctx.fillStyle = "#fff6c8";
  ctx.strokeStyle = "#c9921a";
  ctx.lineWidth = Math.max(1.5, cell / 40);
  ctx.beginPath();
  const spikes = 9;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = cell * pop * (i % 2 ? 0.17 : 0.26);
    const x = cx + Math.cos(a) * r * 1.25;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7a3b10";
  ctx.font = `bold ${Math.round(cell * 0.17 * pop)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("bonk!", cx, cy);
  ctx.restore();
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
function drawCrop(ctx, state, tx, ty, px, py, cell) {
  const tile = state.tiles[ty * state.size + tx];
  const info = CROPS[tile.crop];
  const growth = Math.min(1, tile.age / info.growTicks);
  const ripe = isTileRipe(tile);
  const cx = px + cell / 2;
  const base = py + cell * 0.82;
  const h = cell * (0.15 + 0.5 * growth);

  if (ripe && tile.crop !== "grass") {
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
