// packages/core/engine/step.js

export function step(state, dt, deps) {
    const { waves, advanceCreep, rebuildCreepGrid, fireTower, updateBullets, updateParticles, cullDead, onCreepLeak, onLifeChange, onCreepKill, onGoldChange, onShot, onHit, startWave } = deps;
    if (state.paused || state.gameOver) return;
    state.dt = dt;

    waves.stepSpawner(dt);

    for (const c of state.creeps) {
        advanceCreep(state, c, () => {
            onCreepLeak(c);
            onLifeChange(-1, 'leak');
        });
        if (c.hp <= 0 && c.alive) { c.alive = false; }
    }

    rebuildCreepGrid(state);

    for (const t of state.towers) { if (!t.ghost) fireTower(state, { onShot, onHit, onCreepDamage: deps.onCreepDamage }, t, dt); }

    updateBullets(state, { onCreepDamage: deps.onCreepDamage });
    updateParticles(state);

    cullDead(state, {
        onKill: (c) => { onCreepKill(c); onGoldChange(+c.gold, 'kill'); },
    });

    const canAuto = state.autoWaveEnabled && !state.gameOver && !waves.isSpawning() && state.creeps.length === 0;
    if (canAuto) {
        if (state._autoWaveTimer < 0) { state._autoWaveTimer = (state.autoWaveDelay || 0) / 1000; }
        else {
            state._autoWaveTimer -= dt;
            if (state._autoWaveTimer <= 0) { state._autoWaveTimer = -1; startWave(); }
        }
    } else {
        state._autoWaveTimer = -1;
    }
}

