import * as THREE from './three.module.js';
import { state } from './state.js';
import { getModelPath } from './utils.js';

export async function loadModels(entries, groupName, visible, scene, loader) {
  console.log(`loadModels aufgerufen für Gruppe: ${groupName || 'mixed'}, visible: ${visible}, entries: ${entries ? (Array.isArray(entries) ? entries.length + ' Einträge' : '1 Eintrag') : 'undefined oder kein Array'}`);

  const liveSticker = document.getElementById('live-loading-sticker');
  if (visible) {
    liveSticker.style.display = 'block'; // Zeige Sticker nur bei sichtbarem Laden
    liveSticker.style.animation = 'blink 0.5s ease-in-out';
  }

  try {
    // Stelle sicher, dass entries immer ein Array ist
    if (!Array.isArray(entries)) entries = [entries];

    // Schutz vor ungültigen entries
    if (visible && (!entries || entries.length === 0)) {
      console.warn(`Keine Modelle für Gruppe ${groupName} verfügbar (entries: ${entries?.length || 0}). Überspringe.`);
      return;
    }

    if (!visible) {
      console.log(`🔍 Ausblenden für ${groupName}: ${state.groups[groupName]?.length || 0} Modelle in Szene`);
      entries.forEach(entry => {
        const currentGroup = groupName || entry.group;
        const model = state.groups[currentGroup]?.find(m => state.modelNames.get(m) === entry.label);
        if (model) {
          scene.remove(model);
          state.groups[currentGroup] = state.groups[currentGroup].filter(m => m !== model);
          state.modelNames.delete(model);
          console.log(`❎ Modell ${entry.label} ausgeblendet aus Gruppe ${currentGroup}.`);
        } else {
          console.warn(`Modell ${entry.label} nicht gefunden zum Ausblenden in Gruppe ${currentGroup}.`);
        }
      });
      if (state.groups[groupName]?.length === 0) {
        state.groups[groupName] = [];
      }
      return; // Frühzeitig beenden, kein Sticker für Ausblenden
    }

    // Laden von Modellen (visible: true)
    const promises = entries.map(entry => {
      return new Promise((resolve) => {
        const currentGroup = groupName || entry.group;
        if (!state.groups[currentGroup]) {
          console.warn(`Gruppe ${currentGroup} existiert nicht in state.groups – Initialisiere.`);
          state.groups[currentGroup] = [];
        }

        const existingModel = state.groups[currentGroup].find(m => state.modelNames.get(m) === entry.label);
        if (existingModel) {
          console.log(`🛑 Modell ${entry.label} bereits geladen in Gruppe ${currentGroup}. Überspringe.`);
          resolve();
          return;
        }

        const modelPath = getModelPath(entry.filename, currentGroup);
        fetch(modelPath, { method: 'HEAD' }).then(res => {
          if (!res.ok) {
            console.error(`Datei nicht gefunden: ${modelPath}`);
            resolve();
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
                const safeColor = state.colors[currentGroup] ?? 0xffffff;
                model.traverse(child => {
                  if (child.isMesh && child.material) {
                    try {
                      if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.color.setHex(safeColor));
                      } else {
                        child.material.color.setHex(safeColor);
                      }
                    } catch (e) {
                      child.material = new THREE.MeshStandardMaterial({
                        color: safeColor,
                        transparent: true,
                        opacity: 1,
                        side: THREE.DoubleSide
                      });
                      child.material.needsUpdate = true;
                    }
                  }
                });

                scene.add(model);
                state.groups[currentGroup].push(model);
                state.modelNames.set(model, entry.label);
                resolve();
              } catch (e) {
                console.error(`❌ Fehler beim Hinzufügen des Modells ${entry.label}:`, e);
                resolve();
              }
            },
            (xhr) => {
              // Fortschritt optional, hier leer lassen
            },
            (error) => {
              console.error(`🚫 Laden-Fehler: ${modelPath}`, error);
              resolve();
            }
          );
        }).catch(error => {
          console.error(`Prüf-Fehler: ${modelPath}: ${error}`);
          resolve();
        });
      });
    });

    // Warte auf alle Promises
    await Promise.allSettled(promises).then(results => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Promise ${index} rejected:`, result.reason);
        }
      });
    });
  } catch (error) {
    console.error('Fehler beim Laden:', error);
  } finally {
    if (visible) {
      setTimeout(() => {
        liveSticker.style.display = 'none';
        liveSticker.style.animation = ''; // Reset Animation
      }, 600); // Etwas länger als Animation (0.5s)
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