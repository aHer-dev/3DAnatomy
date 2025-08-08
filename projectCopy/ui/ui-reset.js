// js/ui/ui-reset.js
// 🔁 Stellt den Ursprungszustand der gesamten Webanwendung wieder her (Kamera, Farben, Sichtbarkeit, UI-Slider, Transparenz etc.)
import * as THREE from 'three';
import { state } from '../state.js';
import { hideAllModels, setModelVisibility, } from '../modelLoader/visibility.js';
import { loadGroup } from '../modelLoader/groups.js';
import { resetGroupColor } from '../modelLoader/color.js';
import { hideInfoPanel } from '../interaction/infoPanel.js';
import { renderer } from '../renderer.js';
import { scene } from '../scene.js';
import { camera } from '../camera.js';
import { controls } from '../controls.js';
import { setCameraToDefault, fitCameraToScene } from '../cameraUtils.js';
import { updateModelColors } from '../modelLoader/color.js';
import { updateGroupVisibility } from '../modelLoader/groups.js';

/**
 * Initialisiert den Reset-Button und definiert, wie der Zustand der App vollständig zurückgesetzt wird.
 */
export function setupResetUI() {
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetApp);
  }

  scene.background = new THREE.Color(bgColor);
  // 📌 Klick-Event für den Reset
  resetBtn.addEventListener('click', () => {
    console.log('🔁 Starte Reset-Vorgang...');

    // 1️⃣ Kamera zurück auf Startposition setzen
    setCameraToDefault(camera, controls);

    // 2️⃣ Farben aller Gruppen auf Standard zurücksetzen und neu anwenden
    state.availableGroups.forEach(group => {
      const defaultColor = state.defaultSettings.colors?.[group] ?? state.defaultSettings.defaultColor ?? 0xcccccc;
      state.colors[group] = defaultColor;                 // State synchron halten
      updateModelColors(group, defaultColor);             // << Farbe MITGEBEN
      const colorInput = document.getElementById(`${group}-color`);
      if (colorInput) colorInput.value = '#' + defaultColor.toString(16).padStart(6, '0');
    });

    // 3️⃣ Sichtbarkeit aller Modelle aktivieren (alle Modelle einblenden)
    state.availableGroups.forEach(group => {
      if (state.groups[group]) {
        state.groups[group].forEach(model => {
          model.visible = true;
          model.traverse(child => {
            if (child.isMesh) child.layers.enable(0);
          });
          model.layers.enable(0);
        });
      }
    });

    state.availableGroups.forEach(group => {
      if (state.groups[group]) {
        state.groups[group].forEach(model => {
          model.visible = true;
          model.layers.enable(0);
          model.traverse(c => {
            if (c.isMesh) {
              c.visible = true;
              c.layers.enable(0);
              if (c.material) { c.material.transparent = false; c.material.opacity = 1; }
            }
          });
        });
      }
    });

    // 4️⃣ Raum-Umgebung: Hintergrundfarbe & Lichtintensität zurücksetzen
    const bgColor = state.defaultSettings.background;
    const lighting = state.defaultSettings.lighting;

    state.background = bgColor;
    state.lighting = lighting;

    scene.background = new THREE.Color(bgColor); // Hintergrund aktualisieren
    if (!scene.userData.light) {
      const amb = new THREE.AmbientLight(0xffffff, lighting ?? 1.0);
      scene.add(amb);
      scene.userData.light = amb;
    } else {
      scene.userData.light.intensity = lighting ?? 1.0;
    }

    // UI-Slider für Hintergrund und Helligkeit zurücksetzen
    const bgInput = document.getElementById('room-color');
    if (bgInput) bgInput.value = bgColor;

    const lightInput = document.getElementById('room-brightness');
    if (lightInput) lightInput.value = lighting;

    // 5️⃣ Transparenz auf Standardwert zurücksetzen
    state.transparency = state.defaultSettings.transparency;

    // 6️⃣ Info-Panel schließen (falls offen)
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.remove('visible');

    // ✅ Abschlussmeldung
    console.log('✅ App-Zustand erfolgreich zurückgesetzt.');
  });
}

export async function resetApp() {
  console.log('🔄 Reset gestartet...');

  hideAllModels(); // Alles weg

  const startGroups = ['bones', 'teeth'];
  for (const group of startGroups) {
    try {
      await loadGroup(group, null, false); // false = Kamera nicht jedes Mal fitten
      if (state.groups[group]) {
        state.groups[group].forEach(model => {
          model.visible = true;
          model.layers.enable(0);
        });
        resetGroupColor(group);
      }
    } catch (err) {
      console.error(`❌ Fehler beim Laden von "${group}":`, err);
    }
  }

  // Kamera jetzt fitten, wenn Modelle da sind
  await fitCameraToScene(camera, controls, renderer, scene);

  hideInfoPanel();
  renderer.render(scene, camera);

  console.log('✅ Reset abgeschlossen');

  // 🔎 Notfall-Diagnose & Force-Visible
  // -> Direkt nach resetApp() am Ende einfügen und einmal ausführen.
  // -> Danach Konsole beobachten und mir die Logs schicken.

  
  function debugForceShowAndFrame(scene, camera, renderer) {
    // 1) Ambient-Light sicherstellen (lichtunabhängig ist unten trotzdem MeshBasicMaterial)
    if (!scene.userData.light) {
      const amb = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(amb);
      scene.userData.light = amb;
      console.log('[DBG] AmbientLight hinzugefügt.');
    } else {
      scene.userData.light.intensity = 1.0;
      console.log('[DBG] AmbientLight vorhanden, Intensität gesetzt.');
    }

    // 2) Alles sichtbar + Layer 0 + Material auf Basic
    let meshCount = 0;
    scene.traverse(obj => {
      obj.visible = true;
      obj.layers.enable(0);
      if (obj.isMesh) {
        meshCount++;
        // Material auf lichtunabhängig, volle Deckkraft
        obj.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: false,
          transparent: false
        });
        obj.layers.enable(0);
        obj.visible = true;
      }
    });
    console.log(`[DBG] Sichtbarkeit/Layers gesetzt. Meshes: ${meshCount}`);

    // 3) Bounding Box über gesamte Szene
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    console.log('[DBG] BBox size:', size, 'center:', center);

    // 4) Kamera auf BBox frame’n (vereinfachter Fit für Perspektivkamera)
    const maxSize = Math.max(size.x, size.y, size.z) || 1.0;
    const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const dir = new THREE.Vector3(0, 0, 1); // Blickrichtung Z
    const newPos = center.clone().add(dir.multiplyScalar(distance * 1.5)); // etwas Abstand dazu
    camera.position.copy(newPos);
    camera.near = Math.max(0.01, distance / 1000);
    camera.far = distance * 10 + maxSize;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    console.log('[DBG] Kamera gesetzt. pos:', camera.position, 'near/far:', camera.near, camera.far);

    // 5) Raycast/Kamera Layer synchronisieren (0)
    camera.layers.enable(0);
    if (scene.userData.raycaster) {
      scene.userData.raycaster.layers.set(0);
      console.log('[DBG] Raycaster auf Layer 0 gesetzt (scene.userData.raycaster).');
    } else {
      console.warn('[DBG] Kein scene.userData.raycaster gefunden. Falls du einen globalen Raycaster nutzt, hier ebenfalls .layers.set(0) setzen.');
    }

    // 6) Hintergrund sicher hell-dunkel (nicht schwarz)
    if (scene.background === null) {
      scene.background = new THREE.Color(0x111111);
    }

    // 7) Optional: Achsenhilfe, um sofort etwas zu sehen
    if (!scene.userData.axes) {
      const axes = new THREE.AxesHelper(maxSize * 0.5);
      axes.layers.enable(0);
      scene.add(axes);
      scene.userData.axes = axes;
      console.log('[DBG] AxesHelper hinzugefügt.');
    }

    // 8) Einmal rendern
    renderer.render(scene, camera);

    // 9) Temporärer Klick-Test direkt auf dem Canvas (zeigt, ob Events ankommen)
    const canvas = renderer.domElement;
    const _dbgClick = (e) => {
      console.log('[DBG] Canvas-Klick angekommen.', { x: e.clientX, y: e.clientY });
    };
    canvas.addEventListener('click', _dbgClick, { once: true });
    console.log('[DBG] Temporärer Canvas-Klick-Listener registriert (once).');
  }

  // Aufrufbeispiel am Ende von resetApp():
  // debugForceShowAndFrame(scene, camera, renderer);
}

// Event-Listener für Reset-Button
const resetButton = document.getElementById('btn-reset');
if (resetButton) {
  resetButton.addEventListener('click', resetApp);
} else {
  console.warn('⚠️ Reset-Button (#btn-reset) nicht gefunden');
}