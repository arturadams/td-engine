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

## Canvas renderer

The `createCanvasRenderer` helper accepts optional flags:

- `showGrid` – draw grid lines (default `true`)
- `showBlocked` – visualize blocked tiles (default `true`)
- `showBuildMask` – hatch non-buildable cells (default `true`)
- `cacheMap` – cache static map layers to an offscreen canvas for faster
  rendering (default `true`)
