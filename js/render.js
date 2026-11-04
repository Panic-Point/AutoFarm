// Draws a farm snapshot onto a canvas.
import { CROPS } from "./game.js";

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
  farmer: "#2f5d8c",
  hat: "#d9a441",
  shadow: "rgba(0,0,0,0.18)",
};

export function drawFarm(ctx, state) {
  const { size } = state;
  const W = ctx.canvas.width;
  const cell = W / size;
  ctx.clearRect(0, 0, W, W);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = state.tiles[y * size + x];
      // Screen y is flipped so north is up.
      const px = x * cell;
      const py = (size - 1 - y) * cell;
      drawGround(ctx, tile, px, py, cell);
      if (tile.crop) drawCrop(ctx, tile, px, py, cell);
    }
  }
  drawFarmer(ctx, state.x * cell, (size - 1 - state.y) * cell, cell);
}

function drawGround(ctx, tile, px, py, cell) {
  if (tile.ground === "grass") {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(px, py, cell, cell);
    ctx.strokeStyle = COLORS.grassEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
  } else {
    ctx.fillStyle = COLORS.soil;
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
  }
}

function drawCrop(ctx, tile, px, py, cell) {
  const info = CROPS[tile.crop];
  const growth = Math.min(1, tile.age / info.growTicks);
  const ripe = growth >= 1;
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
      ctx.fillStyle = COLORS.carrot;
      ctx.beginPath();
      ctx.moveTo(cx - cell * 0.1, base - cell * 0.05);
      ctx.lineTo(cx + cell * 0.1, base - cell * 0.05);
      ctx.lineTo(cx, base + cell * 0.12 * growth);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawFarmer(ctx, px, py, cell) {
  const cx = px + cell / 2;
  const cy = py + cell / 2;
  const r = cell * 0.2;
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.1, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.farmer;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.hat;
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.7, r * 1.25, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - r * 0.55, cy - r * 1.35, r * 1.1, r * 0.7);
}
