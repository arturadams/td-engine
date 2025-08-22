// packages/core/towers.js
import { EltColor, Status } from './content.js';
import { takeDamage, applyStatus } from './combat.js';

export function targetInRange(state, t) {
    let best = null, bestProg = -1;
    for (const c of state.creeps) {
        if (!c.alive) continue;
        const d = Math.hypot(c.x - t.x, c.y - t.y);
        if (d <= t.range) {
            const prog = c.seg + c.t;
            if (prog > bestProg) { best = c; bestProg = prog; }
        }
    }
    return best;
}

export function fireTower(state, { onShot, onHit, onCreepDamage }, t, dt) {
    if (t.cooldown > 0) { t.cooldown -= dt; return; }

    // Ice: periodic Nova slow
    if (t.mod.nova) {
        t.novaTimer -= dt; const freq = 4.5 * (t.mod.novaFreq || 1);
        if (t.novaTimer <= 0) {
            t.novaTimer = freq;
            for (const c of state.creeps) {
                if (!c.alive) continue;
                const d = Math.hypot(c.x - t.x, c.y - t.y);
                if (d <= t.range * 0.7) applyStatus(c, Status.CHILL, t);
            }
        }
    }

    // Fire: periodic meteors
    if (t.mod.meteors) {
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

    const target = targetInRange(state, t); if (!target) return;

    const dmg = t.dmg * (1 + t.mod.dmg + t.synergy);
    const acc = 0.98; state.shots++;
    onShot?.(t.id);

    if (t.type === 'bolt' || t.type === 'chain') {
        const hit = state.rng() < acc; if (hit) { state.hits++; onHit?.(t.id); }

        if (hit) {
            takeDamage(target, dmg, t.elt, target.status.resShred || 0);
            applyStatus(target, t.status, t);
            onCreepDamage?.({ creep: target, amount: dmg, elt: t.elt, towerId: t.id });

            // pierce line
            if (t.mod.pierce && t.mod.pierce > 0) {
                const dirx = target.x - t.x, diry = target.y - t.y; const len = Math.hypot(dirx, diry);
                const nx = dirx / len, ny = diry / len;
                let remaining = t.mod.pierce;
                for (const c of state.creeps) {
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

            // chain lightning
            if (t.type === 'chain') {
                let bounces = 1 + (t.mod.chainBounce || 0); let last = target; let bounced = new Set([last.id]);
                let chainRange = 70 + (t.mod.chainRange || 0);
                while (bounces-- > 0) {
                    const next = state.creeps.find(c => c.alive && !bounced.has(c.id) && Math.hypot(c.x - last.x, c.y - last.y) <= chainRange);
                    if (!next) break; bounced.add(next.id);
                    takeDamage(next, dmg * 0.6, t.elt, next.status.resShred || 0);
                    applyStatus(next, t.status, t);
                    if (t.mod.stunChain) next.status.stun = Math.max(next.status.stun || 0, 0.25);
                    if (t.mod.lightDot) next.status.lightDot = { dot: t.mod.lightDot, t: 1.5 };
                    onHit?.(t.id);
                    onCreepDamage?.({ creep: next, amount: dmg * 0.6, elt: t.elt, towerId: t.id });
                    last = next;
                }
            }
        }
        t.cooldown = 1 / t.firerate;
        return;
    }

    if (t.type === 'splash') {
        const dx = target.x - t.x, dy = target.y - t.y;
        const dist = Math.hypot(dx, dy);
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
            elt: t.elt,
            status: t.status,
            dmg,
        });
        state.shots++;
        onShot?.(t.id);
        t.cooldown = 1 / t.firerate;
    }
}
