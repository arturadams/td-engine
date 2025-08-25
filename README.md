# TD Engine

Core modules for a small tower defense engine.

## Documentation
- [Adding elements](docs/ADDING_ELEMENTS.md)

## Configuration

When creating the engine you may specify configuration options. The
`renderer` option allows choosing the rendering backend:

```js
import { createEngine } from '@your-scope/td-core/engine.js';

// Use WebGPU renderer if available
const engine = createEngine(null, { renderer: 'webgpu' });
```

Valid renderers are `canvas` (default) and `webgpu`. Unknown values
fall back to `canvas`.
