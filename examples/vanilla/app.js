import { createEngine } from '../../packages/core/engine.js';
import { createCanvasRenderer } from '../../packages/render-canvas/index.js';
import { TILE, GRID_W, GRID_H, COST, EltColor } from '../../packages/core/content.js';
import { buildHudSnapshot, buildTowerDetailsModel } from '../../packages/core/selectors.js';
import { attachViewportFit } from './viewport-fit.js';
import { twistMap } from '../../maps/twist-24x16.js';

const engine = createEngine();
// attachSfx(engine); // use it once I get cool sound effects on the hooks
const canvas = document.getElementById('game');
canvas.style.touchAction = 'none';
const { fit } = attachViewportFit(canvas, {
  toolbarSelector: '.mobile-toolbar',
  headerSelector: 'header' // update to your actual header class/selector if you have one
});
const ctx = canvas.getContext('2d', { alpha: false });
const renderer = createCanvasRenderer({ ctx, engine });


// ---------- Input helpers ----------
function haptic(ms = 12) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch { } }

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'toast'; el.style.position = 'fixed'; el.style.left = '50%'; el.style.top = '12px'; el.style.transform = 'translateX(-50%)'; el.style.zIndex = 50; el.style.pointerEvents = 'none'; document.body.appendChild(el);
  }
  el.innerHTML = `<div style="background:rgba(2,6,23,.9);border:1px solid rgba(51,65,85,.6);padding:.5rem .75rem;border-radius:.5rem;font-size:12px">${msg}</div>`;
  el.style.opacity = '1';
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 1000);
}

function sizeCanvasToCurrentMap() {
  const { cols, rows } = engine.state.map.size;
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
  fit();
}

// Mouse
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousemove', (e) => {
  const { gx, gy } = gridFromEvent(canvas, e, TILE, GRID_W, GRID_H);
  engine.setHover(gx, gy);
});
canvas.addEventListener('mousedown', (e) => {
  const { gx, gy } = gridFromEvent(canvas, e, TILE, GRID_W, GRID_H);
  if (e.button === 2) {
    const t = engine.selectTowerAt(gx, gy);
    if (t) { engine.sellTower(t.id); haptic(20); syncHud(); repaintTowerDetails(); }
    return;
  }
  // Try selecting first
  const t = engine.selectTowerAt(gx, gy);
  if (!t) {
    const affordable = engine.state.gold >= COST[engine.state.buildSel];
    if (!affordable) { toast("Not enough gold"); haptic(35); return; }
    const r = engine.placeTower(gx, gy, engine.state.buildSel);
    if (!r.ok) { toast(r.reason.replaceAll('_', ' ')); haptic(35); }
    else { haptic(10); }
  }
  syncHud(); repaintTowerDetails();
});

// Touch (tap to place/select, long-press to sell)
let touchTimer = null;
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  const ge = gridFromEvent(canvas, e, TILE, GRID_W, GRID_H);
  touchStart = { ...ge, time: performance.now() };
  engine.setHover(ge.gx, ge.gy);
  touchTimer = setTimeout(() => {
    const tower = engine.selectTowerAt(ge.gx, ge.gy);
    if (tower) { engine.sellTower(tower.id); haptic(20); syncHud(); repaintTowerDetails(); }
    touchTimer = null;
  }, 500);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  const ge = gridFromEvent(canvas, e, TILE, GRID_W, GRID_H);
  engine.setHover(ge.gx, ge.gy);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
    if (touchStart) {
      const { gx, gy } = touchStart;
      const sel = engine.selectTowerAt(gx, gy);
      if (!sel) {
        const affordable = engine.state.gold >= COST[engine.state.buildSel];
        if (!affordable) { toast("Not enough gold"); haptic(35); }
        else {
          const r = engine.placeTower(gx, gy, engine.state.buildSel);
          if (!r.ok) { toast(r.reason.replaceAll('_', ' ')); haptic(35); }
          else { haptic(10); }
        }
      }
      syncHud(); repaintTowerDetails();
    }
  }
  touchStart = null;
}, { passive: false });

function toLogical(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const p = (e.touches?.[0]) || (e.changedTouches?.[0]) || e;
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (p.clientX - rect.left) * sx, y: (p.clientY - rect.top) * sy };
}

function gridFromEvent(canvas, e) {
  const { x, y } = toLogical(canvas, e);
  const { cols, rows } = engine.state.map.size;
  return {
    x, y,
    gx: Math.max(0, Math.min(cols - 1, Math.floor(x / TILE))),
    gy: Math.max(0, Math.min(rows - 1, Math.floor(y / TILE))),
  };
}

// ---------- Palette (desktop + mobile toolbar) ----------
function refreshBuildPalette() {
  const gold = engine.state.gold;
  document.querySelectorAll('[data-elt]').forEach(btn => {
    const elt = btn.dataset.elt;
    if (elt === engine.state.buildSel) {
      btn.classList.add('ring-2', 'ring-indigo-400');
    } else {
      btn.classList.remove('ring-2', 'ring-indigo-400');
    }
    const affordable = gold >= COST[elt];
    btn.classList.toggle('opacity-50', !affordable);
    btn.classList.toggle('pointer-events-none', !affordable);
    const label = elt[0] + elt.slice(1).toLowerCase();
    btn.textContent = `${label} (${COST[elt]})`;
  });
}

function wirePaletteButtons(scope = document) {
  scope.querySelectorAll('[data-elt]').forEach(btn => {
    btn.addEventListener('click', () => {
      engine.setBuild(btn.dataset.elt);
      refreshBuildPalette();
    });
  });
}
wirePaletteButtons(document);

// Hotkeys
window.addEventListener('keydown', (e) => {
  let changed = false;
  if (e.code === 'Digit1') { engine.setBuild('ARCHER'); changed = true; }
  if (e.code === 'Digit2') { engine.setBuild('SIEGE'); changed = true; }
  if (e.code === 'Digit3') { engine.setBuild('FIRE'); changed = true; }
  if (e.code === 'Digit4') { engine.setBuild('ICE'); changed = true; }
  if (e.code === 'Digit5') { engine.setBuild('LIGHT'); changed = true; }
  if (e.code === 'Digit6') { engine.setBuild('POISON'); changed = true; }
  if (e.code === 'Digit7') { engine.setBuild('EARTH'); changed = true; }
  if (e.code === 'Digit8') { engine.setBuild('WIND'); changed = true; }
  if (e.code === 'Digit9') { engine.setBuild('ARCANE'); changed = true; }
  if (e.code === 'Space') engine.startWave();
  if (e.code === 'KeyP') engine.setPaused(!engine.state.paused);
  if (e.code === 'KeyF') engine.toggleFast();
  if (changed) refreshBuildPalette();
});

// ---------- HUD + Tower panel ----------
const binds = {
  gold: Array.from(document.querySelectorAll('[data-bind="gold"]')),
  lives: Array.from(document.querySelectorAll('[data-bind="lives"]')),
  wave: Array.from(document.querySelectorAll('[data-bind="wave"]')),
  waveTimer: Array.from(document.querySelectorAll('[data-bind="waveTimer"]')),
};

let waveTime = 0;
let waveRunning = false;

function syncHud() {
  const h = buildHudSnapshot(engine.state);
  binds.gold.forEach(el => el.textContent = h.gold);
  binds.lives.forEach(el => el.textContent = h.lives);
  binds.wave.forEach(el => el.textContent = h.wave);
  binds.waveTimer.forEach(el => el.textContent = '');
  refreshBuildPalette();
  repaintTowerDetails(false);
}

async function repaintTowerDetails(force = true) {
  const towerInfo = document.getElementById('towerInfo');
  const { TREES, UNLOCK_TIERS, UPG_COST } = await import('../../packages/core/content.js');
  const vm = buildTowerDetailsModel(engine.state, TREES, UNLOCK_TIERS, UPG_COST);
  if (!towerInfo) return;
  if (!vm) {
    if (force) towerInfo.innerHTML = '<div class="opacity-60">Nothing selected. Tap/click a tower.</div>';
    return;
  }
  towerInfo.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full" style="background:${EltColor[vm.elt]}"></span>
        <div class="font-semibold">${vm.elt} Tower</div>
      </div>
      <button id="tiClose" class="px-2 py-1 border rounded text-xs">✕</button>
    </div>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
      <div>DMG</div>   <div class="font-mono text-right">${vm.dmg}</div>
      <div>Rate</div>  <div class="font-mono text-right">${vm.firerate}/s</div>
      <div>Range</div> <div class="font-mono text-right">${vm.range}</div>
      <div>Kills</div> <div class="font-mono text-right">${vm.kills}</div>
    </div>
    <div class="mt-2 flex flex-wrap gap-2">
      <button id="tiUpg" class="px-2 py-1 border rounded text-xs ${vm.canUpgrade ? '' : 'opacity-50 pointer-events-none'}">
        Level Up (${vm.upgCost})
      </button>
      <button id="tiSell" class="px-2 py-1 border rounded text-xs">Sell (+${vm.sellGold})</button>
    </div>
    <div class="mt-2 text-xs uppercase opacity-75">Upgrade Tree</div>
    <div id="tiEvo" class="mt-2 grid grid-cols-2 gap-2"></div>
  `;

  document.getElementById('tiClose')?.addEventListener('click', () => {
    engine.state.selectedTowerId = null;
    repaintTowerDetails();
  });
  document.getElementById('tiUpg')?.addEventListener('click', () => {
    if (engine.levelUpSelected()) { haptic(10); syncHud(); repaintTowerDetails(); }
  });
  document.getElementById('tiSell')?.addEventListener('click', () => {
    engine.sellTower(vm.id); haptic(15); syncHud(); repaintTowerDetails();
  });

  const evoWrap = document.getElementById('tiEvo');
  if (vm.nextTierIndex >= 0) {
    vm.choices.forEach(evo => {
      const btn = document.createElement('button');
      btn.className = `px-2 py-2 border rounded text-left text-xs`;
      btn.innerHTML = `<div class="font-semibold">${evo.name}</div><div class="opacity-70">${evo.desc ?? ''}</div>`;
      btn.onclick = () => { if (engine.applyEvolution(evo.key)) { haptic(10); repaintTowerDetails(); } };
      evoWrap.appendChild(btn);
    });
    if (!vm.choices.length) evoWrap.innerHTML = `<div class='text-xs opacity-60'>No further upgrades on this path.</div>`;
  } else {
    evoWrap.innerHTML = `<div class='text-xs opacity-60'>Level up to unlock next tier.</div>`;
  }
}

// ---------- Controls ----------
document.getElementById('start')?.addEventListener('click', () => engine.startWave());
document.getElementById('pause')?.addEventListener('click', () => engine.setPaused(!engine.state.paused));
const fastBtn = document.getElementById('fast');
const updateSpeedLabel = () => { if (fastBtn) fastBtn.textContent = (engine.state.speed || 1) + '×'; };
fastBtn && (fastBtn.onclick = () => { engine.cycleSpeed(); updateSpeedLabel(); });
updateSpeedLabel();

document.getElementById('mStart')?.addEventListener('click', () => engine.startWave());
document.getElementById('mPause')?.addEventListener('click', () => engine.setPaused(!engine.state.paused));
document.getElementById('mFast')?.addEventListener('click', () => engine.cycleSpeed());

const goModal = document.getElementById('goModal');
const goBody = document.getElementById('goBody');
document.getElementById('goClose')?.addEventListener('click', () => {
  goModal.classList.add('hidden');
});
document.getElementById('goRestart')?.addEventListener('click', () => {
  goModal.classList.add('hidden');
  engine.setAutoWave(false, 1200);
  engine.reset();
  syncHud();
  repaintTowerDetails();
});

// ---------- Event-driven UI refresh ----------
engine.hook('goldChange', () => syncHud());
engine.hook('creepKill', () => syncHud());
engine.hook('waveStart', () => { waveTime = 0; waveRunning = true; });
engine.hook('waveEnd', () => { waveRunning = false; waveTime = 0; syncHud(); });
engine.hook('lifeChange', () => syncHud());

engine.hook('mapChange', ({ size }) => {
  sizeCanvasToCurrentMap();
});
const po = document.getElementById('pauseOverlay');
const poClose = document.getElementById('poClose');

engine.hook('pauseChange', ({ paused }) => {
  if (paused && !engine.state.gameOver) {
    po?.classList.remove('hidden');
    po?.classList.add('flex');
  } else {
    po?.classList.add('hidden');
    po?.classList.remove('flex');
  }
});
poClose?.addEventListener('click', () => engine.setPaused(false));

engine.hook('speedChange', ({ speed }) => {
  const label = (speed === 1 ? '1×' : speed === 2 ? '2×' : '4×');
  const fastElem = document.getElementById('fast');
  if (fastElem) fastElem.textContent = label;
  const mFastElem = document.getElementById('mFast');
  if (mFastElem) mFastElem.textContent = label;
});

engine.hook('gameOver', (ev) => {
  const goBody = document.getElementById('goBody');
  const t = engine.state.towers.find(tt => tt.id === ev.topKillerTowerId);
  const topKillerLabel = t ? `${t.elt} @ ${t.gx},${t.gy}` : '—';

  goBody.innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <div class="border border-slate-700 rounded-xl p-3">
        <div class="text-xs uppercase opacity-70">Final Score</div>
        <div class="text-2xl font-extrabold">${(ev.score || 0).toLocaleString()}</div>
      </div>
      <div class="border border-slate-700 rounded-xl p-3">
        <div class="text-xs uppercase opacity-70">Waves Cleared</div>
        <div class="text-2xl font-extrabold">${ev.wavesCleared || 0}</div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm mt-3">
      <div class="border border-slate-700 rounded-xl p-3">
        <div>Gold: <span class="font-mono">${ev.gold}</span></div>
        <div>Leaks: <span class="font-mono">${ev.leaks}</span></div>
        <div>Combos: <span class="font-mono">${ev.combos}</span></div>
        <div>Spree: <span class="font-mono">${ev.spree}</span></div>
        <div>Accuracy: <span class="font-mono">${ev.accuracy}%</span></div>
      </div>
      <div class="border border-slate-700 rounded-xl p-3">
        <div class="opacity-70">Top Killer Tower</div>
        <div class="font-mono">${topKillerLabel}</div>
        <div>Kills: <span class="font-mono">${ev.topKillerKills || 0}</span></div>
      </div>
    </div>
  `;
  const modal = document.getElementById('goModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
});

// Overlay controls
const awToggle = document.getElementById('autoWaveToggle');
const awDelay = document.getElementById('autoWaveDelay');

awToggle?.addEventListener('change', () => {
  engine.setAutoWave(awToggle.checked, Number(awDelay?.value || 1200));
});
awDelay?.addEventListener('change', () => {
  engine.setAutoWave(awToggle?.checked, Number(awDelay.value || 1200));
});

// HUD quick switch (optional)
const awHUD = document.getElementById('autoWaveHUD');
awHUD?.addEventListener('change', () => {
  engine.setAutoWave(awHUD.checked, Number(awDelay?.value || 1200));
});

// keep UI in sync if engine changes from code
engine.hook('autoWaveChange', ({ enabled, delay }) => {
  if (awToggle) awToggle.checked = !!enabled;
  if (awHUD) awHUD.checked = !!enabled;
  if (awDelay && typeof delay === 'number') awDelay.value = String(delay);
});

if (awToggle) awToggle.checked = engine.state.autoWaveEnabled;
if (awHUD) awHUD.checked = engine.state.autoWaveEnabled;
if (awDelay) awDelay.value = String(engine.state.autoWaveDelay);

// ---------- Event-driven console logs ----------
engine.hook('goldChange', (g) => console.log('gold', g));
engine.hook('creepKill', (e) => console.log('kill', e));
engine.hook('lifeChange', (e) => console.log('life.change', e));
engine.hook('gameOver', (e) => console.log('game over!', e));

// ---------- Loop ----------
let last = performance.now();
engine.setAutoWave(false, 1200);
function loop(now) {
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(raw * (engine.state.speed || 1), 0.05);
  if (!engine.state.paused) {
    engine.step(dt);
    renderer.render(engine.state, dt);
    if (waveRunning) waveTime += dt;
  }
  if (waveRunning) {
    binds.waveTimer.forEach(el => el.textContent = waveTime.toFixed(1) + 's');
  } else if (engine.state.autoWaveEnabled && engine.state._autoWaveTimer >= 0) {
    binds.waveTimer.forEach(el => el.textContent = 'Next ' + engine.state._autoWaveTimer.toFixed(1) + 's');
  } else {
    binds.waveTimer.forEach(el => el.textContent = '');
  }
}
engine.loadMap(twistMap);
engine.reset();
syncHud();
repaintTowerDetails();
requestAnimationFrame(loop);
sizeCanvasToCurrentMap();

const info = engine.getMapInfo();
console.log('map:', info.name, info.size.cols + 'x' + info.size.rows);