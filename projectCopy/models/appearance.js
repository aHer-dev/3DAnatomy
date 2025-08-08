// appearance.js – Farbe, Transparenz & Materialien zentral steuern

import * as THREE from 'three';


/**
 * Setzt die Farbe eines Modells (rekursiv)
 * @param {THREE.Object3D} model
 * @param {string | THREE.Color} color – z. B. "#ff0000" oder THREE.Color
 */
export function setModelColor(model, color) {
  if (!model) return;
  const c = (typeof color === 'string') ? new THREE.Color(color) : color;

  model.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.color.set(c);
      child.material.needsUpdate = true;
    }
  });
}

/**
 * Setzt die Transparenz eines Modells (rekursiv)
 * @param {THREE.Object3D} model
 * @param {number} opacity – z. B. 0.5
 */
export function setModelOpacity(model, opacity) {
  if (!model) return;

  model.traverse(child => {
    if (child.isMesh && child.material) {
      const currentColor = child.material.color?.clone() || new THREE.Color(0xffffff);
      const material = new THREE.MeshStandardMaterial({
        color: currentColor,
        transparent: opacity < 1,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: opacity >= 1
      });

      child.material = material;
      child.material.needsUpdate = true;
    }
  });
}

/**
 * Setzt die Sichtbarkeit eines Modells (oder Mesh-Gruppen)
 * @param {THREE.Object3D} model – Das Modell oder Mesh
 * @param {boolean} visible – Sichtbarkeit true/false
 */
export function setModelVisibility(model, visible) {
  model.traverse(child => {
    if (child.isMesh) {
      child.visible = visible;
    }
  });
}
