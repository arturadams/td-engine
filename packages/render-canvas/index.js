// packages/render-canvas/index.js
// Renders map overlays (grid, blocked tiles, optional buildable mask),
// plus calls to your existing entity renderers.

import { TILE, EltColor } from '../core/content.js';

export function createCanvasRenderer({ ctx, engine, options = {} }) {
  const opts = {
    showGrid: true,
    showBlocked: true,
    showBuildMask: true,
    // Cache static map layers (grid, path, blocked tiles, build mask)
    // into an offscreen canvas for improved performance.
    cacheMap: true,
    ...options,
  };

  // --- helpers -------------------------------------------------------------

  function drawGrid(map, c = ctx) {
    if (!opts.showGrid) return;
    const { cols, rows } = map.size;
    c.save();
    c.strokeStyle = '#1f2937'; // slate-800
    c.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      c.beginPath(); c.moveTo(x * TILE, 0); c.lineTo(x * TILE, rows * TILE); c.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      c.beginPath(); c.moveTo(0, y * TILE); c.lineTo(cols * TILE, y * TILE); c.stroke();
    }
    c.restore();
  }

  function drawPath(state, c = ctx) {
    const p = state.path;
    if (!p || p.length < 2) return;
    const g = c.createLinearGradient(p[0].x, p[0].y, p[p.length - 1].x, p[p.length - 1].y);
    g.addColorStop(0, '#64748b'); // slate-400
    g.addColorStop(1, '#8b5cf6'); // violet-500
    c.save();
    c.strokeStyle = g;
    c.lineWidth = 10;
    c.lineJoin = 'round';
    c.globalAlpha = 0.25;
    c.beginPath();
    c.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) c.lineTo(p[i].x, p[i].y);
    c.stroke();
    c.restore();
  }

  function drawStartEnd(state, c = ctx) {
    const s = state.startPx, e = state.endPx;
    c.save();
    // start (green)
    c.fillStyle = '#10b981'; // emerald-500
    c.beginPath(); c.arc(s.x, s.y, 6, 0, Math.PI * 2); c.fill();
    // end (gold)
    c.fillStyle = '#f59e0b'; // amber-500
    c.beginPath(); c.arc(e.x, e.y, 6, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawBlocked(map, c = ctx) {
    if (!opts.showBlocked) return;
    if (!map.blocked || !map.blocked.length) return;
    c.save();
    c.fillStyle = 'rgba(148,163,184,.28)'; // slate-400 @ ~28%
    c.strokeStyle = 'rgba(148,163,184,.45)';
    for (const { x, y } of map.blocked) {
      const px = x * TILE, py = y * TILE;
      c.fillRect(px, py, TILE, TILE);
      c.strokeRect(px, py, TILE, TILE);
    }
    c.restore();
  }

  // Optional: visualize a buildable mask if provided. We'll hatch NON-buildable.
  function drawBuildableMask(map, c = ctx) {
    if (!opts.showBuildMask) return;
    const mask = map.buildableMask;
    if (!mask) return;

    // make a simple diagonal hatch pattern once
    if (!drawBuildableMask._pat) {
      const off = document.createElement('canvas');
      off.width = 8; off.height = 8;
      const c2 = off.getContext('2d');
      c2.strokeStyle = 'rgba(220, 38, 38, .35)'; // red-600 @ 35%
      c2.lineWidth = 1;
      c2.beginPath();
      c2.moveTo(0, 8); c2.lineTo(8, 0);
      c2.stroke();
      drawBuildableMask._pat = ctx.createPattern(off, 'repeat');
    }

    c.save();
    c.fillStyle = drawBuildableMask._pat;
    for (let gy = 0; gy < mask.length; gy++) {
      for (let gx = 0; gx < mask[gy].length; gx++) {
        if (mask[gy][gx] === false) {
          c.fillRect(gx * TILE, gy * TILE, TILE, TILE);
        }
      }
    }
    c.restore();
  }

  // --- entity draws (assumes you already have these; stubs shown) ----------
  function drawCreeps(state) {
    for (const c of state.creeps) {
      ctx.save();
      ctx.translate(c.x, c.y);

      // body
      ctx.fillStyle = '#e5e7eb'; // gray-200
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();

      // health bar
      const pct = Math.max(0, Math.min(1, c.hp / c.maxhp));
      const w = 18, h = 3;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(-w / 2, -12, w, h);
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : (pct > 0.2 ? '#f59e0b' : '#ef4444');
      ctx.fillRect(-w / 2, -12, w * pct, h);

      // status pips (BURN/POISON/CHILL/SHOCK/stun)
      let dx = -9;
      function pip(color) { ctx.fillStyle = color; ctx.fillRect(dx, -18, 3, 3); dx += 4; }
      if (c.status?.BURN) pip('#ef4444');
      if (c.status?.POISON) pip('#22c55e');
      if (c.status?.CHILL) pip('#38bdf8');
      if (c.status?.SHOCK) pip('#a78bfa');
      if (c.status?.stun && c.status.stun > 0) pip('#fbbf24');

      ctx.restore();
    }
  }

  function drawTowers(state) {
    for (const t of state.towers) {
      if (t.ghost) continue;
      ctx.save();
      ctx.translate(t.x, t.y);
      const elt = t.elt || t.kind;
      const extraColors = { ARCHER: '#fbbf24', CANNON: '#9ca3af', SIEGE: '#9ca3af' };
      const color = EltColor[elt] || extraColors[elt] || '#94a3b8';
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // range ring if selected
      if (state.selectedTowerId === t.id) {
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, t.range, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // tiny ticks for level
      ctx.fillStyle = '#0b1020';
      for (let i = 0; i < t.lvl; i++) ctx.fillRect(-10 + i * 6, 10, 4, 3);

      ctx.restore();
    }
  }

  function drawBullets(state) {
    for (const b of state.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      const extraColors = { ARCHER: '#fbbf24', CANNON: '#9ca3af', SIEGE: '#9ca3af' };
      const color = b.color || EltColor[b.elt] || extraColors[b.elt] || '#94a3b8';
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 12;

      switch (b.elt) {
        case 'FIRE': {
          ctx.beginPath(); ctx.arc(0, 0, b.r || 4, 0, Math.PI * 2); ctx.fill();
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.fillRect(-4, -1, -8, 2);
          break;
        }
        case 'ICE': {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6);
          break;
        }
        case 'LIGHT': {
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(-2, -4); ctx.lineTo(0, -1); ctx.lineTo(2, -4);
          ctx.lineTo(1, 4); ctx.lineTo(-1, 4);
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'POISON': {
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.bezierCurveTo(3, -2, 3, 4, 0, 5);
          ctx.bezierCurveTo(-3, 4, -3, -2, 0, -5);
          ctx.fill();
          break;
        }
        case 'ARCHER': {
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(6, 0);
          ctx.lineTo(2, -3);
          ctx.moveTo(6, 0);
          ctx.lineTo(2, 3);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-6, 0, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'CANNON':
        case 'SIEGE': {
          ctx.beginPath(); ctx.arc(0, 0, b.r || 5, 0, Math.PI * 2); ctx.fill();
          break;
        }
        default: {
          ctx.beginPath(); ctx.arc(0, 0, b.r || 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      ctx.save();
      if (p.ring) {
        ctx.globalAlpha = Math.max(0, p.a ?? 0.6);
        ctx.strokeStyle = p.color || '#94a3b8';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      } else if (p.circle) {
        ctx.globalAlpha = Math.max(0, p.a ?? 0.6);
        ctx.fillStyle = p.color || '#94a3b8';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.spark) {
        ctx.globalAlpha = Math.max(0, p.a ?? 1);
        ctx.strokeStyle = p.color || '#94a3b8';
        ctx.lineWidth = 2;
        const len = p.len || 6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.ang || 0) * len, p.y + Math.sin(p.ang || 0) * len);
        ctx.stroke();
      } else {
        ctx.globalAlpha = Math.max(0, p.a ?? 1);
        ctx.fillStyle = p.color || '#94a3b8';
        ctx.fillRect(p.x, p.y, 2, 2);
      }
      ctx.restore();
    }
  }

  function drawHover(state) {
    const { gx, gy, valid } = state.hover || {};
    if (gx == null || gy == null || gx < 0 || gy < 0) return;
    const x = gx * TILE, y = gy * TILE;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = valid ? '#22c55e' : '#ef4444';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.restore();
  }

  // --- public render -------------------------------------------------------

  // Cache static map layers into an offscreen canvas
  function getMapCanvas(state) {
    const { cols, rows } = state.map.size;
    const w = cols * TILE, h = rows * TILE;
    const key = JSON.stringify({
      cols,
      rows,
      start: state.startPx,
      end: state.endPx,
      path: state.path,
      blocked: state.map.blocked,
      mask: state.map.buildableMask,
    });
    if (getMapCanvas._key !== key) {
      if (!getMapCanvas._canvas) {
        getMapCanvas._canvas = document.createElement('canvas');
        getMapCanvas._ctx = getMapCanvas._canvas.getContext('2d');
      }
      const off = getMapCanvas._canvas;
      const oc = getMapCanvas._ctx;
      off.width = w;
      off.height = h;
      oc.clearRect(0, 0, w, h);
      drawGrid(state.map, oc);
      drawPath(state, oc);
      drawBlocked(state.map, oc);
      drawBuildableMask(state.map, oc);
      drawStartEnd(state, oc);
      getMapCanvas._key = key;
    }
    return getMapCanvas._canvas;
  }

  function render(state, dt) {
    const { cols, rows } = state.map.size;
    const w = cols * TILE, h = rows * TILE;
    ctx.clearRect(0, 0, w, h);

    if (opts.cacheMap) {
      ctx.drawImage(getMapCanvas(state), 0, 0);
    } else {
      drawGrid(state.map);
      drawPath(state);
      drawBlocked(state.map);
      drawBuildableMask(state.map);
      drawStartEnd(state);
    }

    drawBullets(state);
    drawCreeps(state);
    drawTowers(state);
    drawParticles(state);
    drawHover(state);
  }

  return { render };
}
