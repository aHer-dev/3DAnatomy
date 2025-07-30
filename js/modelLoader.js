import * as THREE from './three.module.js';
import { getMeta, getModelPath } from './utils.js';
import { scene, loader } from './init.js';
import { state } from './state.js';

let loadedCount = 0;
let totalModels = 0;

export async function loadModels(entries, groupName, visible, scene, loader) {
  console.log(`loadModels aufgerufen für Gruppe: ${groupName}, visible: ${visible}, entries: ${entries ? (Array.isArray(entries) ? entries.length + ' Einträge' : '1 Eintrag') : 'undefined oder kein Array'}`);

  // Stelle sicher, dass entries immer ein Array ist (für einzelne Modelle)
  if (!Array.isArray(entries)) entries = [entries];

  // Schutz vor ungültigen entries
  if (visible && (!entries || !Array.isArray(entries) || entries.length === 0)) {
    console.warn(`Keine Modelle für Gruppe ${groupName} verfügbar (entries: ${entries?.length || 0}). Überspringe.`);
    return;
  }

  if (!visible) {
    console.log(`🔍 Ausblenden für ${groupName}: ${state.groups[groupName].length} Modelle in Szene`);
  }

  const loadingDiv = document.getElementById('loading');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  if (visible) {
    loadingDiv.style.display = 'block';
    totalModels = entries.length; // Setze totalModels auf die Anzahl der Einträge
    loadedCount = 0; // Reset für jeden Aufruf
    updateProgress(); // Initialer Aufruf, um Balken auf 0% zu setzen

    const promises = entries.map(entry => {
      return new Promise((resolve, reject) => {
        // Vermeide doppeltes Laden: Prüfe, ob das Modell schon in state.groups existiert
        const existingModel = state.groups[groupName].find(m => state.modelNames.get(m) === entry.label);
        if (existingModel) {
          console.log(`🛑 Modell ${entry.label} bereits geladen. Überspringe.`);
          loadedCount++; // Erhöhe bei bereits geladenem Modell
          updateProgress(); // Aktualisiere den Balken
          resolve();
          return;
        }

        const modelPath = getModelPath(entry.filename, groupName);
        fetch(modelPath, { method: 'HEAD' }).then(res => {
          if (!res.ok) {
            console.error(`Datei nicht gefunden: ${modelPath}`);
            loadedCount++; // Erhöhe trotz Fehler
            updateProgress(); // Aktualisiere den Balken
            reject(new Error(`Datei ${modelPath} nicht gefunden`));
            return;
          }
          loader.load(
            modelPath,
            (gltf) => {
              try {
                const model = gltf.scene;
                if (!model) throw new Error("Modell hat kein scene-Objekt");
                model.rotation.x = -Math.PI / 2;
                model.visible = true;
                const safeColor = state.colors[groupName] ?? 0xffffff;
                model.traverse(child => {
                  if (child.isMesh && child.material) {
                    try {
                      if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.color.setHex(safeColor));
                      } else {
                        child.material.color.setHex(safeColor);
                      }
                    } catch (e) {
                      child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                      child.material.transparent = true;
                      child.material.opacity = 1;
                      child.material.needsUpdate = true;
                    }
                  }
                });

                scene.add(model);
                console.log("✅ Modell erfolgreich geladen:", entry.label, modelPath);
                state.groups[groupName].push(model);
                state.modelNames.set(model, entry.label);
                loadedCount++; // Erhöhe bei jedem erfolgreichen Laden
                updateProgress(); // Aktualisiere den Balken
                resolve();
              } catch (e) {
                console.error("❌ Fehler beim Hinzufügen des Modells zur Szene:", entry.label, modelPath, e);
                loadedCount++; // Erhöhe trotz Fehler
                updateProgress(); // Aktualisiere den Balken
                resolve();
              }
            },
            (xhr) => {
              console.log(`Laden von ${entry.label}: ${(xhr.loaded / (xhr.total || 1) * 100).toFixed(2)}%`);
            },
            (error) => {
              console.error(`🚫 Fehler beim Laden: ${modelPath}`, error);
              loadedCount++; // Erhöhe trotz Fehler
              updateProgress(); // Aktualisiere den Balken
              resolve();
            }
          );
        }).catch(error => {
          console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
          loadedCount++; // Erhöhe trotz Fehler
          updateProgress(); // Aktualisiere den Balken
          resolve();
        });
      });
    });

    await Promise.allSettled(promises);
    loadingDiv.style.display = 'none';
  } else {
    // Ausblenden: Für spezifische Modelle (einzeln oder Liste)
    entries.forEach(entry => {
      const model = state.groups[groupName].find(m => state.modelNames.get(m) === entry.label);
      if (model) {
        scene.remove(model);
        state.groups[groupName] = state.groups[groupName].filter(m => m !== model);
        state.modelNames.delete(model);
        console.log(`❎ Modell ${entry.label} ausgeblendet.`);
      } else {
        console.warn(`Modell ${entry.label} nicht gefunden zum Ausblenden.`);
      }
    });
    // Wenn alle Modelle entfernt wurden, leere das Array explizit (optional, aber konsistent)
    if (state.groups[groupName].length === 0) {
      state.groups[groupName] = [];
    }
  }
}

function updateProgress() {
  const progress = totalModels > 0 ? Math.round((loadedCount / totalModels) * 100) : 0;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  progressBar.style.width = `${progress}%`;
  progressText.innerText = `${progress}%`;
}