// packages/core/engine.js

import { createInitialState, resetState } from './state.js';
import { Elt, BLUEPRINT, COST, UPG_COST, TREES, UNLOCK_TIERS, TILE, BASIC_TOWERS, UPGRADE_MULT, REFUND_RATE } from './content.js';
import { defaultWaveConfig, createWaveController } from './waves.js';
import { recomputePathingForAll, advanceCreep, cullDead } from './creeps.js';
import { fireTower } from './towers.js';
import { updateBullets } from './bullets.js';
import { updateParticles } from './particles.js';
import { astar } from './pathfinding.js';
import { uuid } from './rng.js';
import { validateMap, makeBuildableChecker, cellCenterForMap } from './map.js';
import { attachStats } from './stats.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createEngine(seedState) {
    const engine = {};

    const state = createInitialState(seedState);

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
        const r2 = (2 * TILE + 1) * (2 * TILE + 1);
        for (const t of state.towers) {
            const neighbors = state.towers.filter(o => {
                if (o === t) return false;
                const dx = o.x - t.x, dy = o.y - t.y;
                return dx * dx + dy * dy <= r2;
            });
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
        const cached = state.path;
        const onPath = cached?.some(n => n.x === gx && n.y === gy);
        if (!cached || !cached.length || onPath) {
            const p = astar(
                state.map.start,
                state.map.end,
                (x, y) => (x === gx && y === gy) || isBlocked(x, y),
                state.map.size.cols,
                state.map.size.rows,
            );
            return !!p;
        }
        // tile not on cached path; existing path remains valid
        return true;
    }

    // Handle legacy 'CANNON' tower name by normalizing it to 'SIEGE'.
    const normalizeElt = (e) => (e === 'CANNON' ? Elt.SIEGE : e);

    function placeTower(gx, gy, rawElt) {
        const elt = normalizeElt(rawElt);
        if (!inBounds(gx, gy)) return { ok: false, reason: 'oob' };
        if (state.towers.some(t => t.gx === gx && t.gy === gy)) return { ok: false, reason: 'occupied' };
        const { start, end } = state.map;
        if (gx === start.x && gy === start.y) return { ok: false, reason: 'start' };
        if (gx === end.x && gy === end.y) return { ok: false, reason: 'end' };
        if (!canBuildCell(gx, gy)) return { ok: false, reason: 'not_buildable' };
        if (!canPlace(gx, gy)) return { ok: false, reason: 'blocks_path' };

        const cost = COST[elt];
        const bp = BLUEPRINT[elt];
        if (cost == null || !bp) return { ok: false, reason: 'invalid_tower' };
        if (state.gold < cost) return { ok: false, reason: 'gold' };

        const t = {
            id: uuid(), gx, gy,
            x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2,
            elt, lvl: 1, xp: 0, tree: [],
            range: bp.range, firerate: bp.firerate, dmg: bp.dmg, type: bp.type, status: bp.status,
            cooldown: 0, spent: cost,
            mod: { dmg: 0, burn: 0, poison: 0, chill: 0, slowDur: 0, chainBounce: 0, chainRange: 0, stun: 0, aoe: 0, splash: 0, nova: false, resShred: 0, maxStacks: 1, pierce: 0 },
            synergy: 0, novaTimer: 0, kills: 0, freeTierPicks: 0,
            targeting: 'first', _cycleIndex: 0,
        };
        state.towers.push(t);
        onGoldChange(-cost, 'place_tower');
        state.selectedTowerId = t.id;
        neighborsSynergy();
        recomputePathingForAll(state, isBlocked);
        onTowerPlace(t, cost);
        return { ok: true, tower: t };
    }

    function sellTower(id) {
        const idx = state.towers.findIndex(t => t.id === id);
        if (idx < 0) return false;
        const t = state.towers[idx];
        const isBasic = BASIC_TOWERS.includes(t.elt);
        const rate = isBasic ? REFUND_RATE.basic : REFUND_RATE.elemental;
        const refund = Math.floor(t.spent * rate);
        state.towers.splice(idx, 1);
        if (state.selectedTowerId === id) state.selectedTowerId = null;

        neighborsSynergy();
        recomputePathingForAll(state, isBlocked);

        onGoldChange(+refund, 'sell_tower');
        onTowerSell(t, refund);
        return true;
    }

    function setBuild(elt) { state.buildSel = normalizeElt(elt); }

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
        const cost = UPG_COST(t.lvl, t.elt); if (state.gold < cost) return false;

        onGoldChange(-cost, 'level_up');
        const prev = t.lvl;
        t.lvl++;
        t.spent += cost;
        const mult = BASIC_TOWERS.includes(t.elt) ? UPGRADE_MULT.basic : UPGRADE_MULT.elemental;
        t.dmg *= mult.dmg; t.firerate *= mult.firerate; t.range += mult.range;

        const unlocked = UNLOCK_TIERS.filter(u => t.lvl >= u).length;
        const credits = t.freeTierPicks || 0;
        const owed = Math.max(0, unlocked - (t.tree.length + credits));
        if (owed > 0) t.freeTierPicks = credits + owed;

        neighborsSynergy();
        onTowerLevel(t, prev, t.lvl, cost);
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

    function setTargeting(mode) {
        const t = state.towers.find(tt => tt.id === state.selectedTowerId);
        if (!t) return false;
        if (!['first', 'last', 'cycle'].includes(mode)) return false;
        t.targeting = mode;
        t._cycleIndex = 0;
        return true;
    }

    const awardWaveGold = (amount) => onGoldChange(+amount, 'wave_end_reward');
    // waves controller
    const waves = createWaveController(state, {
        getWavePacks: defaultWaveConfig, // or your custom waveConfig
        spawnCreep,
        onWaveStart: () => onWaveStart(),
        onWaveEnd: (reward) => onWaveEnd(reward),
        awardWaveGold,
    });

    function setPaused(v) {
        const next = !!v;
        if (state.paused !== next) {
            state.paused = next;
            onPauseChange();
        }
    }
    function setSpeed(v) {
        const caps = state.map.rules?.speedCaps ?? [1, 2, 4];
        const allowed = caps.includes(v) ? v : caps[0] || 1;
        if (state.speed !== allowed) {
            state.speed = allowed;
            onSpeedChange();
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
        onAutoWaveChange();
    }

    function step(dt) {
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

        for (const t of state.towers) { if (!t.ghost) fireTower(state, { onShot, onHit, onCreepDamage }, t, dt); }

        updateBullets(state, { onCreepDamage });
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


    function startWave() {
        state.wave += 1;
        onWaveStart();
        return waves.startWave();
    }

    function _waveStartInternal() {
        state.wave++;
        onWaveStart();
    }
    engine._waveStartInternal = _waveStartInternal;

    function loadMap(mapConfig) {
        validateMap(mapConfig);
        state.map = structuredClone(mapConfig);
        canBuildCellRef = makeBuildableChecker(state.map);
        state.startPx = cellCenterForMap(state.map, state.map.start.x, state.map.start.y);
        state.endPx = cellCenterForMap(state.map, state.map.end.x, state.map.end.y);

        const caps = state.map.rules?.speedCaps ?? [1, 2, 4];
        if (!caps.includes(state.speed)) setSpeed(caps[0] || 1);
        if (typeof state.map.rules?.autoWaveDefault === 'boolean') {
            state.autoWaveEnabled = state.map.rules.autoWaveDefault;
        }

        state.selectedTowerId = null;
        state.hover = { gx: -1, gy: -1, valid: false };

        recomputePathingForAll(state, isBlocked);
        onMapChange(getMapInfo());
        return true;
    }

    function getMapInfo() {
        const { id, name, size, start, end, rules } = state.map;
        return Object.freeze({ id, name, size, start, end, rules });
    }

    function spawnCreep(type, hpMul) {
        const base = state.creepProfiles[type];
        const start = state.map.start;
        const startPx = cellCenterForMap(state.map, start.x, start.y);
        const endPx = cellCenterForMap(state.map, state.map.end.x, state.map.end.y);

        const cr = {
            id: uuid(),
            type,
            x: startPx.x, y: startPx.y,
            seg: 0, t: 0,
            hp: base.hp * hpMul,
            maxhp: base.hp * hpMul,
            speed: base.speed * (1 + Math.max(0, state.wave - 3) * 0.005),
            resist: { ...base.resist },
            gold: base.gold,
            status: {},
            alive: true,
            path: (state.path && state.path.length >= 2)
                ? [...state.path]
                : [startPx, endPx]
        };

        state.creeps.push(cr);
        onCreepSpawn(cr);
    }
    // ---- Hooks (single event API) --------------------------------------------
    // Central registry: each hook has a Set of subscribers.
    // ---- Hooks (single event API) --------------------------------------------
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
        pauseChange: new Set(),
        speedChange: new Set(),
        autoWaveChange: new Set(),
    };

    function hook(name, fn) {
        const set = hooks[name];
        if (!set) throw new Error(`Unknown hook: ${name}`);
        set.add(fn);
        return () => set.delete(fn);
    }
    function fire(name, payload) {
        const set = hooks[name];
        if (!set) return;
        for (const fn of set) {
            try { fn(payload, state); } catch { /* swallow to keep loop safe */ }
        }
    }

    // Make available to consumers
    engine.hook = hook;

    // ---- Notifiers -----------------------------------------------------------
    function onGameReset() { fire('gameReset', {}); }
    function onGameOver() {
        const summary = engine.stats?.summary?.() || {};
        const totals = summary.totals || {};
        const creeps = totals.creeps || {};
        let top = null;
        for (const t of state.towers) {
            if (!top || (t.kills || 0) > (top.kills || 0)) top = t;
        }
        fire('gameOver', {
            wave: state.wave,
            lives: state.lives,
            gold: state.gold,
            score: state.score,
            wavesCleared: totals.wavesCleared || 0,
            leaks: creeps.leaked || 0,
            combos: totals.combos || 0,
            spree: state.spree,
            accuracy: totals.accuracy || 0,
            topKillerTowerId: top?.id || null,
            topKillerKills: top?.kills || 0,
        });
    }
    function onMapChange(mapInfo) { fire('mapChange', mapInfo); }
    function onWaveStart() { fire('waveStart', { wave: state.wave }); }
    function onWaveEnd(reward) { fire('waveEnd', { wave: state.wave, reward }); }
    function onPauseChange() { fire('pauseChange', { paused: state.paused }); }
    function onSpeedChange() { fire('speedChange', { speed: state.speed }); }
    function onAutoWaveChange() { fire('autoWaveChange', { enabled: state.autoWaveEnabled, delay: state.autoWaveDelay }); }
    function onLifeChange(delta, reason) {
        state.lives += delta;
        fire('lifeChange', { lives: state.lives, delta, reason });
        if (state.lives <= 0 && !state.gameOver) { state.gameOver = true; onGameOver(); }
    }
    function onGoldChange(delta, reason) {
        state.gold += delta;
        fire('goldChange', { gold: state.gold, delta, reason });
    }
    function onTowerPlace(t, cost) { fire('towerPlace', { id: t.id, elt: t.elt, cost, gx: t.gx, gy: t.gy }); }
    function onTowerSell(t, refund) { fire('towerSell', { id: t.id, refund }); }
    function onTowerLevel(t, from, to, cost) { fire('towerLevel', { id: t.id, from, to, cost }); }
    function onTowerEvo(t, key) { fire('towerEvo', { id: t.id, key }); }
    function onCreepSpawn(c) { fire('creepSpawn', { creepId: c.id, type: c.type }); }
    function onCreepKill(c) { fire('creepKill', { creepId: c.id, type: c.type, gold: c.gold }); }
    function onCreepLeak(c) { fire('creepLeak', { creepId: c.id, type: c.type }); }
    function onCreepDamage({ creep, amount, elt, towerId }) {
        fire('creepDamage', { creepId: creep.id, creepType: creep.type, amount, elt, towerId });
    }
    function onShot(towerId) { fire('shot', { towerId }); }
    function onHit(towerId) { fire('hit', { towerId }); }

    function reset(seed) {
        waves.resetSpawner();
        resetState(state, { autoWaveEnabled: state.autoWaveEnabled, autoWaveDelay: state.autoWaveDelay, seed: state.seed, ...seed });
        recomputePathingForAll(state, isBlocked);
        neighborsSynergy();
        onGameReset();
        onGoldChange(0);
        onLifeChange(0);
        onSpeedChange();
        onPauseChange();
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


    engine.stats = attachStats(engine);
    engine.hook = hook;

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
        setTargeting,

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
        hook,
    };
}

export { Elt, BLUEPRINT, COST, UPG_COST, TREES, UNLOCK_TIERS, defaultWaveConfig };
