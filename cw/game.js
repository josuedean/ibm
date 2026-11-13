import { CONFIG, ITEMS, clamp, tileKey, areaKey, sleepRecovery } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { TCW } from './tcw.js';
import { sweptContact } from './geometry.js';

const REST = Object.freeze({ x: 0, y: 0, run: false });
const copyState = data => JSON.parse(JSON.stringify(data));
export class Game {
  constructor({ seed = CONFIG.defaultSeed, world = null } = {}) {
    this.seed = world?.seed || String(seed); this.terrain = world?.terrain || null;
    this.world = world || new World({ seed: this.seed }); this.player = new Player(); this.walker = new TCW();
    this.reset(false, true);
  }
  reset(start = false, preserveWorld = false) {
    if (!preserveWorld) this.world = new World({ seed: this.seed, terrain: this.terrain });
    this.player.reset(); this.walker.reset(); this.elapsed = 0; this.travelled = 0; this.accumulator = 0;
    this.inventory = Object.fromEntries(Object.keys(ITEMS).filter(k => k !== 'food').map(k => [k, 0]));
    this.status = start ? 'running' : 'ready'; this.action = null; this.jobs = new Map();
    this.blasts = []; this.decoys = []; this.effects = []; this.notices = [];
    this.victory = false; this.containmentRevision = this.world.revision; this.lastSave = null; this.savedAt = null;
    if (!this.world.walkerTile(this.walker.x, this.walker.y)
      || this.world.component(this.walker.x, this.walker.y, 256).closed) {
      outer: for (let r = 1; r < 20; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const nx = Math.floor(CONFIG.walker.x) + x, ny = Math.floor(CONFIG.walker.y) + y;
        if (this.world.walkerTile(nx, ny) && !this.world.component(nx, ny, 80).closed) {
          this.walker.x = nx + 0.5; this.walker.y = ny + 0.5; break outer;
        }
      }
    }
  }
  notice(text) { this.notices.push({ text, at: this.elapsed }); if (this.notices.length > 4) this.notices.shift(); }
  concealed() { return this.player.concealed(this.world, this.inventory); }
  targetInReach(target) { return Math.hypot(target.x + 0.5 - this.player.x, target.y + 0.5 - this.player.y) <= 1.95; }
  nearbyFinds() {
    return this.world.visibleFinds().filter(f => Math.hypot(f.x + 0.5 - this.player.x, f.y + 0.5 - this.player.y) <= 1.9);
  }
  collectNearby() {
    if (this.action?.kind === 'sleep' || this.player.underground) return false;
    const nearby = this.nearbyFinds();
    for (const f of nearby) {
      const item = this.world.collect(f.id, this.elapsed);
      if (!item) continue;
      if (item.kind === 'food') this.player.food += item.amount;
      else this.inventory[item.kind] = (this.inventory[item.kind] || 0) + item.amount;
      this.notice('Collected ' + ITEMS[item.kind].name + (item.kind === 'food' ? '.' : ' × ' + item.amount + '.'));
    }
    return nearby.length > 0;
  }
  interact() {
    if (this.status !== 'running' || this.action?.kind === 'sleep') return false;
    if (this.player.underground) {
      this.player.underground = false; this.action = null;
      this.walker.lastKnown = { x: this.player.x, y: this.player.y }; this.walker.planKey = '';
      this.notice('Back aboveground.'); return true;
    }
    if (this.collectNearby()) return true;
    const refuge = this.world.refugeAt(this.player.x, this.player.y);
    if (!refuge) { this.notice('Nothing within reach.'); return false; }
    this.action = null; this.walker.lastKnown = { x: this.player.x, y: this.player.y };
    this.player.underground = true; this.notice('Entered ' + refuge.name.toLowerCase() + '.'); return true;
  }
  sleepPreview(hours) {
    const duration = clamp(Number(hours) || 0.5, 0.5, 8);
    const recovered = sleepRecovery(duration, this.inventory.bedroll > 0);
    const fatigue = Math.max(0, this.player.fatigue - recovered);
    return { hours: duration, fatigue, recovered: this.player.fatigue - fatigue,
      maxStamina: Math.max(20, 100 - fatigue * 0.8),
      speed: 1 - 0.42 * Math.pow(fatigue / 100, 1.7), sheltered: this.inventory.bedroll > 0 };
  }
  startAction(kind, target = null, hours = 6) {
    if (this.status !== 'running' || this.action?.kind === 'sleep') return false;
    const p = this.player, world = this.world, t = target ? world.getTile(target.x, target.y) : world.getTile(p.x, p.y);
    if (kind === 'sleep') {
      if (world.getTile(p.x, p.y).wet && !p.underground) { this.notice('You cannot sleep while swimming or wading.'); return false; }
      const preview = this.sleepPreview(hours);
      this.action = { kind, elapsed: 0, total: preview.hours * CONFIG.hourSeconds,
        fatigueBefore: p.fatigue, sheltered: preview.sheltered };
      return true;
    }
    if (p.underground) { this.notice('Return aboveground to work here.'); return false; }
    if (!this.targetInReach(t)) { this.notice('Move closer to the selected ground.'); return false; }
    if (kind === 'search') {
      const key = areaKey(t.x, t.y), progress = world.searchProgress.get(key) || 0;
      this.action = { kind, x: t.x, y: t.y, key, elapsed: progress, total: CONFIG.searchSeconds };
      return true;
    }
    if (kind === 'refuge') {
      if (!this.inventory.shovel) { this.notice('A digging tool is required.'); return false; }
      if (!world.canRefuge(t.x, t.y)) { this.notice('A chamber needs level soil and a clear apron around its entrance.'); return false; }
      const key = 'refuge:' + tileKey(t.x, t.y);
      const job = this.jobs.get(key) || { kind, x: t.x, y: t.y, key, elapsed: 0, total: CONFIG.refugeSeconds };
      this.jobs.set(key, job); this.action = job; return true;
    }
    if (kind === 'dig') {
      if (!this.inventory.shovel) { this.notice('A digging tool is required.'); return false; }
      const base = world.baseTile(t.x, t.y), floor = base.height - base.soilDepth;
      if (t.material !== 'soil' || t.height <= floor + 0.025) { this.notice('The shovel cannot cut this material any further.'); return false; }
      const key = 'dig:' + tileKey(t.x, t.y);
      let job = this.jobs.get(key);
      if (!job || job.elapsed >= job.total || Math.abs(t.height - job.appliedHeight) > 0.04) {
        const endHeight = Math.max(floor, t.height - 0.9);
        job = { kind, key, x: t.x, y: t.y, elapsed: 0,
          total: (t.height - endHeight) / 0.9 * CONFIG.digSeconds,
          startHeight: t.height, endHeight, appliedHeight: t.height };
      }
      this.jobs.set(key, job); this.action = job; return true;
    }
    return false;
  }
  cancelAction() {
    if (this.action?.kind === 'sleep') return false;
    if (this.action) this.notice('Work interrupted. Progress retained.');
    this.action = null; return true;
  }
  placeDynamite(target) {
    if (this.status !== 'running' || this.player.underground || this.action?.kind === 'sleep') return false;
    if (!this.inventory.dynamite) { this.notice('No dynamite carried.'); return false; }
    if (!target || !this.targetInReach(target)) { this.notice('Move within reach of the selected ground.'); return false; }
    this.inventory.dynamite--;
    this.blasts.push({ x: Math.floor(target.x) + 0.5, y: Math.floor(target.y) + 0.5,
      remaining: CONFIG.fuseSeconds, id: this.elapsed + ':' + this.blasts.length });
    this.notice('Fuse lit · ' + CONFIG.fuseSeconds + ' seconds.'); return true;
  }
  placeDecoy() {
    if (!this.inventory.decoy || this.player.underground || this.action?.kind === 'sleep'
      || this.world.getTile(this.player.x, this.player.y).wet) return false;
    this.inventory.decoy--;
    this.decoys.push({ x: this.player.x, y: this.player.y, id: this.elapsed });
    this.walker.path = []; this.notice('Device placed.'); return true;
  }
  explode(blast) {
    const radius = CONFIG.blastRadius, cx = Math.floor(blast.x), cy = Math.floor(blast.y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      const t = this.world.getTile(cx + dx, cy + dy);
      const power = 1 - distance / (radius + 0.6);
      const cut = (t.material === 'bedrock' ? 0.95 : t.material === 'stone' ? 1.1 : 1.25) * power;
      this.world.edit(t.x, t.y, { height: t.height - cut, density: Math.max(0, t.density - 85 * power) });
      const key = 'dig:' + tileKey(t.x, t.y); this.jobs.delete(key);
      if (this.action?.key === key) this.action = null;
    }
    this.effects.push({ x: blast.x, y: blast.y, at: this.elapsed });
    this.notice('The ground gives way.');
  }
  advance(dt, input = REST) {
    if (this.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    this.accumulator += dt;
    while (this.accumulator + 1e-10 >= CONFIG.fixedStep && this.status === 'running') {
      this.step(CONFIG.fixedStep, input);
      this.accumulator = Math.max(0, this.accumulator - CONFIG.fixedStep);
    }
    if (this.status === 'caught') this.accumulator = 0;
  }
  step(dt, input) {
    const p = this.player, w = this.walker, p0 = { x: p.x, y: p.y }, w0 = { x: w.x, y: w.y };
    const sleeping = this.action?.kind === 'sleep';
    if (!this.concealed()) w.lastKnown = { x: p.x, y: p.y };
    p.food = Math.max(0, p.food - dt);
    if (!sleeping) p.fatigue = Math.min(100, p.fatigue + dt / CONFIG.fatigueSeconds * 100);
    const moved = p.update(input, dt, this.world, this.inventory, sleeping);
    this.travelled += moved;
    if (moved > 1e-8 && this.action && !sleeping) this.cancelAction();
    this.elapsed += dt;
    if (this.action) {
      const a = this.action; a.elapsed = Math.min(a.total, a.elapsed + dt);
      if (a.kind === 'sleep') p.fatigue = Math.max(0, a.fatigueBefore
        - sleepRecovery(a.elapsed / CONFIG.hourSeconds, a.sheltered));
      if (a.kind === 'search') this.world.searchProgress.set(a.key, a.elapsed);
      if (a.kind === 'dig') {
        const height = a.startHeight + (a.endHeight - a.startHeight) * a.elapsed / a.total;
        if (Math.abs(height - a.appliedHeight) >= 0.025 || a.elapsed >= a.total - 1e-8) {
          this.world.edit(a.x, a.y, { height: Math.min(this.world.getTile(a.x, a.y).height, height) });
          a.appliedHeight = this.world.getTile(a.x, a.y).height;
        }
      }
      if (a.elapsed >= a.total - 1e-8) {
        if (a.kind === 'search') {
          this.world.completeSearch(a.x, a.y, this.elapsed, this.inventory.fishing > 0);
          const n = this.world.visibleFinds().filter(f => areaKey(f.x, f.y) === a.key).length;
          this.notice(n ? 'Area explored · ' + n + (n === 1 ? ' find revealed.' : ' finds revealed.') : 'Area explored · nothing to collect.');
        } else if (a.kind === 'refuge') {
          this.world.refuges.set(tileKey(a.x, a.y), { x: a.x, y: a.y, kind: 'dug', name: 'Dug refuge' });
          this.jobs.delete(a.key); this.notice('Chamber complete. Enter from its opening.');
        } else if (a.kind === 'sleep') this.notice('Awake.');
        else { this.jobs.delete(a.key); this.notice('Excavation complete.'); }
        this.action = null;
      }
    }
    for (const b of this.blasts) b.remaining -= dt;
    const detonating = this.blasts.filter(b => b.remaining <= 1e-8);
    this.blasts = this.blasts.filter(b => b.remaining > 1e-8);
    for (const blast of detonating) this.explode(blast);
    w.update(this, dt);
    p.stamina = Math.min(p.stamina, p.maxStamina());
    if (p.food <= 0) p.stamina = 0;
    if (!this.concealed()
      && this.world.canTraverse(w.x, w.y, p.x, p.y)
      && sweptContact(p0, p, w0, w, p.radius + w.radius) !== null) {
      this.status = 'caught'; this.action = null;
    }
    if (this.world.revision !== this.containmentRevision) {
      this.containmentRevision = this.world.revision; this.checkContainment();
    }
    this.effects = this.effects.filter(e => this.elapsed - e.at < 1.5);
  }
  checkContainment() {
    if (!this.world.edits.size) return false;
    const c = this.world.component(this.walker.x, this.walker.y, 4096);
    if (c.closed && !c.keys.has(tileKey(this.player.x, this.player.y))) {
      if (!this.victory) { this.victory = true; this.notice('The Walker is contained.'); }
      this.walker.enclosure = c.cells.length ? c.cells : [{ x: Math.floor(this.walker.x), y: Math.floor(this.walker.y) }];
      this.walker.path = []; return true;
    }
    return false;
  }
  canSave() { return this.status === 'running' && this.player.underground && !!this.world.refugeAt(this.player.x, this.player.y); }
  serialize() {
    return copyState({ version: CONFIG.version, seed: this.seed, elapsed: this.elapsed, travelled: this.travelled,
      player: { ...this.player }, walker: this.walker.serialize(), world: this.world.serialize(),
      inventory: this.inventory, action: this.action, jobs: [...this.jobs], blasts: this.blasts,
      decoys: this.decoys, victory: this.victory, accumulator: this.accumulator });
  }
  checkpoint() {
    if (!this.canSave()) { this.notice('Saving requires an underground refuge or natural cave.'); return null; }
    const snapshot = this.serialize(); this.lastSave = copyState(snapshot); this.savedAt = this.elapsed;
    return snapshot;
  }
  restore(snapshot, { checkpoint = true } = {}) {
    if (!Game.validSnapshot(snapshot, checkpoint)) throw new Error('This is not a valid refuge checkpoint.');
    this.seed = snapshot.seed; this.world = new World({ seed: this.seed, terrain: this.terrain });
    this.world.restore(snapshot.world); Object.assign(this.player, snapshot.player);
    this.walker.restore(snapshot.walker); this.inventory = { ...snapshot.inventory };
    this.elapsed = snapshot.elapsed; this.travelled = snapshot.travelled; this.accumulator = snapshot.accumulator || 0;
    this.jobs = new Map(copyState(snapshot.jobs || [])); this.action = copyState(snapshot.action);
    if (this.action?.key && this.jobs.has(this.action.key)) this.action = this.jobs.get(this.action.key);
    this.blasts = copyState(snapshot.blasts || []); this.decoys = copyState(snapshot.decoys || []);
    this.victory = !!snapshot.victory; this.status = 'running'; this.effects = []; this.notices = [];
    this.containmentRevision = this.world.revision;
    if (checkpoint) { this.lastSave = copyState(snapshot); this.savedAt = snapshot.elapsed; }
  }
  static validSnapshot(s, requireRefuge = true) {
    if (!s || s.version !== CONFIG.version || typeof s.seed !== 'string' || !s.seed.length || s.seed.length > 64
      || !s.player || !s.walker || !s.world || !s.inventory
      || !Number.isFinite(s.elapsed) || s.elapsed < 0 || s.elapsed > 1e9) return false;
    const point = p => p && [p.x, p.y].every(n => Number.isFinite(n) && Math.abs(n) < 1e7);
    const coordinate = k => typeof k === 'string' && /^-?\d+,-?\d+$/.test(k);
    const safeKeys = (o, keys) => o && Object.keys(o).every(k => keys.includes(k));
    if (!point(s.player) || !point(s.walker)
      || !safeKeys(s.player, ['x','y','radius','stamina','fatigue','food','underground','heading','state','exhausted'])
      || !safeKeys(s.walker, ['x','y','lastKnown','path','planKey','planRevision','phase','mode','orbitTarget',
        'enclosure','componentKey','targetClosed','distanceWalked','footPhase'])) return false;
    if (typeof s.player.underground !== 'boolean' || typeof s.player.exhausted !== 'boolean'
      || !Number.isFinite(s.player.heading) || s.player.radius !== CONFIG.player.radius
      || !['resting','occupied','underground','swimming','running','walking','blocked'].includes(s.player.state)
      || !['pursuing','circling','decoy'].includes(s.walker.mode)) return false;
    if (![s.player.food, s.player.fatigue, s.player.stamina].every(n => Number.isFinite(n) && n >= 0)) return false;
    if (s.player.fatigue > 100 || s.player.stamina > 100) return false;
    for (const [k, v] of Object.entries(s.inventory))
      if (!Object.hasOwn(ITEMS, k) || k === 'food' || !Number.isInteger(v) || v < 0 || v > 1e9) return false;
    if (!Object.keys(ITEMS).filter(k => k !== 'food').every(k => Object.hasOwn(s.inventory,k))) return false;
    if (!point(s.walker.lastKnown) || !Array.isArray(s.walker.path) || s.walker.path.length > 100000
      || !s.walker.path.every(point) || !Number.isFinite(s.walker.phase)
      || !Number.isFinite(s.walker.footPhase) || !Number.isFinite(s.walker.distanceWalked)
      || !Number.isFinite(s.walker.planRevision) || typeof s.walker.planKey !== 'string'
      || typeof s.walker.componentKey !== 'string' || typeof s.walker.targetClosed !== 'boolean'
      || (s.walker.orbitTarget !== null && !point(s.walker.orbitTarget))
      || (s.walker.enclosure !== null && (!Array.isArray(s.walker.enclosure)
        || s.walker.enclosure.length > 100000 || !s.walker.enclosure.every(point)))) return false;
    for (const name of ['edits', 'refuges', 'searched', 'searchProgress', 'collected', 'resources'])
      if (!Array.isArray(s.world[name]) || s.world[name].length > 100000) return false;
    if (!Number.isInteger(s.world.revision) || s.world.revision < 0) return false;
    const pairs = a => a.every(e => Array.isArray(e) && e.length === 2 && coordinate(e[0]));
    if (!['edits','refuges','searchProgress','resources'].every(k => pairs(s.world[k]))) return false;
    if (!s.world.searched.every(coordinate) || !s.world.collected.every(k => typeof k === 'string' && k.length < 150)) return false;
    if (!s.world.edits.every(([,e]) => safeKeys(e,['height','density'])
      && Object.values(e).every(Number.isFinite) && (e.density === undefined || (e.density >= 0 && e.density <= 100)))) return false;
    if (!s.world.refuges.every(([k,r]) => point(r) && tileKey(r.x,r.y) === k && r.kind === 'dug'
      && typeof r.name === 'string' && r.name.length < 150)) return false;
    if (!s.world.searchProgress.every(([,v]) => Number.isFinite(v) && v >= 0 && v <= CONFIG.searchSeconds)) return false;
    if (!s.world.resources.every(([k,r]) => point(r) && r.kind === 'food' && r.id === 'food:' + k
      && Number.isFinite(r.amount) && r.amount >= 0 && Number.isFinite(r.availableAt)
      && typeof r.present === 'boolean')) return false;
    const validAction = a => a && ['search','dig','refuge','sleep'].includes(a.kind)
      && Number.isFinite(a.total) && a.total > 0 && a.total <= 1e6
      && Number.isFinite(a.elapsed) && a.elapsed >= 0 && a.elapsed <= a.total
      && (a.kind === 'sleep' ? typeof a.sheltered === 'boolean' && Number.isFinite(a.fatigueBefore)
        && a.fatigueBefore >= 0 && a.fatigueBefore <= 100 && a.total <= 8 * CONFIG.hourSeconds
        : point(a) && typeof a.key === 'string')
      && (a.kind !== 'dig' || [a.startHeight,a.endHeight,a.appliedHeight].every(Number.isFinite));
    if ((s.action !== null && !validAction(s.action)) || !Array.isArray(s.jobs) || s.jobs.length > 100000
      || !s.jobs.every(e => Array.isArray(e) && typeof e[0] === 'string' && validAction(e[1]))) return false;
    if (!Array.isArray(s.blasts) || !Array.isArray(s.decoys) || s.blasts.length > 10000 || s.decoys.length > 10000
      || !s.blasts.every(b => point(b) && Number.isFinite(b.remaining) && b.remaining >= 0 && b.remaining <= CONFIG.fuseSeconds)
      || !s.decoys.every(point) || !Number.isFinite(s.travelled) || s.travelled < 0
      || !Number.isFinite(s.accumulator) || s.accumulator < 0 || s.accumulator > 1) return false;
    if (requireRefuge) {
      if (!s.player.underground) return false;
      try {
        const world = new World({ seed: s.seed }); world.restore(s.world);
        if (!world.refugeAt(s.player.x, s.player.y)) return false;
      } catch { return false; }
    }
    return true;
  }
}
