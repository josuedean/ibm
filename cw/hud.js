import { CONFIG, ITEMS, sleepRecovery } from './config.js';
import { BIOMES } from './world.js';
export class HUD {
  constructor(root, controls) {
    this.root = root; this.controls = controls; this.lastUpdate = -Infinity; this.lastInventory = '';
    this.lastNotice = ''; this.toastUntil = 0; this.victoryDismissed = false; this.notesSeed = '';
    const bind = (id, fn) => root.getElementById(id).addEventListener('click', fn);
    bind('searchBtn', () => controls.act('search'));
    bind('refugeBtn', () => controls.act('refuge'));
    bind('digBtn', () => controls.act('dig'));
    bind('sleepBtn', () => controls.act('sleep', Number(this.el('sleepHours').value)));
    bind('interactBtn', () => controls.interact());
    bind('decoyBtn', () => controls.decoy());
    bind('blastBtn', () => controls.blast());
    bind('cancelAction', () => controls.cancel());
    bind('saveBtn', () => controls.save());
    bind('loadBtn', () => controls.load());
    bind('centerTarget', () => controls.center());
    bind('exportBtn', () => controls.exportCheckpoint());
    bind('importBtn', () => this.el('importFile').click());
    this.el('importFile').addEventListener('change', e => controls.importCheckpoint(e.target.files?.[0]));
    bind('exportNotes', () => controls.exportNotes(this.el('notes').value));
    bind('dismissVictory', () => { this.victoryDismissed = true; this.el('victory').hidden = true; });
    this.el('notes').addEventListener('input', () => controls.notes(this.el('notes').value));
    this.el('notes').addEventListener('focus', () => controls.clearInput());
    for (const button of root.querySelectorAll('[data-tab]')) button.addEventListener('click', () => {
      for (const b of root.querySelectorAll('[data-tab]')) b.classList.toggle('active', b === button);
      for (const id of ['actions', 'inventory', 'notes']) this.el('panel-' + id).hidden = id !== button.dataset.tab;
      controls.clearInput();
    });
    for (const button of root.querySelectorAll('[data-speed]')) button.addEventListener('click', () => controls.speed(Number(button.dataset.speed)));
    this.el('blastBtn').addEventListener('pointerenter', () => controls.preview(true));
    this.el('blastBtn').addEventListener('pointerleave', () => controls.preview(false));
    this.el('sleepHours').addEventListener('input', () => this.update(controls.game(), performance.now(), true));
  }
  el(id) { return this.root.getElementById(id); }
  setNotes(seed, text) {
    this.notesSeed = seed; this.el('notes').value = text; this.el('notesStatus').textContent = 'Player-written notes';
  }
  update(game, now, force = false) {
    if (!force && now - this.lastUpdate < 100) return;
    this.lastUpdate = now;
    const p = game.player, world = game.world, action = game.action;
    const target = this.controls.target(), t = world.getTile(target.x, target.y);
    const running = game.status === 'running', sleeping = action?.kind === 'sleep';
    const hour = game.elapsed / CONFIG.hourSeconds + 8;
    this.el('clock').textContent = 'DAY ' + String(Math.floor(hour / 24) + 1).padStart(2, '0') + ' · '
      + String(Math.floor(hour % 24)).padStart(2, '0') + ':' + String(Math.floor(hour * 60 % 60)).padStart(2, '0');
    this.el('coordinates').textContent = 'E ' + p.x.toFixed(1) + ' · N ' + (-p.y).toFixed(1);
    this.el('gap').textContent = 'DISTANCE ' + Math.hypot(p.x - game.walker.x, p.y - game.walker.y).toFixed(1);
    this.el('seedLabel').textContent = world.seed;
    this.el('terrainLabel').textContent = p.underground ? 'BELOW GROUND' : BIOMES[world.getTile(p.x, p.y).type].name.toUpperCase();
    this.el('staminaText').textContent = Math.floor(p.stamina) + ' / ' + Math.floor(p.maxStamina());
    this.el('staminaMeter').value = p.stamina; this.el('foodMeter').value = Math.min(CONFIG.foodCapacityDisplay, p.food);
    this.el('foodText').textContent = (p.food / CONFIG.hourSeconds).toFixed(1) + ' h';
    this.el('fatigueText').textContent = Math.round(p.fatigue) + '%'; this.el('fatigueMeter').value = p.fatigue;
    this.el('selectedName').textContent = BIOMES[t.type].name;
    this.el('selectedPosition').textContent = t.x + ', ' + t.y;
    const degrees = Math.atan(world.slopeAt(t.x, t.y)) * 180 / Math.PI;
    this.el('selectedDetails').textContent = t.material.toUpperCase() + ' · ELEVATION ' + t.height.toFixed(2)
      + '\nDENSITY ' + Math.round(t.density) + '% · SLOPE ' + Math.round(degrees) + '°'
      + (t.wet ? ' · DEPTH ' + t.depth.toFixed(2) + ' · FLOW ' + (t.current >= CONFIG.maxWalkerCurrent ? 'SWIFT' : 'GENTLE') : '');
    this.el('selectedDetails').style.whiteSpace = 'pre-line';
    this.el('targetDistance').textContent = game.targetInReach(t) ? 'Selected ground is within reach.' : 'Move closer to work on this ground.';
    const unavailable = !running || sleeping;
    this.el('searchBtn').disabled = unavailable || p.underground || !game.targetInReach(t);
    this.el('refugeBtn').disabled = unavailable || p.underground || !game.inventory.shovel || !world.canRefuge(t.x, t.y) || !game.targetInReach(t);
    this.el('digBtn').disabled = unavailable || p.underground || !game.inventory.shovel || t.material !== 'soil'
      || t.height <= world.baseTile(t.x, t.y).height - world.baseTile(t.x, t.y).soilDepth + 0.025 || !game.targetInReach(t);
    this.el('blastBtn').disabled = unavailable || p.underground || !game.inventory.dynamite || !game.targetInReach(t);
    this.el('decoyBtn').disabled = unavailable || p.underground || !game.inventory.decoy || world.getTile(p.x, p.y).wet;
    const refuge = world.refugeAt(p.x, p.y);
    this.el('interactBtn').disabled = unavailable || (!p.underground && !refuge && game.nearbyFinds().length === 0);
    this.el('interactBtn').firstChild.textContent = p.underground ? 'Surface ' : refuge ? 'Enter ' : 'Collect ';
    this.el('decoyCount').textContent = game.inventory.decoy ? game.inventory.decoy + ' carried' : 'None carried';
    this.el('dynamiteCount').textContent = '8-second fuse · ' + game.inventory.dynamite + ' carried';
    const hours = Number(this.el('sleepHours').value), preview = game.sleepPreview(hours);
    this.el('sleepHoursLabel').textContent = hours + (hours === 1 ? ' hour' : ' hours');
    this.el('sleepPreview').textContent = 'Fatigue ' + Math.round(p.fatigue) + '% → ' + Math.round(preview.fatigue) + '%';
    const foodAfter = Math.max(0, p.food - hours * CONFIG.hourSeconds);
    this.el('sleepStats').textContent = 'Stamina cap ' + Math.round(preview.maxStamina)
      + ' · pace ' + Math.round(preview.speed * (foodAfter ? 1 : 0.55) * 100) + '%'
      + ' · ' + (foodAfter / CONFIG.hourSeconds).toFixed(1) + ' h food at wake'
      + (preview.sheltered ? ' · sheltered' : '');
    this.el('sleepBtn').disabled = unavailable || (world.getTile(p.x, p.y).wet && !p.underground);
    this.el('sleepHours').disabled = sleeping;
    this.el('saveBtn').disabled = !game.canSave();
    const hasCheckpoint = !!game.lastSave || this.controls.hasCheckpoint();
    this.el('loadBtn').disabled = !hasCheckpoint || sleeping || !running;
    this.el('exportBtn').disabled = !hasCheckpoint; this.el('importBtn').disabled = sleeping;
    this.el('saveStatus').textContent = game.savedAt === null ? (hasCheckpoint ? 'Checkpoint available in this world.' : 'No checkpoint in this world.')
      : 'Checkpoint · ' + (game.savedAt / CONFIG.hourSeconds).toFixed(1) + ' expedition hours';
    this.el('actionCard').hidden = !action;
    if (action) {
      this.el('actionTitle').textContent = ({ search: 'Exploring the area', refuge: 'Excavating a chamber', dig: 'Lowering the ground', sleep: 'Sleeping' })[action.kind];
      this.el('actionTime').textContent = action.kind === 'sleep'
        ? (action.elapsed / CONFIG.hourSeconds).toFixed(1) + ' / ' + (action.total / CONFIG.hourSeconds).toFixed(1) + ' h'
        : Math.ceil(Math.max(0, action.total - action.elapsed)) + 's remaining';
      this.el('actionProgress').value = action.elapsed / action.total;
      this.el('cancelAction').hidden = sleeping; this.el('committedLabel').hidden = !sleeping;
    }
    for (const b of this.root.querySelectorAll('[data-speed]')) {
      b.classList.toggle('active', Number(b.dataset.speed) === this.controls.timeScale()); b.disabled = !action;
    }
    const signature = JSON.stringify(game.inventory);
    if (signature !== this.lastInventory) {
      this.lastInventory = signature; const list = this.el('inventoryList'); list.replaceChildren();
      let count = 0;
      for (const [key, amount] of Object.entries(game.inventory)) if (amount > 0) {
        count++; const item = ITEMS[key], row = this.root.createElement('div'); row.className = 'inventory-item';
        const icon = this.root.createElement('span'); icon.textContent = item.icon;
        const body = this.root.createElement('div'), title = this.root.createElement('strong'), desc = this.root.createElement('p'), qty = this.root.createElement('small');
        title.textContent = item.name; desc.textContent = item.description; qty.textContent = '× ' + amount;
        body.append(qty, title, desc); row.append(icon, body); list.append(row);
      }
      if (!count) { const empty = this.root.createElement('p'); empty.className = 'panel-foot'; empty.textContent = 'Your pack is empty.'; list.append(empty); }
      this.el('kitCount').textContent = count;
    }
    const notice = game.notices.at(-1);
    const noticeKey = notice ? notice.at + ':' + notice.text : '';
    if (noticeKey && noticeKey !== this.lastNotice) {
      this.lastNotice = noticeKey; this.toastUntil = now + 3600; this.el('toast').textContent = notice.text;
    }
    this.el('toast').classList.toggle('visible', running && now < this.toastUntil);
    this.el('victory').hidden = !game.victory || this.victoryDismissed;
    if (!game.victory) this.victoryDismissed = false;
  }
}
