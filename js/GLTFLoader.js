import * as THREE from './three.module.js';

class GLTFLoader {
  constructor(manager) {
    this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
    this.loader = new THREE.FileLoader(this.manager);
    this.loader.setResponseType('arraybuffer');
  }

  load(url, onLoad, onProgress, onError) {
    this.loader.load(
      url,
      (data) => {
        // Placeholder: simulate a GLTF object
        onLoad({ scene: new THREE.Group(), data: data });
      },
      onProgress,
      onError
    );
  }
}

export { GLTFLoader };
