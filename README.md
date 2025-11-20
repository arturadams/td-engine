# TD Engine

Core modules for a small tower defense engine.

## Documentation
- [Adding elements](docs/ADDING_ELEMENTS.md)

## Configuration

When creating the engine you may specify configuration options. The
`renderer` option allows choosing the rendering backend:

```js
import { createEngine } from '@your-scope/td-core/engine.js';

// Defaults to the WebGPU renderer; override for Canvas
const engine = createEngine(null, { renderer: 'canvas' });
```

Valid renderers are `canvas` (default) and `webgpu`. Unknown values
fall back to `webgpu`.

### Headless and manual stepping

The engine runtime is renderer-agnostic and can be advanced from any
loop (including Node.js or a renderer-driven requestAnimationFrame).
Call `engine.update(deltaSeconds)` each frame to run fixed-timestep
simulation ticks and receive an interpolation factor for visuals:

```js
import { createEngine } from '@your-scope/td-core/engine.js';

const engine = createEngine();

function frame(now, last) {
  const dt = (now - last) / 1000;
  const { alpha } = engine.update(dt);
  // render using engine.state plus alpha for interpolation
}
```

`update` clamps the fixed timestep to the configured `fixedStep`
(`1/60` by default), caps substeps via `maxSubSteps`, and never touches
DOM APIs—making it safe to run headless.

## Canvas renderer

The `createCanvasRenderer` helper accepts optional flags:

- `showGrid` – draw grid lines (default `true`)
- `showBlocked` – visualize blocked tiles (default `true`)
- `showBuildMask` – hatch non-buildable cells (default `true`)
- `cacheMap` – cache static map layers to an offscreen canvas for faster
  rendering (default `true`)

## Hook payloads

Subscribe to gameplay events with `engine.hook(name, handler)`. Notable
combat-related hooks expose positional data so listeners can trigger
visuals without inspecting engine state:

- `shot` – fired whenever a tower shoots. Payload: `{ towerId, towerX,
  towerY, targetId, targetX, targetY }`.
- `hit` – dispatched for each confirmed hit (including chain and pierce
  bounces). Payload: `{ towerId, towerX, towerY, targetId, targetType,
  hitX, hitY }`.
- `creepDamage` – emitted on damage application. Payload: `{ creepId,
  creepType, targetId, targetType, amount, elt, towerId, towerX, towerY,
  hitX, hitY, targetX, targetY }`.
