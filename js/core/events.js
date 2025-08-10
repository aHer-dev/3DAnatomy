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

// ============================================
// 2. INFO PANEL - interaction/infoPanel.js  
// ============================================
export function showInfoPanel(entry, model) {
    const panel = document.getElementById('info-panel');
    const content = document.getElementById('info-content');

    if (!panel || !content) {
        console.warn('Info-Panel Elemente nicht gefunden');
        return;
    }

    // Defensive: Check entry exists
    if (!entry) {
        console.warn('showInfoPanel: Keine Entry-Daten');
        return;
    }

    content.innerHTML = `
        <h3>${entry.labels?.de || entry.labels?.en || entry.id || 'Unbekannt'}</h3>
        <p><strong>ID:</strong> ${entry.id || 'N/A'}</p>
        <p><strong>Gruppe:</strong> ${entry.classification?.group || entry.group || 'Unbekannt'}</p>
        ${entry.classification?.subgroup ? `<p><strong>Untergruppe:</strong> ${entry.classification.subgroup}</p>` : ''}
        ${entry.info?.description?.de || entry.info?.description?.en ?
            `<p><strong>Beschreibung:</strong> ${entry.info.description.de || entry.info.description.en}</p>` : ''}
    `;

    panel.classList.remove('hidden');
    panel.classList.add('visible');
}

export function hideInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.classList.add('hidden');
        panel.classList.remove('visible');
    }

    const content = document.getElementById('info-content');
    if (content) {
        content.innerHTML = '';
    }
}
