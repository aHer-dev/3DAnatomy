/**
 * @file ui-set.js
 * @description Ermöglicht dem Nutzer, anatomische Strukturen zu einer persönlichen Sammlung (Set) hinzuzufügen,
 * alle Muskeln auf einmal zu laden und Einträge aus dem Set wieder zu entfernen.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dracoLoader } from '../modelLoader/dracoLoader.js';
import { scene } from '../scene.js';
import { camera } from '../camera.js';
import { renderer } from '../renderer.js';
import { controls } from '../controls.js';
import { state } from '../state.js';
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js';

/**
 * Initialisiert das UI-System zur Verwaltung von Sets (Sammlungen).
 */
export function setupSetUI() {
  console.log('setupSetUI aufgerufen');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  const setupGroupButton = (buttonId, groupName) => {
    const button = document.getElementById(buttonId);
    if (!button) {
      console.warn(`⚠️ Button ${buttonId} nicht gefunden.`);
      return;
    }
    console.log(`Button ${buttonId} gefunden, füge Listener hinzu...`);
    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        const entries = state.groupedMeta[groupName] || [];
        if (entries.length) {
          console.log(`🔍 Lade ${entries.length} Modelle aus Gruppe "${groupName}"...`);
          showLoadingBar();
          await loadModels(entries, groupName, true, scene, loader, camera, controls, renderer);
          hideLoadingBar();
        }
      } catch (err) {
        console.error(`❌ Fehler beim Laden von ${groupName}:`, err);
        hideLoadingBar();
      } finally {
        button.disabled = false;
      }
    });
  };

  // Alle Gruppen aus meta.json
  const groups = ['bones', 'muscles', 'tendons', 'arteries', 'brain', 'cartilage', 'ear', 'eyes', 'glands', 'heart', 'ligaments', 'lungs', 'nerves', 'organs', 'skin_hair', 'teeth', 'veins'];
  groups.forEach(group => setupGroupButton(`btn-load-${group}`, group));

  const addButton = document.getElementById('btn-add-to-set');
  const setList = document.getElementById('set-list');
  if (!addButton || !setList) {
    console.warn('⚠️ Set-UI: btn-add-to-set oder set-list nicht gefunden.');
    return;
  }

  addButton.addEventListener('click', () => {
    const selected = state.currentlySelected;
    if (!selected) {
      alert("Bitte zuerst eine Struktur auswählen.");
      return;
    }
    const label = state.modelNames.get(selected);
    const alreadyInSet = state.setStructures.find(s => s.label === label);
    if (alreadyInSet) {
      alert("Diese Struktur ist bereits in deiner Sammlung.");
      return;
    }
    const meta = selected.userData?.meta;
    if (!meta) {
      alert("Fehler: Struktur enthält keine Metadaten.");
      return;
    }
    state.setStructures.push(meta);
    refreshSetList();
  });

  function refreshSetList() {
    setList.innerHTML = '';
    state.setStructures.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'set-entry';
      item.textContent = entry.label || entry.id;
      item.addEventListener('dblclick', () => {
        state.setStructures.splice(index, 1);
        refreshSetList();
      });
      setList.appendChild(item);
    });
  }

  console.log('📦 Sammlungssystem und Gruppen-Buttons aktiviert.');
}