// js/modelLoader.js
import { getMeta, getModelPath } from './utils.js';
import { scene, loader } from './init.js';
import { groups, modelNames, colors } from './state.js';

export async function loadModels(entries, groupName, visible) {
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
              const model = gltf.scene;
              model.rotation.x = -Math.PI / 2;
              model.visible = true;
              const safeColor = colors[groupName] ?? 0xffffff;
              model.traverse(child => {
                if (child.isMesh) {
                  child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                }
              });
              scene.add(model);
              groups[groupName].push(model);
              modelNames.set(model, entry.label);
              updateProgress(++loadedCount, totalModels, progressBar, progressText);
              resolve();
            },
            undefined,
            (error) => {
              console.error(`Fehler beim Laden: ${error}`);
              updateProgress(++loadedCount, totalModels, progressBar, progressText);
              reject(error);
            }
          );
        }).catch(error => {
          console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
          updateProgress(++loadedCount, totalModels, progressBar, progressText);
          reject(error);
        });
      });
    });

    await Promise.allSettled(promises);
    loadingDiv.style.display = 'none';
  } else {
    groups[groupName] = groups[groupName].filter(model => {
      const label = modelNames.get(model);
      const isMatch = entries.some(entry => entry.label === label);
      if (isMatch) {
        scene.remove(model);
        model.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
        modelNames.delete(model);
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
}