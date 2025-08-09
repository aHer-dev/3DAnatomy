// js/interaction/raycastOnClick.js
// js/interaction/raycastOnClick.js
// ✅ Ergänzungen oben:
import * as THREE from 'three';
import { raycaster, getPointerNDC } from '../core/raycaster.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { state } from '../store/state.js';
// Falls dein Info-Panel exportiert wird:
import { showInfoPanel } from './infoPanel.js'; // passt ggf. an, wenn der Export anders heißt



// 🔶 Ein einfacher, performanter Highlight-Rahmen (BoxHelper)
let currentHighlight = null;

/** Entfernt den aktuellen Highlight-Rahmen (falls vorhanden) */
function clearHighlight() {
    if (!currentHighlight) return;
    scene.remove(currentHighlight);
    // Cleanup
    currentHighlight.geometry?.dispose?.();
    // material vom BoxHelper wird vom GC übernommen; bei Bedarf: currentHighlight.material.dispose()
    currentHighlight = null;
}

/** Setzt einen neuen Highlight-Rahmen um das Root-Objekt */
function highlightRoot(root) {
    clearHighlight();
    // BoxHelper zeichnet einen gelben Draht-Rahmen um das Objekt
    currentHighlight = new THREE.BoxHelper(root, 0xffff00);
    // Optional: leicht dicker zeichnen (Line width wird nicht überall unterstützt)
    scene.add(currentHighlight);
}

// ✅ dein Click-Handler (nur Kern anpassen, falls vorhanden)
function onClick(e) {
    console.log('🖱️ Klick erkannt');

    // NDC relativ zur Canvas berechnen
    const ndc = getPointerNDC(e, renderer.domElement);
    raycaster.setFromCamera(ndc, camera);

    // Nur Layer 1 wird getestet (ist im Raycaster gesetzt)
    const hit = raycaster.intersectObjects(scene.children, true)[0]?.object;
    if (!hit) return;

    // Root-Objekt (GLTF-Root) bestimmen
    let root = hit;
    while (root.parent && root.parent !== scene) root = root.parent;

    const key = root.name;
    console.log('🔍 Getroffenes Objekt:', key);

    // ➜ Meta: zuerst direkt am Root (K1), sonst Index-Fallback
    const meta =
        root.userData?.meta ||
        state.metaById?.[key] ||
        state.metaByFile?.[key] ||
        state.metaByFile?.[`${key}.glb`] ||
        null;

    if (!meta) {
        console.warn('⚠️ Kein zugehöriges Modell mit Metadaten gefunden.');
        return;
    }

    // Auswahl & Highlight setzen
    state.currentlySelected = root;
    highlightRoot(root);

    // Info-Panel öffnen (falls export vorhanden)
    if (typeof showInfoPanel === 'function') {
        showInfoPanel(meta, root);
    } else {
        console.log('ℹ️ Meta gefunden:', meta);
    }
}

// Listener registrieren (falls nicht schon vorhanden)
export function setupInteractions() {
    renderer.domElement.addEventListener('pointerdown', onClick, { passive: true });
}

// Optional: Exporte für spätere Nutzung (z. B. beim Reset)
export { clearHighlight, highlightRoot };


/**
 * Setzt Raycasting bei Klick auf das 3D-Modell auf.
 * Führt Callback aus mit { meta, model, intersects, event }
 */
export function setupRaycastOnClick(domElement, callback) {
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(0);
    const mouse = new THREE.Vector2();

    function onClick(event) {
        console.log("🖱️ Klick erkannt");
        event.preventDefault();
        event.stopPropagation();

        const bounds = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            console.log('🔍 Getroffenes Objekt:', object.name || object.type);

            // Elternkette nach userData.meta durchsuchen
            while (object && !object.userData?.meta) {
                object = object.parent;
            }

            if (object && object.userData?.meta) {
                const meta = object.userData.meta;
                console.log('✅ Callback wird aufgerufen mit:', meta.labels?.en || meta.id);
                callback({ meta, model: object, intersects, event });
            } else {
                console.warn('⚠️ Kein zugehöriges Modell mit Metadaten gefunden.');
            }
        } else {
            console.log('🔍 Keine Objekte getroffen.');
        }
    }

    domElement.addEventListener('pointerdown', onClick);
}

