import { CONFIG, ITEMS } from './config.js';
import { Game } from './game.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { Renderer } from './render.js';

const root = document, canvas = root.getElementById('gameCanvas');
const initialSeed = new URL(location.href).searchParams.get('seed')?.trim().slice(0, 64) || CONFIG.defaultSeed;
export const game = new Game({ seed: initialSeed });
const renderer = new Renderer(canvas);
let selected = null, timeScale = 1, lastFrame = performance.now(), shownStatus = '';
const input = new Input(root, () => game.status === 'running' && game.action?.kind !== 'sleep');
const keyFor = seed => 'constant-walker:v3:checkpoint:' + seed;
const notesKey = seed => 'constant-walker:v3:notes:' + seed;
function stored(seed) {
  try {
    const raw = localStorage.getItem(keyFor(seed));
    if (!raw) return null;
    const data = JSON.parse(raw); return Game.validSnapshot(data) ? data : null;
  } catch { return null; }
}
function readNotes() { try { return localStorage.getItem(notesKey(game.seed)) || ''; } catch { return ''; } }
function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = root.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function currentTarget() { return selected || { x: Math.floor(game.player.x), y: Math.floor(game.player.y) }; }
function resetView() {
  input.clear(); selected = null; timeScale = 1; lastFrame = performance.now(); renderer.cache.clear();
  hud.lastInventory = ''; hud.lastNotice = ''; hud.victoryDismissed = false; hud.setNotes(game.seed, readNotes());
  root.getElementById('seedInput').value = game.seed;
  try { const url = new URL(location.href); url.searchParams.set('seed', game.seed); history.replaceState(null, '', url); } catch {}
  updateOverlay(); hud.update(game, performance.now(), true); renderer.draw(game);
}
function begin() {
  game.seed = root.getElementById('seedInput').value.trim().slice(0, 64) || CONFIG.defaultSeed;
  game.reset(true); resetView(); canvas.focus({ preventScroll: true });
}
function continueGame() {
  const seed = root.getElementById('seedInput').value.trim().slice(0, 64) || CONFIG.defaultSeed;
  const snapshot = stored(seed);
  if (!snapshot) return;
  try { game.restore(snapshot); resetView(); canvas.focus({ preventScroll: true }); }
  catch { game.notice('This checkpoint could not be opened.'); }
}
function save() {
  const snapshot = game.checkpoint(); if (!snapshot) return false;
  try {
    localStorage.setItem(keyFor(game.seed), JSON.stringify(snapshot)); game.notice('Checkpoint saved.');
  } catch { game.notice('Checkpoint kept for this session. Export a backup to keep it.'); }
  hud.update(game, performance.now(), true); return true;
}
function load() {
  if (game.action?.kind === 'sleep' && game.status === 'running') return;
  const snapshot = game.lastSave || stored(game.seed);
  if (!snapshot) { game.reset(true); resetView(); return; }
  try { game.restore(snapshot); resetView(); canvas.focus({ preventScroll: true }); }
  catch { game.notice('This checkpoint could not be opened.'); }
}
function act(kind, hours) {
  const result = game.startAction(kind, currentTarget(), hours);
  if (result) input.clear(); hud.update(game, performance.now(), true); return result;
}
const hud = new HUD(root, {
  game: () => game, target: currentTarget, timeScale: () => timeScale,
  clearInput: () => input.clear(), act, save, load,
  interact: () => { input.clear(); game.interact(); hud.update(game, performance.now(), true); },
  cancel: () => { game.cancelAction(); timeScale = 1; },
  center: () => { selected = null; renderer.selection = currentTarget(); hud.update(game, performance.now(), true); },
  decoy: () => { game.placeDecoy(); hud.update(game, performance.now(), true); },
  blast: () => { game.placeDynamite(currentTarget()); hud.update(game, performance.now(), true); },
  preview: enabled => { renderer.previewBlast = enabled; },
  speed: n => { if (game.action && [1, 5, 20].includes(n)) timeScale = n; },
  hasCheckpoint: () => !!stored(game.seed),
  notes: value => {
    try { localStorage.setItem(notesKey(game.seed), value); root.getElementById('notesStatus').textContent = 'Notes kept'; }
    catch { root.getElementById('notesStatus').textContent = 'Export to keep these notes'; }
  },
  exportNotes: value => download('Constant_Walker_Notes.txt', value, 'text/plain'),
  exportCheckpoint: () => {
    const snapshot = game.lastSave || stored(game.seed);
    if (snapshot) download('Constant_Walker_Checkpoint.json', JSON.stringify(snapshot, null, 2));
  },
  importCheckpoint: async file => {
    if (!file || game.action?.kind === 'sleep') return;
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('size');
      const data = JSON.parse(await file.text());
      if (!Game.validSnapshot(data)) throw new Error('format');
      game.restore(data); resetView();
      try { localStorage.setItem(keyFor(game.seed), JSON.stringify(data)); } catch {}
      game.notice('Checkpoint imported.');
    } catch { game.notice('That file is not a valid refuge checkpoint.'); }
    root.getElementById('importFile').value = '';
  },
});
root.getElementById('seedInput').value = initialSeed;
function updateContinue() {
  const seed = root.getElementById('seedInput').value.trim() || CONFIG.defaultSeed;
  root.getElementById('continueBtn').hidden = !stored(seed);
}
function updateOverlay() {
  if (shownStatus === game.status) return;
  shownStatus = game.status;
  root.getElementById('startScreen').hidden = game.status !== 'ready';
  root.getElementById('gameOver').hidden = game.status !== 'caught';
  if (game.status === 'caught') {
    input.clear(); timeScale = 1;
    const hasSave = !!game.lastSave || stored(game.seed);
    root.getElementById('caughtText').textContent = hasSave
      ? 'Unsaved expedition progress is lost. Your written notes remain.'
      : 'No refuge checkpoint has been made yet.';
    root.getElementById('restartBtn').textContent = hasSave ? 'Return to last refuge' : 'Restart expedition';
    root.getElementById('restartBtn').focus({ preventScroll: true });
  }
  if (game.status === 'ready') updateContinue();
  for (const button of root.querySelectorAll('[data-control]')) button.disabled = game.status !== 'running';
}
root.getElementById('startBtn').addEventListener('click', begin);
root.getElementById('continueBtn').addEventListener('click', continueGame);
root.getElementById('restartBtn').addEventListener('click', load);
root.getElementById('newRunBtn').addEventListener('click', () => {
  input.clear(); game.status = 'ready'; shownStatus = ''; updateOverlay();
});
root.getElementById('seedInput').addEventListener('input', updateContinue);
root.querySelector('.wordmark').addEventListener('click', e => e.preventDefault());
const dialog = root.getElementById('helpDialog');
root.getElementById('helpBtn').addEventListener('click', () => { input.clear(); dialog.showModal(); });
for (const id of ['closeHelp', 'closeHelpBottom']) root.getElementById(id).addEventListener('click', () => dialog.close());
canvas.addEventListener('pointerdown', event => {
  if (game.status !== 'running') return;
  const rect = canvas.getBoundingClientRect();
  selected = renderer.fromScreen(event.clientX - rect.left, event.clientY - rect.top, game.player);
  renderer.selection = selected; hud.update(game, performance.now(), true); canvas.focus({ preventScroll: true });
});
window.addEventListener('keydown', event => {
  if (event.target?.closest?.('input,textarea,select,[contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (game.status !== 'running' || dialog.open) return;
  if (event.code === 'KeyQ') { event.preventDefault(); act('search'); }
  if (event.code === 'KeyE') { event.preventDefault(); input.clear(); game.interact(); }
  if (event.code === 'Escape') { game.cancelAction(); timeScale = 1; }
});
window.addEventListener('blur', () => input.clear());
document.addEventListener('visibilitychange', () => { input.clear(); lastFrame = performance.now(); });
function resize() { renderer.resize(); renderer.draw(game); }
new ResizeObserver(resize).observe(root.getElementById('gameStage'));
window.addEventListener('resize', resize);
function frame(now) {
  const dt = Math.max(0, Math.min(0.15, (now - lastFrame) / 1000)); lastFrame = now;
  if (!document.hidden) {
    if (!game.action) timeScale = 1;
    const movement = input.read();
    if (game.action?.kind !== 'sleep' && (movement.x || movement.y)) timeScale = 1;
    game.advance(dt * timeScale, movement);
  }
  renderer.selection = currentTarget();
  if (renderer.dpr !== Math.max(1, window.devicePixelRatio || 1)) renderer.resize();
  updateOverlay(); hud.update(game, now); renderer.draw(game);
  requestAnimationFrame(frame);
}
if (new URL(location.href).searchParams.has('test')) {
  window.__CW_TEST__ = { game, renderer, begin, save, load, act,
    select: target => { selected = target; renderer.selection = target; },
    refresh: () => { shownStatus = ''; updateOverlay(); hud.update(game, performance.now(), true); renderer.draw(game); },
    get timeScale() { return timeScale; } };
}
resize(); hud.setNotes(game.seed, readNotes()); updateOverlay(); hud.update(game, performance.now(), true);
requestAnimationFrame(frame);
