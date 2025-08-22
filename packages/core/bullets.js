// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';

function spawnImpact(state, b) {
    const rng = state.rng;
    const color = b.color || '#94a3b8';
    let count = 6, speed = 40, ttl = 0.4, ring = 12;
    switch (b.elt) {
        case 'FIRE': {
            const aoe = b.aoe || 22;
            count = 16; speed = 120; ttl = 0.6; ring = aoe;
            // bright flash for fiery explosion
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 140, ttl: 0.25, max: 0.25, a: 1, color: '#f97316', circle: true });
            // lingering flames over the affected area
            for (let n = 0; n < 8; n++) {
                const ang = rng() * Math.PI * 2;
                const dist = rng() * aoe * 0.9;
                state.particles.push({
                    x: b.x + Math.cos(ang) * dist,
                    y: b.y + Math.sin(ang) * dist,
                    r: 4,
                    vr: 40,
                    ttl: 0.5,
                    max: 0.5,
                    a: 1,
                    color: '#fb923c',
                    circle: true,
                });
            }
            break;
        }
        case 'ICE': {
            count = 8; speed = 40; ttl = 0.7; ring = 16;
            // icy spikes
            for (let n = 0; n < 4; n++) {
                const ang = rng() * Math.PI * 2;
                state.particles.push({ x: b.x, y: b.y, ang, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#e0f2fe', spark: true });
                state.particles.push({ x: b.x, y: b.y, ang: ang + Math.PI / 2, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#e0f2fe', spark: true });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 60, ttl: 0.3, max: 0.3, a: 1, color: '#bae6fd', circle: true });
            break;
        }
        case 'LIGHT': {
            count = 10; speed = 200; ttl = 0.25; ring = 18;
            // tight cluster of electric sparks
            for (let n = 0; n < 10; n++) {
                const ang = rng() * Math.PI * 2;
                const sp = 220;
                state.particles.push({
                    x: b.x, y: b.y,
                    vx: Math.cos(ang) * sp,
                    vy: Math.sin(ang) * sp,
                    ang,
                    len: 10 + rng() * 6,
                    ttl: 0.15,
                    max: 0.15,
                    a: 1,
                    color: '#faf5ff',
                    spark: true,
                });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 220, ttl: 0.12, max: 0.12, a: 1, color: '#faf5ff', circle: true });
            break;
        }
        case 'POISON':
            count = 7; speed = 45; ttl = 0.6; ring = 16; break;
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

        // lightning bolts flicker in flight
        if (b.elt === 'LIGHT' && state.rng() < 0.4) {
            const ang = Math.atan2(b.vy, b.vx) + (state.rng() - 0.5) * 1;
            state.particles.push({
                x: b.x,
                y: b.y,
                ang,
                len: 6 + state.rng() * 4,
                ttl: 0.1,
                max: 0.1,
                a: 1,
                color: '#faf5ff',
                spark: true,
            });
        }

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
