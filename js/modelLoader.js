// js/modelLoader.js
import * as THREE from './three.module.js';
import { getMeta, getModelPath } from './utils.js';
import { scene, loader } from './init.js'; // ✅ korrekt
import { state } from './state.js';

export async function loadModels(entries, groupName, visible, scene, loader) {
  console.log(`loadModels aufgerufen für Gruppe: ${groupName}, visible: ${visible}, entries: ${entries ? entries.length + ' Einträge' : 'undefined oder kein Array'}`);

  // Schutz vor ungültigen entries
  if (visible && (!entries || !Array.isArray(entries))) {
    console.error(`Ungültige entries für Gruppe ${groupName} (visible=true). Überspringe Laden.`);
    return;
  }

  const loadingDiv = document.getElementById('loading');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  if (visible) {
    loadingDiv.style.display = 'block';
    let loadedCount = 0;
    const totalModels = entries.length;

    const promises = entries.map(entry => {
      return new Promise((resolve, reject) => {
        const modelPath = getModelPath(entry.filename, groupName);
        console.log("🧪 Lade Modell:", entry.label, "→", modelPath);
        fetch(modelPath, { method: 'HEAD' }).then(res => {
          if (!res.ok) {
            console.error(`Datei nicht gefunden: ${modelPath}`);
            updateProgress(++loadedCount, totalModels, progressBar, progressText);
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
                    }
                  }
                });
                scene.add(model);
                state.groups[groupName].push(model);
                state.modelNames.set(model, entry.label);
                console.log("✅ Modell geladen:", entry.label);
                updateProgress(++loadedCount, totalModels, progressBar, progressText);
                resolve();
              } catch (e) {
                console.error("❌ Fehler beim Hinzufügen des Modells zur Szene:", entry.label, modelPath, e);
                updateProgress(++loadedCount, totalModels, progressBar, progressText);
                resolve(); // Weitermachen, um andere Modelle zu laden
              }
            },
            undefined,
            (error) => {
              console.error(`🚫 Fehler beim Laden: ${modelPath}`, error);
              updateProgress(++loadedCount, totalModels, progressBar, progressText);
              resolve(); // Weitermachen, um andere Modelle zu laden
            }
          );
        }).catch(error => {
          console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
          updateProgress(++loadedCount, totalModels, progressBar, progressText);
          resolve(); // Weitermachen, um andere Modelle zu laden
        });
      });
    });

    await Promise.allSettled(promises);
    loadingDiv.style.display = 'none';
  } else {
    // Fix für Tippfehler: state.groups und state.modelNames verwenden
    const safeColor = state.colors[groupName] ?? 0xffffff;
    state.groups[groupName] = state.groups[groupName].filter(model => {
      const label = state.modelNames.get(model);
      const isMatch = entries && Array.isArray(entries) ? entries.some(entry => entry.label === label) : false;
      if (isMatch) {
        scene.remove(model);
        model.traverse(child => {
          if (child.isMesh) {
            try {
              if (!child.material || !child.material.isMaterial) {
                child.material = new THREE.MeshStandardMaterial({ color: safeColor });
              } else {
                const cloned = child.material.clone();
                cloned.color.setHex(safeColor);
                child.material = cloned;
              }
            } catch (e) {
              console.warn("⚠️ Material konnte nicht gesetzt werden für", child.name || "unbenanntes Mesh", e);
            }
          }
        });
        state.modelNames.delete(model);
        return false;
      }
      return true;
    });
  }
}

function updateProgress(loaded, total, bar, text) {
  const progress = Math.round((loaded / total) * 100);
  bar.style.width = `${progress}%`;
  text.innerText = `${progress}%`;
};