import { createNoise } from './noise.min.js';
import { CONFIG } from './config.js';
import { worldToScreen } from './geometry.js';

export const BIOMES = Object.freeze({
  grass: { name: 'Grassland', color: '#8e9e73' },
  forest: { name: 'Forest', color: '#48664c' },
  rock: { name: 'Rocky ground', color: '#929686' },
  foothills: { name: 'Foothills', color: '#7d8970' },
  mountain: { name: 'Mountain range', color: '#657667' },
  peak: { name: 'High peaks', color: '#bbc5b0' },
  water: { name: 'Lake', color: '#476e81' },
  river: { name: 'River', color: '#4b788b' },
  stream: { name: 'Stream', color: '#608c99' },
  shallowWater: { name: 'Shallows', color: '#7eaaa7' },
});

export function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function coordinateRandom(x, y, salt) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function segmentDistance(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0,
    Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}

export class World {
  constructor({ seed = CONFIG.defaultSeed, tileSize = CONFIG.tileSize,
    chunkSize = CONFIG.chunkSize } = {}) {
    this.seed = String(seed);
    this.tileSize = tileSize;
    this.chunkSize = chunkSize;
    this.chunks = new Map();
    this.salt = hashSeed(seed);
    // Instance-local permutations: constructing another world cannot reseed this one.
    this.elevationNoise = createNoise(hashSeed(this.seed + ':elevation'));
    this.moistureNoise = createNoise(hashSeed(this.seed + ':moisture'));
    this.riverNoise = createNoise(hashSeed(this.seed + ':rivers'));
  }

  getChunkKey(x, y) { return x + ',' + y; }

  sampleFields(x, y) {
    return {
      elevation: 0.48
        + 0.40 * this.elevationNoise.perlin2(x * 0.009 + 13.7, y * 0.009 - 22.3)
        + 0.18 * this.elevationNoise.perlin2(x * 0.028 - 71.2, y * 0.028 + 45.8),
      moisture: 0.5
        + 0.75 * this.moistureNoise.perlin2(x * 0.018 + 111.3, y * 0.018 - 43.7)
        + 0.22 * this.moistureNoise.perlin2(x * 0.061 - 21.1, y * 0.061 + 8.9),
    };
  }

  riverNode(band, index) {
    const x = index * 24;
    const phase = coordinateRandom(band, 0, this.salt) * Math.PI * 2;
    return { x, y: band * 224 + 100
      + Math.sin(x * 0.015 + phase) * 22
      + this.riverNoise.perlin2(x * 0.008 + 35.7, band * 7.13 + 18.2) * 38 };
  }

  riverY(band, x) {
    const i = Math.floor(x / 24);
    const a = this.riverNode(band, i), b = this.riverNode(band, i + 1);
    return a.y + (b.y - a.y) * (x - a.x) / 24;
  }

  tributary(band, cell) {
    const random = coordinateRandom(cell, band, this.salt ^ 9173);
    if (random < 0.2) return null;
    const joinX = cell * 160 + 35 + random * 85;
    const join = { x: joinX, y: this.riverY(band, joinX) };
    const source = { x: joinX - 38 + random * 70, y: join.y - 52 - random * 32 };
    const control = { x: source.x + (random < 0.6 ? -30 : 30), y: join.y - 22 };
    const points = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, u = 1 - t;
      points.push({ x: u * u * source.x + 2 * u * t * control.x + t * t * join.x,
        y: u * u * source.y + 2 * u * t * control.y + t * t * join.y });
    }
    return points;
  }

  waterType(x, y) {
    let shallow = false, stream = false, river = false, lake = false;
    const nearestBand = Math.floor((y - 100) / 224);
    for (let band = nearestBand - 1; band <= nearestBand + 1; band++) {
      const nodeIndex = Math.floor(x / 24);
      const width = 1.7 + (this.riverNoise.perlin2(x * 0.006, band + 0.4) + 1) * 0.7;
      for (let i = nodeIndex - 1; i <= nodeIndex + 1; i++) {
        const distance = segmentDistance(x, y, this.riverNode(band, i), this.riverNode(band, i + 1));
        if (distance <= width) river = true;
        else if (distance <= width + 0.8) shallow = true;
      }

      const cell = Math.floor(x / 160);
      for (let c = cell - 1; c <= cell + 1; c++) {
        const points = this.tributary(band, c);
        if (!points) continue;
        for (let i = 1; i < points.length; i++) {
          const distance = segmentDistance(x, y, points[i - 1], points[i]);
          if (distance <= 0.8) stream = true;
          else if (distance <= 1.45) shallow = true;
        }
      }

      const lakeCell = Math.floor(x / 320);
      for (let c = lakeCell - 1; c <= lakeCell + 1; c++) {
        const random = coordinateRandom(c, band, this.salt ^ 81727);
        if (random > 0.48) continue;
        const cx = c * 320 + 70 + random * 260;
        const cy = this.riverY(band, cx); // Lake intersects its river.
        const radiusX = 9 + random * 16, radiusY = 6 + random * 12;
        const distance = Math.hypot((x - cx) / radiusX, (y - cy) / radiusY);
        if (distance < 1) lake = true;
        else if (distance < 1.14) shallow = true;
      }
    }
    // Specialized water precedes banks; none of these categories is unreachable.
    if (lake) return 'water';
    if (river) return 'river';
    if (stream) return 'stream';
    return shallow ? 'shallowWater' : null;
  }

  getTileType(worldX, worldY) {
    const x = Math.floor(worldX), y = Math.floor(worldY);
    const water = this.waterType(x + 0.5, y + 0.5);
    if (water) return water;
    const { elevation, moisture } = this.sampleFields(x + 0.5, y + 0.5);
    // Height takes precedence independently of forest moisture.
    if (elevation > 0.74) return 'peak';
    if (elevation > 0.65) return 'mountain';
    if (elevation > 0.57) return 'foothills';
    if (moisture > 0.57) return 'forest';
    if (elevation > 0.53 && moisture < 0.43) return 'rock';
    return 'grass';
  }

  loadChunk(chunkX, chunkY) {
    const key = this.getChunkKey(chunkX, chunkY);
    if (this.chunks.has(key)) return this.chunks.get(key);
    const tiles = [];
    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const wx = chunkX * this.chunkSize + x, wy = chunkY * this.chunkSize + y;
        tiles.push({ x: wx, y: wy, type: this.getTileType(wx, wy) });
      }
    }
    const chunk = { chunkX, chunkY, tiles, bitmap: null };
    this.chunks.set(key, chunk);
    return chunk;
  }

  unloadChunk(x, y) { this.chunks.delete(this.getChunkKey(x, y)); }
  clearCache() { this.chunks.clear(); }

  getVisibleChunks(playerX, playerY, width = 800, height = 600) {
    const span = this.chunkSize;
    const minX = Math.floor((playerX - width / (2 * this.tileSize)) / span);
    const maxX = Math.floor((playerX + width / (2 * this.tileSize)) / span);
    const minY = Math.floor((playerY - height / (2 * this.tileSize)) / span);
    const maxY = Math.floor((playerY + height / (2 * this.tileSize)) / span);
    for (const [key, chunk] of this.chunks) {
      if (chunk.chunkX < minX - 1 || chunk.chunkX > maxX + 1
        || chunk.chunkY < minY - 1 || chunk.chunkY > maxY + 1) this.chunks.delete(key);
    }
    const visible = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        visible.push(this.loadChunk(x, y));
      }
    }
    return visible;
  }

  makeBitmap(chunk) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.chunkSize * this.tileSize;
    const ctx = canvas.getContext('2d', { alpha: false });
    for (let i = 0; i < chunk.tiles.length; i++) {
      const tile = chunk.tiles[i];
      const x = (i % this.chunkSize) * this.tileSize;
      const y = Math.floor(i / this.chunkSize) * this.tileSize;
      const s = this.tileSize;
      const variation = coordinateRandom(tile.x, tile.y, this.salt);
      ctx.fillStyle = this.getTileColor(tile.type);
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = variation > 0.5 ? '#ffffff06' : '#10251b06';
      ctx.fillRect(x, y, s, s);
      ctx.lineWidth = 1;
      if (tile.type === 'forest') {
        for (let tree = 0; tree < 3; tree++) {
          const tx = x + s * (0.2 + tree * 0.27);
          const ty = y + s * (0.33 + ((tree + Math.floor(variation * 3)) % 3) * 0.17);
          ctx.fillStyle = '#203c32';
          ctx.fillRect(tx - 1, ty + 5, 2, 7);
          ctx.beginPath(); ctx.moveTo(tx, ty - 10);
          ctx.lineTo(tx - 7, ty + 7); ctx.lineTo(tx + 7, ty + 7); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#78906a'; ctx.fillRect(tx, ty - 3, 1, 6);
        }
      } else if (['mountain', 'peak', 'foothills'].includes(tile.type)) {
        const h = tile.type === 'foothills' ? 7 : 15;
        ctx.strokeStyle = tile.type === 'peak' ? '#eef0dba0' : '#c1cbb280';
        ctx.beginPath(); ctx.moveTo(x + 10, y + 31);
        ctx.lineTo(x + 24, y + 31 - h); ctx.lineTo(x + 38, y + 31); ctx.stroke();
        if (tile.type === 'peak') {
          ctx.beginPath(); ctx.moveTo(x + 18, y + 22); ctx.lineTo(x + 24, y + 16);
          ctx.lineTo(x + 30, y + 22); ctx.stroke();
        }
      } else if (['water', 'river', 'stream', 'shallowWater'].includes(tile.type)) {
        ctx.strokeStyle = '#b8d7d146';
        ctx.beginPath(); ctx.moveTo(x + 10 + variation * 7, y + 19);
        ctx.lineTo(x + 25 + variation * 7, y + 19);
        ctx.moveTo(x + 23, y + 33); ctx.lineTo(x + 34, y + 33); ctx.stroke();
      } else if (tile.type === 'rock') {
        ctx.fillStyle = '#525e5460';
        ctx.fillRect(x + 14, y + 24, 8, 4); ctx.fillRect(x + 31, y + 15, 5, 3);
      } else {
        ctx.fillStyle = '#d5ddae48';
        ctx.fillRect(x + 10 + variation * 20, y + 15, 2, 3);
        ctx.fillStyle = '#4e6e4640';
        ctx.fillRect(x + 33, y + 32 - variation * 13, 2, 4);
      }
    }
    return canvas;
  }

  render(ctx, playerX, playerY, width, height) {
    const chunks = this.getVisibleChunks(playerX, playerY, width, height);
    for (const chunk of chunks) {
      if (!chunk.bitmap) chunk.bitmap = this.makeBitmap(chunk);
      const point = worldToScreen(chunk.chunkX * this.chunkSize, chunk.chunkY * this.chunkSize,
        playerX, playerY, width, height, this.tileSize);
      ctx.drawImage(chunk.bitmap, Math.round(point.x), Math.round(point.y));
    }
  }

  getTileColor(type) { return BIOMES[type]?.color || BIOMES.grass.color; }
}
