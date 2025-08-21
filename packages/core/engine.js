// packages/core/engine.js
// Adds loadMap() & getMapInfo(), and routes pathing/placement through map

import { createEmitter } from './events.js';
import { createInitialState, resetState } from './state.js';
import { Elt, BLUEPRINT, COST, UPG_COST, TREES, UNLOCK_TIERS, TILE } from './content.js';
import { waveConfig, createWaveController } from './waves.js';
import { recomputePathingForAll, advanceCreep, cullDead } from './creeps.js';
import { fireTower } from './towers.js';
import { updateBullets } from './bullets.js';
import { astar } from './pathfinding.js';
import { uuid } from './rng.js';
import { validateMap, createDefaultMap, makeBuildableChecker, cellCenterForMap } from './map.js';
import { createStats } from './stats.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createEngine(seedState) {
    const emitter = createEmitter();
    const state = createInitialState(seedState);
    const stats = createStats(emitter);
    engine.stats = stats; // expose for UI

    // map helpers (bound to current state.map)
    const inBounds = (gx, gy) =>
        gx >= 0 && gy >= 0 && gx < state.map.size.cols && gy < state.map.size.rows;

    // refreshable reference; will be reassigned on loadMap()
    let canBuildCellRef = makeBuildableChecker(state.map);
    const canBuildCell = (gx, gy) => canBuildCellRef(gx, gy);

    const isBlocked = (gx, gy) => {
        if (!inBounds(gx, gy)) return true;
        const { start, end } = state.map;
        if (gx === start.x && gy === start.y) return false;
        if (gx === end.x && gy === end.y) return false;
        if (!canBuildCell(gx, gy)) return true;        // <- uses refreshed checker
        return state.towers.some(t => t.gx === gx && t.gy === gy);
    };

    function neighborsSynergy() {
        for (const t of state.towers) {
            const neighbors = state.towers.filter(o => o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= 2 * TILE + 1);
            const uniq = new Set(neighbors.map(n => n.elt));
            t.synergy = 0.08 * uniq.size;
        }
    }

    function canPlace(gx, gy) {
        if (!inBounds(gx, gy)) return false;
        const { start, end } = state.map;
        if (gx === start.x && gy === start.y) return false;
        if (gx === end.x && gy === end.y) return false;
        if (!canBuildCell(gx, gy)) return false;
        if (state.towers.some(t => t.gx === gx && t.gy === gy)) return false;
        // simulate and ensure path exists
        state.towers.push({ gx, gy, ghost: true });
        const p = astar(state.map.start, state.map.end, isBlocked, state.map.size.cols, state.map.size.rows);
        state.towers.pop();
        return !!p;
    }

    function placeTower(gx, gy, elt) {
        if (!inBounds(gx, gy)) return { ok: false, reason: 'oob' };
        if (state.towers.some(t => t.gx === gx && t.gy === gy)) return { ok: false, reason: 'occupied' };
        const { start, end } = state.map;
        if (gx === start.x && gy === start.y) return { ok: false, reason: 'start' };
        if (gx === end.x && gy === end.y) return { ok: false, reason: 'end' };
        if (!canBuildCell(gx, gy)) return { ok: false, reason: 'not_buildable' };
        if (!canPlace(gx, gy)) return { ok: false, reason: 'blocks_path' };

        const cost = COST[elt]; if (state.gold < cost) return { ok: false, reason: 'gold' };
        const bp = BLUEPRINT[elt];
        const t = {
            id: uuid(), gx, gy,
            x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2,
            elt, lvl: 1, xp: 0, tree: [],
            range: bp.range, firerate: bp.firerate, dmg: bp.dmg, type: bp.type, status: bp.status,
            cooldown: 0, spent: cost,
            mod: { dmg: 0, burn: 0, poison: 0, chill: 0, slowDur: 0, chainBounce: 0, chainRange: 0, stun: 0, aoe: 0, splash: 0, nova: false, resShred: 0, maxStacks: 1, pierce: 0 },
            synergy: 0, novaTimer: 0, kills: 0, freeTierPicks: 0,
        };
        state.towers.push(t); state.gold -= cost; state.selectedTowerId = t.id;
        neighborsSynergy(); recomputePathingForAll(state, isBlocked);
        emitter.emit({ type: 'gold.change', gold: state.gold });
        return { ok: true, tower: t };
    }

    function sellTower(id) {
        const idx = state.towers.findIndex(t => t.id === id);
        if (idx < 0) return false;
        const t = state.towers[idx];
        state.gold += Math.floor(t.spent * 0.8);
        state.towers.splice(idx, 1);
        if (state.selectedTowerId === id) state.selectedTowerId = null;
        neighborsSynergy(); recomputePathingForAll(state, isBlocked);
        emitter.emit({ type: 'gold.change', gold: state.gold });
        return true;
    }

    function setBuild(elt) { state.buildSel = elt; }

    function setHover(gx, gy) {
        state.hover.gx = gx; state.hover.gy = gy;
        state.hover.valid = canPlace(gx, gy);
    }

    function selectTowerAt(gx, gy) {
        const t = state.towers.find(tt => tt.gx === gx && tt.gy === gy);
        state.selectedTowerId = t ? t.id : null;
        return t || null;
    }

    function levelUpSelected() {
        const t = state.towers.find(tt => tt.id === state.selectedTowerId); if (!t) return false;
        const cost = UPG_COST(t.lvl); if (state.gold < cost) return false;
        state.gold -= cost; t.lvl++; t.spent += cost;
        t.dmg *= 1.12; t.firerate *= 1.04; t.range += 4;
        const unlocked = UNLOCK_TIERS.filter(u => t.lvl >= u).length;
        const credits = t.freeTierPicks || 0;
        const owed = Math.max(0, unlocked - (t.tree.length + credits));
        if (owed > 0) t.freeTierPicks = credits + owed;
        neighborsSynergy();
        emitter.emit({ type: 'gold.change', gold: state.gold });
        return true;
    }

    function applyEvolution(key) {
        const t = state.towers.find(tt => tt.id === state.selectedTowerId);
        if (!t) return false;
        if ((t.freeTierPicks || 0) <= 0) return false;
        const branch = TREES[t.elt];
        const currentTier = t.tree.length;
        if (!branch || currentTier >= branch.length) return false;
        const choices = branch[currentTier].filter(n => !n.req || t.tree.includes(n.req));
        const chosen = choices.find(n => n.key === key); if (!chosen) return false;
        chosen.mod(t); t.tree.push(chosen.key); t.freeTierPicks--;
        return true;
    }

    // waves controller
    const waves = createWaveController(state, emitter, isBlocked);

    // pause/speed
    function setPaused(v) {
        const next = !!v;
        if (state.paused !== next) {
            state.paused = next;
            emitter.emit({ type: 'pause.change', paused: state.paused });
        }
    }

    function setSpeed(v) {
        const caps = state.map.rules?.speedCaps ?? [1, 2, 4];
        const allowed = caps.includes(v) ? v : caps[0] || 1;
        if (state.speed !== allowed) {
            state.speed = allowed;
            emitter.emit({ type: 'speed.change', speed: state.speed });
        }
    }
    function cycleSpeed() {
        const caps = state.map.rules?.speedCaps ?? [1, 2, 4];
        const i = Math.max(0, caps.indexOf(state.speed));
        setSpeed(caps[(i + 1) % caps.length] || 1);
    }
    function toggleFast() { cycleSpeed(); }

    function setAutoWave(enabled, delayMs) {
        state.autoWaveEnabled = !!enabled;
        if (typeof delayMs === 'number') state.autoWaveDelay = Math.max(0, delayMs);
        if (!state.autoWaveEnabled) state._autoWaveTimer = -1;
        emitter.emit({ type: 'autowave.change', enabled: state.autoWaveEnabled, delay: state.autoWaveDelay });
    }

    // main loop
    function step(dt) {
        if (state.paused || state.gameOver) return;
        state.dt = dt;

        waves.stepSpawner();

        for (const c of state.creeps) {
            advanceCreep(state, c, () => {
                emitter.emit({ type: 'creep.leak' });
                emitter.emit({ type: 'life.change', lives: state.lives });
                if (state.lives <= 0 && !state.gameOver) {
                    state.gameOver = true; setPaused(true);
                    emitter.emit({ type: 'game.over', stats: getStats() });
                }
            });
            if (c.hp <= 0 && c.alive) { c.alive = false; }
        }

        for (const t of state.towers) { if (!t.ghost) fireTower(state, emitter, t, dt); }

        updateBullets(state, emitter);

        cullDead(state, emitter, () => {
            emitter.emit({ type: 'gold.change', gold: state.gold });
        });

        const canAuto = state.autoWaveEnabled && !state.gameOver && !waves.isSpawning() && state.creeps.length === 0;
        if (canAuto) {
            if (state._autoWaveTimer < 0) {
                state._autoWaveTimer = (state.autoWaveDelay || 0) / 1000;
            } else {
                state._autoWaveTimer -= dt;
                if (state._autoWaveTimer <= 0) {
                    state._autoWaveTimer = -1;
                    startWave();
                }
            }
        } else {
            state._autoWaveTimer = -1;
        }
    }

    function startWave() { return waves.startWave(); }

    function _waveStartInternal() {
        state.wave++;
        onWaveStart();
    }
    engine._waveStartInternal = _waveStartInternal;

    // map API
    function loadMap(mapConfig) {
        validateMap(mapConfig);

        // apply new map
        state.map = structuredClone(mapConfig);

        // refresh checker for this map
        canBuildCellRef = makeBuildableChecker(state.map);

        // refresh start/end pixel centers
        state.startPx = cellCenterForMap(state.map, state.map.start.x, state.map.start.y);
        state.endPx = cellCenterForMap(state.map, state.map.end.x, state.map.end.y);

        // clamp speed to map caps
        const caps = state.map.rules?.speedCaps ?? [1, 2, 4];
        if (!caps.includes(state.speed)) setSpeed(caps[0] || 1);

        // default autowave
        if (typeof state.map.rules?.autoWaveDefault === 'boolean') {
            state.autoWaveEnabled = state.map.rules.autoWaveDefault;
        }

        // clear selection/hover and recompute path
        state.selectedTowerId = null;
        state.hover = { gx: -1, gy: -1, valid: false };

        recomputePathingForAll(state, isBlocked);

        emitter.emit({ type: 'map.change', map: getMapInfo() });
        return true;
    }


    function getMapInfo() {
        const { id, name, size, start, end, rules } = state.map;
        return Object.freeze({ id, name, size, start, end, rules });
    }

    // ---- Hooks (single event API) --------------------------------------------
    // Central registry: each hook has a Set of subscribers.
    const hooks = {
        gameReset: new Set(),
        gameOver: new Set(),
        mapChange: new Set(),
        waveStart: new Set(),
        waveEnd: new Set(),
        lifeChange: new Set(),
        goldChange: new Set(),

        towerPlace: new Set(),
        towerSell: new Set(),
        towerLevel: new Set(),
        towerEvo: new Set(),

        creepSpawn: new Set(),
        creepKill: new Set(),
        creepLeak: new Set(),
        creepDamage: new Set(),

        shot: new Set(),
        hit: new Set(),
    };

    // Subscribe: engine.hook(name, fn) -> unsubscribe()
    function hook(name, fn) {
        const set = hooks[name];
        if (!set) throw new Error(`Unknown hook: ${name}`);
        set.add(fn);
        return () => set.delete(fn);
    }

    // Internal fanout
    function fire(name, payload) {
        const set = hooks[name];
        if (!set) return;
        for (const fn of set) {
            try { fn(payload, state); } catch (e) { /* avoid crashing game loop */ }
        }
    }

    // Make available to consumers
    engine.hook = hook;

    // ---- Notifiers (single points of truth) ----------------------------------
    function onGameReset() {
        fire('gameReset', {});
    }
    function onGameOver() {
        fire('gameOver', { wave: state.wave, lives: state.lives, gold: state.gold });
    }
    function onMapChange(mapInfo) {
        fire('mapChange', mapInfo);
    }
    function onWaveStart() {
        fire('waveStart', { wave: state.wave });
    }
    function onWaveEnd(reward) {
        fire('waveEnd', { wave: state.wave, reward });
    }

    function onLifeChange(delta, reason) {
        state.lives += delta;
        fire('lifeChange', { lives: state.lives, delta, reason });
        if (state.lives <= 0 && !state.gameOver) { state.gameOver = true; onGameOver(); }
    }

    function onGoldChange(delta, reason) {
        state.gold += delta;
        fire('goldChange', { gold: state.gold, delta, reason });
    }

    function onTowerPlace(tower, cost) {
        fire('towerPlace', { id: tower.id, elt: tower.elt, cost, gx: tower.gx, gy: tower.gy });
    }
    function onTowerSell(tower, refund) {
        fire('towerSell', { id: tower.id, refund });
    }
    function onTowerLevel(tower, from, to, cost) {
        fire('towerLevel', { id: tower.id, from, to, cost });
    }
    function onTowerEvo(tower, evoKey) {
        fire('towerEvo', { id: tower.id, key: evoKey });
    }

    function onCreepSpawn(cr) {
        fire('creepSpawn', { creepId: cr.id, type: cr.type });
    }
    function onCreepKill(c) {
        fire('creepKill', { creepId: c.id, type: c.type, gold: c.gold });
    }
    function onCreepLeak(c) {
        fire('creepLeak', { creepId: c.id, type: c.type });
    }
    function onCreepDamage({ creep, amount, elt, towerId }) {
        fire('creepDamage', { creepId: creep.id, creepType: creep.type, amount, elt, towerId });
    }

    function onShot(towerId) {
        fire('shot', { towerId });
    }
    function onHit(towerId) {
        fire('hit', { towerId });
    }

    // reset/serialize/stats
    function reset(seed) {
        waves.resetSpawner();
        resetState(state, { autoWaveEnabled: state.autoWaveEnabled, autoWaveDelay: state.autoWaveDelay, seed: state.seed, ...seed });
        // keep current map; recompute pathing
        recomputePathingForAll(state, isBlocked);
        neighborsSynergy();
        emitter.emit({ type: 'gold.change', gold: state.gold });
        emitter.emit({ type: 'life.change', lives: state.lives });
        emitter.emit({ type: 'speed.change', speed: state.speed });
        emitter.emit({ type: 'pause.change', paused: state.paused });
        emitter.emit({ type: 'game.reset' });
    }

    function serialize() {
        return JSON.parse(JSON.stringify({
            ...state,
            rng: undefined, dt: undefined, __onLeak: undefined, __onKill: undefined, __onCombo: undefined
        }));
    }

    function getStats() {
        return {
            gold: state.gold,
            lives: state.lives,
            wave: state.wave,
            spree: state.spree,
            score: state.score,
            shots: state.shots, hits: state.hits, accPct: Math.round((state.hits / Math.max(1, state.shots)) * 100),
            leaks: state.stats.leaks,
            leakedByWave: state.stats.leakedByWave,
            wavesCleared: state.stats.wavesCleared,
            seed: state.seed,
            mapId: state.map.id,
        };
    }

    // initial path
    recomputePathingForAll(state, isBlocked);

    return {
        // state
        get state() { return state; },
        serialize,
        getStats,

        // placement/select
        canPlace,
        setHover,
        selectTowerAt,
        placeTower,
        sellTower,
        setBuild,
        levelUpSelected,
        applyEvolution,

        // waves/runtime
        startWave,
        step,
        setPaused,
        setSpeed,
        cycleSpeed,
        toggleFast,
        setAutoWave,
        reset,

        // maps
        loadMap,
        getMapInfo,

        // events
        on: emitter.on,
        off: emitter.off,
    };
}

export { Elt, BLUEPRINT, COST, UPG_COST, TREES, UNLOCK_TIERS, waveConfig };
