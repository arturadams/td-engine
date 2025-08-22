// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';
import { getEffect } from './effects/index.js';

export function updateBullets(state, { onCreepDamage }) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        const effect = getEffect(b.elt);
        effect.trail(state, b);
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
                effect.aoe(state, b);
            }
            effect.impact(state, b);
            state.bullets.splice(i, 1);
        }
    }
}
