// packages/core/engine/upgrades.js

import { UPG_COST, UNLOCK_TIERS, BASIC_TOWERS, UPGRADE_MULT, TREES } from '../content.js';

export function levelUpSelected(state, deps) {
    const { onGoldChange, neighborsSynergy, onTowerLevel } = deps;
    const t = state.towers.find(tt => tt.id === state.selectedTowerId); if (!t) return false;
    const cost = UPG_COST(t.lvl, t.elt); if (state.gold < cost) return false;

    onGoldChange(-cost, 'level_up');
    const prev = t.lvl;
    t.lvl++;
    t.spent += cost;
    const mult = BASIC_TOWERS.includes(t.elt) ? UPGRADE_MULT.basic : UPGRADE_MULT.elemental;
    t.dmg *= mult.dmg; t.firerate *= mult.firerate; t.range += mult.range;

    const unlocked = UNLOCK_TIERS.filter(u => t.lvl >= u).length;
    const credits = t.freeTierPicks || 0;
    const owed = Math.max(0, unlocked - (t.tree.length + credits));
    if (owed > 0) t.freeTierPicks = credits + owed;

    neighborsSynergy(state);
    if (onTowerLevel) onTowerLevel(t, prev, t.lvl, cost);
    return true;
}

export function applyEvolution(state, key) {
    const t = state.towers.find(tt => tt.id === state.selectedTowerId);
    if (!t) return false;
    if ((t.freeTierPicks || 0) <= 0) return false;
    const branch = TREES[t.elt];
    const currentTier = t.tree.length;
    if (!branch || currentTier >= branch.length) return false;
    const choices = branch[currentTier].filter(n => !n.req || t.tree.includes(n.req));
    const chosen = choices.find(n => n.key === key); if (!chosen) return false;
    chosen.mod(t); t.tree.push(chosen.key); t.freeTierPicks--;
    return true;
}

export function setTargeting(state, mode) {
    const t = state.towers.find(tt => tt.id === state.selectedTowerId);
    if (!t) return false;
    if (!['first', 'last', 'cycle'].includes(mode)) return false;
    t.targeting = mode;
    t._cycleIndex = 0;
    return true;
}

