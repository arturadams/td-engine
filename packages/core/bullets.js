// packages/core/bullets.js
import { takeDamage, applyStatus } from './combat.js';

export function updateBullets(state, emitter) {
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
                    }
                }
                if (hitAny) state.hits++;
                emitter.emit({ type: 'fx.aoe', x: b.x, y: b.y, r: b.aoe, color: b.color, ttl: 0.18 });
            }
            state.bullets.splice(i, 1);
        }
    }
}
