// js/modelLoader.js (vollständige Funktion mit Fix)
import * as THREE from './three.module.js';
import { getMeta, getModelPath } from './utils.js';
import { state } from './state.js';

let loadedCount = 0;
let totalModels = 0;

export async function loadModels(entries, groupName, visible, scene, loader) {
  console.log(`loadModels aufgerufen für Gruppe: ${groupName || 'mixed'}, visible: ${visible}, entries: ${entries ? (Array.isArray(entries) ? entries.length + ' Einträge' : '1 Eintrag') : 'undefined oder kein Array'}`);

  // Stelle sicher, dass entries immer ein Array ist (für einzelne Modelle)
  if (!Array.isArray(entries)) entries = [entries];

  // Schutz vor ungültigen entries
  if (visible && (!entries || !Array.isArray(entries) || entries.length === 0)) {
    console.warn(`Keine Modelle für Gruppe ${groupName} verfügbar (entries: ${entries?.length || 0}). Überspringe.`);
    return;
  }

  if (!visible) {
    console.log(`🔍 Ausblenden für ${groupName}: ${state.groups[groupName]?.length || 0} Modelle in Szene`);
  }

  const loadingDiv = document.getElementById('loading');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

if (visible) {
  loadingDiv.style.display = 'block';
  totalModels = entries.length;
  loadedCount = 0;
  updateProgress();

  const promises = entries.map(entry => {
    return new Promise((resolve) => {  // ✅ Fix: Kein reject mehr – immer resolve, um Ports zu schließen
      const currentGroup = groupName || entry.group;
      if (!state.groups[currentGroup]) {
        console.warn(`Gruppe ${currentGroup} existiert nicht in state.groups – Initialisiere.`);
        state.groups[currentGroup] = [];
      }

      const existingModel = state.groups[currentGroup].find(m => state.modelNames.get(m) === entry.label);
      if (existingModel) {
        console.log(`🛑 Modell ${entry.label} bereits geladen in Gruppe ${currentGroup}. Überspringe.`);
        loadedCount++;
        updateProgress();
        resolve();
        return;
      }

      const modelPath = getModelPath(entry.filename, currentGroup);
      fetch(modelPath, { method: 'HEAD' }).then(res => {
        if (!res.ok) {
          console.error(`Datei nicht gefunden: ${modelPath}`);
          loadedCount++;
          updateProgress();
          resolve();  // ✅ Resolve trotz Error
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
                    child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                    child.material.transparent = true;
                    child.material.opacity = 1;
                    child.material.needsUpdate = true;
                  }
                }
              });

              scene.add(model);
              state.groups[currentGroup].push(model);
              state.modelNames.set(model, entry.label);
              loadedCount++;
              updateProgress();
              resolve();
            } catch (e) {
              console.error("❌ Fehler beim Hinzufügen des Modells:", e);
              loadedCount++;
              updateProgress();
              resolve();  // ✅ Resolve trotz Error
            }
          },
          (xhr) => {
            // Fortschritt (optional)
          },
          (error) => {
            console.error(`🚫 Laden-Fehler: ${modelPath}`, error);
            loadedCount++;
            updateProgress();
            resolve();  // ✅ Resolve trotz Error
          }
        );
      }).catch(error => {
        console.error(`Prüf-Fehler: ${modelPath}: ${error}`);
        loadedCount++;
        updateProgress();
        resolve();  // ✅ Resolve trotz Error
      });
    });
  });

  // ✅ Fix: Warte auf alle mit Error-Handling
await Promise.allSettled(promises).then(results => {
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Promise ${index} rejected:`, result.reason);
    }
  });
}).catch(err => {
  console.error('AllSettled Error:', err);
});
  loadingDiv.style.display = 'none';
} else {
  // Ausblenden: Für spezifische Modelle (einzeln oder Liste)
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
}
}

function updateProgress() {
  const progress = totalModels > 0 ? Math.round((loadedCount / totalModels) * 100) : 0;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  progressBar.style.width = `${progress}%`;
  progressText.innerText = `${progress}%`;
}