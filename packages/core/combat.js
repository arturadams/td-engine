// packages/core/combat.js
import { Status } from './content.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function takeDamage(c, raw, elt, shred = 0) {
    let resist = clamp((c.resist[elt] || 0) - shred, -0.5, 0.8);
    if (c.status[Status.EXPOSED]) {
        resist = clamp(resist - c.status[Status.EXPOSED].shred, -0.5, 0.8);
    }
    let dmg = raw * (1 - resist);
    if (c.status[Status.BRITTLE]) {
        dmg *= 1 + c.status[Status.BRITTLE].amp;
    }
    c.hp -= dmg;
    return dmg;
}

export function applyStatus(c, status, fromTower) {
    const m = fromTower?.mod || {};
    if (status === Status.BURN) {
        c.status[Status.BURN] = { t: 2.2 * (1 + (m.burn || 0)), dot: 5 * (1 + (m.burn || 0)) };
    }
    if (status === Status.POISON) {
        const prev = c.status[Status.POISON];
        const stacks = clamp((prev?.stacks || 0) + 1, 1, 1 + (m.maxStacks || 0));
        c.status[Status.POISON] = { t: 3.5 * (1 + (m.poison || 0)), dot: 4 * (1 + (m.poison || 0)) * stacks, stacks };
    }
    if (status === Status.CHILL) {
        c.status[Status.CHILL] = { t: 1.8 * (1 + (m.slowDur || 0)), slow: clamp(0.35 + (m.chill || 0), 0, 0.85) };
    }
    if (status === Status.SHOCK) {
        c.status[Status.SHOCK] = { t: 1.2, power: 1 };
    }
    if (status === Status.BRITTLE) {
        c.status[Status.BRITTLE] = { t: 2.5, amp: 0.25 };
    }
    if (status === Status.EXPOSED) {
        c.status[Status.EXPOSED] = { t: 2.5, shred: 0.2 };
    }
    if (status === Status.MANA_BURN) {
        c.status[Status.MANA_BURN] = { t: 2.0, dot: 10 };
    }
    if (m.resShred) c.status.resShred = Math.max(c.status.resShred || 0, m.resShred);

    // Combos
    const hasBurn = !!c.status[Status.BURN];
    const hasPoison = !!c.status[Status.POISON];
    const hasChill = !!c.status[Status.CHILL];
    const hasShock = !!c.status[Status.SHOCK];
    const hasBrittle = !!c.status[Status.BRITTLE];
    const hasExposed = !!c.status[Status.EXPOSED];
    const hasManaBurn = !!c.status[Status.MANA_BURN];

    if (hasBurn && hasPoison && !c.status.combo_acid) {
        c.status.combo_acid = 2.0;
        c.status.acid = { dot: 12 + (m.acidAmp ? m.acidAmp * 60 : 0) };
        return 'combo.acid';
    }
    if (hasChill && hasShock) {
        const burst = 0.2 * c.hp; c.hp -= burst;
        return 'combo.shatter';
    }
    if (hasPoison && hasShock) {
        c.status.stun = Math.max(c.status.stun || 0, 0.5 + (m.stun || 0));
        return 'combo.neuro';
    }
    if (hasBrittle && hasBurn) {
        const burst = 0.15 * c.hp; c.hp -= burst;
        return 'combo.glassfire';
    }
    if (hasExposed && hasBurn) {
        c.status[Status.BURN].dot *= 1.5;
        return 'combo.fanned';
    }
    if (hasManaBurn && hasShock) {
        const dot = 20 + (m.lightDot || 0);
        c.status.lightDot = { dot, t: 1.5 };
        return 'combo.overload';
    }
    return null;
}

export function tickStatusesAndCombos(c, dt) {
    if (c.status[Status.BURN]) {
        const s = c.status[Status.BURN]; s.t -= dt; c.hp -= s.dot * dt; if (s.t <= 0) delete c.status[Status.BURN];
    }
    if (c.status[Status.POISON]) {
        const s = c.status[Status.POISON]; s.t -= dt; c.hp -= s.dot * dt; if (s.t <= 0) delete c.status[Status.POISON];
    }
    if (c.status[Status.CHILL]) {
        const s = c.status[Status.CHILL]; s.t -= dt; if (s.t <= 0) delete c.status[Status.CHILL];
    }
    if (c.status[Status.BRITTLE]) {
        const s = c.status[Status.BRITTLE]; s.t -= dt; if (s.t <= 0) delete c.status[Status.BRITTLE];
    }
    if (c.status[Status.EXPOSED]) {
        const s = c.status[Status.EXPOSED]; s.t -= dt; if (s.t <= 0) delete c.status[Status.EXPOSED];
    }
    if (c.status[Status.MANA_BURN]) {
        const s = c.status[Status.MANA_BURN]; s.t -= dt; c.hp -= s.dot * dt; if (s.t <= 0) delete c.status[Status.MANA_BURN];
    }
    if (c.status.combo_acid) {
        c.status.combo_acid -= dt; c.hp -= (c.status.acid.dot * dt);
        if (c.status.combo_acid <= 0) delete c.status.combo_acid;
    }
    if (c.status.lightDot) {
        c.status.lightDot.t -= dt; if (c.status.lightDot.t <= 0) delete c.status.lightDot; else c.hp -= c.status.lightDot.dot * dt;
    }
}
