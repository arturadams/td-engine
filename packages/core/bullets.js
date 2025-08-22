// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';

function spawnImpact(state, b) {
    const rng = state.rng;
    const color = b.color || '#94a3b8';
    let count = 6, speed = 40, ttl = 0.4, ring = 12;
    switch (b.elt) {
        case 'FIRE':
            count = 8; speed = 90; ttl = 0.4; ring = 18; break;
        case 'ICE':
            count = 6; speed = 50; ttl = 0.6; ring = 14; break;
        case 'LIGHT':
            count = 10; speed = 130; ttl = 0.3; ring = 20; break;
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
