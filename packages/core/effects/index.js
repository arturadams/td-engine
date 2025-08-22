// packages/core/effects/index.js
import def from './default.js';
import fire from './fire.js';
import ice from './ice.js';
import light from './light.js';
import poison from './poison.js';
import earth from './earth.js';
import wind from './wind.js';

const registry = {
    FIRE: fire,
    ICE: ice,
    LIGHT: light,
    POISON: poison,
    EARTH: earth,
    WIND: wind,
};

export function getEffect(elt) {
    return registry[elt] || def;
}

export { registry };
