// ============================================
// 1. SIMPLE EVENT BUS - core/events.js
// ============================================
class EventBus {
    constructor() {
        this.events = {};
        this.debug = true; // Für Development
    }

    on(event, callback, context = null) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push({ callback, context });

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    emit(event, data = {}) {
        if (this.debug) console.log(`📢 Event: ${event}`, data);

        if (!this.events[event]) return;
        this.events[event].forEach(({ callback, context }) => {
            callback.call(context, data);
        });
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(
            listener => listener.callback !== callback
        );
    }

    clear() {
        this.events = {};
    }
}

export const events = new EventBus();