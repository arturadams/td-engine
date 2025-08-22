// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';

function spawnImpact(state, b) {
    const rng = state.rng;
    const color = b.color || '#94a3b8';
    let count = 6, speed = 40, ttl = 0.4, ring = 12;
    switch (b.elt) {
        case 'FIRE': {
            count = 14; speed = 160; ttl = 0.6; ring = 24;
            // fiery flash and lingering smoke
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 220, ttl: 0.2, max: 0.2, a: 1, color: '#fb923c', circle: true });
            state.particles.push({ x: b.x, y: b.y, r: 4, ttl: 1.2, max: 1.2, a: 0.6, color: '#374151', circle: true, vy: -20 });
            break;
        }
        case 'ICE': {
            count = 10; speed = 60; ttl = 0.7; ring = 20;
            // icy spikes and frost burst
            for (let n = 0; n < 6; n++) {
                const ang = rng() * Math.PI * 2;
                state.particles.push({ x: b.x, y: b.y, ang, len: 10, ttl: 0.6, max: 0.6, a: 1, color: '#e0f2fe', spark: true });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 80, ttl: 0.4, max: 0.4, a: 1, color: '#bae6fd', circle: true });
            break;
        }
        case 'LIGHT': {
            count = 12; speed = 200; ttl = 0.3; ring = 24;
            // electric sparks and flash
            for (let n = 0; n < 8; n++) {
                const ang = rng() * Math.PI * 2;
                const sp = 180;
                state.particles.push({
                    x: b.x, y: b.y,
                    vx: Math.cos(ang) * sp,
                    vy: Math.sin(ang) * sp,
                    ang, len: 14, ttl: 0.25, max: 0.25, a: 1, color: '#faf5ff', spark: true,
                });
            }
            state.particles.push({ x: b.x, y: b.y, r: 0, vr: 240, ttl: 0.2, max: 0.2, a: 1, color: '#ddd6fe', circle: true });
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

        // element-specific trail particles
        switch (b.elt) {
            case 'FIRE':
                state.particles.push({ x: b.x, y: b.y, r: 1.5, ttl: 0.25, max: 0.25, a: 1, color: '#fb923c', circle: true });
                break;
            case 'ICE':
                state.particles.push({ x: b.x, y: b.y, r: 1.5, ttl: 0.35, max: 0.35, a: 1, color: '#e0f2fe', circle: true });
                break;
            case 'LIGHT':
                state.particles.push({ x: b.x, y: b.y, r: 1.5, ttl: 0.2, max: 0.2, a: 1, color: '#faf5ff', circle: true });
                break;
            case 'POISON':
                state.particles.push({ x: b.x, y: b.y, r: 1.5, ttl: 0.3, max: 0.3, a: 1, color: '#bbf7d0', circle: true });
                break;
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
