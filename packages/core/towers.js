// packages/core/towers.js
import { EltColor, Status } from './content.js';
import { takeDamage, applyStatus } from './combat.js';
import { getEffect } from './effects/index.js';
import { queryCreeps } from './spatial.js';

export function targetInRange(state, t) {
    const mode = t.targeting || 'first';
    const candidates = queryCreeps(state, t.x, t.y, t.range);
    const r2 = t.range * t.range;

    if (mode === 'cycle') {
        const inRange = [];
        let hasPrev = false;
        for (const c of candidates) {
            if (!c.alive) continue;
            const dx = c.x - t.x, dy = c.y - t.y;
            if (dx * dx + dy * dy <= r2) {
                inRange.push(c);
                if (c.id === t._cycleId) hasPrev = true;
            }
        }
        if (!inRange.length) { t._cycleProg = null; t._cycleId = null; return null; }
        let lastProg = t._cycleProg;
        let lastId = t._cycleId;
        if (!hasPrev) { lastProg = -Infinity; lastId = -Infinity; }
        let next = null; let nextProg = Infinity; let nextId = Infinity;
        let first = null; let firstProg = Infinity; let firstId = Infinity;
        for (const c of inRange) {
            const prog = c.seg + c.t;
            const id = c.id;
            if (prog > lastProg || (prog === lastProg && id > lastId)) {
                if (prog < nextProg || (prog === nextProg && id < nextId)) {
                    next = c; nextProg = prog; nextId = id;
                }
            }
            if (prog < firstProg || (prog === firstProg && id < firstId)) {
                first = c; firstProg = prog; firstId = id;
            }
        }
        if (!next) { next = first; nextProg = firstProg; nextId = firstId; }
        if (!next) { t._cycleProg = null; t._cycleId = null; return null; }
        t._cycleProg = nextProg; t._cycleId = nextId;
        return next;
    }

    let best = null;
    if (mode === 'last') {
        let bestProg = Infinity;
        for (const c of candidates) {
            if (!c.alive) continue;
            const dx = c.x - t.x, dy = c.y - t.y;
            if (dx * dx + dy * dy <= r2) {
                const prog = c.seg + c.t;
                if (prog < bestProg) { best = c; bestProg = prog; }
            }
        }
    } else {
        let bestProg = -1;
        for (const c of candidates) {
            if (!c.alive) continue;
            const dx = c.x - t.x, dy = c.y - t.y;
            if (dx * dx + dy * dy <= r2) {
                const prog = c.seg + c.t;
                if (prog > bestProg) { best = c; bestProg = prog; }
            }
        }
    }
    return best;
}

function handleNova(state, t, dt) {
    t.novaTimer -= dt; const freq = 4.5 * (t.mod.novaFreq || 1);
    if (t.novaTimer <= 0) {
        t.novaTimer = freq;
        const r = t.range * 0.7, r2 = r * r;
        const nearby = queryCreeps(state, t.x, t.y, r);
        for (const c of nearby) {
            if (!c.alive) continue;
            const dx = c.x - t.x, dy = c.y - t.y;
            if (dx * dx + dy * dy <= r2) applyStatus(c, Status.CHILL, t);
        }
    }
}

function handleMeteors(state, { onHit, onCreepDamage }, t, dt) {
    if (!t._meteorTimer) t._meteorTimer = 3.8;
    t._meteorTimer -= dt;
    if (t._meteorTimer <= 0) {
        t._meteorTimer = 3.8;
        const c = targetInRange(state, t);
        if (c) {
            takeDamage(c, t.dmg, t.elt, c.status.resShred || 0);
            applyStatus(c, t.status, t);
            onHit?.(t.id);
            onCreepDamage?.({ creep: c, amount: t.dmg, elt: t.elt, towerId: t.id });
        }
    }
}

function attemptBoltHit(state, { onHit, onCreepDamage }, t, target, dmg, acc) {
    const dx = target.x - t.x, dy = target.y - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let speed = 480;
    if (t.elt === 'ICE') speed = 360;
    // create a visual bullet
    state.bullets.push({
        kind: 'bolt',
        x: t.x, y: t.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        ttl: dist / speed,
        color: EltColor[t.elt],
        effect: getEffect(t.elt),
        fromId: t.id,
        elt: t.elt,
    });

    const hit = state.rng() < acc; if (hit) { state.hits++; onHit?.(t.id); }
    if (hit) {
        takeDamage(target, dmg, t.elt, target.status.resShred || 0);
        applyStatus(target, t.status, t);
        onCreepDamage?.({ creep: target, amount: dmg, elt: t.elt, towerId: t.id });

        if (t.mod.pierce && t.mod.pierce > 0) {
            const dirx = target.x - t.x, diry = target.y - t.y; const len = Math.sqrt(dirx * dirx + diry * diry);
            const nx = dirx / len, ny = diry / len;
            let remaining = t.mod.pierce;
            const candidates = queryCreeps(state, t.x, t.y, len + 50);
            for (const c of candidates) {
                if (c === target || !c.alive) continue;
                const proj = ((c.x - t.x) * nx + (c.y - t.y) * ny);
                if (proj > 0 && proj < len + 50) {
                    const dist = Math.abs((c.x - t.x) * ny - (c.y - t.y) * nx);
                    if (dist < 10) {
                        takeDamage(c, dmg * 0.7, t.elt, c.status.resShred || 0);
                        applyStatus(c, t.status, t);
                        onHit?.(t.id);
                        onCreepDamage?.({ creep: c, amount: dmg * 0.7, elt: t.elt, towerId: t.id });
                        remaining--; if (remaining <= 0) break;
                    }
                }
            }
        }
    }
    t.cooldown = 1 / t.firerate;
    return hit;
}

function boltStrategy(state, callbacks, t, target, dmg, acc) {
    attemptBoltHit(state, callbacks, t, target, dmg, acc);
}

function chainStrategy(state, callbacks, t, target, dmg, acc) {
    const hit = attemptBoltHit(state, callbacks, t, target, dmg, acc);
    if (!hit) return;

    let bounces = 1 + (t.mod.chainBounce || 0); let last = target; let bounced = new Set([last.id]);
    let chainRange = 70 + (t.mod.chainRange || 0);
    while (bounces-- > 0) {
    const candidates = queryCreeps(state, last.x, last.y, chainRange);
    const next = candidates.find(c => {
        if (!c.alive || bounced.has(c.id)) return false;
        const dx = c.x - last.x, dy = c.y - last.y;
        return dx * dx + dy * dy <= chainRange * chainRange;
    });
        if (!next) break; bounced.add(next.id);

        const dx = next.x - last.x, dy = next.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 480;
        state.bullets.push({
            kind: 'bolt',
            x: last.x, y: last.y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            ttl: dist / speed,
            color: EltColor[t.elt],
            effect: getEffect(t.elt),
            elt: t.elt,
        });

        takeDamage(next, dmg * 0.6, t.elt, next.status.resShred || 0);
        applyStatus(next, t.status, t);
        if (t.mod.stunChain) next.status.stun = Math.max(next.status.stun || 0, 0.25);
        if (t.mod.lightDot) next.status.lightDot = { dot: t.mod.lightDot, t: 1.5 };
        callbacks.onHit?.(t.id);
        callbacks.onCreepDamage?.({ creep: next, amount: dmg * 0.6, elt: t.elt, towerId: t.id });
        last = next;
    }
}

function splashStrategy(state, { onShot }, t, target, dmg) {
    const dx = target.x - t.x, dy = target.y - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 260;
    state.bullets.push({
        kind: 'splash',
        x: t.x, y: t.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        ttl: dist / speed,
        aoe: 34 + (t.mod.splash ? 24 : 0),
        color: EltColor[t.elt],
        fromId: t.id,
        mod: t.mod,
        effect: getEffect(t.elt),
        elt: t.elt,
        status: t.status,
        dmg,
    });
    state.shots++;
    onShot?.(t.id);
    t.cooldown = 1 / t.firerate;
}

// Siege/cannon towers lob heavy projectiles with a wider explosion radius
// and slower travel speed than standard splash towers.
function siegeStrategy(state, { onShot }, t, target, dmg) {
    const dx = target.x - t.x, dy = target.y - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 180; // slower projectile
    state.bullets.push({
        kind: 'splash',
        x: t.x, y: t.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        ttl: dist / speed,
        aoe: 50 + (t.mod.splash ? 24 : 0),
        color: EltColor[t.elt],
        fromId: t.id,
        mod: t.mod,
        effect: getEffect(t.elt),
        elt: t.elt,
        status: t.status,
        dmg,
    });
    state.shots++;
    onShot?.(t.id);
    t.cooldown = 1 / t.firerate;
}

const STRATEGIES = {
    bolt: boltStrategy,
    chain: chainStrategy,
    splash: splashStrategy,
    siege: siegeStrategy,
};

export function fireTower(state, callbacks, t, dt) {
    if (t.cooldown > 0) { t.cooldown -= dt; return; }

    if (t.mod.nova) handleNova(state, t, dt);
    if (t.mod.meteors) handleMeteors(state, callbacks, t, dt);

    const target = targetInRange(state, t); if (!target) return;

    const dmg = t.dmg * (1 + t.mod.dmg + t.synergy);
    const acc = 0.98; state.shots++;
    callbacks.onShot?.(t.id);

    const strategy = STRATEGIES[t.type];
    if (strategy) strategy(state, callbacks, t, target, dmg, acc);
}
