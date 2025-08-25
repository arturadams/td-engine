import { createEngine } from '../../packages/core/engine.js';
import { createCanvasRenderer } from '../../packages/render-canvas/index.js';
import { TILE } from '../../packages/core/content.js';
import { twistMap } from '../../maps/twist-24x16.js';

const engine = createEngine();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const renderer = createCanvasRenderer({ ctx, engine, options: { theme: 'manga' } });

function resize() {
  const { cols, rows } = engine.state.map.size;
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = 1 / 60;
  engine.step(dt);
  renderer.render(engine.state, dt);
}

engine.loadMap(twistMap);
engine.reset();
resize();
requestAnimationFrame(loop);
