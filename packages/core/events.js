// packages/core/events.js
// Tiny typed-ish event emitter with on()/off()/emit()
export function createEmitter() {
    /** @type {Record<string, Set<Function>>} */
    const handlers = Object.create(null);

    function on(type, fn) {
        if (!handlers[type]) handlers[type] = new Set();
        handlers[type].add(fn);
        return () => off(type, fn);
    }

    function off(type, fn) {
        handlers[type]?.delete(fn);
    }

    function emit(evt) {
        // evt must be an object with a "type"
        const set = handlers[evt.type];
        if (set) {
            for (const fn of [...set]) {
                try { fn(evt); } catch (e) { /* never throw */ }
            }
        }
    }

    return { on, off, emit };
}
