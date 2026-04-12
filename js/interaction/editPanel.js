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
    const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selectedModel);

    function _updateBtnState() {
        const inCollection = state.collection.some(item => item.id === modelId);
        btn.textContent = inCollection ? 'Aus Sammlung entfernen' : 'Zur Sammlung hinzufügen';
        btn.style.backgroundColor = inCollection ? '#c0392b' : '';
        btn.style.color = inCollection ? 'white' : '';
    }

    _updateBtnState();

    const h = () => {
        const inCollection = state.collection.some(item => item.id === modelId);
        if (inCollection) {
            const idx = state.collection.findIndex(item => item.id === modelId);
            state.collection.splice(idx, 1);
            showFeedbackMessage(container, `"${modelName}" aus der Sammlung entfernt`, 'warning');
            document.dispatchEvent(new CustomEvent('collectionUpdated'));
            renderer.render(scene, camera);
            _updateBtnState();
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
        document.dispatchEvent(new CustomEvent('collectionUpdated'));
        renderer.render(scene, camera);
        _updateBtnState();
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

    if (addToSetButton) {
        const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selectedModel);

        function _updateAddBtnState() {
            const inCollection = state.collection.some(item => item.id === modelId);
            addToSetButton.textContent = inCollection ? 'Aus Sammlung entfernen' : 'Zur Sammlung hinzufügen';
            addToSetButton.style.backgroundColor = inCollection ? '#c0392b' : '';
            addToSetButton.style.color = inCollection ? 'white' : '';
        }

        _updateAddBtnState();

        const addToSetHandler = () => {
            const inCollection = state.collection.some(item => item.id === modelId);
            if (inCollection) {
                const idx = state.collection.findIndex(item => item.id === modelId);
                state.collection.splice(idx, 1);
                showFeedbackMessage(container, `"${modelName}" aus der Sammlung entfernt`, 'warning');
                document.dispatchEvent(new CustomEvent('collectionUpdated'));
                renderer.render(scene, camera);
                _updateAddBtnState();
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
            document.dispatchEvent(new CustomEvent('collectionUpdated'));
            renderer.render(scene, camera);
            _updateAddBtnState();
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
        <button id="multi-edit-add-all"></button>
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

    // Alle zur Sammlung / Alle aus Sammlung entfernen
    function _updateMultiAddBtnState() {
        const allIn = models.every(m => {
            const { id } = extractModelData(m);
            return state.collection.some(item => item.id === id);
        });
        const anyIn = models.some(m => {
            const { id } = extractModelData(m);
            return state.collection.some(item => item.id === id);
        });
        if (allIn) {
            addAllBtn.textContent = 'Alle aus Sammlung entfernen';
            addAllBtn.style.backgroundColor = '#c0392b';
            addAllBtn.style.color = 'white';
        } else if (anyIn) {
            addAllBtn.textContent = 'Restliche zur Sammlung hinzufügen';
            addAllBtn.style.backgroundColor = '';
            addAllBtn.style.color = '';
        } else {
            addAllBtn.textContent = 'Alle zur Sammlung hinzufügen';
            addAllBtn.style.backgroundColor = '';
            addAllBtn.style.color = '';
        }
    }

    _updateMultiAddBtnState();

    addAllBtn.addEventListener('click', () => {
        const allIn = models.every(m => {
            const { id } = extractModelData(m);
            return state.collection.some(item => item.id === id);
        });

        if (allIn) {
            // Alle entfernen
            for (const model of models) {
                const { id } = extractModelData(model);
                const idx = state.collection.findIndex(item => item.id === id);
                if (idx !== -1) state.collection.splice(idx, 1);
            }
            document.dispatchEvent(new CustomEvent('collectionUpdated'));
            showFeedbackMessage(container, `${models.length} Struktur${models.length !== 1 ? 'en' : ''} aus der Sammlung entfernt`, 'warning');
        } else {
            // Fehlende hinzufügen
            let added = 0;
            for (const model of models) {
                const { id: modelId, name: modelName, group: modelGroup } = extractModelData(model);
                if (state.collection.some(item => item.id === modelId)) continue;
                let color = new THREE.Color(0xffffff).getHex();
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
        }

        renderer.render(scene, camera);
        _updateMultiAddBtnState();
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
