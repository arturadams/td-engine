// upgrades.js

export const upgradePools = {
  any: [
    { key:"UPG_RANGE_S", weight:30, apply:t=>t.range+=10 },
    { key:"UPG_RATE_S",  weight:30, apply:t=>t.firerate*=1.06 },
    { key:"UPG_DMG_S",   weight:30, apply:t=>t.dmg*=1.08 },
    { key:"SPLASH_L",    weight:10, apply:t=>t.mod.splash = true },
  ],
  FIRE: [ { key:"HELLFIRE_DOT", weight:10, apply:t=>t.mod.burn+=0.4 } ],
};
