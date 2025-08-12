/**
 * @file ui-set.js - VERBESSERTE VERSION
 * @description Sammlung mit automatischem Nachladen von entladenen Gruppen
 */
import * as THREE from 'three';

import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';
import { hideAllManagedModels, setModelVisibility, showModel, hideModel } from '../features/visibility.js';

import { rebuildRaycastStructures } from '../core/raycaster.js';
import { loadGroupByName } from '../features/modelLoader-core.js';






function debugCollection() {
  console.log('\n=== COLLECTION DEBUG ===');
  console.log('Collection length:', state.collection.length);

  state.collection.forEach((item, index) => {
    console.log(`Item ${index}:`, {
      id: item.id,
      name: item.name,
      group: item.group,
      hasModel: !!item.model,
      modelInScene: item.model ? !!item.model.parent : false,
      modelName: item.model?.name,
      metaId: item.meta?.id
    });
  });

  console.log('\nGeladene Gruppen:');
  Object.entries(state.groups || {}).forEach(([group, models]) => {
    console.log(`  ${group}: ${models.length} Modelle`);
    models.slice(0, 3).forEach(model => {
      console.log(`    - ${model.name} (ID: ${model.userData?.meta?.id})`);
    });
  });
  console.log('=== END DEBUG ===\n');
}

// 2. VERBESSERTE findModelById Funktion
function findModelById(searchId, preferredGroup = null) {
  console.log(`🔍 Suche Modell mit ID: "${searchId}" (bevorzugte Gruppe: ${preferredGroup})`);

  if (!searchId) {
    console.warn('❌ Keine ID zum Suchen angegeben');
    return null;
  }

  // Alle möglichen ID-Varianten sammeln
  const possibleIds = [
    searchId,
    searchId.toString(),
    searchId.toLowerCase(),
    searchId.replace(/[^a-zA-Z0-9]/g, '') // Ohne Sonderzeichen
  ];

  // Erste bevorzugte Gruppe durchsuchen
  if (preferredGroup && state.groups[preferredGroup]) {
    console.log(`🔎 Durchsuche bevorzugte Gruppe "${preferredGroup}" mit ${state.groups[preferredGroup].length} Modellen`);

    for (const model of state.groups[preferredGroup]) {
      const modelIds = [
        model.userData?.meta?.id,
        model.userData?.meta?.fma,
        model.name,
        model.userData?.entry?.id,
        model.userData?.entry?.fma
      ].filter(id => id); // Nur definierte IDs

      console.log(`  Prüfe Modell "${model.name}" mit IDs:`, modelIds);

      for (const possibleId of possibleIds) {
        for (const modelId of modelIds) {
          if (modelId && modelId.toString() === possibleId.toString()) {
            console.log(`✅ GEFUNDEN in ${preferredGroup}: ${model.name}`);
            return model;
          }
        }
      }
    }
  }

  // Dann alle anderen Gruppen durchsuchen
  console.log(`🔎 Durchsuche alle anderen Gruppen...`);
  for (const [groupName, models] of Object.entries(state.groups || {})) {
    if (groupName === preferredGroup) continue;

    console.log(`  Gruppe "${groupName}": ${models.length} Modelle`);

    for (const model of models || []) {
      const modelIds = [
        model.userData?.meta?.id,
        model.userData?.meta?.fma,
        model.name,
        model.userData?.entry?.id,
        model.userData?.entry?.fma
      ].filter(id => id);

      for (const possibleId of possibleIds) {
        for (const modelId of modelIds) {
          if (modelId && modelId.toString() === possibleId.toString()) {
            console.log(`✅ GEFUNDEN in ${groupName}: ${model.name}`);
            return model;
          }
        }
      }
    }
  }

  console.log(`❌ Modell mit ID "${searchId}" nicht gefunden`);
  return null;
}

// 3. ROBUSTE synchronizeCollection Funktion
async function synchronizeCollection() {
  console.log('\n🔄 SYNCHRONISIERE SAMMLUNG...');
  debugCollection();

  let syncedCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < state.collection.length; i++) {
    const item = state.collection[i];
    console.log(`\n--- Synchronisiere Item ${i}: ${item.name} ---`);

    // Prüfe ob aktuelle Modell-Referenz noch gültig ist
    const currentModelValid = item.model &&
      item.model.parent &&
      !item.model.parent.userData?.disposed;

    if (currentModelValid) {
      console.log(`✅ Modell-Referenz noch gültig für: ${item.name}`);
      syncedCount++;
      continue;
    }

    console.log(`🔄 Suche neue Referenz für: ${item.name} (ID: ${item.id})`);

    // Suche neue Referenz
    const foundModel = findModelById(item.id, item.group);

    if (foundModel) {
      console.log(`✅ Neue Referenz gefunden: ${foundModel.name}`);
      item.model = foundModel;
      syncedCount++;
    } else {
      console.log(`❌ Keine Referenz gefunden für: ${item.name}`);
      notFoundCount++;
    }
  }

  console.log(`\n📊 Synchronisation abgeschlossen:`);
  console.log(`  ✅ Synchronisiert: ${syncedCount}`);
  console.log(`  ❌ Nicht gefunden: ${notFoundCount}`);
  console.log(`  📦 Gesamt: ${state.collection.length}`);
}

// 4. VERBESSERTE showCollection Funktion
async function showCollectionRobust() {
  console.log('\n🎯 ZEIGE SAMMLUNG (PROFESSIONELL)...');

  if (!state.collection || state.collection.length === 0) {
    alert('ℹ️ Die Sammlung ist leer.');
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

    console.log('📋 Benötigte Gruppen:', requiredGroups);
    console.log('📥 Fehlende Gruppen:', missingGroups);

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
        console.log(`✅ Gruppe "${group}" geladen`);
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

    console.log(`✅ ${preparedCount} Objekte aus Sammlung angezeigt`);

  } catch (err) {
    console.error('❌ Fehler beim Anzeigen der Sammlung:', err);
    showSceneAfterLoading(); // Szene auch bei Fehler wieder zeigen
  } finally {
    hideCollectionLoadingOverlay();
  }
}

// 5. DEBUGGING-BUTTON (temporär hinzufügen)
function addDebugButton() {
  const controls = document.getElementById('controls');
  if (!controls) return;

  const debugBtn = document.createElement('button');
  debugBtn.textContent = '🐛 Debug Sammlung';
  debugBtn.style.backgroundColor = '#ff9800';
  debugBtn.style.margin = '5px';

  debugBtn.addEventListener('click', () => {
    debugCollection();
  });

  controls.appendChild(debugBtn);
}

// 6. ERWEITERTE setupSetUI (ersetzen Sie die ursprüngliche)
export function setupSetUI() {
  const addBtn = document.getElementById('btn-add-to-set');
  const showBtn = document.getElementById('btn-show-set');
  const clearBtn = document.getElementById('btn-clear-set');

  // Debug-Button hinzufügen
  addDebugButton();

  // Show-Button mit robuster Funktion verbinden
  if (showBtn) {
    // Alle alten Listener entfernen
    const newShowBtn = showBtn.cloneNode(true);
    showBtn.parentNode.replaceChild(newShowBtn, showBtn);

    newShowBtn.addEventListener('click', showCollectionRobust);
  }

  // Add-Button mit gefixter Version
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const selected = state.selected?.root || state.currentlySelected;
      if (!selected) {
        alert('⚠️ Bitte wählen Sie zuerst ein Modell aus!');
        return;
      }

      console.log('🔍 DEBUGGING: Ausgewähltes Modell:', {
        name: selected.name,
        userData: selected.userData,
        meta: selected.userData?.meta,
        entry: selected.userData?.entry
      });

      // ROBUSTE ID-Extraktion
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
          if (candidate && candidate !== 'undefined') {
            return candidate.toString();
          }
        }

        // Fallback: Generiere ID aus Name + Timestamp
        const baseName = obj.name || 'unknown';
        return `${baseName}_${Date.now()}`;
      };

      // ROBUSTE NAME-EXTRAKTION
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

      // ROBUSTE GRUPPEN-EXTRAKTION
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

        // Fallback: Versuche aus den geladenen Gruppen zu erraten
        for (const [groupName, models] of Object.entries(state.groups || {})) {
          if (models.includes(obj)) {
            return groupName;
          }
        }

        return 'unknown';
      };

      // DATEN EXTRAHIEREN
      const modelId = extractId(selected);
      const modelName = extractName(selected);
      const modelGroup = extractGroup(selected);

      console.log('📋 Extrahierte Daten:', {
        id: modelId,
        name: modelName,
        group: modelGroup
      });

      // PRÜFEN OB BEREITS VORHANDEN
      const exists = state.collection.some(item => item.id === modelId);
      if (exists) {
        alert(`ℹ️ "${modelName}" ist bereits in der Sammlung.`);
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

      console.log('💾 Speichere in Sammlung:', collectionItem);

      // ZUR SAMMLUNG HINZUFÜGEN
      state.collection.push(collectionItem);
      updateSetList();

      console.log('✅ Zur Sammlung hinzugefügt:', modelName);

      // Visuelles Feedback
      highlightModel(selected);

      // Erfolgs-Alert mit Details
      alert(`✅ "${modelName}" zur Sammlung hinzugefügt!\n(Gruppe: ${modelGroup}, ID: ${modelId})`);
    });
  }

  // Clear-Button (wie gehabt)
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (state.collection.length === 0) {
        alert('ℹ️ Die Sammlung ist bereits leer.');
        return;
      }

      if (confirm(`🗑️ Möchten Sie wirklich ${state.collection.length} Objekte aus der Sammlung entfernen?`)) {
        state.collection = [];
        updateSetList();

        if (state.modes) state.modes.collection = false;

        Object.values(state.groups || {}).forEach(models => {
          (models || []).forEach(root => setModelVisibility(root, true));
        });

        renderer.render(scene, camera);
        console.log('🗑️ Sammlung geleert');
      }
    });
  }

  document.addEventListener('collectionUpdated', () => {
    console.log('🔄 Collection wurde von editPanel aktualisiert');
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
function updateSetList() {
  const setList = document.getElementById('set-list');
  if (!setList) return;

  setList.innerHTML = '<h4 style="margin: 0 0 10px 0;">Meine Sammlung:</h4>';

  if (state.collection.length === 0) {
    setList.innerHTML += '<p style="color: #999; font-style: italic;">Leer - Klicken Sie Modelle an und fügen Sie sie hinzu</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';
  ul.style.margin = '0';

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
      li.style.padding = '5px 5px 5px 20px'; // Einrückung für Gruppe
      li.style.marginBottom = '3px';
      li.style.backgroundColor = 'rgba(255,255,255,0.1)';
      li.style.borderRadius = '3px';
      li.style.cursor = 'pointer';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name || `Objekt ${index + 1}`;
      nameSpan.style.fontSize = '14px';

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.style.background = 'transparent';
      removeBtn.style.border = 'none';
      removeBtn.style.color = '#ff4444';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.fontSize = '16px';
      removeBtn.title = 'Aus Sammlung entfernen';

      // Klick zum Entfernen
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemIndex = state.collection.findIndex(ci => ci.id === item.id);
        if (itemIndex !== -1) {
          state.collection.splice(itemIndex, 1);
          updateSetList();
          console.log('📤 Aus Sammlung entfernt:', item.name);
        }
      });

      // Hover-Effekt
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = 'rgba(255,255,255,0.2)';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = 'rgba(255,255,255,0.1)';
      });

      li.appendChild(nameSpan);
      li.appendChild(removeBtn);
      ul.appendChild(li);
    });
  });

  setList.appendChild(ul);

  // Gesamtanzahl anzeigen
  const count = document.createElement('p');
  count.style.marginTop = '10px';
  count.style.fontSize = '12px';
  count.style.color = '#999';
  count.textContent = `${state.collection.length} Objekt(e) in Sammlung`;
  setList.appendChild(count);
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
  console.log('🗑️ Sammlung geleert (Baseline sichtbar).');
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
        border-top: 3px solid #4CAF50;
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
        background: linear-gradient(90deg, #4CAF50, #45a049);
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
