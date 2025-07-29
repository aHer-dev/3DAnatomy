import * as THREE from './three.module.js'; // oder '../three.module.js' je nach Lage

class OrbitControls extends THREE.EventDispatcher {
  constructor(object, domElement) {
    super();
    this.object = object;
    this.domElement = domElement;
    this.target = new THREE.Vector3();
  }

  update() {
    this.object.lookAt(this.target);
  }

  dispose() {}
}

export { OrbitControls };