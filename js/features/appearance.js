// ============================================
// appearance.js – Farbe, Transparenz & Materialien zentral steuern
// ============================================

import * as THREE from 'three';
import { setModelVisibility } from '../features/visibility.js';

/**
 * Setzt die Farbe eines Modells (rekursiv)
 * @param {THREE.Object3D} model
 * @param {string | THREE.Color} color – z. B. "#ff0000" oder THREE.Color
 */
export function setModelColor(model, color) {
  if (!model) return;
  const c = (typeof color === 'string') ? new THREE.Color(color) : color;

  model.traverse(child => {
    if (child.isMesh && child.material) {
      // Material-Array handling
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        if (mat && mat.color) {
          mat.color.set(c);
          mat.needsUpdate = true;
        }
      });
    }
  });
}

/**
 * Setzt die Transparenz eines Modells (rekursiv)
 * ACHTUNG: Diese Funktion erstellt NEUE Materialien - use with caution!
 * Für temporäre Transparenz besser setObjectOpacity aus visibility.js verwenden
 * @param {THREE.Object3D} model
 * @param {number} opacity – z. B. 0.5
 */
export function setModelOpacity(model, opacity) {
  if (!model) return;

  model.traverse(child => {
    if (child.isMesh && child.material) {
      // Speichere Original-Material wenn noch nicht geschehen
      if (!child.userData.__originalMaterial) {
        child.userData.__originalMaterial = child.material;
      }

      // Extrahiere aktuelle Farbe
      const currentMat = child.material;
      const currentColor = currentMat.color?.clone() || new THREE.Color(0xffffff);

      // Erstelle neues Material mit gleicher Farbe aber neuer Opacity
      const material = new THREE.MeshStandardMaterial({
        color: currentColor,
        transparent: opacity < 1,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: opacity >= 1,
        metalness: currentMat.metalness || 0,
        roughness: currentMat.roughness || 1
      });

      child.material = material;
      child.material.needsUpdate = true;
    }
  });
}

/**
 * Stellt die Original-Materialien wieder her (nach setModelOpacity)
 * @param {THREE.Object3D} model
 */
export function restoreOriginalMaterials(model) {
  if (!model) return;

  model.traverse(child => {
    if (child.isMesh && child.userData.__originalMaterial) {
      child.material = child.userData.__originalMaterial;
      delete child.userData.__originalMaterial;
    }
  });
}

/**
 * Setzt Farbe für eine ganze Gruppe
 * @param {string} groupName
 * @param {string | THREE.Color} color
 */
export async function setGroupColor(groupName, color) {
  const { state } = await import('../store/state.js');
  const THREE = await import('three');
  const models = state.groups[groupName] || [];
  models.forEach(model => setModelColor(model, color));

  // Speichere Farbe im State für spätere Verwendung
  if (state.colors) {
    state.colors[groupName] = (typeof color === 'string')
      ? new THREE.Color(color).getHex()
      : color.getHex();
  }
}

/**
 * Setzt Transparenz für eine ganze Gruppe
 * @param {string} groupName
 * @param {number} opacity
 */
export async function setGroupOpacity(groupName, opacity) {
  const { state } = await import('../store/state.js');
  const models = state.groups[groupName] || [];
  models.forEach(model => setModelOpacity(model, opacity));
}

/**
 * Wendet die Standard-Farbe aus Meta-Daten an
 * @param {THREE.Object3D} model
 */
export function applyDefaultColor(model) {
  const meta = model?.userData?.meta;
  const defaultColor = meta?.model?.default_color || '#cccccc';
  setModelColor(model, defaultColor);
}

/**
 * Wendet die Highlight-Farbe aus Meta-Daten an
 * @param {THREE.Object3D} model
 */
export function applyHighlightColor(model) {
  const meta = model?.userData?.meta;
  const highlightColor = meta?.model?.highlight_color;
  if (highlightColor) {
    setModelColor(model, highlightColor);
  } else {
    // Fallback: Heller machen
    setModelColor(model, '#ffff00'); // Gelb als Standard-Highlight
  }
}

/**
 * Setzt das Material eines Modells
 * @param {THREE.Object3D} model
 * @param {THREE.Material} material
 */
export function setModelMaterial(model, material) {
  if (!model || !material) return;

  model.traverse(child => {
    if (child.isMesh) {
      // Speichere Original für spätere Wiederherstellung
      if (!child.userData.__originalMaterial) {
        child.userData.__originalMaterial = child.material;
      }
      child.material = material;
      child.material.needsUpdate = true;
    }
  });
}

/**
 * Erstellt ein Standard-Material mit gegebenen Eigenschaften
 * @param {Object} options
 * @returns {THREE.MeshStandardMaterial}
 */
export function createStandardMaterial(options = {}) {
  return new THREE.MeshStandardMaterial({
    color: options.color || 0xcccccc,
    metalness: options.metalness || 0,
    roughness: options.roughness || 0.5,
    transparent: options.transparent || false,
    opacity: options.opacity || 1,
    side: options.side || THREE.FrontSide,
    depthWrite: options.depthWrite !== false
  });
}

/**
 * Toggle zwischen Normal- und Wireframe-Darstellung
 * @param {THREE.Object3D} model
 * @param {boolean} wireframe
 */
export function setModelWireframe(model, wireframe = true) {
  if (!model) return;

  model.traverse(child => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        if (mat) {
          mat.wireframe = wireframe;
          mat.needsUpdate = true;
        }
      });
    }
  });
}

// Re-exportiere setModelVisibility für Convenience
export { setModelVisibility };