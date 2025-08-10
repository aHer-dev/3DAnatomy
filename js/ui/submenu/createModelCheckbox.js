// js/ui/submenu/createModelCheckbox.js
import { scene } from '../../core/scene.js';
import { setGroupVisibility } from '../../modelLoader/index.js';
import { getApp } from '../../bootstrap/startApp.js';

/**
 * Erstellt eine Checkbox für ein einzelnes anatomisches Modell.
 * @param {Object} entry – Meta-Eintrag (inkl. label, filename, etc.)
 * @param {string} group – Zugehörige anatomische Gruppe
 * @returns {HTMLLIElement} – Checkbox mit Label im Listenelement
 */
export function createModelCheckbox(entry, group) {
    const li = document.createElement('li');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `entry-${entry.fma}`;

    const label = document.createElement('label');
    label.textContent = entry.label;
    label.htmlFor = cb.id;

    cb.addEventListener('change', async () => {
        try {
            const app = getApp();
            if (!app) throw new Error('App ist noch nicht initialisiert');

            if (cb.checked) {
                // Einzelnes Modell laden und im State registrieren
                const model = await app.managers.loader.loadEntry(entry);
                app.managers.state.addModelToGroup(model, group);
                app.managers.visibility.setState(model, 'visible');
            } else {
                // Einzelnes Modell wieder entfernen
                const models = app.managers.state.getGroupModels(group);
                const nameA = entry?.id || entry?.model?.root_name || entry?.model?.asset?.file;
                const toRemove = models.find(m => m.name === nameA);
                if (toRemove) {
                    app.managers.loader.disposeModel(toRemove);
                    app.managers.state.removeModelFromGroup(toRemove, group);
                    scene.remove(toRemove);
                }
            }

            setGroupVisibility(group); // Sichtbarkeit neu berechnen
        } catch (err) {
            console.error(`❌ Fehler bei "${entry.label}":`, err);
        }
    });

    li.appendChild(cb);
    li.appendChild(label);
    return li;
}
