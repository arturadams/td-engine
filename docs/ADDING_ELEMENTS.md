# Adding Elements

This guide shows how to introduce a new damage element to the engine.

## 1. Define the element

Each element lives in `packages/core/elements.js` and includes a `color` used for rendering and a `status` effect applied on hit.

```js
// packages/core/elements.js
export const elements = {
  FIRE:  { color:"#ff0066", status:"BURN" },
  ICE:   { color:"#00eaff", status:"CHILL" },
  LIGHT: { color:"#f8ff00", status:"SHOCK" },
  POISON:{ color:"#39ff14", status:"POISON" },
  EARTH: { color:"#ffb347", status:"BRITTLE" },
  WIND:  { color:"#00bbff", status:"EXPOSED" },
  // ARCANE: { color:"#bf00ff", status:"MANA_BURN" }, // example addition
};
```

Add a new entry following the same shape. `color` should be any CSS color string, and `status` refers to the effect to apply.

## 2. Register the status effect

Status behaviours are defined in the effect registry at `packages/core/combat.js`. Extend `applyStatus` with your new status and update `tickStatusesAndCombos` so it expires correctly.

```js
// packages/core/combat.js
import { Status } from './content.js';

export function applyStatus(c, status, fromTower) {
    const m = fromTower?.mod || {};
    if (status === Status.BURN) {
        c.status[Status.BURN] = { t: 2.2 * (1 + (m.burn || 0)), dot: 5 * (1 + (m.burn || 0)) };
    }
    // ...existing effects...
    if (status === Status.MANA_BURN) {
        c.status[Status.MANA_BURN] = { t: 2.0, dot: 10 };
    }
}

export function tickStatusesAndCombos(c, dt) {
    if (c.status[Status.MANA_BURN]) {
        const s = c.status[Status.MANA_BURN];
        s.t -= dt; c.hp -= s.dot * dt;
        if (s.t <= 0) delete c.status[Status.MANA_BURN];
    }
    // ...existing timers...
}
```

`Status` constants live in `packages/core/content.js`; add an identifier there so the engine can reference your effect.

## 3. Optional: combos and content

If the new status should interact with others, update `packages/core/combos.js`. You may also want to add tower blueprints or loot referencing the element in `packages/core/content.js`.

With these steps, the engine recognises your element, applies its status effect, and renders it using the specified colour.
