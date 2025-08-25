import assert from 'node:assert';
import { describe, it } from 'vitest';
import { Window } from 'happy-dom';
import { createCanvasRenderer } from './index.js';
import { TILE } from '../core/content.js';

const { document } = new Window();
// expose to renderer for document.createElement calls
global.document = document;
global.Image = class {
  constructor() {
    this.complete = true;
    this.width = 16;
    this.height = 16;
  }
  set src(v) { this._src = v; }
  get src() { return this._src; }
};

function makeCtx() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE * 2;
  // happy-dom might not provide a 2D context implementation; fall back to a
  // minimal stub that exposes the methods our renderer uses.
  const ctx = canvas.getContext('2d');
  if (ctx) return ctx;
  const methods = ['save','restore','beginPath','moveTo','lineTo','stroke','strokeRect','fillRect','fill','arc','translate','drawImage','clearRect'];
  const stub = { canvas };
  for (const m of methods) stub[m] = () => {};
  stub.createLinearGradient = () => ({ addColorStop() {} });
  stub.createPattern = () => ({})
  return stub;
}

function spyContext(ctx, methods) {
  const calls = Object.fromEntries(methods.map(m => [m, 0]));
  for (const m of methods) {
    const orig = ctx[m].bind(ctx);
    ctx[m] = (...args) => { calls[m]++; return orig(...args); };
  }
  return calls;
}

function baseState() {
  return {
    map: {
      size: { cols: 2, rows: 2 },
      blocked: [{ x: 0, y: 0 }],
      buildableMask: [[false, true], [true, true]]
    },
    startPx: { x: 0, y: 0 },
    endPx: { x: TILE, y: TILE },
    path: null,
    creeps: [], bullets: [], towers: [], particles: [], hover: null
  };
}

describe('render-canvas', () => {
  it('strokes grid by default', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['stroke']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false } });
    renderer.render(baseState());
    assert.ok(calls.stroke > 0, 'grid strokes by default');
  });

  it('suppresses grid when showGrid=false', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['stroke']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showGrid: false } });
    renderer.render(baseState());
    assert.strictEqual(calls.stroke, 0, 'grid suppressed when showGrid=false');
  });

  it('draws blocked tiles by default', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['strokeRect']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false } });
    renderer.render(baseState());
    assert.ok(calls.strokeRect > 0, 'blocked tiles drawn by default');
  });

  it('suppresses blocked tiles when showBlocked=false', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['strokeRect']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showBlocked: false }, spritePath: null });
    renderer.render(baseState());
    assert.strictEqual(calls.strokeRect, 0, 'blocked tiles suppressed when showBlocked=false');
  });

  it('draws build mask by default', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['fillRect']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showBlocked: false } });
    renderer.render(baseState());
    assert.ok(calls.fillRect > 0, 'build mask drawn by default');
  });

  it('suppresses build mask when showBuildMask=false', () => {
    const ctx = makeCtx();
    const calls = spyContext(ctx, ['fillRect']);
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showBlocked: false, showBuildMask: false } });
    renderer.render(baseState());
    assert.strictEqual(calls.fillRect, 0, 'build mask suppressed when showBuildMask=false');
  });

  it('draws creep sprite when img provided', () => {
    const ctx = makeCtx();
    let args;
    ctx.drawImage = (...a) => { args = a; };
    const img = { complete: true, width: 16, height: 16 };
    const state = baseState();
    state.creeps.push({ x: 16, y: 16, hp: 1, maxhp: 1, img, w: 20, h: 12 });
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showBlocked: false } });
    renderer.render(state);
    assert.ok(args, 'drawImage called');
    assert.strictEqual(args[1], -10, 'uses entity width');
    assert.strictEqual(args[2], -6, 'uses entity height');
    assert.strictEqual(args[3], 20, 'draws with provided width');
    assert.strictEqual(args[4], 12, 'draws with provided height');
  });

  it('draws creep sprite by type using spritePath when no img provided', () => {
    const ctx = makeCtx();
    let used;
    ctx.drawImage = (img) => { used = img.src; };
    const state = baseState();
    state.creeps.push({ x: 16, y: 16, hp: 1, maxhp: 1, type: 'Runner' });
    const renderer = createCanvasRenderer({
      ctx,
      engine: {},
      options: { cacheMap: false, showBlocked: false },
      spritePath: 'img'
    });
    renderer.render(state);
    assert.strictEqual(used, 'img/runner.svg', 'runner sprite inferred from type');
  });

  it('falls back to default creep sprite for unknown types', () => {
    const ctx = makeCtx();
    let used;
    ctx.drawImage = (img) => { used = img.src; };
    const state = baseState();
    state.creeps.push({ x: 16, y: 16, hp: 1, maxhp: 1, type: 'Alien' });
    const renderer = createCanvasRenderer({
      ctx,
      engine: {},
      options: { cacheMap: false, showBlocked: false },
      spritePath: 'img'
    });
    renderer.render(state);
    assert.strictEqual(used, 'img/creep.svg', 'default creep sprite used');
  });

  it('falls back to tower shape when no img', () => {
    const ctx = makeCtx();
    let drew = false;
    let drewImg = false;
    ctx.arc = () => { drew = true; };
    ctx.drawImage = () => { drewImg = true; };
    const state = baseState();
    state.towers.push({ id: 1, x: 16, y: 16, lvl: 1, range: 10, elt: 'FIRE' });
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false }, spritePath: null });
    renderer.render(state);
    assert.ok(drew, 'arc called for fallback tower shape');
    assert.strictEqual(drewImg, false, 'drawImage not called');
  });

  it('uses tower sprite by element when no img provided', () => {
    const ctx = makeCtx();
    let used;
    ctx.drawImage = (img) => { used = img.src; };
    const state = baseState();
    state.towers.push({ id: 1, x: 16, y: 16, lvl: 1, range: 10, elt: 'ICE' });
    const renderer = createCanvasRenderer({
      ctx,
      engine: {},
      options: { cacheMap: false },
      spritePath: 'img'
    });
    renderer.render(state);
    assert.strictEqual(used, 'img/ice.svg', 'ice tower sprite inferred from element');
  });

  it('falls back to default tower sprite for unknown elements', () => {
    const ctx = makeCtx();
    let used;
    ctx.drawImage = (img) => { used = img.src; };
    const state = baseState();
    state.towers.push({ id: 1, x: 16, y: 16, lvl: 1, range: 10, elt: 'LASER' });
    const renderer = createCanvasRenderer({
      ctx,
      engine: {},
      options: { cacheMap: false },
      spritePath: 'img'
    });
    renderer.render(state);
    assert.strictEqual(used, 'img/tower.svg', 'default tower sprite used');
  });
});

console.log('render-canvas tests passed');
