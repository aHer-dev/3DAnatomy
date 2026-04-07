// js/interaction/editPanel.js - VERBESSERTE UX VERSION
import * as THREE from 'three';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { toggleModelVisibility, isModelVisible, hideModel } from '../features/visibility.js';
import { state } from '../store/state.js';
import { clearMultiSelect } from './multiSelect.js';
import { extractModelData } from '../utils/modelData.js';
import { attachRecentColors } from '../ui/recentColors.js';
import { enterIsolatedView } from './isolationView.js';

// WeakMap zur Speicherung von Event-Listenern
const listeners = new WeakMap();

// RAF-Debounce: max. 1 render pro Frame bei Input-Events
let _rafId = null;
function _scheduleRender() {
    if (_rafId !== null) return;
    _rafId = requestAnimationFrame(() => {
        _rafId = null;
        renderer.render(scene, camera);
    });
}

/**
 * Entfernt alle vorhandenen Event-Listener für ein Element
 * @param {HTMLElement} element 
 */
function removeElementListeners(element) {
    const handler = listeners.get(element);
    if (handler) {
        element.removeEventListener('input', handler.input);
        element.removeEventListener('click', handler.click);
        listeners.delete(element);
    }
}

/**
 * 🎯 DEZENTES FEEDBACK - Zeigt Status unter dem Button
 */
function showFeedbackMessage(container, message, type = 'success') {
    // Entferne vorherige Nachrichten
    const existing = container.querySelector('.feedback-message');
    if (existing) existing.remove();

    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.textContent = message;

    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };

    feedback.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        background: ${colors[type] || colors.success};
        color: white;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        opacity: 0;
        transition: opacity 0.3s ease;
        text-align: center;
    `;

    container.appendChild(feedback);

    // Fade in
    setTimeout(() => feedback.style.opacity = '1', 10);

    // Fade out nach 3 Sekunden
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) feedback.remove();
        }, 300);
    }, 3000);
}

/**
 * 🎯 BUTTON-ANIMATION - Kurz grün färben bei Erfolg
 */
function animateButtonSuccess(button, originalText) {
    const originalColor = button.style.backgroundColor;
    const originalTextColor = button.style.color;

    // Erfolgs-Animation
    button.style.backgroundColor = '#4caf50';
    button.style.color = 'white';
    button.textContent = '✅ Hinzugefügt!';
    button.disabled = true;

    setTimeout(() => {
        button.style.backgroundColor = originalColor;
        button.style.color = originalTextColor;
        button.textContent = originalText;
        button.disabled = false;
    }, 2000);
}


/**
 * Baut die UI-Controls für das ausgewählte Modell
 * @param {HTMLElement} container 
 * @param {THREE.Object3D} selectedModel 
 */
function _cleanupContainer(container) {
    container.querySelectorAll('input, button').forEach(removeElementListeners);
}

function _isMuscleOrCartilage(model) {
    if (!model) return false;
    return (state.groups['muscles']?.includes(model) || state.groups['cartilage']?.includes(model)) ?? false;
}

function _buildMuscleButtons(container, model) {
    _cleanupContainer(container);
    container.innerHTML = `
        <label>Farbe:
          <input type="color" id="edit-color" />
        </label>
        <label>Transparenz:
          <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1" />
        </label>
        <div class="edit-btn-row">
          <button id="edit-hide-btn" class="edit-btn-half">Verstecken</button>
          <button id="edit-isolate-btn" class="edit-btn-half">Einzelansicht</button>
        </div>
        <button id="edit-add-to-set" class="edit-btn-full">Zur Sammlung hinzufügen</button>
    `;
    _wireMusclePanelListeners(container, model);
}

function _wireMusclePanelListeners(container, selectedModel) {
    const colorInput   = container.querySelector('#edit-color');
    const opacitySlider = container.querySelector('#edit-opacity');
    const hideBtn      = container.querySelector('#edit-hide-btn');
    const isolateBtn   = container.querySelector('#edit-isolate-btn');
    const addToSetBtn  = container.querySelector('#edit-add-to-set');

    // Initialwerte
    let initialColor = '#ffffff';
    let initialOpacity = 1;
    selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
            initialColor = '#' + child.material.color.getHexString();
            initialOpacity = child.material.opacity ?? 1;
        }
    });

    if (colorInput) {
        colorInput.value = initialColor;
        const h = (e) => { setModelColor(selectedModel, new THREE.Color(e.target.value)); _scheduleRender(); };
        colorInput.addEventListener('input', h);
        listeners.set(colorInput, { input: h });
        attachRecentColors(colorInput, (hex) => {
            setModelColor(selectedModel, new THREE.Color(hex));
            _scheduleRender();
        });
    }
    if (opacitySlider) {
        opacitySlider.value = initialOpacity;
        const h = (e) => { setModelOpacity(selectedModel, parseFloat(e.target.value)); _scheduleRender(); };
        opacitySlider.addEventListener('input', h);
        listeners.set(opacitySlider, { input: h });
    }
    if (hideBtn) {
        hideBtn.textContent = isModelVisible(selectedModel) ? 'Verstecken' : 'Anzeigen';
        const h = () => {
            toggleModelVisibility(selectedModel);
            hideBtn.textContent = isModelVisible(selectedModel) ? 'Verstecken' : 'Anzeigen';
            renderer.render(scene, camera);
        };
        hideBtn.addEventListener('click', h);
        listeners.set(hideBtn, { click: h });
    }
    if (isolateBtn) {
        const h = () => enterIsolatedView(selectedModel);
        isolateBtn.addEventListener('click', h);
        listeners.set(isolateBtn, { click: h });
    }
    if (addToSetBtn) {
        _wireAddToSet(addToSetBtn, container, selectedModel);
    }
}

function _wireAddToSet(btn, container, selectedModel) {
    const originalText = btn.textContent;
    const h = () => {
        const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selectedModel);
        if (state.collection.some(item => item.id === modelId)) {
            showFeedbackMessage(container, `"${modelName}" ist bereits in der Sammlung`, 'warning');
            btn.style.backgroundColor = '#ff9800';
            btn.textContent = '⚠️ Bereits vorhanden';
            setTimeout(() => { btn.style.backgroundColor = ''; btn.textContent = originalText; }, 2000);
            return;
        }
        let currentColor = new THREE.Color(0xffffff).getHex();
        let currentOpacity = 1;
        selectedModel.traverse(child => {
            if (child.isMesh && child.material) {
                if (child.material.color) currentColor = child.material.color.getHex();
                currentOpacity = child.material.opacity ?? 1;
            }
        });
        state.collection.push({
            id: modelId, name: modelName, group: modelGroup,
            meta: selectedModel.userData?.meta || selectedModel.userData?.entry || {},
            color: currentColor, opacity: currentOpacity,
            visible: selectedModel.visible !== false,
            model: selectedModel, addedAt: Date.now(), source: 'editPanel'
        });
        showFeedbackMessage(container, `"${modelName}" zur Sammlung hinzugefügt`, 'success');
        animateButtonSuccess(btn, originalText);
        document.dispatchEvent(new CustomEvent('collectionUpdated'));
        renderer.render(scene, camera);
    };
    btn.addEventListener('click', h);
    listeners.set(btn, { click: h });
}

// ─── Standard buildEditPanel ─────────────────────────────────────────────────

export function buildEditPanel(container, selectedModel) {
    if (!selectedModel || !container) {
        console.warn('buildEditPanel: Kein Modell oder Container angegeben');
        return;
    }

    container.querySelectorAll('input, button').forEach(removeElementListeners);

    if (_isMuscleOrCartilage(selectedModel)) {
        _buildMuscleButtons(container, selectedModel);
        return;
    }

    container.innerHTML = `
    <label>Farbe:
      <input type="color" id="edit-color" />
    </label>
    <label>Transparenz:
      <input type="range" id="edit-opacity" min="0" max="1" step="0.01" value="1" />
    </label>
    <button id="edit-toggle-visible">Verstecken/Anzeigen</button>
    <button id="edit-add-to-set" style="margin-bottom: 5px;">Zur Sammlung hinzufügen</button>
  `;

    const colorInput = container.querySelector('#edit-color');
    const opacitySlider = container.querySelector('#edit-opacity');
    const toggleButton = container.querySelector('#edit-toggle-visible');
    const addToSetButton = container.querySelector('#edit-add-to-set');

    // Initialwerte spiegeln
    let initialColor = '#ffffff';
    let initialOpacity = 1;
    let initialVisible = isModelVisible(selectedModel);

    selectedModel.traverse(child => {
        if (child.isMesh && child.material) {
            initialColor = '#' + child.material.color.getHexString();
            initialOpacity = child.material.opacity ?? 1;
        }
    });

    if (colorInput) {
        colorInput.value = initialColor;
        const colorHandler = (e) => {
            setModelColor(selectedModel, new THREE.Color(e.target.value));
            _scheduleRender();
        };
        colorInput.addEventListener('input', colorHandler);
        listeners.set(colorInput, { input: colorHandler });
        attachRecentColors(colorInput, (hex) => {
            setModelColor(selectedModel, new THREE.Color(hex));
            _scheduleRender();
        });
    }

    if (opacitySlider) {
        opacitySlider.value = initialOpacity;
        const opacityHandler = (e) => {
            setModelOpacity(selectedModel, parseFloat(e.target.value));
            _scheduleRender();
        };
        opacitySlider.addEventListener('input', opacityHandler);
        listeners.set(opacitySlider, { input: opacityHandler });
    }

    if (toggleButton) {
        toggleButton.textContent = initialVisible ? 'Verstecken' : 'Anzeigen';
        const toggleHandler = () => {
            toggleModelVisibility(selectedModel);
            const nowVisible = isModelVisible(selectedModel);
            toggleButton.textContent = nowVisible ? 'Verstecken' : 'Anzeigen';
            renderer.render(scene, camera);
        };
        toggleButton.addEventListener('click', toggleHandler);
        listeners.set(toggleButton, { click: toggleHandler });
    }

    // 🎯 VERBESSERTE "ZUM SET HINZUFÜGEN" LOGIK - DEZENTES FEEDBACK
    if (addToSetButton) {
        const originalButtonText = addToSetButton.textContent;

        const addToSetHandler = () => {

            // ROBUSTE DATENEXTRAKTION
            const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selectedModel);

            // PRÜFEN OB BEREITS VORHANDEN
            const exists = state.collection.some(item => item.id === modelId);
            if (exists) {
                console.warn(`ℹ️ "${modelName}" ist bereits in der Sammlung.`);

                // 🎯 DEZENTES FEEDBACK FÜR BEREITS VORHANDEN
                showFeedbackMessage(container, `"${modelName}" ist bereits in der Sammlung`, 'warning');

                // Button kurz orange färben
                const originalColor = addToSetButton.style.backgroundColor;
                addToSetButton.style.backgroundColor = '#ff9800';
                addToSetButton.style.color = 'white';
                addToSetButton.textContent = '⚠️ Bereits vorhanden';

                setTimeout(() => {
                    addToSetButton.style.backgroundColor = originalColor;
                    addToSetButton.style.color = '';
                    addToSetButton.textContent = originalButtonText;
                }, 2000);

                return;
            }

            // AKTUELLE EIGENSCHAFTEN EXTRAHIEREN
            let currentColor = new THREE.Color(0xffffff);
            let currentOpacity = 1;
            const currentVisible = selectedModel.visible !== false;

            selectedModel.traverse(child => {
                if (child.isMesh && child.material) {
                    if (child.material.color) {
                        currentColor = child.material.color.getHex();
                    }
                    currentOpacity = child.material.opacity ?? 1;
                }
            });

            // COLLECTION-ITEM ERSTELLEN
            const collectionItem = {
                // Eindeutige Identifikation
                id: modelId,
                name: modelName,
                group: modelGroup,

                // Vollständige Metadaten
                meta: selectedModel.userData?.meta || selectedModel.userData?.entry || {},

                // Aktuelle visuelle Eigenschaften
                color: currentColor,
                opacity: currentOpacity,
                visible: currentVisible,

                // Modell-Referenz
                model: selectedModel,

                // Debug-Info
                addedAt: Date.now(),
                source: 'editPanel'
            };


            // ZUR SAMMLUNG HINZUFÜGEN
            state.collection.push(collectionItem);


            // 🎯 DEZENTES FEEDBACK - Kein Alert!
            showFeedbackMessage(
                container,
                `"${modelName}" zur Sammlung hinzugefügt`,
                'success'
            );

            // 🎯 BUTTON-ANIMATION
            animateButtonSuccess(addToSetButton, originalButtonText);

            // UI AKTUALISIEREN - Event senden für ui-set.js
            const event = new CustomEvent('collectionUpdated');
            document.dispatchEvent(event);

            // 🎯 OPTIONAL: Leichtes Highlight für das Modell
            selectedModel.traverse(child => {
                if (child.isMesh && child.material) {
                    const originalEmissive = child.material.emissive?.clone() || new THREE.Color(0x000000);
                    child.material.emissive = new THREE.Color(0x00ff00);

                    setTimeout(() => {
                        child.material.emissive = originalEmissive;
                        renderer.render(scene, camera);
                    }, 1000);
                }
            });

            renderer.render(scene, camera);
        };

        addToSetButton.addEventListener('click', addToSetHandler);
        listeners.set(addToSetButton, { click: addToSetHandler });
    }

    renderer.render(scene, camera);
}

/**
 * Bereinigt alle Event-Listener im Edit-Panel
 * @param {HTMLElement} container 
 */
export function cleanupEditPanel(container) {
    if (!container) return;

    container.querySelectorAll('input, button').forEach(removeElementListeners);
    container.innerHTML = '';
}

/**
 * Batch-Controls für Mehrfachauswahl
 * @param {HTMLElement} container
 * @param {THREE.Object3D[]} models  – alle selektierten Roots
 * @param {() => void} onUpdate      – Panel nach Änderung neu aufbauen
 */
export function buildMultiEditPanel(container, models, onUpdate) {
    if (!container || !models?.length) return;

    container.querySelectorAll('input, button').forEach(removeElementListeners);

    container.innerHTML = `
        <label class="multi-edit-row">Farbe:
            <input type="color" id="multi-edit-color" value="#ffffff" />
        </label>
        <label class="multi-edit-row">Transparenz:
            <input type="range" id="multi-edit-opacity" min="0" max="1" step="0.01" value="1" />
        </label>
        <button id="multi-edit-add-all">Alle zur Sammlung hinzufügen</button>
        <button id="multi-edit-hide-all">Alle verstecken</button>
        <button id="multi-edit-clear">Auswahl aufheben</button>
    `;

    const colorInput   = container.querySelector('#multi-edit-color');
    const opacitySlider = container.querySelector('#multi-edit-opacity');
    const addAllBtn    = container.querySelector('#multi-edit-add-all');
    const hideAllBtn   = container.querySelector('#multi-edit-hide-all');
    const clearBtn     = container.querySelector('#multi-edit-clear');

    // Startwert: Farbe des ersten Modells übernehmen
    models[0]?.traverse(child => {
        if (child.isMesh && child.material?.color) {
            colorInput.value = '#' + child.material.color.getHexString();
        }
    });

    // Farbe auf alle anwenden
    colorInput.addEventListener('input', (e) => {
        const col = new THREE.Color(e.target.value);
        models.forEach(m => setModelColor(m, col));
        _scheduleRender();
    });
    attachRecentColors(colorInput, (hex) => {
        const col = new THREE.Color(hex);
        models.forEach(m => setModelColor(m, col));
        _scheduleRender();
    });

    // Transparenz auf alle anwenden
    opacitySlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        models.forEach(m => setModelOpacity(m, v));
        _scheduleRender();
    });

    // Alle zur Sammlung
    addAllBtn.addEventListener('click', () => {
        let added = 0;
        for (const model of models) {
            const { id: modelId, name: modelName, group: modelGroup } = extractModelData(model);
            if (state.collection.some(item => item.id === modelId)) continue;

            let color = new THREE.Color(0xffffff);
            let opacity = 1;
            model.traverse(child => {
                if (child.isMesh && child.material) {
                    if (child.material.color) color = child.material.color.getHex();
                    opacity = child.material.opacity ?? 1;
                }
            });

            state.collection.push({
                id: modelId, name: modelName, group: modelGroup,
                meta: model.userData?.meta || model.userData?.entry || {},
                color, opacity, visible: model.visible !== false,
                model, addedAt: Date.now(), source: 'multiSelect'
            });
            added++;
        }
        document.dispatchEvent(new CustomEvent('collectionUpdated'));
        showFeedbackMessage(container, `${added} Struktur${added !== 1 ? 'en' : ''} zur Sammlung hinzugefügt`, added > 0 ? 'success' : 'warning');
        renderer.render(scene, camera);
    });

    // Alle verstecken
    hideAllBtn.addEventListener('click', () => {
        models.forEach(m => hideModel(m));
        clearMultiSelect();
        import('./infoPanel.js').then(({ hideInfoPanel }) => hideInfoPanel()).catch(() => {});
        renderer.render(scene, camera);
    });

    // Auswahl aufheben
    clearBtn.addEventListener('click', () => {
        clearMultiSelect();
        import('./infoPanel.js').then(({ hideInfoPanel }) => hideInfoPanel()).catch(() => {});
    });

    renderer.render(scene, camera);
}
