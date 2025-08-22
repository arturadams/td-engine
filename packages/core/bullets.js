// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';

function spawnTrail(state, b) {
    const rng = state.rng;
    switch (b.elt) {
        case 'FIRE': {
            if (rng() < 0.7) {
                state.particles.push({
                    x: b.x, y: b.y,
                    ang: rng() * Math.PI * 2,
                    len: 6,
                    ttl: 0.3, max: 0.3, a: 1,
                    color: '#fb923c', spark: true
                });
            }
            break;
        }
        case 'ICE': {
            if (rng() < 0.6) {
                state.particles.push({
                    x: b.x, y: b.y,
                    r: 0, vr: 20,
                    ttl: 0.4, max: 0.4, a: 1,
                    color: '#e0f2fe', circle: true
                });
            }
            break;
        }
        case 'LIGHT': {
            if (rng() < 0.7) {
                state.particles.push({
                    x: b.x, y: b.y,
                    ang: rng() * Math.PI * 2,
                    len: 8,
                    ttl: 0.2, max: 0.2, a: 1,
                    color: '#faf5ff', spark: true
                });
            }
            break;
        }
        case 'POISON': {
            if (rng() < 0.6) {
                state.particles.push({
                    x: b.x, y: b.y,
                    r: 0, vr: 14,
                    ttl: 0.35, max: 0.35, a: 1,
                    color: '#bbf7d0', circle: true
                });
            }
            break;
        }
    }
}

function spawnImpact(state, b) {
    const rng = state.rng;
    const color = b.color || '#94a3b8';
    let count = 6, speed = 40, ttl = 0.4, ring = 12;
    switch (b.elt) {
        case 'FIRE': {
            count = 12; speed = 140; ttl = 0.5; ring = 22;
            // bright flash for fiery explosion
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 120, ttl: 0.25, max: 0.25, a: 1, color: '#f97316', circle: true });
            break;
        }
        case 'ICE': {
            count = 8; speed = 40; ttl = 0.7; ring = 16;
            // icy spikes
            for (let n = 0; n < 4; n++) {
                const ang = rng() * Math.PI * 2;
                state.particles.push({
                    x: b.x, y: b.y, ang,
                    len: 8, ttl: 0.5, max: 0.5, a: 1,
                    color: '#e0f2fe', spark: true,
                });
                state.particles.push({
                    x: b.x, y: b.y, ang: ang + Math.PI / 2,
                    len: 8, ttl: 0.5, max: 0.5, a: 1,
                    color: '#e0f2fe', spark: true,
                });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 60, ttl: 0.3, max: 0.3, a: 1, color: '#bae6fd', circle: true });
            break;
        }
        case 'LIGHT': {
            count = 12; speed = 180; ttl = 0.3; ring = 20;
            // electric sparks
            for (let n = 0; n < 6; n++) {
                const ang = rng() * Math.PI * 2;
                const sp = 160;
                state.particles.push({
                    x: b.x, y: b.y,
                    vx: Math.cos(ang) * sp,
                    vy: Math.sin(ang) * sp,
                    ang, len: 12, ttl: 0.3, max: 0.3, a: 1, color: '#faf5ff', spark: true,
                });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 200, ttl: 0.15, max: 0.15, a: 1, color: '#faf5ff', circle: true });
            break;
        }
        case 'POISON': {
            count = 9; speed = 60; ttl = 0.7; ring = 18;
            // toxic splash
            for (let n = 0; n < 5; n++) {
                const ang = rng() * Math.PI * 2;
                state.particles.push({ x: b.x, y: b.y, ang, len: 10, ttl: 0.5, max: 0.5, a: 1, color: '#4ade80', spark: true });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 50, ttl: 0.4, max: 0.4, a: 1, color: '#86efac', circle: true });
            break;
        }
    }
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: ring / ttl, ttl, max: ttl, a: 1, color, ring: true });
    for (let n = 0; n < count; n++) {
        const ang = rng() * Math.PI * 2;
        const sp = speed * (0.5 + rng());
        state.particles.push({
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
        b.ttl -= state.dt;
        b.x += b.vx * state.dt;
        b.y += b.vy * state.dt;
        spawnTrail(state, b);

        if (b.ttl <= 0) {
            if (b.kind === 'splash') {
                let hitAny = false;
                const fromT = state.towers.find(tt => tt.id === b.fromId);
                for (const c of state.creeps) {
                    if (!c.alive) continue;
                    if (Math.hypot(c.x - b.x, c.y - b.y) <= b.aoe) {
                        takeDamage(c, b.dmg, b.elt, c.status.resShred || 0);
                        applyStatus(c, b.status, fromT);
                        hitAny = true;
                        onCreepDamage?.({ creep: c, amount: b.dmg, elt: b.elt, towerId: fromT?.id });
                    }
                }
                if (hitAny) state.hits++;
            }
            spawnImpact(state, b);
            state.bullets.splice(i, 1);
        }
    }
}
