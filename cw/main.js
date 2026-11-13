import { CONFIG } from './config.js';
import { World } from './world.js';
import { Game } from './game.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { worldToScreen, edgeIndicator } from './geometry.js';

const stage = document.getElementById('gameStage');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const startScreen = document.getElementById('startScreen');
const gameOver = document.getElementById('gameOver');
const startButton = document.getElementById('startBtn');
const restartButton = document.getElementById('restartBtn');
const seed = new URL(location.href).searchParams.get('seed')?.trim().slice(0, 64) || CONFIG.defaultSeed;

export const world = new World({ seed });
export const game = new Game();
const hud = new HUD(document);
const input = new Input(document, () => game.status === 'running');
let width = 1, height = 1, dpr = 1;
let lastFrame = performance.now();
let shownStatus = '';

const seedLink = document.getElementById('seedLink');
const seedURL = new URL(location.href);
seedURL.searchParams.set('seed', seed);
seedLink.textContent = seed;
seedLink.href = seedURL.href;
seedLink.title = 'Reopen this world with seed: ' + seed;

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  draw();
}

function circle(x, y, radius, color, innerColor) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = innerColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, radius - 1.5, 0, Math.PI * 2); ctx.stroke();
}

function drawPlayer() {
  const p = game.player;
  circle(width / 2, height / 2, p.radius * world.tileSize, '#223e37', '#f6f0d6');
  ctx.save();
  ctx.translate(width / 2, height / 2); ctx.rotate(p.heading);
  ctx.fillStyle = '#f6f0d6';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(1, -2); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWalker() {
  const w = game.walker, p = game.player;
  const point = worldToScreen(w.x, w.y, p.x, p.y, width, height, world.tileSize);
  const radius = w.radius * world.tileSize;
  if (point.x + radius >= 0 && point.x - radius <= width
    && point.y + radius >= 0 && point.y - radius <= height) {
    circle(point.x, point.y, radius, '#cd4d3e', '#ffe0c9');
    return;
  }
  const arrow = edgeIndicator(point.x - width / 2, point.y - height / 2,
    width, height, { left: 80, right: 35, top: 76, bottom: 48 });
  if (!arrow) return;
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.fillStyle = '#21392ee6';
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f4e4c942'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 16.5, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(arrow.angle);
  ctx.fillStyle = '#f0735b';
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7);
  ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#8e9e73'; ctx.fillRect(0, 0, width, height);
  world.render(ctx, game.player.x, game.player.y, width, height);
  drawWalker();
  drawPlayer();
}

function updateOverlay() {
  if (shownStatus === game.status) return;
  shownStatus = game.status;
  startScreen.hidden = game.status !== 'ready';
  gameOver.hidden = game.status !== 'caught';
  canvas.inert = game.status !== 'running';
  for (const button of document.querySelectorAll('[data-control]')) {
    button.disabled = game.status !== 'running';
  }
  if (game.status === 'caught') {
    input.clear();
    restartButton.focus({ preventScroll: true });
  }
}

function startRun() {
  input.clear();
  game.reset(true);
  world.clearCache();
  lastFrame = performance.now();
  updateOverlay();
  hud.update(game, world, lastFrame, true);
  draw();
  canvas.focus({ preventScroll: true });
}

function advanceTo(now) {
  const dt = Math.max(0, (now - lastFrame) / 1000);
  lastFrame = now;
  if (dt > CONFIG.awayThreshold) input.clear();
  game.advance(dt, input.read());
}

// One authoritative RAF chain for the lifetime of the page; restart never adds one.
function frame(now) {
  advanceTo(now);
  if (dpr !== Math.max(1, window.devicePixelRatio || 1)) resize();
  if (game.status === 'running' || shownStatus !== game.status) {
    hud.update(game, world, now, shownStatus !== game.status);
    updateOverlay();
    draw();
  }
  requestAnimationFrame(frame);
}

startButton.addEventListener('click', startRun);
restartButton.addEventListener('click', startRun);
window.addEventListener('blur', () => {
  advanceTo(performance.now());
  input.clear();
});
document.addEventListener('visibilitychange', () => {
  advanceTo(performance.now());
  input.clear();
  hud.update(game, world, performance.now(), true);
  updateOverlay();
  draw();
});
window.addEventListener('pagehide', () => {
  advanceTo(performance.now());
  input.clear();
});
// Keep keyboard focus inside the active dialog without offering an in-run pause.
document.addEventListener('keydown', event => {
  if (event.key === 'Tab' && game.status !== 'running') {
    event.preventDefault();
    (game.status === 'ready' ? startButton : restartButton).focus();
  }
});

new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
updateOverlay();
resize();
hud.update(game, world, performance.now(), true);
startButton.focus({ preventScroll: true });
requestAnimationFrame(frame);
