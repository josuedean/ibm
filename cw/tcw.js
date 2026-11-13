import { CONFIG, tileKey, mod } from './config.js';
import { findPath } from './navigation.js';
export class TCW {
  constructor() { this.reset(); }
  get speed() { return CONFIG.walker.speed; }
  reset() {
    Object.assign(this, { x: CONFIG.walker.x, y: CONFIG.walker.y, radius: CONFIG.walker.radius,
      lastKnown: { x: CONFIG.player.x, y: CONFIG.player.y }, path: [], planKey: '',
      planRevision: -1, phase: 0, mode: 'pursuing', orbitTarget: null, enclosure: null,
      componentKey: '', targetClosed: false, distanceWalked: 0, footPhase: 0 });
  }
  orbitGoal(world, center) {
    if (this.enclosure?.length) {
      const cells = this.enclosure, cx = cells.reduce((s, p) => s + p.x + 0.5, 0) / cells.length;
      const cy = cells.reduce((s, p) => s + p.y + 0.5, 0) / cells.length;
      for (let attempt = 0; attempt < 16; attempt++) {
        const desired = { x: cx + Math.cos(this.phase * Math.PI / 8) * 3,
          y: cy + Math.sin(this.phase * Math.PI / 8) * 3 };
        const p = cells.reduce((best, p) => Math.hypot(p.x + 0.5 - desired.x, p.y + 0.5 - desired.y)
          < Math.hypot(best.x + 0.5 - desired.x, best.y + 0.5 - desired.y) ? p : best, cells[0]);
        const goal = { x: p.x + 0.5, y: p.y + 0.5 };
        if (Math.hypot(goal.x - this.x, goal.y - this.y) > 0.15) return goal;
        this.phase = (this.phase + 1) % 16;
      }
      return { x: cells[0].x + 0.5, y: cells[0].y + 0.5 };
    }
    for (let n = 0; n < 80; n++) {
      const angle = this.phase * Math.PI / 8;
      const radius = CONFIG.orbitRadius + Math.floor(n / 16) * 1.5;
      const p = { x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius };
      if (world.walkerTile(p.x, p.y)) return p;
      this.phase = (this.phase + 1) % 16;
    }
    const currentAngle = Math.atan2(this.y - center.y, this.x - center.x);
    const neighbors = world.neighbors(Math.floor(this.x), Math.floor(this.y));
    neighbors.sort((a,b) => {
      const score = p => Math.abs(Math.hypot(p.x + 0.5 - center.x,p.y + 0.5 - center.y)
        - Math.hypot(this.x-center.x,this.y-center.y))
        + mod(Math.atan2(p.y+0.5-center.y,p.x+0.5-center.x)-currentAngle,Math.PI*2)*0.3;
      return score(a)-score(b);
    });
    return neighbors.length ? {x:neighbors[0].x+0.5,y:neighbors[0].y+0.5} : center;
  }
  update(game, dt) {
    const world = game.world, player = game.player;
    if (!player.concealed(world, game.inventory)) this.lastKnown = { x: player.x, y: player.y };
    const decoy = game.decoys[0];
    const target = decoy ? { x: decoy.x, y: decoy.y } : this.lastKnown;
    let circle = !decoy && player.concealed(world, game.inventory);
    const ck = tileKey(target.x, target.y) + ':' + world.revision;
    if (!circle && !decoy && ck !== this.componentKey) {
      this.componentKey = ck;
      const c = world.component(target.x, target.y, 250);
      this.targetClosed = !world.walkerTile(target.x, target.y)
        || (c.closed && !c.keys.has(tileKey(this.x, this.y)));
    }
    if (!decoy && this.targetClosed) circle = true;
    if (this.enclosure && this.planRevision !== world.revision) this.enclosure = null;
    this.mode = circle || this.enclosure ? 'circling' : decoy ? 'decoy' : 'pursuing';
    if (this.enclosure?.length === 1 || !world.walkerTile(this.x, this.y)) {
      // A newly enclosed footprint still has room for continuous motion.
      const cx = Math.floor(this.x) + 0.5, cy = Math.floor(this.y) + 0.5;
      this.footPhase += this.speed * dt / 0.17;
      const tx = cx + Math.cos(this.footPhase) * 0.17, ty = cy + Math.sin(this.footPhase) * 0.17;
      const distance = Math.hypot(tx - this.x, ty - this.y), move = Math.min(this.speed * dt, distance);
      if (distance > 1e-9) { this.x += (tx - this.x) / distance * move; this.y += (ty - this.y) / distance * move; }
      this.distanceWalked += move; return;
    }
    if (circle || this.enclosure) {
      if (!this.orbitTarget || Math.hypot(this.x - this.orbitTarget.x, this.y - this.orbitTarget.y) < 0.12) {
        this.phase = (this.phase + 1) % 16; this.orbitTarget = this.orbitGoal(world, target);
      }
    } else this.orbitTarget = null;
    const goal = this.orbitTarget || target;
    const key = this.mode + ':' + tileKey(goal.x, goal.y) + ':' + (this.orbitTarget ? this.phase : '');
    if (!this.path.length || this.planRevision !== world.revision || this.planKey !== key) {
      const plan = findPath(world, this, goal);
      this.path = plan.path;
      if (plan.found) this.path.push({ x: goal.x, y: goal.y });
      if (!plan.found && plan.exhausted) {
        const c = world.component(this.x, this.y, 2048);
        if (c.closed && c.cells.length) {
          this.enclosure = c.cells; this.mode = 'circling';
          this.phase = (this.phase + 1) % 16; this.orbitTarget = this.orbitGoal(world, target);
          this.path = findPath(world, this, this.orbitTarget).path;
        } else {
          this.phase = (this.phase + 1) % 16; this.orbitTarget = null;
        }
      }
      this.planKey = key; this.planRevision = world.revision;
    }
    let remaining = this.speed * dt, attempts = 0;
    while (remaining > 1e-9 && this.path.length && attempts++ < 32) {
      const next = this.path[0], distance = Math.hypot(next.x - this.x, next.y - this.y);
      if (distance < 1e-8) { this.path.shift(); continue; }
      const move = Math.min(distance, remaining);
      const nx = this.x + (next.x - this.x) / distance * move;
      const ny = this.y + (next.y - this.y) / distance * move;
      if (!world.canTraverse(this.x, this.y, nx, ny)) { this.path = []; break; }
      this.x = nx; this.y = ny; this.distanceWalked += move; remaining -= move;
      if (move >= distance - 1e-8) this.path.shift();
    }
    if (decoy && Math.hypot(this.x - decoy.x, this.y - decoy.y) < 0.4) {
      game.decoys.shift(); this.path = []; this.planKey = ''; game.notice('A device falls silent.');
    }
  }
  serialize() {
    const { x, y, lastKnown, path, planKey, planRevision, phase, mode, orbitTarget,
      enclosure, componentKey, targetClosed, distanceWalked, footPhase } = this;
    return { x, y, lastKnown, path, planKey, planRevision, phase, mode, orbitTarget,
      enclosure, componentKey, targetClosed, distanceWalked, footPhase };
  }
  restore(data) { this.reset(); Object.assign(this, JSON.parse(JSON.stringify(data))); }
}
