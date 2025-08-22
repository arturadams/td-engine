// packages/audio/index.js
// Basic Web Audio based sound effects for the TD engine.
// Generates short synthesized tones for different tower elements
// and creep interactions. Designed to run in browser environments.

export function attachSfx(engine, context = null) {
    // Lazily create context to allow calling from user interaction
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = context || new AudioCtx();

    // frequencies for different events
    const shotFreq = { FIRE: 220, ICE: 300, LIGHT: 440, POISON: 260 };
    const hitFreq = { FIRE: 880, ICE: 660, LIGHT: 520, POISON: 600 };
    const killFreq = 120;

    function beep(freq, dur = 0.1, type = 'square', vol = 0.1) {
        if (!freq) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    }

    // Ensure context resumed on first user interaction
    function resume() { if (ctx.state !== 'running') ctx.resume(); }
    window.addEventListener('pointerdown', resume, { once: true });

    // tower firing sound, per element
    engine.hook('shot', ({ towerId }) => {
        const t = engine.state.towers.find(tt => tt.id === towerId);
        const f = t && shotFreq[t.elt];
        if (f) beep(f, 0.06, 'square');
    });

    // element-based hit sound
    engine.hook('creepDamage', ({ elt }) => {
        const f = hitFreq[elt];
        if (f) beep(f, 0.05, 'triangle', 0.08);
    });

    // global creep death sound
    engine.hook('creepKill', () => {
        beep(killFreq, 0.25, 'sawtooth', 0.15);
    });

    return { beep };
}