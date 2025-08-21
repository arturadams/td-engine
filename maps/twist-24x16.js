// maps/twist-24x16.js
export const twistMap = {
    id: 'twist-24x16',
    name: 'Twist 24×16',
    size: { cols: 24, rows: 16 },
    start: { x: 0, y: 8 },
    end: { x: 23, y: 8 },
    blocked: [
        ...Array.from({ length: 6 }, (_, i) => ({ x: 10, y: 5 + i })),
    ],
    buildableMask: null,
    rules: {
        allowElements: ['FIRE', 'ICE', 'LIGHT', 'POISON'],
        autoWaveDefault: false,
        speedCaps: [1, 2, 4],
        maxWaves: 0,
        disableEvolutions: false,
        upgradeCredits: [2, 4, 6],
    },
    waves: {
        mode: 'procedural',
        authored: null,
        scaling: { hp: 'linear(0.07)', speed: 'flat(0.005)', gold: 'interest(0.03)' }
    }
};
