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

Valid renderers are `webgpu` (default) and `canvas`. Unknown values
fall back to `webgpu`.
