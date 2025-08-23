// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';
import { acquireParticle } from './particles.js';

function addParticle(state, props) {
    const p = acquireParticle();
    Object.assign(p, props);
    state.particles.push(p);
}

function spawnImpact(state, b) {
    const rng = state.rng;
    const color = b.color || '#94a3b8';
    let count = 6, speed = 40, ttl = 0.4, ring = 12;
    switch (b.elt) {
        case 'FIRE': {
            count = 12; speed = 140; ttl = 0.5; ring = 22;
            // bright flash for fiery explosion
            addParticle(state, { x: b.x, y: b.y, r: 0, vr: 120, ttl: 0.25, max: 0.25, a: 1, color: '#f97316', circle: true });
            break;
        }
        case 'ICE': {
            count = 8; speed = 40; ttl = 0.7; ring = 16;
            // icy spikes
            for (let n = 0; n < 4; n++) {
                const ang = rng() * Math.PI * 2;
                addParticle(state, { x: b.x, y: b.y, ang, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#e0f2fe', spark: true });
                addParticle(state, { x: b.x, y: b.y, ang: ang + Math.PI / 2, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#e0f2fe', spark: true });
            }
            addParticle(state, { x: b.x, y: b.y, r: 0, vr: 60, ttl: 0.3, max: 0.3, a: 1, color: '#bae6fd', circle: true });
            break;
        }
        case 'LIGHT': {
            count = 12; speed = 180; ttl = 0.3; ring = 20;
            // electric sparks
            for (let n = 0; n < 6; n++) {
                const ang = rng() * Math.PI * 2;
                const sp = 160;
                addParticle(state, {
                    x: b.x, y: b.y,
                    vx: Math.cos(ang) * sp,
                    vy: Math.sin(ang) * sp,
                    ang, len: 12, ttl: 0.3, max: 0.3, a: 1, color: '#faf5ff', spark: true,
                });
            }
            addParticle(state, { x: b.x, y: b.y, r: 0, vr: 200, ttl: 0.15, max: 0.15, a: 1, color: '#faf5ff', circle: true });
            break;
        }
        case 'POISON':
            count = 7; speed = 45; ttl = 0.6; ring = 16; break;
    }
    addParticle(state, { x: b.x, y: b.y, r: 0, vr: ring / ttl, ttl, max: ttl, a: 1, color, ring: true });
    for (let n = 0; n < count; n++) {
        const ang = rng() * Math.PI * 2;
        const sp = speed * (0.5 + rng());
        addParticle(state, {
            x: b.x, y: b.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            ttl, max: ttl, a: 1, color,
        });
    }
}

export function updateBullets(state, { onCreepDamage }) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        const effect = b.effect;
        effect.trail(state, b);
        b.ttl -= state.dt;
        b.x += b.vx * state.dt;
        b.y += b.vy * state.dt;

        if (b.ttl <= 0) {
            if (b.kind === 'splash') {
                let hitAny = false;
                for (const c of state.creeps) {
                    if (!c.alive) continue;
                    const dx = c.x - b.x, dy = c.y - b.y;
                    if (dx * dx + dy * dy <= b.aoe * b.aoe) {
                        takeDamage(c, b.dmg, b.elt, c.status.resShred || 0);
                        applyStatus(c, b.status, { mod: b.mod });
                        hitAny = true;
                        onCreepDamage?.({ creep: c, amount: b.dmg, elt: b.elt, towerId: b.fromId });
                    }
                }
                if (hitAny) state.hits++;
                effect.aoe(state, b);
            }
            effect.impact(state, b);
            const last = state.bullets.pop();
            if (i < state.bullets.length) state.bullets[i] = last;
        }
    }
}
