// ============================================
// appearance.js – Farbe, Transparenz & Materialien zentral steuern
// ============================================

import * as THREE from 'three';
import { setModelVisibility } from '../features/visibility.js';
import { state } from '../store/state.js';


const fallback = {
  exposure: 0.95,
  envIntensity: 0.85,
  groups: {
    bones: { color: 0xE8E6DD, roughness: 0.85, metalness: 0.0 },
    teeth: { color: 0xFFFFFF, roughness: 0.60, metalness: 0.0 },
    default: { roughness: 0.75, metalness: 0.0 }
  }
};

const SHADOW_CASTING_GROUPS = new Set(['bones', 'teeth']);
const SHADOW_RECEIVER_GROUPS = new Set(['bones', 'teeth', 'cartilage']);

export function getShadowFlagsForGroup(groupName = 'default') {
  const key = typeof groupName === 'string' ? groupName.toLowerCase() : 'default';
  return {
    castShadow: SHADOW_CASTING_GROUPS.has(key),
    receiveShadow: SHADOW_RECEIVER_GROUPS.has(key)
  };
}



/**
 * Setzt die Farbe eines Modells (rekursiv)
 * @param {THREE.Object3D} model
 * @param {string | THREE.Color} color – z. B. "#ff0000" oder THREE.Color
 */
export function setModelColor(model, color) {
  if (!model) return;

  // Color normalisieren
  let threeColor;
  if (typeof color === 'string') {
    threeColor = new THREE.Color(color);
  } else if (typeof color === 'number') {
    threeColor = new THREE.Color(color);
  } else if (color instanceof THREE.Color) {
    threeColor = color.clone();
  } else {
    console.warn('Ungültiger Farbwert:', color);
    return;
  }

  model.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;

    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

    materials.forEach(mat => {
      if (!mat || !('color' in mat)) return;

      // Klon nur wenn Farbe tatsächlich anders ist
      if (mat.color.equals(threeColor)) return;

      const clonedMat = mat.clone();
      clonedMat.color = threeColor.clone();
      if ('envMapIntensity' in clonedMat) clonedMat.envMapIntensity = 0.3;

      materials[materials.indexOf(mat)] = clonedMat;
    });

    obj.material = Array.isArray(obj.material) ? materials : materials[0];
  });
}



export const appearance = {
  exposure: 0.95,      // 0.85–1.05
  envIntensity: 0.85,  // 0.6–1.0
  groups: {
    bones: { color: 0xE8E6DD, roughness: 0.85, metalness: 0.0 },
    teeth: { color: 0xFFFFFF, roughness: 0.6, metalness: 0.0 },
    default: { roughness: 0.75, metalness: 0.0 }
  }
};


export const defaultAppearance = {
  exposure: 0.95,
  envIntensity: 0.85,
  groups: {
    bones: { color: 0xE8E6DD, roughness: 0.85, metalness: 0.0 },
    teeth: { color: 0xFFFFFF, roughness: 0.60, metalness: 0.0 },
    default: { roughness: 0.75, metalness: 0.0 }
  }
};


function cfg() {
  return state?.defaultSettings?.appearance ?? fallback;
}

export function applyEnvIntensity(scene, cfg = defaultAppearance) {
  const v = cfg.envIntensity;
  if (typeof v !== 'number') return;
  scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m && 'envMapIntensity' in m) { m.envMapIntensity = v; m.needsUpdate = true; }
  });
}

export function applyRendererAppearance(renderer, cfg = defaultAppearance) {
  if (typeof cfg.exposure === 'number') renderer.toneMappingExposure = cfg.exposure;
}

// Gruppenweise Material-Defaults (für Modelle ohne Texturen sehr wichtig)
export function applyGroupMaterialTweaks(groupName, c = cfg()) {
  const rules = (c.groups && (c.groups[groupName] || c.groups.default)) || {};
  const roots = state.groups?.[groupName] || [];
  const { castShadow, receiveShadow } = getShadowFlagsForGroup(groupName);
  for (const root of roots) {
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;

      if (rules.color != null && m.color) m.color.setHex(rules.color);
      if ('roughness' in m && typeof rules.roughness === 'number') m.roughness = rules.roughness;
      if ('metalness' in m && typeof rules.metalness === 'number') m.metalness = rules.metalness;

      // Farbkarten sRGB
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;

      // Schatten gezielt statt pauschal aktivieren
      o.castShadow = castShadow;
      o.receiveShadow = receiveShadow;
    });
  }
}




/**
 * Setzt die Transparenz eines Modells (rekursiv)
 * ACHTUNG: Diese Funktion erstellt NEUE Materialien - use with caution!
 * Für temporäre Transparenz besser setObjectOpacity aus visibility.js verwenden
 * @param {THREE.Object3D} model
 * @param {number} opacity – z. B. 0.5
 */
export function setModelOpacity(model, opacity = 1) {
  if (!model) return;

  const targetOpacity = opacity < 1 ? opacity : 1;

  model.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;

    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

    materials.forEach(mat => {
      if (!mat) return;

      // Klon nur wenn sich Opacity oder transparent-Flag tatsächlich ändern
      const needsChange = Math.abs((mat.opacity ?? 1) - targetOpacity) > 0.001
          || mat.transparent !== (targetOpacity < 1);
      if (!needsChange) return;

      const clonedMat = mat.clone();
      if (targetOpacity < 1) {
        clonedMat.transparent = true;
        clonedMat.opacity = targetOpacity;
        clonedMat.depthWrite = false;
        clonedMat.side = THREE.DoubleSide;
      } else {
        clonedMat.transparent = false;
        clonedMat.opacity = 1;
        clonedMat.depthWrite = true;
        clonedMat.side = THREE.FrontSide;
      }

      materials[materials.indexOf(mat)] = clonedMat;
    });

    obj.material = Array.isArray(obj.material) ? materials : materials[0];
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
