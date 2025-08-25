import assert from 'node:assert';
import { describe, it } from 'vitest';
import { Window } from 'happy-dom';
import { createCanvasRenderer } from './index.js';
import { TILE } from '../core/content.js';

const { document } = new Window();
// expose to renderer for document.createElement calls
global.document = document;

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
    const renderer = createCanvasRenderer({ ctx, engine: {}, options: { cacheMap: false, showBlocked: false } });
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
});

console.log('render-canvas tests passed');
