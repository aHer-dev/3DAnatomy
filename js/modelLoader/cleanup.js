// cleanup.js
import { scene } from '../scene.js'; // Oder './scene.js' je nach Pfad
import { camera } from '../camera.js';
import { renderer } from '../renderer.js';
import { controls } from '../controls.js'; // Falls benötigt

/**
 * 🔄 Entfernt alle Modelle einer Gruppe oder einer Subgruppe aus der Szene.
 *
 * @param {string} groupName - z. B. "muscles"
 * @param {string|null} subgroupName - z. B. "arm-schulter", oder null für ganze Gruppe
 */
export async function removeModelsByGroupOrSubgroup(groupName, subgroupName = null) {
  const models = state.groups[groupName];
  if (!models) return;

  for (let i = models.length - 1; i >= 0; i--) {
    const model = models[i];
    const meta = model.userData.meta;
    const subgroup = meta?.subgroup || null;

    // ✅ Bedingung: gesamter Group- oder nur passender Subgroup-Eintrag
    if (subgroupName === null || subgroup === subgroupName) {
      // Speicher freigeben (Three.js Best Practice)
      model.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m?.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      // Modell aus Szene & Speicher entfernen
      scene.remove(model);
      models.splice(i, 1);

      // Optional: Gruppenzustand aktualisieren
      if (state.groupStates[groupName]) {
        delete state.groupStates[groupName][model.name];
      }
    }
  }

  console.log(`🧹 Modelle aus Gruppe "${groupName}"${subgroupName ? `, Subgruppe "${subgroupName}"` : ''} entfernt.`);
}

/**
 * ❌ Entfernt ein einzelnes Modell anhand seines Dateinamens.
 *
 * @param {string} filename - z. B. "fj7285_bp2121_fma7234_draco.glb"
 * @param {string} groupName - z. B. "muscles"
 */
export function removeModelByFilename(filename, groupName) {
  const models = state.groups[groupName];
  if (!models) {
    console.warn(`⚠️ Gruppe "${groupName}" nicht in state.groups gefunden.`);
    return;
  }

  // 🔎 Suche nach Modell anhand des .name (Dateiname)
  const index = models.findIndex(m => m.name === filename);
  if (index === -1) {
    console.warn(`⚠️ Modell "${filename}" nicht in Gruppe "${groupName}" gefunden.`);
    return;
  }

  const model = models[index];

  // Speicher korrekt freigeben
  model.traverse(child => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m?.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });

  // Aus Szene und Speicher entfernen
  scene.remove(model);
  models.splice(index, 1);

  // Zustand aktualisieren, falls vorhanden
  if (state.groupStates?.[groupName]) {
    delete state.groupStates[groupName][filename];
  }

  console.log(`🗑️ Modell "${filename}" erfolgreich aus Gruppe "${groupName}" entfernt.`);
}
