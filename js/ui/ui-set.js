/**
 * @file ui-set.js
 * @description Ermöglicht dem Nutzer, anatomische Strukturen zu einer persönlichen Sammlung (Set) hinzuzufügen,
 * alle Muskeln auf einmal zu laden und Einträge aus dem Set wieder zu entfernen.
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
import { loadGroupByName } from '../features/modelLoader-core.js'; // falls noch nicht importiert



/**
 * Initialisiert das UI-System zur Verwaltung von Sets (Sammlungen).
 */
export function setupSetUI() {
  const addBtn = document.getElementById('btn-add-to-set');
  const showBtn = document.getElementById('btn-show-set');
  const clearBtn = document.getElementById('btn-clear-set');
  const setList = document.getElementById('set-list');

  if (!addBtn || !showBtn || !clearBtn) {
    console.warn('⚠️ Set-UI Buttons nicht gefunden');
    return;
  }

  // Zur Sammlung hinzufügen
  addBtn.addEventListener('click', () => {
    const selected = state.selected?.root || state.currentlySelected;
    if (!selected) {
      alert('⚠️ Bitte wählen Sie zuerst ein Modell aus!');
      return;
    }

    // Prüfen ob bereits in Sammlung
    const exists = state.collection.some(item =>
      item.model === selected || item.id === (selected.userData?.meta?.id || selected.name)
    );

    if (exists) {
      alert('ℹ️ Dieses Modell ist bereits in der Sammlung.');
      return;
    }

    // Vollständige Daten speichern
    const collectionItem = {
      model: selected,
      id: selected.userData?.meta?.id || selected.name,
      name: selected.userData?.meta?.labels?.en || selected.name,
      meta: selected.userData?.meta,
      group: selected.userData?.group || 'unknown',
      visible: selected.visible
    };

    state.collection.push(collectionItem);
    updateSetList();

    // Visuelles Feedback
    console.log('✅ Zur Sammlung hinzugefügt:', collectionItem.name);

    // Kurz highlighten
    selected.traverse(obj => {
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
  });

  // SAMMLUNG ANZEIGEN - MIT SICHERHEITSPRÜFUNG
  showBtn.addEventListener('click', () => {
    // SICHERHEITSPRÜFUNG 1: Ist Sammlung leer?
    if (!state.collection || state.collection.length === 0) {
      alert('ℹ️ Die Sammlung ist leer. Fügen Sie zuerst Modelle hinzu.');
      console.warn('⚠️ Sammlung ist leer - Anzeige abgebrochen');
      return;
    }

    // SICHERHEITSPRÜFUNG 2: Existieren die Modelle noch?
    const validItems = state.collection.filter(item => {
      if (!item.model) return false;
      // Prüfen ob Modell noch in Szene ist
      let found = false;
      scene.traverse(child => {
        if (child === item.model) found = true;
      });
      return found;
    });

    if (validItems.length === 0) {
      alert('⚠️ Die Modelle in der Sammlung sind nicht mehr verfügbar. Bitte laden Sie die entsprechenden Gruppen erneut.');
      console.warn('⚠️ Keine gültigen Modelle in Sammlung gefunden');
      return;
    }

    // Jetzt sicher anzeigen
    console.log(`📦 Zeige ${validItems.length} Modelle aus Sammlung`);

    // Erst alles verstecken
    Object.values(state.groups).flat().forEach(model => {
      if (model && model.visible !== undefined) {
        hideModel(model);
      }
    });

    // NUR gültige Sammlung zeigen
    let shownCount = 0;
    validItems.forEach(item => {
      if (item.model) {
        try {
          showModel(item.model);
          shownCount++;
        } catch (err) {
          console.error('Fehler beim Anzeigen von:', item.name, err);
        }
      }
    });

    renderer.render(scene, camera);
    console.log(`✅ ${shownCount} Modelle aus Sammlung angezeigt`);

    if (shownCount < validItems.length) {
      alert(`ℹ️ ${shownCount} von ${validItems.length} Modellen konnten angezeigt werden.`);
    }
  });

  // Sammlung leeren
  clearBtn.addEventListener('click', () => {
    if (state.collection.length === 0) {
      alert('ℹ️ Die Sammlung geleert.');
      return;
    }

    if (confirm(`🗑️ Möchten Sie wirklich ${state.collection.length} Objekte aus der Sammlung entfernen?`)) {
      state.collection = [];
      updateSetList();
      console.log('🗑️ Sammlung geleert');
    }
  });

  // Set-Liste aktualisieren
  function updateSetList() {
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

    state.collection.forEach((item, index) => {
      const li = document.createElement('li');
      li.style.padding = '5px';
      li.style.marginBottom = '3px';
      li.style.backgroundColor = 'rgba(255,255,255,0.1)';
      li.style.borderRadius = '3px';
      li.style.cursor = 'pointer';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name || `Objekt ${index + 1}`;

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
        state.collection.splice(index, 1);
        updateSetList();
        console.log('📤 Aus Sammlung entfernt:', item.name);
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

    setList.appendChild(ul);

    // Anzahl anzeigen
    const count = document.createElement('p');
    count.style.marginTop = '10px';
    count.style.fontSize = '12px';
    count.style.color = '#999';
    count.textContent = `${state.collection.length} Objekt(e) in Sammlung`;
    setList.appendChild(count);
  }

  // Initial aktualisieren
  updateSetList();
  console.log('✅ Set-UI initialisiert');
}
/**
 * Rendert die Liste der gespeicherten Modelle in der Sammlung (UI)
 */
export function updateCollectionUI() {
  const collectionList = document.getElementById('set-list');
  if (!collectionList) {
    console.error('❌ Collection-List Container (#set-list) nicht gefunden');
    return;
  }

  if (state.collection.length === 0) {
    collectionList.innerHTML = '<p style="color: #888; font-style: italic;">Keine Modelle in der Sammlung.</p>';
    return;
  }

  console.log('✅ Sammlung gerendert:', state.collection.length, 'Modelle');
}
/**
 * Schaltet die Szene um: Zeigt nur Sammlungs-Modelle mit gespeicherten Zuständen
 */
export function showCollectionInScene() {
  console.log('🔄 Szene umschalten auf Sammlung...');

  // Verstecke alle anderen Modelle
  hideAllManagedModels();
  state.modes = state.modes || {};
  state.modes.collection = true;

  // Zeige nur Sammlungs-Modelle
  state.collection.forEach(item => {
    const model = item.model;

    // Wende gespeicherte Eigenschaften an
    if (item.color !== undefined) {
      setModelColor(model, item.color);
    }
    if (item.opacity !== undefined) {
      setModelOpacity(model, item.opacity);
    }

    // Mache sichtbar und klickbar
    setModelVisibility(model, true);

    // Stelle sicher dass Layer gesetzt sind
    model.traverse(obj => {
      if (obj.isMesh || obj.isGroup) {
        obj.layers.enable(0); // Render Layer
        obj.layers.enable(1); // Pick Layer
      }
    });
  });

  renderer.render(scene, camera);
  console.log('✅ Sammlung in Szene angezeigt:', state.collection.length, 'Modelle');
}
// === EVENT LISTENERS ===

// Event-Listener für "Sammlung anzeigen"
const showCollectionBtn = document.querySelector('#btn-show-set');
if (showCollectionBtn) {
  showCollectionBtn.addEventListener('click', () => {
    console.log('🖱️ Sammlung anzeigen geklickt');
    updateCollectionUI();
    showCollectionInScene();
  });
} else {
  console.warn('⚠️ Button (#btn-show-set) nicht gefunden');
}

// Event-Listener für "Sammlung leeren"
const clearCollectionBtn = document.querySelector('#btn-clear-set');
if (clearCollectionBtn) {
  clearCollectionBtn.addEventListener('click', clearCollection);
} else {
  console.warn('⚠️ Button (#btn-clear-set) nicht gefunden');
}
// Event-Listener für "Sammlung exportieren"
const exportBtn = document.querySelector('#btn-export-set');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (state.collection.length === 0) {
      alert('Die Sammlung ist leer.');
      return;
    }

    // Erstelle Export-Daten
    const exportData = {
      version: '1.0',
      date: new Date().toISOString(),
      collection: state.collection.map(item => ({
        id: item.meta?.id,
        labels: item.meta?.labels,
        color: item.color,
        opacity: item.opacity,
        visible: item.visible
      }))
    };

    // Download als JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anatomie-sammlung-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('📥 Sammlung exportiert:', state.collection.length, 'Modelle');
  });
}
// Event-Listener für "Screenshot"
const screenshotBtn = document.querySelector('#btn-screenshot');
if (screenshotBtn) {
  screenshotBtn.addEventListener('click', () => {
    // Rendere einmal für Screenshot
    renderer.render(scene, camera);

    // Canvas zu Bild konvertieren
    const canvas = renderer.domElement;
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anatomie-screenshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });

    console.log('📸 Screenshot erstellt');
  });
}


/**
 * Leert die Sammlung – OHNE die gesamte Szene zu verstecken.
 * Nach dem Leeren wird das Basisskelett (bones + teeth) sichergestellt.
 */
export function clearCollection() {
  state.collection = [];
  updateCollectionUI();

  // ❌ Entfernen: hideAllManagedModels();
  if (state.modes) state.modes.collection = false;

  // ✅ Baseline wieder zeigen (optional, falls zuvor Sammlungsmodus aktiv war)
  Object.values(state.groups || {}).forEach(models => {
    (models || []).forEach(root => setModelVisibility(root, true));
  });

  renderer.render(scene, camera);
  console.log('🗑️ Sammlung geleert (Baseline sichtbar).');
}