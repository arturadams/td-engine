// packages/core/map.js
// MapConfig schema, defaults, and validation

import { TILE } from './content.js';

export function createDefaultMap() {
    return /** @type {MapConfig} */({
        id: 'default-24x16',
        name: 'Default 24×16',
        size: { cols: 24, rows: 16 },
        start: { x: 0, y: 8 },
        end: { x: 23, y: 8 },
        blocked: [],         // no permanent obstacles
        buildableMask: null, // null means "everything except start/end/blocked"
        rules: {
            allowElements: ['FIRE', 'ICE', 'LIGHT', 'POISON'],
            maxWaves: 0,             // 0 = unlimited
            autoWaveDefault: false,
            speedCaps: [1, 2, 4],
            disableEvolutions: false,
            upgradeCredits: [2, 4, 6],
        },
        waves: {
            mode: 'procedural',
            authored: null,
            scaling: { hp: 'linear(0.07)', speed: 'flat(0.005)', gold: 'interest(0.03)' }
        }
    });
}

/**
 * Validate a MapConfig (lightweight checks, throws on invalid).
 * @param {MapConfig} map
 */
export function validateMap(map) {
    if (!map || typeof map !== 'object') throw new Error('map: required');
    const { size, start, end } = map;
    if (!size || typeof size.cols !== 'number' || typeof size.rows !== 'number') {
        throw new Error('map.size: {cols,rows} required');
    }
    if (size.cols <= 2 || size.rows <= 2) throw new Error('map.size: too small');
    if (!start || !isFinite(start.x) || !isFinite(start.y)) throw new Error('map.start invalid');
    if (!end || !isFinite(end.x) || !isFinite(end.y)) throw new Error('map.end invalid');
    const inb = (g) => g.x >= 0 && g.y >= 0 && g.x < size.cols && g.y < size.rows;
    if (!inb(start)) throw new Error('map.start OOB');
    if (!inb(end)) throw new Error('map.end OOB');

    if (Array.isArray(map.blocked)) {
        for (const b of map.blocked) {
            if (!inb(b)) throw new Error('map.blocked contains OOB cell');
        }
    } else if (map.blocked != null) throw new Error('map.blocked must be array or null');

    if (map.buildableMask != null) {
        if (!Array.isArray(map.buildableMask)) throw new Error('map.buildableMask must be 2D boolean array');
        if (map.buildableMask.length !== size.rows) throw new Error('map.buildableMask rows mismatch');
        for (const row of map.buildableMask) {
            if (!Array.isArray(row) || row.length !== size.cols) throw new Error('map.buildableMask cols mismatch');
        }
    }

    if (map.rules) {
        const caps = map.rules.speedCaps ?? [1, 2, 4];
        if (!Array.isArray(caps) || !caps.every(v => v === 1 || v === 2 || v === 4)) {
            throw new Error('map.rules.speedCaps must be subset of [1,2,4]');
        }
    }
    return true;
}

/**
 * Derive a buildability checker from map config.
 * @param {MapConfig} map
 */
export function makeBuildableChecker(map) {
    const { cols, rows } = map.size;
    const blockedSet = new Set((map.blocked || []).map(c => `${c.x},${c.y}`));
    const hasMask = !!map.buildableMask;

    return function canBuild(gx, gy) {
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
        if (gx === map.start.x && gy === map.start.y) return false;
        if (gx === map.end.x && gy === map.end.y) return false;
        if (blockedSet.has(`${gx},${gy}`)) return false;
        if (hasMask) return !!map.buildableMask[gy][gx];
        return true;
    };
}

/**
 * Utility: convert grid cell to pixel center for this map
 */
export function cellCenterForMap(map, gx, gy) {
    return { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
}

/**
 * @typedef {object} MapConfig
 * @property {string} id
 * @property {string} name
 * @property {{cols:number, rows:number}} size
 * @property {{x:number,y:number}} start
 * @property {{x:number,y:number}} end
 * @property {Array<{x:number,y:number}>|null} [blocked]
 * @property {boolean[][]|null} [buildableMask]
 * @property {{
 *   allowElements?: string[],
 *   maxWaves?: number,          // 0 = unlimited
 *   autoWaveDefault?: boolean,
 *   speedCaps?: Array<1|2|4>,
 *   disableEvolutions?: boolean,
 *   upgradeCredits?: [number,number,number],
 * }} [rules]
 * @property {{
 *   mode: 'procedural'|'authored'|'hybrid',
 *   authored?: Array<{ packs: Array<{type:string;count:number;gap:number;hpMul:number}> }>|null,
 *   scaling?: { hp: string, speed: string, gold: string }
 * }} [waves]
 */
