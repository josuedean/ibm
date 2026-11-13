// Distances: tiles. Time: simulation seconds. One world hour = 60 seconds.
export const CONFIG = Object.freeze({
  version: 3, release: '0.3.1', defaultSeed: 'constant-walker', tileSize: 36, chunkSize: 16,
  fixedStep: 1 / 30, hourSeconds: 60, daySeconds: 1440,
  fatigueSeconds: 1800, foodCapacityDisplay: 1800,
  searchSeconds: 8, refugeSeconds: 20, digSeconds: 80,
  fuseSeconds: 8, blastRadius: 1.65, orbitRadius: 3,
  maxWalkerSlope: Math.tan(Math.PI / 6), maxPlayerSlope: 1,
  maxWalkerDensity: 70, maxWalkerCurrent: 0.78, shallowDepth: 0.52, navBudget: 10000,
  player: Object.freeze({ x: 0.5, y: 0.5, radius: 0.19,
    speedWalk: 2.4, speedRun: 4.8, maxStamina: 100,
    staminaDrain: 24, regenRest: 24, regenWalk: 5 }),
  walker: Object.freeze({ x: 58.5, y: -43.5, radius: 0.27, speed: 1.8 }),
});
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const tileKey = (x, y) => Math.floor(x) + ',' + Math.floor(y);
export const areaKey = (x, y) => Math.floor(x / 3) + ',' + Math.floor(y / 3);
export const mod = (n, m) => ((n % m) + m) % m;
export const ITEMS = Object.freeze({
  shovel: { name: 'Shovel', description: 'Excavate soil and underground chambers.', icon: '↧' },
  bedroll: { name: 'Shelter roll', description: 'A dry sleeping surface and a light canopy.', icon: '⌂' },
  climbing: { name: 'Climbing equipment', description: 'Ropes and anchors for steep ground.', icon: '⌁' },
  fishing: { name: 'Fishing pole', description: 'Search suitable water for food.', icon: '⌇' },
  diving: { name: 'Diving equipment', description: 'Submerge while travelling through deep water.', icon: '≈' },
  decoy: { name: 'Decoy', description: 'Place the device on dry ground.', icon: '◉' },
  dynamite: { name: 'Dynamite', description: 'An eight-second fuse. Reshapes nearby terrain.', icon: '✳' },
  food: { name: 'Provisions', description: 'Carried food, consumed over time.', icon: '◒' },
});
export function sleepRecovery(hours, sheltered) {
  const curve = sheltered ? [[0, 0], [2, 0], [4, 60], [6, 100], [8, 100]]
    : [[0, 0], [2, 0], [4, 30], [6, 65], [8, 100]];
  for (let i = 1; i < curve.length; i++) if (hours <= curve[i][0]) {
    const [a, va] = curve[i - 1], [b, vb] = curve[i];
    return va + (vb - va) * clamp((hours - a) / (b - a), 0, 1);
  }
  return 100;
}
