// js/core/lifecycle.js
const _listeners = new Set();
let _rafId = null;

export const lifecycle = {
    on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        const rec = { target, type, handler, options };
        _listeners.add(rec);
        return () => {
            try { target.removeEventListener(type, handler, options); } catch { }
            _listeners.delete(rec);
        };
    },

    startLoop(tick) {
        if (_rafId !== null) return () => { }; // schon aktiv
        const step = (t) => {
            _rafId = null;
            const keepRunning = tick?.(t);
            if (keepRunning === false) return;
            _rafId = requestAnimationFrame(step);
        };
        _rafId = requestAnimationFrame(step);
        return () => {
            if (_rafId !== null) cancelAnimationFrame(_rafId);
            _rafId = null;
        };
    },

    dispose() {
        // alle Listener entfernen
        _listeners.forEach(({ target, type, handler, options }) => {
            try { target.removeEventListener(type, handler, options); } catch { }
        });
        _listeners.clear();
        // RAF stoppen
        if (_rafId !== null) cancelAnimationFrame(_rafId);
        _rafId = null;
    },

    stats() {
        return { listeners: _listeners.size, loopRunning: _rafId !== null };
    }
};

if (typeof window !== 'undefined') {
    window.__lifeStats = () => (console.table(lifecycle.stats()), lifecycle.stats());
}
