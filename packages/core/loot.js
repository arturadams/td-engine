// packages/core/loot.js
// Minimal weighted tables + picker (deterministic via engine rng)

export const lootTables = {
  common: [
    { id: 'GEM_DMG_S',    w: 40, meta: { kind: 'gem',  stats: { dmgPct: 8 } } },
    { id: 'RING_RATE_S',  w: 40, meta: { kind: 'ring', stats: { fireRatePct: 6 } } },
    { id: 'SCROLL_CHAIN', w: 20, meta: { kind: 'scroll', effect: 'CHAIN+1' } },
  ],
  boss: [
    { id: 'CORE_HELLFIRE', w: 3, meta: { kind: 'core', restrict: ['FIRE'], stats: { burnDot: 30 } } },
    { id: 'CORE_FROSTBITE',w: 3, meta: { kind: 'core', restrict: ['ICE'],  stats: { chillPct: 10 } } },
  ]
};

export function weightedPick(table, rng) {
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = rng() * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e; }
  return table[table.length - 1];
}
