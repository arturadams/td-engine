// packages/core/content.js
// Default content & constants for the TD engine (data-driven)

export const TILE = 32;
export const GRID_W = 24;
export const GRID_H = 16;
export const START = { x: 0, y: 8 };
export const END = { x: 23, y: 8 };

export const Elt = {
  FIRE: 'FIRE',
  ICE: 'ICE',
  LIGHT: 'LIGHT',
  POISON: 'POISON',
  ARCHER: 'ARCHER',
  SIEGE: 'SIEGE',
  CANNON: 'SIEGE',
  EARTH: 'EARTH',
  WIND: 'WIND',
  ARCANE: 'ARCANE'
};
export const Status = {
  BURN: 'BURN',
  CHILL: 'CHILL',
  SHOCK: 'SHOCK',
  POISON: 'POISON',
  BRITTLE: 'BRITTLE',
  EXPOSED: 'EXPOSED',
  MANA_BURN: 'MANA_BURN'
};

// Tower definitions used to derive helpers like EltColor, EltType and
// EltStatus.  Non-elemental towers simply omit a status effect.
export const ELEMENTS = [
  { key: 'ARCHER', color: '#9ca3af', type: 'bolt' },
  { key: 'SIEGE', color: '#f59e0b', type: 'siege' },
  { key: 'FIRE', color: '#ef4444', type: 'splash', status: Status.BURN },
  { key: 'ICE', color: '#38bdf8', type: 'bolt', status: Status.CHILL },
  { key: 'LIGHT', color: '#a78bfa', type: 'chain', status: Status.SHOCK },
  { key: 'POISON', color: '#22c55e', type: 'bolt', status: Status.POISON },
  { key: 'EARTH', color: '#a3a3a3', type: 'splash', status: Status.BRITTLE },
  { key: 'WIND', color: '#60a5fa', type: 'bolt', status: Status.EXPOSED },
  { key: 'ARCANE', color: '#be123c', type: 'bolt', status: Status.MANA_BURN }
];

export const EltColor = Object.fromEntries(ELEMENTS.map(e => [e.key, e.color]));
export const EltType = Object.fromEntries(ELEMENTS.map(e => [e.key, e.type]));
export const EltStatus = Object.fromEntries(ELEMENTS.map(e => [e.key, e.status]));

// Non-elemental/basic towers that don't inflict statuses
// Include legacy 'CANNON' for backwards compatibility, but the
// canonical name is 'SIEGE'.
export const BASIC_TOWERS = ['ARCHER', 'SIEGE', 'CANNON'];

// Upgrade cost now varies by tower category; `elt` is optional for backwards compat
export const UPG_COST = (lvl, elt) => {
  if (!elt) return 80 + lvl * 45;
  const basic = BASIC_TOWERS.includes(elt);
  const base = basic ? 40 : 80;
  const scale = basic ? 30 : 60;
  return base + lvl * scale;
};

export const UPGRADE_MULT = {
  basic: { dmg: 1.12, firerate: 1.04, range: 4 },
  elemental: { dmg: 1.18, firerate: 1.06, range: 5 },
};

export const REFUND_RATE = { basic: 0.8, elemental: 0.75 };

export const COST = {
  ARCHER: 50,
  SIEGE: 65,
  // Legacy alias for backwards compatibility
  CANNON: 65,
  FIRE: 90,
  ICE: 90,
  LIGHT: 110,
  POISON: 95,
  EARTH: 100,
  WIND: 100,
  ARCANE: 120
};
export const UNLOCK_TIERS = [2, 4, 6];
//export const EVO_COST = tier => [120, 220, 400][tier] || 500;

export const ResistProfiles = {
  Grunt: {
    hp: 95,
    speed: 40,
    resist: { FIRE: 0.1, ICE: 0, LIGHT: 0, POISON: 0, EARTH: 0, WIND: 0, ARCANE: 0 },
    gold: 8
  },
  Runner: {
    hp: 70,
    speed: 70,
    resist: { FIRE: 0, ICE: 0.1, LIGHT: 0, POISON: 0, EARTH: 0, WIND: 0, ARCANE: 0 },
    gold: 7
  },
  Tank: {
    hp: 230,
    speed: 28,
    resist: {
      FIRE: 0.15,
      ICE: 0.15,
      LIGHT: 0.15,
      POISON: 0.15,
      EARTH: 0.15,
      WIND: 0.15,
      ARCANE: 0.15
    },
    gold: 16
  },
  Shield: {
    hp: 120,
    speed: 42,
    resist: { FIRE: 0.25, ICE: 0.1, LIGHT: 0.25, POISON: 0, EARTH: 0.2, WIND: 0.2, ARCANE: 0 },
    gold: 10
  },
  Boss: {
    hp: 1400,
    speed: 36,
    resist: {
      FIRE: 0.2,
      ICE: 0.2,
      LIGHT: 0.2,
      POISON: 0.2,
      EARTH: 0.2,
      WIND: 0.2,
      ARCANE: 0.2
    },
    gold: 90
  }
};

export const BLUEPRINT = {
  ARCHER: { range: 110, firerate: 1.1, dmg: 9, type: 'bolt', status: null },
  // Siege towers are the renamed cannon towers. They fire heavy shells
  // with a wider explosion radius. Keep a CANNON alias for older saves.
  SIEGE: { range: 120, firerate: 0.75, dmg: 16, type: 'siege', status: null },
  CANNON: { range: 120, firerate: 0.75, dmg: 16, type: 'siege', status: null },
  FIRE: { range: 120, firerate: 0.8, dmg: 22, type: 'splash', status: Status.BURN },
  ICE: { range: 130, firerate: 0.95, dmg: 12, type: 'bolt', status: Status.CHILL },
  LIGHT: { range: 140, firerate: 0.7, dmg: 18, type: 'chain', status: Status.SHOCK },
  POISON: { range: 120, firerate: 1.0, dmg: 8, type: 'bolt', status: Status.POISON },
  EARTH: { range: 135, firerate: 0.9, dmg: 22, type: 'splash', status: Status.BRITTLE },
  WIND: { range: 160, firerate: 0.65, dmg: 16, type: 'bolt', status: Status.EXPOSED },
  ARCANE: { range: 145, firerate: 0.75, dmg: 18, type: 'bolt', status: Status.MANA_BURN }
};

export const TREES = {
  FIRE: [
    [
      { key: 'INFERNO', name: 'Inferno', desc: 'Bigger burn DoT + splash', mod: t => { t.mod.burn += 0.6; t.mod.splash += 0.4; } },
      { key: 'BLAST', name: 'Blast', desc: 'Raw dmg + small AoE', mod: t => { t.mod.dmg += 0.35; t.mod.aoe += 24; } },
    ],
    [
      { key: 'WILDFIRE', req: 'INFERNO', name: 'Wildfire', mod: t => { t.mod.burnSpread = true; } },
      { key: 'SEARING', req: 'INFERNO', name: 'Searing Heat', mod: t => { t.mod.burnAmp = 0.08; } },
      { key: 'IMPACT', req: 'BLAST', name: 'High Impact', mod: t => { t.mod.splash = true; t.mod.aoe += 26; } },
      { key: 'THERMAL', req: 'BLAST', name: 'Thermal Lance', mod: t => { t.type = 'bolt'; t.mod.pierce = 2; t.firerate *= 0.8; t.range += 10; } },
    ],
    [
      { key: 'CATACLYSM', req: 'WILDFIRE', name: 'Cataclysm', mod: t => { t.mod.cataclysm = true; } },
      { key: 'HELLFIRE', req: 'SEARING', name: 'Hellfire', mod: t => { t.mod.burn += 0.9; t.firerate *= 0.85; } },
      { key: 'STARFALL', req: 'IMPACT', name: 'Starfall', mod: t => { t.mod.meteors = true; } },
    ],
  ],
  ICE: [
    [
      { key: 'GLACIER', name: 'Glacier', mod: t => { t.mod.chill += 0.25; t.mod.slowDur += 0.8; } },
      { key: 'NOVA', name: 'Frost Nova', mod: t => { t.mod.nova = true; } },
    ],
    [
      { key: 'ARCTIC', req: 'GLACIER', name: 'Arctic Grip', mod: t => { t.mod.resShred += 0.06; } },
      { key: 'SHATTER', req: 'GLACIER', name: 'Brittle', mod: t => { t.mod.shatter = 0.18; } },
      { key: 'BLIZZ', req: 'NOVA', name: 'Blizzard', mod: t => { t.mod.novaFreq = 0.75; } },
      { key: 'CRYO', req: 'NOVA', name: 'Cryo Core', mod: t => { t.mod.chill += 0.15; } },
    ],
    [
      { key: 'ABSOLUTE', req: 'ARCTIC', name: 'Absolute Zero', mod: t => { t.mod.chill += 0.25; } },
      { key: 'WHITEOUT', req: 'BLIZZ', name: 'Whiteout', mod: t => { t.range += 20; } },
    ],
  ],
  LIGHT: [
    [
      { key: 'CHAIN', name: 'Chain', mod: t => { t.mod.chainBounce += 2; t.mod.chainRange += 40; } },
      { key: 'OVERLOAD', name: 'Overload', mod: t => { t.mod.stun += 0.15; t.mod.dmg += 0.2; } },
    ],
    [
      { key: 'SUPERCELL', req: 'CHAIN', name: 'Supercell', mod: t => { t.mod.chainBounce += 2; } },
      { key: 'IONIZE', req: 'CHAIN', name: 'Ionize', mod: t => { t.mod.lightDot = 5; } },
      { key: 'BLACKOUT', req: 'OVERLOAD', name: 'Blackout', mod: t => { t.mod.stunChain = true; } },
    ],
    [
      { key: 'TEMPEST', req: 'SUPERCELL', name: 'Tempest', mod: t => { t.mod.chainBounce += 3; } },
      { key: 'SINGULAR', req: 'IONIZE', name: 'Singularity', mod: t => { t.mod.singularity = true; } },
    ],
  ],
  POISON: [
    [
      { key: 'VENOM', name: 'Venom', mod: t => { t.mod.poison += 0.6; t.mod.maxStacks += 2; } },
      { key: 'NEURO', name: 'Neurotoxin', mod: t => { t.mod.resShred += 0.08; } },
    ],
    [
      { key: 'BLIGHT', req: 'VENOM', name: 'Blight', mod: t => { t.mod.poisonSpread = true; } },
      { key: 'ACID', req: 'VENOM', name: 'Acid Mix', mod: t => { t.mod.acidAmp = 0.12; } },
      { key: 'NEUROSHOCK', req: 'NEURO', name: 'Neuroshock+', mod: t => { t.mod.stun += 0.1; } },
    ],
    [
      { key: 'PLAGUE', req: 'BLIGHT', name: 'Plague Lord', mod: t => { t.mod.maxStacks += 2; t.mod.poison += 0.6; } },
      { key: 'SYNAPSE', req: 'NEUROSHOCK', name: 'Synaptic Overload', mod: t => { t.mod.stunDmg = 14; } },
    ],
  ],
};

export const defaultContent = {
  TILE, GRID_W, GRID_H, START, END,
  Elt, Status, ELEMENTS, EltColor, EltType, EltStatus,
  BASIC_TOWERS,
  COST, UPG_COST, UNLOCK_TIERS, ResistProfiles, BLUEPRINT, TREES,
  UPGRADE_MULT, REFUND_RATE,
};
