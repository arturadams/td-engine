// packages/core/engine.js

import { createInitialState, resetState } from './state.js';
import { Elt, BLUEPRINT, COST, UPG_COST, TREES, UNLOCK_TIERS, TILE, BASIC_TOWERS, UPGRADE_MULT, REFUND_RATE } from './content.js';
import { defaultWaveConfig, createWaveController } from './waves.js';
import { recomputePathingForAll, advanceCreep, cullDead } from './creeps.js';
import { fireTower } from './towers.js';
import { updateBullets } from './bullets.js';
import { updateParticles, clearParticlePool } from './particles.js';
import { uuid } from './rng.js';
import { validateMap, makeBuildableChecker, cellCenterForMap } from './map.js';
import { attachStats } from './stats.js';
import { rebuildCreepGrid } from './spatial.js';
import { resolveConfig } from './config.js';
import { isBlocked as isBlockedImpl, canPlace as canPlaceImpl, placeTower as placeTowerImpl, sellTower as sellTowerImpl, setBuild as setBuildImpl, setHover as setHoverImpl, selectTowerAt as selectTowerAtImpl, gatherNeighbors, neighborsSynergy } from './engine/placement.js';
import { changeGold, changeLife } from './engine/economy.js';
import { levelUpSelected as levelUpSelectedImpl, applyEvolution as applyEvolutionImpl, setTargeting as setTargetingImpl } from './engine/upgrades.js';

/**
 * @typedef {Object} ShotEvent
 * @property {string|null} towerId
 * @property {number|null} towerX
 * @property {number|null} towerY
 * @property {string|null} targetId
 * @property {number|null} targetX
 * @property {number|null} targetY
 */

/**
 * @typedef {Object} HitEvent
 * @property {string|null} towerId
 * @property {number|null} towerX
 * @property {number|null} towerY
 * @property {string|null} targetId
 * @property {string|null} targetType
 * @property {number|null} hitX
 * @property {number|null} hitY
 */

/**
 * @typedef {Object} CreepDamageEvent
 * @property {string} creepId
 * @property {string} creepType
 * @property {string} targetId
 * @property {string} targetType
 * @property {number} amount
 * @property {string} elt
 * @property {string|null} towerId
 * @property {number|null} towerX
 * @property {number|null} towerY
 * @property {number} hitX
 * @property {number} hitY
 * @property {number} targetX
 * @property {number} targetY
 */
import { step as stepImpl } from './engine/step.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createEngine(seedState, userConfig) {
    const engine = {};
    engine.config = resolveConfig(userConfig);

    const state = createInitialState(seedState);

    let accumulator = 0;
    const fixedStep = engine.config.fixedStep || (1 / 60);
    const maxSubSteps = engine.config.maxSubSteps || 240;

    // spatial index for towers keyed by grid coords "gx,gy"
    const towerGrid = new Map();
    const gridKey = (gx, gy) => `${gx},${gy}`;
    const rebuildTowerGrid = () => {
        towerGrid.clear();
        for (const t of state.towers) {
            towerGrid.set(gridKey(t.gx, t.gy), t);
        }
    };
    rebuildTowerGrid();

    // refreshable reference; will be reassigned on loadMap()
    let canBuildCellRef = makeBuildableChecker(state.map);
    const canBuildCell = (gx, gy) => canBuildCellRef(gx, gy);

    const isBlocked = (gx, gy) => isBlockedImpl(state, towerGrid, canBuildCell, gx, gy);
    const canPlace = (gx, gy) => canPlaceImpl(state, towerGrid, canBuildCell, gx, gy);
    const neighborsSynergyBound = (targets) => neighborsSynergy(state, towerGrid, targets);

    function placeTower(gx, gy, rawElt) {
        return placeTowerImpl(state, towerGrid, canBuildCell, gx, gy, rawElt, {
            onGoldChange,
            recomputePathingForAll,
            gatherNeighborsFn: gatherNeighbors,
            neighborsSynergyFn: neighborsSynergy,
            onTowerPlace,
        });
    }

    function sellTower(id) {
        return sellTowerImpl(state, towerGrid, id, {
            onGoldChange,
            recomputePathingForAll,
            gatherNeighborsFn: gatherNeighbors,
            neighborsSynergyFn: neighborsSynergy,
            onTowerSell,
            canBuildCell,
        });
    }

    function setBuild(elt) { setBuildImpl(state, elt); }
    function setHover(gx, gy) { setHoverImpl(state, gx, gy, canPlace); }
    function selectTowerAt(gx, gy) { return selectTowerAtImpl(state, gx, gy); }

    function levelUpSelected() {
        return levelUpSelectedImpl(state, { onGoldChange, neighborsSynergy: () => neighborsSynergyBound(), onTowerLevel });
    }

    function applyEvolution(key) { return applyEvolutionImpl(state, key); }
    function setTargeting(mode) { return setTargetingImpl(state, mode); }

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
        stepImpl(state, dt, {
            waves,
            advanceCreep,
            rebuildCreepGrid,
            fireTower,
            updateBullets,
            updateParticles,
            cullDead,
            onCreepLeak,
            onLifeChange,
            onCreepKill,
            onGoldChange,
            onShot,
            onHit,
            startWave,
            onCreepDamage,
        });
        state.alpha = 0;
        return { alpha: 0 };
    }

    function update(dt) {
        const delta = Math.max(0, Number(dt) || 0);
        accumulator = clamp(accumulator + delta * (state.speed || 1), 0, fixedStep * (maxSubSteps + 1));
        let steps = 0;
        while (accumulator >= fixedStep && steps < maxSubSteps) {
            step(fixedStep);
            accumulator -= fixedStep;
            steps += 1;
        }
        const alpha = clamp(accumulator / fixedStep, 0, 1);
        state.alpha = alpha;
        return { alpha, steps };
    }

    function startWave() {
        return waves.startWave();
    }

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

        rebuildTowerGrid();
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
            z: base.z ?? 0,
            baseZ: base.z ?? 0,
            arc: base.arc ? { ...base.arc } : null,
            arcTimer: 0,
            arcProgress: base.arc ? 0 : null,
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
        changeLife(state, delta);
        fire('lifeChange', { lives: state.lives, delta, reason });
        if (state.lives <= 0 && !state.gameOver) { state.gameOver = true; onGameOver(); }
    }
    function onGoldChange(delta, reason) {
        changeGold(state, delta);
        fire('goldChange', { gold: state.gold, delta, reason });
    }
    function onTowerPlace(t, cost) { fire('towerPlace', { id: t.id, elt: t.elt, cost, gx: t.gx, gy: t.gy }); }
    function onTowerSell(t, refund) { fire('towerSell', { id: t.id, refund }); }
    function onTowerLevel(t, from, to, cost) { fire('towerLevel', { id: t.id, from, to, cost }); }
    function onTowerEvo(t, key) { fire('towerEvo', { id: t.id, key }); }
    function onCreepSpawn(c) { fire('creepSpawn', { creepId: c.id, type: c.type }); }
    function onCreepKill(c) { fire('creepKill', { creepId: c.id, type: c.type, gold: c.gold }); }
    function onCreepLeak(c) { fire('creepLeak', { creepId: c.id, type: c.type }); }
    function onCreepDamage({ creep, amount, elt, towerId, hitX, hitY, targetX, targetY }) {
        const tower = towerId ? state.towers.find(t => t.id === towerId) : null;
        fire('creepDamage', {
            creepId: creep.id,
            creepType: creep.type,
            targetId: creep.id,
            targetType: creep.type,
            amount,
            elt,
            towerId,
            towerX: tower?.x ?? null,
            towerY: tower?.y ?? null,
            hitX: hitX ?? targetX ?? creep.x,
            hitY: hitY ?? targetY ?? creep.y,
            targetX: targetX ?? creep.x,
            targetY: targetY ?? creep.y,
        });
    }
    function onShot(evt) {
        const tower = evt?.towerId ? state.towers.find(t => t.id === evt.towerId) : null;
        fire('shot', {
            towerId: evt?.towerId ?? null,
            towerX: evt?.towerX ?? tower?.x ?? null,
            towerY: evt?.towerY ?? tower?.y ?? null,
            targetId: evt?.targetId ?? null,
            targetX: evt?.targetX ?? null,
            targetY: evt?.targetY ?? null,
        });
    }
    function onHit(evt) {
        const tower = evt?.towerId ? state.towers.find(t => t.id === evt.towerId) : null;
        fire('hit', {
            towerId: evt?.towerId ?? null,
            towerX: evt?.towerX ?? tower?.x ?? null,
            towerY: evt?.towerY ?? tower?.y ?? null,
            targetId: evt?.targetId ?? null,
            targetType: evt?.targetType ?? null,
            hitX: evt?.hitX ?? null,
            hitY: evt?.hitY ?? null,
        });
    }

    function reset(seed) {
        waves.resetSpawner();
        resetState(state, { autoWaveEnabled: state.autoWaveEnabled, autoWaveDelay: state.autoWaveDelay, seed: state.seed, ...seed });
        clearParticlePool();
        rebuildTowerGrid();
        recomputePathingForAll(state, isBlocked);
        neighborsSynergyBound();
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
        update,
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
