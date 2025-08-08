import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

   const dracoLoader = new DRACOLoader();
   dracoLoader.setDecoderPath('/draco/'); // Lokaler Pfad zu deinem Ordner
   dracoLoader.setDecoderConfig({ type: 'js' }); // JavaScript-Decoder
   dracoLoader.preload(); // Lädt Decoder im Voraus

   export { dracoLoader };