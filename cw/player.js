import { CONFIG, clamp } from './config.js';
export class Player {
  constructor() { this.reset(); }
  reset() {
    Object.assign(this, { x: CONFIG.player.x, y: CONFIG.player.y, radius: CONFIG.player.radius,
      stamina: 100, fatigue: 0, food: 1440, underground: false,
      heading: -Math.PI / 2, state: 'resting', exhausted: false });
  }
  maxStamina() { return Math.max(20, 100 - this.fatigue * 0.8); }
  fatigueSpeed() { return 1 - 0.42 * Math.pow(this.fatigue / 100, 1.7); }
  speedMultiplier(world, inventory, direction = { x: 0, y: 0 }) {
    const t = world.getTile(this.x, this.y);
    const next = world.getTile(this.x + direction.x, this.y + direction.y);
    const horizontal = Math.max(1, Math.hypot(next.x - t.x, next.y - t.y));
    const slope = Math.abs((next.wet ? next.waterLevel : next.height)
      - (t.wet ? t.waterLevel : t.height)) / horizontal;
    let surface = t.wet ? (t.deep ? 0.5 : 0.6) : t.density >= 70 ? 0.5
      : t.type === 'forest' ? 0.8 : t.material !== 'soil' ? 0.6 : 1;
    let slopeSpeed = slope > 1 ? (inventory.climbing ? 0.25 : 0.35)
      : slope > CONFIG.maxWalkerSlope ? (inventory.climbing ? 0.7 : 0.45)
      : slope > Math.tan(Math.PI / 12) ? 0.8 : 1;
    return Math.min(surface, slopeSpeed) * this.fatigueSpeed() * (this.food > 0 ? 1 : 0.55);
  }
  concealed(world, inventory) {
    return this.underground || !!(inventory.diving && world.getTile(this.x, this.y).deep);
  }
  update(input, dt, world, inventory, locked = false) {
    const c = CONFIG.player, water = world.getTile(this.x, this.y).wet;
    let dx = Number(input.x) || 0, dy = Number(input.y) || 0;
    if (!input.run) this.exhausted = false;
    const length = Math.hypot(dx, dy), max = this.maxStamina();
    if (locked || this.underground || length === 0) {
      this.state = locked ? 'occupied' : this.underground ? 'underground' : water ? 'swimming' : 'resting';
      if (!water && this.food > 0) this.stamina = Math.min(max, this.stamina + c.regenRest * dt);
      if (this.food <= 0) this.stamina = 0;
      return 0;
    }
    dx /= length; dy /= length; this.heading = Math.atan2(dy, dx);
    const run = input.run && !water && !this.exhausted && this.stamina > 0 && this.food > 0;
    const runTime = run ? Math.min(dt, this.stamina / c.staminaDrain) : 0;
    const distance = (runTime * c.speedRun + (dt - runTime) * c.speedWalk)
      * this.speedMultiplier(world, inventory, { x: dx, y: dy });
    const oldX = this.x, oldY = this.y;
    // Axis sliding retains movement at cliffs without allowing diagonal corner cuts.
    const nx = this.x + dx * distance, ny = this.y + dy * distance;
    if (world.canTraverse(this.x, this.y, nx, ny, 'player', inventory)) { this.x = nx; this.y = ny; }
    else {
      if (world.canTraverse(this.x, this.y, nx, this.y, 'player', inventory)) this.x = nx;
      if (world.canTraverse(this.x, this.y, this.x, ny, 'player', inventory)) this.y = ny;
    }
    const moved = Math.hypot(this.x - oldX, this.y - oldY);
    if (moved > 1e-9 && runTime > 0) {
      this.stamina = Math.max(0, this.stamina - runTime * c.staminaDrain);
      if (this.stamina < 1e-8) { this.stamina = 0; this.exhausted = true; }
    } else if (!water && this.food > 0) this.stamina = Math.min(max, this.stamina + c.regenWalk * dt);
    if (this.food <= 0) this.stamina = 0;
    this.state = water ? 'swimming' : moved < 1e-9 ? 'blocked' : runTime > 0 ? 'running' : 'walking';
    return moved;
  }
}
