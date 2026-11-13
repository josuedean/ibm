// Positions, radii and speeds use tiles. One tile renders as 50 CSS pixels.
// Provisional PRD balance: 120 / 240 / 90 CSS pixels per second.
export const CONFIG = Object.freeze({
  tileSize: 50, chunkSize: 16, fixedStep: 1 / 120, awayThreshold: 0.25,
  defaultSeed: 'constant-walker',
  player: Object.freeze({
    x: 0, y: 0, radius: 10 / 50, speedWalk: 120 / 50, speedRun: 240 / 50,
    maxStamina: 100, staminaDrain: 30, regenRest: 60, regenWalk: 6,
  }),
  walker: Object.freeze({ x: 30, y: -30, radius: 15 / 50, speed: 90 / 50 }),
});
