import { CONFIG, ITEMS, tileKey } from './config.js';
import { BIOMES, fieldRandom } from './world.js';
import { worldToScreen, edgeIndicator } from './geometry.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1; this.height = 1; this.dpr = 1; this.scale = CONFIG.tileSize;
    this.cache = new Map(); this.revision = -1; this.worldRef = null;
    this.selection = null; this.previewBlast = false;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    const scale = Math.max(17, Math.min(CONFIG.tileSize, Math.min(this.width, this.height) / 10));
    if (scale !== this.scale) { this.scale = scale; this.cache.clear(); }
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
  }
  at(x, y, player) { return worldToScreen(x, y, player.x, player.y, this.width, this.height, this.scale); }
  fromScreen(x, y, player) {
    return { x: Math.floor(player.x + (x - this.width / 2) / this.scale),
      y: Math.floor(player.y + (y - this.height / 2) / this.scale) };
  }
  paintChunk(world, cx, cy) {
    const s = this.scale, span = 12, canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.ceil(s * span);
    const ctx = canvas.getContext('2d', { alpha: false });
    for (let j = 0; j < span; j++) for (let i = 0; i < span; i++) {
      const t = world.getTile(cx * span + i, cy * span + j), x = i * s, y = j * s;
      const r = fieldRandom(t.x, t.y, world.salt);
      ctx.fillStyle = BIOMES[t.type].color; ctx.fillRect(x, y, s + 1, s + 1);
      ctx.fillStyle = r > 0.5 ? '#ffffff08' : '#132c1f09'; ctx.fillRect(x, y, s, s);
      if (t.wet) {
        ctx.strokeStyle = t.deep ? '#adccca3a' : '#d8e6ca67'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * (0.28 + r * 0.12));
        ctx.lineTo(x + s * 0.45, y + s * (0.28 + r * 0.12));
        ctx.moveTo(x + s * 0.57, y + s * 0.68); ctx.lineTo(x + s * 0.83, y + s * 0.68); ctx.stroke();
        if (!t.deep) { ctx.fillStyle = '#546e5f45'; ctx.fillRect(x + s * 0.4, y + s * 0.51, s * 0.1, s * 0.05); }
      } else if (t.type === 'forest' || t.type === 'denseForest') {
        const count = t.type === 'denseForest' ? 4 : 2;
        for (let k = 0; k < count; k++) {
          const tx = x + s * (0.2 + (k % 2) * 0.46 + r * 0.08);
          const ty = y + s * (0.15 + Math.floor(k / 2) * 0.39);
          ctx.fillStyle = '#193d2c35'; ctx.beginPath(); ctx.ellipse(tx + s * 0.07, ty + s * 0.33, s * 0.17, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#243d2b'; ctx.fillRect(tx - 0.6, ty + s * 0.16, 1.2, s * 0.17);
          ctx.beginPath(); ctx.moveTo(tx, ty - s * 0.03); ctx.lineTo(tx - s * 0.16, ty + s * 0.24);
          ctx.lineTo(tx + s * 0.16, ty + s * 0.24); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#b2c08a66'; ctx.lineWidth = 0.6; ctx.beginPath();
          ctx.moveTo(tx, ty + s * 0.02); ctx.lineTo(tx, ty + s * 0.18); ctx.stroke();
        }
      } else if (t.material !== 'soil') {
        ctx.fillStyle = '#4b605458'; ctx.beginPath();
        ctx.moveTo(x + s * 0.24, y + s * 0.63); ctx.lineTo(x + s * 0.42, y + s * 0.38);
        ctx.lineTo(x + s * 0.62, y + s * 0.6); ctx.lineTo(x + s * 0.54, y + s * 0.72); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#dce0caa0'; ctx.lineWidth = 0.8; ctx.beginPath();
        ctx.moveTo(x + s * 0.24, y + s * 0.62); ctx.lineTo(x + s * 0.42, y + s * 0.38);
        ctx.lineTo(x + s * 0.53, y + s * 0.49); ctx.stroke();
      } else {
        ctx.fillStyle = '#dae2ac55'; ctx.fillRect(x + s * (0.18 + r * 0.4), y + s * 0.31, 1, s * 0.08);
        ctx.fillStyle = '#4b724b40'; ctx.fillRect(x + s * 0.76, y + s * (0.6 - r * 0.15), 1, s * 0.08);
      }
      if (!t.wet) {
        for (const [dx, dy, sx, sy, ex, ey] of [[1, 0, x + s, y, x + s, y + s], [0, 1, x, y + s, x + s, y + s]]) {
          const n = world.getTile(t.x + dx, t.y + dy), delta = t.height - n.height;
          if (Math.abs(delta) > 0.2) {
            ctx.strokeStyle = Math.abs(delta) > CONFIG.maxWalkerSlope ? '#213c2d9c' : '#e2e4c74d';
            ctx.lineWidth = Math.abs(delta) > CONFIG.maxWalkerSlope ? 2 : 0.8;
            ctx.beginPath(); ctx.moveTo(sx - 1, sy - 1); ctx.lineTo(ex - 1, ey - 1); ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = '#1e3b2110'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, s, s);
    }
    return canvas;
  }
  draw(game) {
    const ctx = this.ctx, p = game.player, world = game.world, s = this.scale;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    if (this.worldRef !== world || this.revision !== world.revision) {
      this.cache.clear(); this.worldRef = world; this.revision = world.revision;
    }
    ctx.fillStyle = '#8c9c76'; ctx.fillRect(0, 0, this.width, this.height);
    const minX = Math.floor(p.x - this.width / s / 2) - 1, maxX = Math.ceil(p.x + this.width / s / 2) + 1;
    const minY = Math.floor(p.y - this.height / s / 2) - 1, maxY = Math.ceil(p.y + this.height / s / 2) + 1;
    const keep = new Set();
    for (let cy = Math.floor(minY / 12); cy <= Math.floor(maxY / 12); cy++)
      for (let cx = Math.floor(minX / 12); cx <= Math.floor(maxX / 12); cx++) {
        const key = cx + ',' + cy; keep.add(key);
        if (!this.cache.has(key)) this.cache.set(key, this.paintChunk(world, cx, cy));
        const a = this.at(cx * 12, cy * 12, p);
        ctx.drawImage(this.cache.get(key), a.x, a.y, s * 12, s * 12);
      }
    for (const key of this.cache.keys()) if (!keep.has(key)) this.cache.delete(key);
    for (let ay = Math.floor(minY / 3); ay <= Math.floor(maxY / 3); ay++)
      for (let ax = Math.floor(minX / 3); ax <= Math.floor(maxX / 3); ax++) {
        const a = this.at(ax * 3 + 1.5, ay * 3 + 1.5, p);
        if (world.clueAt(ax * 3, ay * 3)) {
          ctx.strokeStyle = '#d9d6ac'; ctx.lineWidth = 1.3; ctx.beginPath();
          ctx.moveTo(a.x - 5, a.y + 3); ctx.lineTo(a.x + 4, a.y - 3);
          ctx.moveTo(a.x - 3, a.y - 4); ctx.lineTo(a.x + 2, a.y + 4); ctx.stroke();
          ctx.fillStyle = '#3e543568'; ctx.fillRect(a.x + 6, a.y + 3, 2, 2);
        } else if (world.searched.has(ax + ',' + ay)) {
          ctx.strokeStyle = '#f0efc12e'; ctx.lineWidth = 0.8; ctx.beginPath();
          ctx.arc(a.x, a.y, 2, 0, Math.PI * 2); ctx.stroke();
        }
      }
    const mouths = [...world.refuges.values(), ...world.cavePoints(p.x, p.y, Math.max(this.width, this.height) / s)];
    for (const r of mouths) {
      const a = this.at(r.x + 0.5, r.y + 0.5, p);
      ctx.fillStyle = '#243d31'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 2, s * 0.31, s * 0.19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = r.kind === 'dug' ? '#dacb8d' : '#b5bba1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a.x, a.y - 1, s * 0.3, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = '#bdc79f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x - 3, a.y - 1); ctx.lineTo(a.x - 3, a.y + 8);
      ctx.moveTo(a.x + 3, a.y - 1); ctx.lineTo(a.x + 3, a.y + 8);
      ctx.moveTo(a.x - 3, a.y + 3); ctx.lineTo(a.x + 3, a.y + 3); ctx.stroke();
    }
    for (const f of world.visibleFinds()) {
      const a = this.at(f.x + 0.5, f.y + 0.5, p);
      ctx.fillStyle = '#f5e7b7'; ctx.strokeStyle = '#54673e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(a.x, a.y, s * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#415737'; ctx.font = Math.round(s * 0.38) + 'px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ITEMS[f.kind].icon, a.x, a.y);
    }
    for (const d of game.decoys) {
      const a = this.at(d.x, d.y, p);
      ctx.strokeStyle = '#eed784'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(a.x, a.y, 10 + (game.elapsed % 1) * 10, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const b of game.blasts) {
      const a = this.at(b.x, b.y, p);
      ctx.fillStyle = '#a74633'; ctx.fillRect(a.x - 5, a.y - 5, 10, 10);
      ctx.fillStyle = '#fff0c8'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(Math.ceil(b.remaining) + 's', a.x, a.y - 9);
    }
    if (this.selection && !p.underground) {
      const a = this.at(this.selection.x, this.selection.y, p);
      ctx.strokeStyle = game.targetInReach(this.selection) ? '#f1e8b7' : '#f1e8b766'; ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x + 2, a.y + 2, s - 4, s - 4);
      if (this.previewBlast) {
        ctx.fillStyle = '#be5e3e26'; ctx.strokeStyle = '#f0bd8888'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(a.x + s / 2, a.y + s / 2, CONFIG.blastRadius * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (p.underground) {
      ctx.fillStyle = '#1d332749'; ctx.fillRect(0, 0, this.width, this.height);
    }
    this.drawWalker(game);
    const center = { x: this.width / 2, y: this.height / 2 };
    ctx.fillStyle = '#193e33'; ctx.strokeStyle = '#f7eed0'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(center.x, center.y, Math.max(6, p.radius * s), 0, Math.PI * 2); ctx.fill();
    if (p.underground || (game.inventory.diving && world.getTile(p.x, p.y).deep)) ctx.setLineDash([2, 2]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(center.x, center.y); ctx.rotate(p.heading);
    ctx.fillStyle = '#f6efce'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill(); ctx.restore();
    if (p.underground) {
      ctx.fillStyle = '#f4ebc8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '8px monospace';
      ctx.fillText('BELOW GROUND', center.x, center.y + 15);
    }
    for (const effect of game.effects) {
      const a = this.at(effect.x, effect.y, p), age = game.elapsed - effect.at;
      ctx.strokeStyle = '#f8d19b'; ctx.globalAlpha = Math.max(0, 1 - age / 1.5); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, (0.2 + age) * s, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  drawWalker(game) {
    const ctx = this.ctx, w = game.walker, a = this.at(w.x, w.y, game.player), r = Math.max(8, w.radius * this.scale);
    if (a.x + r >= 0 && a.x - r <= this.width && a.y + r >= 0 && a.y - r <= this.height) {
      ctx.fillStyle = '#24352933'; ctx.beginPath(); ctx.ellipse(a.x + 2, a.y + r * 0.8, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a84837'; ctx.strokeStyle = '#f5dfbe'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1c89e'; ctx.beginPath(); ctx.arc(a.x, a.y - 1.5, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8483780'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(a.x, a.y, r + 4 + Math.sin(w.distanceWalked * 3) * 1.1, 0, Math.PI * 2); ctx.stroke();
    } else {
      const arrow = edgeIndicator(a.x - this.width / 2, a.y - this.height / 2, this.width, this.height,
        { left: 24, right: 24, top: 65, bottom: 30 });
      if (!arrow) return;
      ctx.save(); ctx.translate(arrow.x, arrow.y); ctx.rotate(arrow.angle);
      ctx.fillStyle = '#f3e4c4ec'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a54b38'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
