import * as THREE from 'three';
import { getConfig } from '../config/config.js';

const _box  = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

/**
 * Fokussiert Kamera auf ein Objekt und erlaubt 360°-Rotation darum.
 * Gibt { center, radius } zurück für Richtungspresets.
 */
export function focusOnObject(camera, controls, object, paddingFactor = 1.8) {
    if (!object) return null;

    _box.setFromObject(object);
    if (_box.isEmpty()) return null;

    _box.getCenter(_center);
    _box.getSize(_size);
    const radius = Math.max(_size.x, _size.y, _size.z) * paddingFactor;

    // camera.up zurücksetzen (könnte durch Kranial/Kaudal-Ansicht verändert sein)
    camera.up.set(0, 1, 0);

    // Aktuelle Kamerarichtung beibehalten, nur Abstand und Ziel anpassen
    const dir = camera.position.clone().sub(controls.target).normalize();
    const newPos = _center.clone().add(dir.multiplyScalar(radius));

    animateCameraTo(camera, controls, newPos, _center.clone(), 600);
    return { center: _center.clone(), radius };
}

/**
 * Kamera aus einer anatomischen Richtung auf einen Punkt ausrichten.
 * dir: 'anterior'|'posterior'|'cranial'|'caudal'|'left'|'right'
 */
export function setCameraDirection(camera, controls, center, radius, dir) {
    // Kranial/Kaudal: camera.up muss angepasst werden (sonst Gimbal-Lock in OrbitControls)
    const upVectors = {
        cranial:   new THREE.Vector3(0, 0, -1),  // Blick nach unten → "oben" ist anterior
        caudal:    new THREE.Vector3(0, 0,  1),  // Blick nach oben  → "oben" ist posterior
        anterior:  new THREE.Vector3(0, 1,  0),
        posterior: new THREE.Vector3(0, 1,  0),
        left:      new THREE.Vector3(0, 1,  0),
        right:     new THREE.Vector3(0, 1,  0),
    };

    const offsets = {
        anterior:  new THREE.Vector3( 0,  0,  1),
        posterior: new THREE.Vector3( 0,  0, -1),
        cranial:   new THREE.Vector3( 0,  1,  0),
        caudal:    new THREE.Vector3( 0, -1,  0),
        right:     new THREE.Vector3( 1,  0,  0),
        left:      new THREE.Vector3(-1,  0,  0),
    };

    const offset = offsets[dir];
    if (!offset) return;

    // camera.up vor der Animation setzen
    camera.up.copy(upVectors[dir] || new THREE.Vector3(0, 1, 0));
    controls.update();

    const newPos = center.clone().add(offset.clone().multiplyScalar(radius));
    animateCameraTo(camera, controls, newPos, center.clone(), 500);
}
/**
 * Utility zur Erkennung mobiler Endgeräte (Viewport-basiert).
 */
export function isMobile() {
  return window.innerWidth < 768;
}

/**
 * Setzt Kamera und Controls auf eine definierte Standardposition.
 */
export function setCameraToDefault(camera, controls) {
  // 1) Werte aus der Config lesen (Fallbacks = deine bisherigen Hartwerte)
  const posArr = getConfig('ui.cameraDefaults.position', [-0.5, 0.9, 0.8]); // [x,y,z]
  const tgtArr = getConfig('ui.cameraDefaults.target', [0.0, 1.0, 0.0]); // [x,y,z]

  // 2) In THREE-Vektoren umwandeln
  const defaultPosition = new THREE.Vector3(posArr[0], posArr[1], posArr[2]);
  const defaultTarget = new THREE.Vector3(tgtArr[0], tgtArr[1], tgtArr[2]);

  // 3) Kamera und Controls setzen
  camera.position.copy(defaultPosition);  // Kamera auf Preset-Position
  controls.target.copy(defaultTarget);    // OrbitControls-Fokuspunkt setzen
  controls.update();                      // Controls intern aktualisieren
  camera.lookAt(defaultTarget);           // Blickrichtung explizit setzen
}

/**
 * Zentriert die Kamera auf sichtbare Modelle und wählt eine passende Zoom-Distanz.
 * Berücksichtigt mobile Geräte durch größeren Abstand.
 */
export function fitCameraToScene(camera, controls, renderer, scene, paddingFactor = 1.2) {
  const boundingBox = new THREE.Box3();
  const tempBox = new THREE.Box3();
  const visibleMeshes = [];

  scene.traverse(obj => {
    if (obj.isMesh && obj.visible) {
      visibleMeshes.push(obj);
    }
  });

  if (visibleMeshes.length === 0) {
    console.warn('[fitCameraToScene] Keine sichtbaren Modelle. Setze auf Default.');
    setCameraToDefault(camera, controls);
    return;
  }

  // BoundingBox berechnen
  visibleMeshes.forEach(mesh => {
    tempBox.setFromObject(mesh);
    boundingBox.union(tempBox);
  });

  // Debug: BoundingBox anzeigen
  const debugMode = false;
  if (debugMode) {
    const helper = new THREE.Box3Helper(boundingBox, 0xff0000);
    scene.add(helper);
  }

  if (boundingBox.isEmpty()) {
    console.warn('[fitCameraToScene] BoundingBox leer. Setze auf Default.');
    setCameraToDefault(camera, controls);
    return;
  }

  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const baseDistance = maxDim * paddingFactor;
  const adjustedDistance = isMobile() ? baseDistance * 1.2 : baseDistance * 0.9; // UX: Mehr Raum auf Mobile

  const offset = new THREE.Vector3(0, maxDim * 0.2, adjustedDistance); // Von vorne (Z+)
  const newPosition = center.clone().add(offset);

  camera.position.copy(newPosition);
  controls.target.copy(center);
  controls.update();
  camera.lookAt(center);

  //console.log('[fitCameraToScene] Kamera angepasst:', newPosition.toArray());
}

/**
 * Animiert Kamera und Steuerziel sanft zu einer neuen Position.
 * OrbitControls wird während der Animation pausiert um Konflikte zu vermeiden.
 */
export function animateCameraTo(camera, controls, newPosition, newTarget, duration = 600) {
  controls.enabled = false;

  const startPos    = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos      = newPosition.clone();
  const endTarget   = newTarget.clone();
  const startTime   = performance.now();

  // Ease in-out
  function ease(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

  function animateFrame(time) {
    const t = Math.min((time - startTime) / duration, 1);
    const e = ease(t);

    camera.position.lerpVectors(startPos, endPos, e);
    controls.target.lerpVectors(startTarget, endTarget, e);
    camera.lookAt(controls.target);
    if (typeof window !== 'undefined') window.requestRender?.(4);

    if (t < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      controls.enabled = true;
      controls.update();
      if (typeof window !== 'undefined') window.requestRender?.(8);
    }
  }

  requestAnimationFrame(animateFrame);
}
