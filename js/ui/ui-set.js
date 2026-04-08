/**
 * @file ui-set.js - VERBESSERTE UX VERSION
 * @description Sammlung mit dezentestem Feedback (ohne störende Alerts)
 */
import * as THREE from 'three';

import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';
import { hideAllManagedModels, setModelVisibility, showModel, hideModel } from '../features/visibility.js';
import { collectionManager } from './ui-collection-export.js';

import { rebuildRaycastStructures } from '../core/raycaster.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { extractModelData } from '../utils/modelData.js';
import { renderStructureLabel } from '../utils/anatomyLabels.js';

/**
 * 🎯 DEZENTES TOAST-SYSTEM (ersetzt störende Alerts)
 */
function showToast(message, type = 'success', duration = 3000) {
  // Entferne vorherige Toasts
  const existingToast = document.getElementById('collection-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'collection-toast';
  toast.textContent = message;

  const colors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  };

  toast.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

  document.body.appendChild(toast);

  // Slide in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Slide out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, duration);
}

/**
 * 🎯 BUTTON-ANIMATION - Visuelles Feedback ohne Popup
 */
function animateButtonSuccess(button, originalText, successText = '✅ Hinzugefügt!') {
  const originalColor = button.style.backgroundColor;
  const originalTextColor = button.style.color;

  // Erfolgs-Animation
  button.style.backgroundColor = '#4caf50';
  button.style.color = 'white';
  button.textContent = successText;
  button.disabled = true;

  setTimeout(() => {
    button.style.backgroundColor = originalColor;
    button.style.color = originalTextColor;
    button.textContent = originalText;
    button.disabled = false;
  }, 2000);
}


// 2. O(n) findModelById – baut einmalig eine Lookup-Map aus allen geladenen Gruppen
function buildModelIndex() {
  // Map<id-string, THREE.Object3D>
  const index = new Map();
  for (const models of Object.values(state.groups || {})) {
    for (const model of models) {
      const ids = [
        model.userData?.meta?.id,
        model.userData?.meta?.fma,
        model.userData?.entry?.id,
        model.userData?.entry?.fma,
        model.name,
      ];
      for (const id of ids) {
        if (id && !index.has(String(id))) index.set(String(id), model);
      }
    }
  }
  return index;
}

function findModelById(searchId, _preferredGroup = null, index = null) {
  if (!searchId) return null;
  const map = index ?? buildModelIndex();
  return map.get(String(searchId)) ?? null;
}

// 3. ROBUSTE synchronizeCollection Funktion – O(n) statt O(n³)
async function synchronizeCollection() {
  const index = buildModelIndex(); // einmal aufbauen
  let synced = 0, notFound = 0;

  for (const item of state.collection) {
    const valid = item.model?.parent && !item.model.parent.userData?.disposed;
    if (valid) { synced++; continue; }

    const found = findModelById(item.id, item.group, index);
    if (found) { item.model = found; synced++; }
    else notFound++;
  }

  if (notFound > 0) console.warn(`synchronizeCollection: ${notFound} Modelle nicht gefunden`);
}

// 4. VERBESSERTE showCollection Funktion
export async function showCollectionRobust() {

  if (!state.collection || state.collection.length === 0) {
    // 🎯 DEZENTES FEEDBACK statt Alert
    showToast('Die Sammlung ist leer', 'info');
    return;
  }

  // SCHRITT 1: LOADING-OVERLAY ANZEIGEN
  showCollectionLoadingOverlay();

  try {
    // Benötigte Gruppen ermitteln
    const requiredGroups = [...new Set(state.collection.map(item => item.group).filter(Boolean))];
    const currentGroups = Object.keys(state.groups || {}).filter(g =>
      (state.groups[g] || []).length > 0
    );
    const missingGroups = requiredGroups.filter(group => !currentGroups.includes(group));


    // SCHRITT 2: SZENE VERSTECKEN (falls Gruppen geladen werden müssen)
    if (missingGroups.length > 0) {
      hideSceneForLoading();
      updateLoadingProgress(`Lade ${missingGroups.length} Gruppe(n)...`, 0);
    }

    // SCHRITT 3: FEHLENDE GRUPPEN LADEN (versteckt)
    for (let i = 0; i < missingGroups.length; i++) {
      const group = missingGroups[i];
      updateLoadingProgress(`Lade ${group}...`, (i / missingGroups.length) * 80);

      try {
        await loadGroupByName(group, { centerCamera: false });
      } catch (err) {
        console.error(`❌ Fehler beim Laden von "${group}":`, err);
      }
    }

    // SCHRITT 4: SAMMLUNG SYNCHRONISIEREN
    updateLoadingProgress('Bereite Sammlung vor...', 85);
    await synchronizeCollection();

    // SCHRITT 5: SZENE AUFBAUEN (versteckt)
    updateLoadingProgress('Bereite Anzeige vor...', 90);

    // Alle Modelle verstecken
    Object.values(state.groups || {}).forEach(models => {
      (models || []).forEach(model => hideModel(model));
    });

    // Nur Sammlungs-Modelle vorbereiten
    let preparedCount = 0;
    for (const item of state.collection) {
      if (item.model && item.model.parent) {
        // Eigenschaften anwenden
        if (item.color !== undefined) setModelColor(item.model, item.color);
        if (item.opacity !== undefined && item.opacity < 1) setModelOpacity(item.model, item.opacity);
        showModel(item.model);
        preparedCount++;
      }
    }

    // SCHRITT 6: SZENE WIEDER ANZEIGEN
    updateLoadingProgress('Fertig!', 100);
    await new Promise(resolve => setTimeout(resolve, 200)); // Kurze Pause für "Fertig!"

    showSceneAfterLoading();
    state.modes = state.modes || {};
    state.modes.collection = true;
    window.requestRender?.();


    // 🎯 DEZENTES ERFOLGS-FEEDBACK
    showToast(`Sammlung angezeigt: ${preparedCount} Objekte`, 'success');

  } catch (err) {
    console.error('❌ Fehler beim Anzeigen der Sammlung:', err);
    showSceneAfterLoading(); // Szene auch bei Fehler wieder zeigen

    // 🎯 DEZENTES FEHLER-FEEDBACK
    showToast('Fehler beim Anzeigen der Sammlung', 'error');
  } finally {
    hideCollectionLoadingOverlay();
  }
}

// 5. ERWEITERTE setupSetUI (ersetzen Sie die ursprüngliche)
export function setupSetUI() {
  const addBtn = document.getElementById('btn-add-to-set');
  const showBtn = document.getElementById('btn-show-set');
  const clearBtn = document.getElementById('btn-clear-set');

  // Show-Button mit robuster Funktion verbinden
  if (showBtn) {
    // Alle alten Listener entfernen
    const newShowBtn = showBtn.cloneNode(true);
    showBtn.parentNode.replaceChild(newShowBtn, showBtn);

    newShowBtn.addEventListener('click', showCollectionRobust);
  }

  // Add-Button mit gefixter Version + DEZENTES FEEDBACK
  if (addBtn) {
    const originalButtonText = addBtn.textContent;

    addBtn.addEventListener('click', () => {
      const selected = state.selected?.root || state.currentlySelected;
      if (!selected) {
        // 🎯 DEZENTES FEEDBACK statt Alert
        showToast('Bitte wählen Sie zuerst ein Modell aus!', 'warning');
        return;
      }

      setTimeout(() => { collectionManager.setupUI(); }, 100);

      const { id: modelId, name: modelName, group: modelGroup } = extractModelData(selected);

      // PRÜFEN OB BEREITS VORHANDEN
      const exists = state.collection.some(item => item.id === modelId);
      if (exists) {
        // 🎯 DEZENTES FEEDBACK statt Alert
        showToast(`"${modelName}" ist bereits in der Sammlung`, 'warning');

        // Button kurz orange färben
        const originalColor = addBtn.style.backgroundColor;
        addBtn.style.backgroundColor = '#ff9800';
        addBtn.style.color = 'white';
        addBtn.textContent = '⚠️ Bereits vorhanden';

        setTimeout(() => {
          addBtn.style.backgroundColor = originalColor;
          addBtn.style.color = '';
          addBtn.textContent = originalButtonText;
        }, 2000);

        return;
      }

      // SAMMLUNG-ITEM ERSTELLEN
      const collectionItem = {
        // Eindeutige Identifikation
        id: modelId,
        name: modelName,
        group: modelGroup,

        // Vollständige Metadaten (für Nachladen)
        meta: selected.userData?.meta || selected.userData?.entry || {},

        // Aktuelle visuelle Eigenschaften
        color: extractModelColor(selected),
        opacity: extractModelOpacity(selected),
        visible: selected.visible !== false,

        // Modell-Referenz (kann ungültig werden)
        model: selected,

        // Debug-Info
        addedAt: Date.now(),
        originalName: selected.name,
        hasUserData: !!selected.userData,
        hasMeta: !!selected.userData?.meta,
        hasEntry: !!selected.userData?.entry
      };


      // ZUR SAMMLUNG HINZUFÜGEN
      state.collection.push(collectionItem);
      updateSetList();


      // 🎯 DEZENTES VISUELLES FEEDBACK (kein Alert!)
      showToast(`"${modelName}" zur Sammlung hinzugefügt`, 'success');

      // 🎯 BUTTON-ANIMATION
      animateButtonSuccess(addBtn, originalButtonText);

      // Visuelles Feedback am Modell
      highlightModel(selected);
    });
  }

  // Clear-Button (mit dezentem Feedback)
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (state.collection.length === 0) {
        showToast('Die Sammlung ist bereits leer', 'info');
        return;
      }

      // Bestätigung mit dezenter Nachricht
      const confirmed = confirm(`🗑️ Möchten Sie wirklich ${state.collection.length} Objekte aus der Sammlung entfernen?`);

      if (confirmed) {
        const removedCount = state.collection.length;
        state.collection = [];
        updateSetList();

        if (state.modes) state.modes.collection = false;

        Object.values(state.groups || {}).forEach(models => {
          (models || []).forEach(root => setModelVisibility(root, true));
        });

        renderer.render(scene, camera);
        showToast(`Sammlung geleert: ${removedCount} Objekte entfernt`, 'info');
      }
    });
  }

  // Initialisierung beim Laden
  updateSetList();

  document.addEventListener('collectionUpdated', () => {
    updateSetList();
  });
}


// Hilfsfunktionen (falls noch nicht vorhanden)
function extractModelColor(model) {
  if (!model) return null;
  let color = null;
  model.traverse(child => {
    if (child.isMesh && child.material && child.material.color && !color) {
      color = child.material.color.getHex();
    }
  });
  return color;
}

function extractModelOpacity(model) {
  if (!model) return 1;
  let opacity = 1;
  model.traverse(child => {
    if (child.isMesh && child.material) {
      opacity = child.material.opacity || 1;
    }
  });
  return opacity;
}

function highlightModel(model) {
  model.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const originalEmissive = obj.material.emissive?.clone() || new THREE.Color(0x000000);
      obj.material.emissive = new THREE.Color(0x00ff00);
      setTimeout(() => {
        obj.material.emissive = originalEmissive;
        renderer.render(scene, camera);
      }, 500);
    }
  });
  renderer.render(scene, camera);
}

/**
 * Aktualisiert die UI-Liste der Sammlung - VERBESSERT
 */
export function updateSetList() {
  const setList = document.getElementById('set-list');
  if (!setList) return;

  // Inhalt nur innerhalb eines Wrappers ändern, um andere Elemente nicht zu löschen
  let contentWrapper = document.getElementById('set-list-content');
  if (!contentWrapper) {
    // Wrapper erstellen, falls nicht vorhanden
    contentWrapper = document.createElement('div');
    contentWrapper.id = 'set-list-content';
    setList.innerHTML = '';
    setList.appendChild(contentWrapper);
  }

  // Inhalt des Wrappers aktualisieren
  contentWrapper.innerHTML = '<h4 style="margin: 0 0 10px 0;">Meine Sammlung:</h4>';

  if (state.collection.length === 0) {
    contentWrapper.innerHTML += '<p style="color: #999; font-style: italic;">Leer - Klicken Sie Modelle an und fügen Sie sie hinzu</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';
  ul.style.margin = '0';
  ul.style.maxHeight = '300px';
  ul.style.overflowY = 'auto';

  // Sammlung nach Gruppen sortieren für bessere Übersicht
  const groupedItems = groupCollectionByGroup(state.collection);

  Object.entries(groupedItems).forEach(([groupName, items]) => {
    // Gruppen-Header
    const groupHeader = document.createElement('li');
    groupHeader.style.fontWeight = 'bold';
    groupHeader.style.color = '#4CAF50';
    groupHeader.style.marginTop = '8px';
    groupHeader.style.marginBottom = '4px';
    groupHeader.textContent = `${groupName.toUpperCase()} (${items.length})`;
    ul.appendChild(groupHeader);

    // Items in der Gruppe
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.style.cssText = `
        padding: 5px 5px 5px 20px;
        margin-bottom: 3px;
        background-color: rgba(255,255,255,0.1);
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.2s ease;
      `;

      const nameSpan = document.createElement('span');
      renderStructureLabel(nameSpan, item.name || `Objekt ${index + 1}`);
      nameSpan.style.fontSize = '14px';

      // Visuelle Indikatoren für Eigenschaften
      const indicators = document.createElement('span');
      indicators.style.cssText = 'display: flex; gap: 5px; align-items: center;';

      // Farb-Indikator
      if (item.color !== null && item.color !== undefined) {
        const colorDot = document.createElement('span');
        const hexColor = typeof item.color === 'number'
          ? '#' + item.color.toString(16).padStart(6, '0')
          : item.color;
        colorDot.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${hexColor};
          border: 1px solid rgba(255,255,255,0.5);
        `;
        indicators.appendChild(colorDot);
      }

      // Transparenz-Indikator
      if (item.opacity !== undefined && item.opacity < 1) {
        const opacityBadge = document.createElement('span');
        opacityBadge.textContent = `${Math.round(item.opacity * 100)}%`;
        opacityBadge.style.cssText = `
          font-size: 10px;
          padding: 1px 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
          color: rgba(255,255,255,0.8);
        `;
        indicators.appendChild(opacityBadge);
      }

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #ff4444;
        cursor: pointer;
        font-size: 16px;
        padding: 0 5px;
        transition: color 0.2s ease;
      `;
      removeBtn.title = 'Aus Sammlung entfernen';

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemIndex = state.collection.findIndex(ci => ci.id === item.id);
        if (itemIndex !== -1) {
          state.collection.splice(itemIndex, 1);
          updateSetList();
          showToast(`"${item.name}" aus Sammlung entfernt`, 'info', 2000);
        }
      });

      // Hover-Effekte
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = 'rgba(255,255,255,0.2)';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = 'rgba(255,255,255,0.1)';
      });

      li.appendChild(nameSpan);
      li.appendChild(indicators);
      li.appendChild(removeBtn);
      ul.appendChild(li);
    });
  });

  contentWrapper.appendChild(ul);

  // Gesamtanzahl anzeigen
  const count = document.createElement('p');
  count.style.cssText = `
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 12px;
    color: #999;
    text-align: center;
  `;
  count.textContent = `${state.collection.length} Objekt(e) in Sammlung`;
  contentWrapper.appendChild(count);
}

/**
 * Gruppiert die Sammlung nach anatomischen Gruppen für bessere Übersicht
 */
function groupCollectionByGroup(collection) {
  const grouped = {};

  collection.forEach(item => {
    const group = item.group || 'Unbekannt';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(item);
  });

  // Sortiere Gruppen alphabetisch, aber 'bones' und 'teeth' zuerst
  const sortedGroups = {};
  const priority = ['bones', 'teeth'];

  priority.forEach(group => {
    if (grouped[group]) sortedGroups[group] = grouped[group];
  });

  Object.keys(grouped)
    .filter(group => !priority.includes(group))
    .sort()
    .forEach(group => {
      sortedGroups[group] = grouped[group];
    });

  return sortedGroups;
}

/**
 * Legacy-Support für andere Module
 */
export function updateCollectionUI() {
  updateSetList();
}

export function clearCollection() {
  state.collection = [];
  updateCollectionUI();

  if (state.modes) state.modes.collection = false;

  Object.values(state.groups || {}).forEach(models => {
    (models || []).forEach(root => setModelVisibility(root, true));
  });

  renderer.render(scene, camera);
}

export function showCollectionInScene() {
  const showBtn = document.getElementById('btn-show-set');
  if (showBtn) showBtn.click();
}

function showCollectionLoadingOverlay() {
  // Erstelle oder zeige Loading-Overlay
  let overlay = document.getElementById('collection-loading-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'collection-loading-overlay';
    overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>Lade Sammlung</h3>
                <p id="loading-progress-text">Bereite vor...</p>
                <div class="loading-bar">
                    <div id="loading-progress-fill" class="loading-bar-fill"></div>
                </div>
            </div>
        `;

    // CSS-Styles hinzufügen
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

    const style = document.createElement('style');
    style.textContent = `
            .loading-content {
                text-align: center;
                color: white;
                max-width: 300px;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid #333;
                border-top: 3px solid #FF7A4A;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-bar {
                width: 100%;
                height: 8px;
                background: #333;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 15px;
            }
            
            .loading-bar-fill {
                height: 100%;
                background: linear-gradient(180deg, #4A9EFF, #FF7A4A);
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .loading-content h3 {
                margin: 0 0 10px 0;
                font-size: 24px;
            }
            
            .loading-content p {
                margin: 0;
                font-size: 14px;
                opacity: 0.8;
            }
        `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
}

function updateLoadingProgress(text, percent) {
  const textEl = document.getElementById('loading-progress-text');
  const fillEl = document.getElementById('loading-progress-fill');

  if (textEl) textEl.textContent = text;
  if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function hideCollectionLoadingOverlay() {
  const overlay = document.getElementById('collection-loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function hideSceneForLoading() {
  const canvas = renderer.domElement;
  if (canvas) {
    canvas.style.opacity = '0.3';
    canvas.style.pointerEvents = 'none';
  }
}

function showSceneAfterLoading() {
  const canvas = renderer.domElement;
  if (canvas) {
    canvas.style.opacity = '1';
    canvas.style.pointerEvents = 'auto';
  }
  renderer.render(scene, camera);
}
