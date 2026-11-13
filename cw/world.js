import { createNoise } from './noise.min.js';
import { CONFIG, clamp, tileKey, areaKey, mod } from './config.js';

export const BIOMES = Object.freeze({
  grass: { name: 'Grassland', color: '#8c9c76' },
  forest: { name: 'Woodland', color: '#567351' },
  denseForest: { name: 'Dense undergrowth', color: '#365b48' },
  rock: { name: 'Rocky ground', color: '#99998a' },
  foothills: { name: 'Foothills', color: '#8a9274' },
  mountain: { name: 'Mountain', color: '#747f72' },
  peak: { name: 'High ground', color: '#bac0ad' },
  water: { name: 'Deep lake', color: '#355e72' },
  river: { name: 'Deep river', color: '#406b7c' },
  stream: { name: 'Stream', color: '#66949a' },
  shallowWater: { name: 'Shallows', color: '#82aaa4' },
});
export function hashSeed(value) {
  let hash = 2166136261;
  for (const c of String(value)) { hash ^= c.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
export function fieldRandom(x, y, salt = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const BASIN_ROWS = [[-1, 1], [-2, 3], [-3, 3], [-3, 3], [-3, 2], [-2, 2], [-1, 1]];
function basinInterior(dx, dy) {
  const row = BASIN_ROWS[dy + 3];
  return !!row && dx >= row[0] && dx <= row[1];
}

export class World {
  constructor({ seed = CONFIG.defaultSeed, terrain = null } = {}) {
    this.seed = String(seed).slice(0, 64); this.salt = hashSeed(this.seed);
    this.noise = createNoise(this.salt); this.coverNoise = createNoise(this.salt ^ 73471);
    this.terrain = terrain; this.baseCache = new Map(); this.edits = new Map();
    this.refuges = new Map(); this.searched = new Set(); this.searchProgress = new Map();
    this.collected = new Set(); this.resources = new Map(); this.revision = 0;
    const shift = (this.salt % 5) - 2;
    this.sites = { basin: { x: 44 + shift, y: -22, radius: 4 }, cave: { x: -19, y: 12 } };
    const j = ((this.salt >>> 4) % 3) - 1;
    this.finds = [
      { id: 'starter-shovel', kind: 'shovel', x: 4 + j, y: -1, amount: 1 },
      { id: 'starter-shelter', kind: 'bedroll', x: -5, y: -3 + j, amount: 1 },
      { id: 'starter-provisions', kind: 'food', x: 0, y: 3, amount: 480 },
      { id: 'climbing-kit', kind: 'climbing', x: 13 + j, y: -7, amount: 1 },
      { id: 'fishing-pole', kind: 'fishing', x: 19, y: 7 + j, amount: 1 },
      { id: 'diving-kit', kind: 'diving', x: 29 + j, y: 13, amount: 1 },
      { id: 'decoy-cache', kind: 'decoy', x: 31, y: -10, amount: 2 },
      { id: 'charges-west', kind: 'dynamite', x: -14, y: -12, amount: 2 },
      { id: 'charges-east', kind: 'dynamite', x: 36, y: 9, amount: 2 },
      { id: 'charges-north', kind: 'dynamite', x: 64, y: -31, amount: 2 },
    ];
  }
  riverY(band, x) {
    return 25 + band * 96 + Math.sin(x * 0.035 + (this.salt % 113)) * 5
      + this.noise.perlin2(x * 0.013 + 12, band * 7 + 1.6) * 4;
  }
  basinNear(x, y) {
    const first = this.sites.basin;
    if (Math.max(Math.abs(x - first.x), Math.abs(y - first.y)) <= 24) return first;
    const gx = Math.floor(x / 192), gy = Math.floor((y + 96) / 192);
    if (gx === 0 && gy === 0) return null;
    const r = fieldRandom(gx, gy, this.salt ^ 3197);
    const b = { x: gx * 192 + 86 + Math.floor(r * 32), y: gy * 192 - 38 + Math.floor(r * 8), radius: 4 };
    return Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) <= 24 ? b : null;
  }
  cavePoints(x, y, radius = 20) {
    const result = [this.sites.cave];
    const minX = Math.floor((x - radius) / 96), maxX = Math.floor((x + radius) / 96);
    const minY = Math.floor((y - radius) / 96), maxY = Math.floor((y + radius) / 96);
    for (let cy = minY; cy <= maxY; cy++) for (let cx = minX; cx <= maxX; cx++) {
      const r = fieldRandom(cx, cy, this.salt ^ 827);
      if (r < 0.08 && Math.abs(cx) + Math.abs(cy) > 0)
        result.push({ x: cx * 96 + 18 + Math.floor(r * 500), y: cy * 96 + 35 });
    }
    return result.filter(p => Math.abs(p.x - x) <= radius && Math.abs(p.y - y) <= radius
      && !this.basinNear(p.x, p.y));
  }
  baseTile(wx, wy) {
    const x = Math.floor(wx), y = Math.floor(wy), key = tileKey(x, y);
    if (this.baseCache.has(key)) return this.baseCache.get(key);
    let t;
    if (this.terrain) {
      t = { x, y, height: 0.2, density: 5, material: 'soil', soilDepth: 1.1,
        waterLevel: null, waterKind: 'river', current: 0, ...this.terrain(x, y) };
    } else {
      const large = this.noise.perlin2(x * 0.019 + 13.7, y * 0.019 - 22.3);
      const ridge = Math.max(0, large + 0.02) * 11;
      let height = 0.2 + this.noise.perlin2(x * 0.08 - 20, y * 0.08 + 10) * 0.3 + ridge;
      if (ridge > 2) height += this.noise.perlin2(x * 0.35, y * 0.35) * 1.1;
      const cover = this.coverNoise.perlin2(x * 0.08 + 31, y * 0.08 + 18);
      const detail = this.coverNoise.perlin2(x * 0.36 - 20, y * 0.36 + 30);
      let density = clamp(25 + cover * 105 + Math.max(0, detail) * 80, 4, 96);
      // Blocked cover occurs in compact detail patches, rather than vast safe biomes.
      if (detail < 0.18) density = Math.min(density, 69);
      let material = height > 3.5 ? 'bedrock' : height > 1.9 ? 'stone' : 'soil';
      let waterLevel = null, waterKind = 'river';
      const band = Math.round((y - 25) / 96), center = this.riverY(band, x);
      let riverDistance = Math.abs(y - center), width = 3.2;
      const lakeX = 34 + Math.floor(x / 192) * 192;
      const lakeY = this.riverY(band, lakeX);
      const lakeDistance = Math.hypot((x - lakeX) / 10, (y - lakeY) / 7);
      const ford = mod(x - (this.salt % 7), 28) < 2;
      if (lakeDistance < 1) { riverDistance = 0; waterKind = 'water'; }
      if (riverDistance < width + 5) {
        const blend = clamp((riverDistance - width - 1) / 4, 0, 1);
        height = 0.2 * (1 - blend) + height * blend;
        density *= blend; material = 'soil';
      }
      if (riverDistance < width) {
        waterLevel = 0; height = ford || riverDistance > width - 1 ? -0.24 : -1.05;
        density = 0;
      }
      const tributaryCell = Math.floor(x / 64), joinX = tributaryCell * 64 + 32;
      const joinY = this.riverY(band, joinX), along = (y - (joinY - 20)) / 20;
      if (along >= 0 && along <= 1 && Math.abs(x - joinX - Math.sin(along * Math.PI) * 3) < 0.85
        && waterLevel === null) {
        waterLevel = 0; height = -0.24; density = 0; material = 'soil'; waterKind = 'stream';
      }
      const openingDistance = Math.hypot(x, y);
      if (openingDistance < 27 && waterLevel === null) {
        const blend = clamp((openingDistance - 13) / 14, 0, 1);
        height = 0.2 + (height - 0.2) * blend;
        density = 7 + (density - 7) * blend;
        if (height < 1.9) material = 'soil';
      }
      if (openingDistance < 13) {
        height = 0.2; waterLevel = null; material = 'soil'; density = 7;
        if (x < -4 && y > 2 && y < 8) density = 52;
      }
      const b = this.basinNear(x, y);
      if (b) {
        const dx = Math.abs(x - b.x), dy = Math.abs(y - b.y);
        const basinDistance = Math.max(dx, dy);
        if (basinDistance > 7 && basinDistance < 24 && waterLevel === null) {
          const blend = (basinDistance - 7) / 17;
          height = 0.2 + (height - 0.2) * blend;
          density = 8 + (density - 8) * blend;
          if (height < 1.9) material = 'soil';
        }
        if (dx <= 7 && dy <= 7) {
          height = 0.2; density = 8; waterLevel = null; material = 'soil';
          const rx = x - b.x, ry = y - b.y;
          const boundary = !basinInterior(rx, ry) && [-1,0,1].some(ox =>
            [-1,0,1].some(oy => basinInterior(rx + ox, ry + oy)));
          if (boundary) {
            height = 2.3 + fieldRandom(x,y,this.salt) * 0.25; material = 'bedrock'; density = 35;
            if (x === b.x && y === b.y + b.radius) { height = 0.2; material = 'soil'; density = 5; }
          }
        }
      }
      const cave = this.cavePoints(x, y, 10).find(c => Math.hypot(x - c.x, y - c.y) <= 10);
      if (cave) {
        const blend = clamp((Math.hypot(x - cave.x, y - cave.y) - 4) / 6, 0, 1);
        if (blend === 0 || waterLevel === null) {
          height = 0.2 + (height - 0.2) * blend; density = 8 + (density - 8) * blend;
          if (blend === 0) waterLevel = null;
          if (height < 1.9) material = 'soil';
        }
      }
      if (this.finds.some(f => f.x === x && f.y === y)) {
        height = 0.2; density = Math.min(density, 50); waterLevel = null; material = 'soil';
      }
      t = { x, y, height, density, material, waterLevel, waterKind,
        current: waterLevel === null ? 0 : ford || waterKind === 'stream' ? 0.1
          : 0.3 + Math.max(0, Math.sin(x * 0.11 + band)) * 0.6,
        soilDepth: material === 'soil' ? 1.05 : material === 'stone' ? 0.2 : 0 };
    }
    if (this.baseCache.size > 80000) this.baseCache.clear();
    this.baseCache.set(key, Object.freeze(t)); return t;
  }
  getTile(x, y) {
    const base = this.baseTile(x, y), edit = this.edits.get(tileKey(x, y));
    const t = { ...base, ...edit };
    t.depth = t.waterLevel === null ? 0 : Math.max(0, t.waterLevel - t.height);
    t.wet = t.depth > 0.05; t.deep = t.depth > CONFIG.shallowDepth;
    t.type = t.wet ? (t.deep ? t.waterKind : t.waterKind === 'stream' ? 'stream' : 'shallowWater')
      : t.density >= 70 && t.material === 'soil' ? 'denseForest' : t.density >= 30 && t.material === 'soil' ? 'forest'
      : t.height > 4.4 ? 'peak' : t.height > 2.3 ? 'mountain'
      : t.height > 1.1 ? 'foothills' : t.material !== 'soil' ? 'rock' : 'grass';
    return t;
  }
  getTileType(x, y) { return this.getTile(x, y).type; }
  getTileColor(type) { return BIOMES[type]?.color || BIOMES.grass.color; }
  slopeAt(x, y) {
    const t = this.getTile(x, y);
    return Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) =>
      Math.abs(t.height - this.getTile(t.x + dx, t.y + dy).height)));
  }
  walkerTile(x, y) {
    const t = this.getTile(x, y);
    return !t.deep && t.current < CONFIG.maxWalkerCurrent && t.density < CONFIG.maxWalkerDensity;
  }
  canTraverse(x, y, nx, ny, actor = 'walker', equipment = {}) {
    x = Math.floor(x); y = Math.floor(y); nx = Math.floor(nx); ny = Math.floor(ny);
    if (x === nx && y === ny) return actor !== 'walker' || this.walkerTile(nx, ny);
    if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1) return false;
    const a = this.getTile(x, y), b = this.getTile(nx, ny);
    const distance = Math.hypot(nx - x, ny - y);
    if (actor === 'walker') {
      if (!this.walkerTile(x, y) || !this.walkerTile(nx, ny)) return false;
      if (Math.abs(b.height - a.height) / distance > CONFIG.maxWalkerSlope + 1e-8) return false;
    } else if (!equipment.climbing && Math.abs((b.wet ? b.waterLevel : b.height)
      - (a.wet ? a.waterLevel : a.height)) / distance > CONFIG.maxPlayerSlope + 1e-8) return false;
    if (nx !== x && ny !== y) return this.canTraverse(x, y, nx, y, actor, equipment)
      && this.canTraverse(x, y, x, ny, actor, equipment)
      && this.canTraverse(nx, y, nx, ny, actor, equipment)
      && this.canTraverse(x, ny, nx, ny, actor, equipment);
    return true;
  }
  neighbors(x, y, actor = 'walker', equipment = {}) {
    const list = [];
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]])
      if (this.canTraverse(x, y, x + dx, y + dy, actor, equipment)) list.push({ x: x + dx, y: y + dy });
    return list;
  }
  component(x, y, limit = 600) {
    x = Math.floor(x); y = Math.floor(y);
    if (!this.walkerTile(x, y)) return { closed: true, keys: new Set(), cells: [] };
    const cells = [{ x, y }], keys = new Set([tileKey(x, y)]);
    for (let i = 0; i < cells.length; i++) for (const n of this.neighbors(cells[i].x, cells[i].y)) {
      const key = tileKey(n.x, n.y);
      if (!keys.has(key)) {
        keys.add(key); cells.push(n);
        if (cells.length > limit) return { closed: false, keys, cells };
      }
    }
    return { closed: true, keys, cells };
  }
  edit(x, y, change) {
    const key = tileKey(x, y), previous = this.edits.get(key) || {};
    this.edits.set(key, { ...previous, ...change }); this.revision++;
  }
  clearCache() { this.baseCache.clear(); }
  sampleFields(x, y) {
    const t = this.getTile(x, y); return { elevation: t.height, moisture: t.density / 100 };
  }
  refugeAt(x, y) {
    const key = tileKey(x, y);
    if (this.refuges.has(key)) return this.refuges.get(key);
    const cave = this.cavePoints(Math.floor(x), Math.floor(y), 0).find(c => c.x === Math.floor(x) && c.y === Math.floor(y));
    return cave ? { ...cave, kind: 'cave', name: 'Natural cave' } : null;
  }
  canRefuge(x, y) {
    const t = this.getTile(x, y);
    if (t.wet || t.material !== 'soil' || t.density > 29 || this.refugeAt(x, y)) return false;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const n = this.getTile(t.x + dx, t.y + dy);
      if (!this.walkerTile(n.x, n.y) || n.wet || Math.abs(n.height - t.height) > 0.3) return false;
    }
    return true;
  }
  clueAt(x, y) {
    if (this.searched.has(areaKey(x, y))) return false;
    const ax = Math.floor(x / 3), ay = Math.floor(y / 3);
    return this.finds.some(f => areaKey(f.x, f.y) === ax + ',' + ay)
      || fieldRandom(ax, ay, this.salt ^ 1829) < 0.09;
  }
  completeSearch(x, y, now, hasFishing) {
    const key = areaKey(x, y); this.searched.add(key); this.searchProgress.delete(key);
    const t = this.getTile(x, y), previous = this.resources.get(key);
    const forest = t.type === 'forest' || t.type === 'denseForest';
    if ((forest || (t.wet && hasFishing)) && (!previous || previous.availableAt <= now)) {
      const [ax, ay] = key.split(',').map(Number);
      if (t.wet || fieldRandom(ax, ay, this.salt ^ 921) < 0.85)
        this.resources.set(key, { id: 'food:' + key, kind: 'food', x: Math.floor(x), y: Math.floor(y),
          amount: t.wet ? 300 : 180, availableAt: Infinity, present: true });
    }
    return this.visibleFinds();
  }
  visibleFinds() {
    return [...this.finds.filter(f => this.searched.has(areaKey(f.x, f.y)) && !this.collected.has(f.id)),
      ...[...this.resources.values()].filter(f => f.present)];
  }
  collect(id, now) {
    const find = this.visibleFinds().find(f => f.id === id);
    if (!find) return null;
    if (id.startsWith('food:')) this.resources.set(id.slice(5), { ...find, present: false, availableAt: now + 300 });
    else this.collected.add(id);
    return { ...find };
  }
  serialize() {
    return { edits: [...this.edits], refuges: [...this.refuges], searched: [...this.searched],
      searchProgress: [...this.searchProgress], collected: [...this.collected],
      resources: [...this.resources].map(([key, r]) => [key, { ...r, availableAt: Number.isFinite(r.availableAt) ? r.availableAt : -1 }]),
      revision: this.revision };
  }
  restore(data) {
    this.edits = new Map(data.edits || []); this.refuges = new Map(data.refuges || []);
    this.searched = new Set(data.searched || []); this.searchProgress = new Map(data.searchProgress || []);
    this.collected = new Set(data.collected || []);
    this.resources = new Map((data.resources || []).map(([k, r]) => [k, { ...r, availableAt: r.availableAt === -1 ? Infinity : r.availableAt }]));
    this.revision = data.revision || 0; this.clearCache();
  }
}
