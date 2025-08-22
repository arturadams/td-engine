// packages/core/selectors.js
import { COST, EltColor, UNLOCK_TIERS } from './content.js';

export function buildHudSnapshot(state) {
  return {
    gold: state.gold,
    lives: state.lives,
    wave: state.wave,
    spree: state.spree,
    score: state.score,
    accPct: Math.round((state.hits / Math.max(1, state.shots)) * 100),
    speed: state.speed,
    buildSel: state.buildSel,
    canAfford: (elt) => state.gold >= COST[elt],
  };
}

export function buildTowerDetailsModel(state, TREES, UNLOCK_TIERS, UPG_COST) {
  const t = state.towers.find(x => x.id === state.selectedTowerId);
  if (!t) return null;
  const canUpgrade = state.gold >= UPG_COST(t.lvl);
  const dmg = (t.dmg * (1 + t.mod.dmg + t.synergy)).toFixed(1);

  const tierIdx = nextAvailableTier(t);
  const choices = (tierIdx >= 0)
    ? TREES[t.elt][tierIdx].filter(n => !n.req || t.tree.includes(n.req))
    : [];

  return {
    id: t.id, elt: t.elt, color: EltColor[t.elt],
    dmg, firerate: t.firerate.toFixed(2), range: Math.round(t.range),
    kills: t.kills || 0,
    canUpgrade, upgCost: UPG_COST(t.lvl), sellGold: Math.floor(t.spent * 0.8),
    nextTierIndex: tierIdx, choices,
    targeting: t.targeting || 'first',
  };

  function nextAvailableTier(t) {
    const tiers = TREES[t.elt]; if (!tiers) return -1;
    const current = t.tree.length; if (current >= tiers.length) return -1;
    return (t.lvl >= UNLOCK_TIERS[current]) ? current : -1;
  }
}
