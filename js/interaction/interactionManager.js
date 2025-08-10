// ============================================
// 5. INTERACTION MANAGER - interaction/interactionManager.js
// ============================================
import * as THREE from 'three';
import { pickAt } from '../core/raycaster.js';
import { renderer } from '../core/renderer.js';
import { debug } from '../core/debug.js';

class InteractionManager {
    constructor(stateManager, visibilityManager) {
        this.state = stateManager;
        this.visibility = visibilityManager;
        this.cleanupFunctions = [];
        this.setupInteractions();
    }

    setupInteractions() {
        // Canvas-Klick Handler
        const clickHandler = (event) => {
            const selection = pickAt(event.clientX, event.clientY);

            if (selection?.root) {
                this.handleModelSelection(selection);
            } else {
                this.clearSelection();
            }
        };

        renderer.domElement.addEventListener('pointerdown', clickHandler, { passive: true });
        this.cleanupFunctions.push(() => {
            renderer.domElement.removeEventListener('pointerdown', clickHandler);
        });

        debug.log('interaction', '🖱️ Interaktionen eingerichtet');
    }

    handleModelSelection(selection) {
        const { root, mesh, point } = selection;
        const entry = root.userData?.entry;

        if (!entry) {
            console.warn('Ausgewähltes Modell hat keine Meta-Daten');
            return;
        }

        // State aktualisieren
        this.state.setSelected(selection);

        // Highlight anwenden
        this.applyHighlight(root);

        // Info-Panel anzeigen
        this.showInfoPanel(entry, root);

        debug.log('interaction', `Modell ausgewählt: ${entry.id}`);
    }

    applyHighlight(model) {
        // Vorheriges Highlight entfernen
        const previous = this.state.getCurrentlySelected();
        if (previous && previous !== model) {
            this.removeHighlight(previous);
        }

        // Neues Highlight setzen
        model.traverse(node => {
            if (node.isMesh && node.material) {
                if (!node.material.emissive) {
                    node.material.emissive = new THREE.Color(0x222222);
                } else {
                    node.material.emissive.set(0x222222);
                }
                node.material.needsUpdate = true;
            }
        });
    }

    removeHighlight(model) {
        model.traverse(node => {
            if (node.isMesh && node.material?.emissive) {
                node.material.emissive.set(0x000000);
                node.material.needsUpdate = true;
            }
        });
    }

    clearSelection() {
        const previous = this.state.getCurrentlySelected();
        if (previous) {
            this.removeHighlight(previous);
        }

        this.state.setSelected(null);
        this.hideInfoPanel();
    }

    showInfoPanel(entry, model) {
        const panel = document.getElementById('info-panel');
        const content = document.getElementById('info-content');

        if (!panel || !content) {
            console.warn('Info-Panel Elemente nicht gefunden');
            return;
        }

        // Panel-Inhalt erstellen (neue Schema-Struktur)
        content.innerHTML = `
            <h3>${entry.labels?.en || entry.id}</h3>
            <p><strong>ID:</strong> ${entry.id}</p>
            <p><strong>Gruppe:</strong> ${entry.classification?.group || 'Unbekannt'}</p>
            ${entry.classification?.subgroup ? `<p><strong>Untergruppe:</strong> ${entry.classification.subgroup}</p>` : ''}
            ${entry.info?.description?.en ? `<p><strong>Beschreibung:</strong> ${entry.info.description.en}</p>` : ''}
            ${entry.info?.links?.fma ? `<p><strong>FMA:</strong> ${entry.info.links.fma}</p>` : ''}
        `;

        // Edit-Controls hinzufügen
        const editDiv = document.createElement('div');
        editDiv.id = 'edit-controls';
        this.buildEditControls(editDiv, model);
        content.appendChild(editDiv);

        // Panel anzeigen
        panel.classList.remove('hidden');
        panel.classList.add('visible');
    }

    buildEditControls(container, model) {
        container.innerHTML = `
            <div class="edit-control">
                <label>Farbe:</label>
                <input type="color" id="edit-color" />
            </div>
            <div class="edit-control">
                <label>Transparenz:</label>
                <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1" />
            </div>
            <div class="edit-actions">
                <button id="edit-toggle-visible">Verstecken/Anzeigen</button>
                <button id="edit-add-to-set">Zur Sammlung</button>
            </div>
        `;

        // Event-Listener für Controls
        const colorInput = container.querySelector('#edit-color');
        const opacitySlider = container.querySelector('#edit-opacity');
        const toggleButton = container.querySelector('#edit-toggle-visible');
        const addToSetButton = container.querySelector('#edit-add-to-set');

        // Initialwerte setzen
        this.setInitialControlValues(colorInput, opacitySlider, toggleButton, model);

        // Event-Listener
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.visibility.setColor(model, e.target.value);
            });
        }

        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.visibility.setOpacity(model, parseFloat(e.target.value));
            });
        }

        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                const isVisible = model.visible;
                this.visibility.setState(model, isVisible ? 'hidden' : 'visible');
                toggleButton.textContent = isVisible ? 'Anzeigen' : 'Verstecken';
            });
        }

        if (addToSetButton) {
            addToSetButton.addEventListener('click', () => {
                this.addToCollection(model);
            });
        }
    }

    setInitialControlValues(colorInput, opacitySlider, toggleButton, model) {
        let initialColor = '#ffffff';
        let initialOpacity = 1;

        model.traverse(node => {
            if (node.isMesh && node.material) {
                if (node.material.color) {
                    initialColor = '#' + node.material.color.getHexString();
                }
                if (node.material.opacity !== undefined) {
                    initialOpacity = node.material.opacity;
                }
            }
        });

        if (colorInput) colorInput.value = initialColor;
        if (opacitySlider) opacitySlider.value = initialOpacity;
        if (toggleButton) toggleButton.textContent = model.visible ? 'Verstecken' : 'Anzeigen';
    }

    addToCollection(model) {
        const entry = model.userData?.entry;
        if (!entry) {
            console.warn('Modell hat keine Meta-Daten für Sammlung');
            return;
        }

        // Aktuelle Eigenschaften ermitteln
        let currentColor = 0xffffff;
        let currentOpacity = 1;

        model.traverse(node => {
            if (node.isMesh && node.material) {
                if (node.material.color) {
                    currentColor = node.material.color.getHex();
                }
                if (node.material.opacity !== undefined) {
                    currentOpacity = node.material.opacity;
                }
            }
        });

        const collectionItem = {
            model: model,
            meta: entry,
            color: currentColor,
            opacity: currentOpacity,
            visible: model.visible
        };

        const added = this.state.addToCollection(collectionItem);
        if (added) {
            console.log(`✅ "${entry.labels?.en || entry.id}" zur Sammlung hinzugefügt`);
        } else {
            console.log('ℹ️ Modell bereits in der Sammlung');
        }
    }

    hideInfoPanel() {
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

    dispose() {
        debug.log('interaction', '🗑️ InteractionManager wird aufgeräumt');

        this.cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (error) {
                console.warn('Interaction cleanup error:', error);
            }
        });

        this.cleanupFunctions = [];
    }
}

// Zusätzliche Export-Funktion für hideInfoPanel
export function hideInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.classList.add('hidden');
        panel.classList.remove('visible');
    }
}

export { InteractionManager };