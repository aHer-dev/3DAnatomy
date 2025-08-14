// js/interaction/editPanel.js - VERBESSERTE UX VERSION
import * as THREE from 'three';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { toggleModelVisibility, isModelVisible } from '../features/visibility.js';
import { state } from '../store/state.js';

// WeakMap zur Speicherung von Event-Listenern
const listeners = new WeakMap();

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
 * ROBUSTE DATENEXTRAKTION FÜR COLLECTION
 */
function extractModelData(selectedModel) {
    const extractId = (obj) => {
        const candidates = [
            obj.userData?.meta?.id,
            obj.userData?.entry?.id,
            obj.userData?.meta?.fma,
            obj.userData?.entry?.fma,
            obj.name,
            obj.userData?.id
        ];

        for (const candidate of candidates) {
            if (candidate && candidate !== 'undefined' && typeof candidate === 'string') {
                return candidate.toString();
            }
        }

        const baseName = obj.name || 'unknown';
        return `${baseName}_${Date.now()}`;
    };

    const extractName = (obj) => {
        const candidates = [
            obj.userData?.meta?.labels?.en,
            obj.userData?.meta?.labels?.de,
            obj.userData?.entry?.labels?.en,
            obj.userData?.entry?.labels?.de,
            obj.userData?.meta?.label,
            obj.userData?.entry?.label,
            obj.name,
            'Unbekannt'
        ];

        for (const candidate of candidates) {
            if (candidate && candidate !== 'undefined' && typeof candidate === 'string') {
                return candidate;
            }
        }

        return 'Unbekanntes Objekt';
    };

    const extractGroup = (obj) => {
        const candidates = [
            obj.userData?.group,
            obj.userData?.meta?.classification?.group,
            obj.userData?.entry?.classification?.group,
            obj.userData?.meta?.group,
            obj.userData?.entry?.group
        ];

        for (const candidate of candidates) {
            if (candidate && candidate !== 'undefined' && typeof candidate === 'string') {
                return candidate;
            }
        }

        // Fallback: Aus geladenen Gruppen erraten
        for (const [groupName, models] of Object.entries(state.groups || {})) {
            if (models.includes(obj)) {
                return groupName;
            }
        }

        return 'unknown';
    };

    return {
        id: extractId(selectedModel),
        name: extractName(selectedModel),
        group: extractGroup(selectedModel)
    };
}

/**
 * Baut die UI-Controls für das ausgewählte Modell
 * @param {HTMLElement} container 
 * @param {THREE.Object3D} selectedModel 
 */
export function buildEditPanel(container, selectedModel) {
    if (!selectedModel || !container) {
        console.warn('buildEditPanel: Kein Modell oder Container angegeben');
        return;
    }

    // Vorherige Listener bereinigen
    container.querySelectorAll('input, button').forEach(removeElementListeners);

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
            const newColor = new THREE.Color(e.target.value);
            setModelColor(selectedModel, newColor);
            renderer.render(scene, camera);
        };
        colorInput.addEventListener('input', colorHandler);
        listeners.set(colorInput, { input: colorHandler });
    }

    if (opacitySlider) {
        opacitySlider.value = initialOpacity;
        const opacityHandler = (e) => {
            const opacity = parseFloat(e.target.value);
            setModelOpacity(selectedModel, opacity);
            renderer.render(scene, camera);
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
            console.log('🔍 EDITPANEL: Füge zur Sammlung hinzu');

            // ROBUSTE DATENEXTRAKTION
            const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selectedModel);

            console.log('📋 EDITPANEL: Extrahierte Daten:', {
                id: modelId,
                name: modelName,
                group: modelGroup
            });

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

            console.log('💾 EDITPANEL: Speichere Collection-Item:', collectionItem);

            // ZUR SAMMLUNG HINZUFÜGEN
            state.collection.push(collectionItem);

            console.log(`✅ EDITPANEL: "${modelName}" zur Sammlung hinzugefügt!`);

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