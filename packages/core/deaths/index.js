// packages/core/deaths/index.js
import def from './default.js';
import boss from './boss.js';

const registry = {
    Boss: boss,
};

export function getDeathFx(type) {
    return registry[type] || def;
}

export { registry };
