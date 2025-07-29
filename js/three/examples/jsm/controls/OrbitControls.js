import {
  EventDispatcher,
  Vector3
} from '../../../../../../three.module.js';

class OrbitControls extends EventDispatcher {
  constructor(object, domElement) {
    super();
    this.object = object;
    this.domElement = domElement;
    this.target = new Vector3();
  }

  update() {
    this.object.lookAt(this.target);
  }

  dispose() {}
}

export { OrbitControls };
