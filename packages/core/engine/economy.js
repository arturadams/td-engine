// packages/core/engine/economy.js

export function changeGold(state, delta) {
    state.gold += delta;
    return state.gold;
}

export function changeLife(state, delta) {
    state.lives += delta;
    return state.lives;
}

