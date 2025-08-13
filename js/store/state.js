// ============================================
// FIX 1: state.js - Bereinigter State
// ============================================
export const state = {
  // --- Meta & Daten ---
  clickCounts: {},
  setStructures: [],
  availableGroups: [], // Wird von initializeGroupsFromMeta befüllt
  groupedMeta: {},     // { groupName: [metaEntry, ...] }
  groups: {},          // { groupName: [THREE.Object3D, ...] }

  // NEU: Konsistente Lookup-Maps
  metaById: {},        // { id: metaEntry }
  metaByFile: {},      // { filename: metaEntry }
  modelsByName: new Map(), // Map<Object3D, string>

  // Sichtbarkeitszustände
  groupStates: {},     // { groupName: boolean | {modelName: boolean} }
  subgroupStates: {},
  collection: [],
  groupVisible: {}, 
  pickableMeshes: new Set(),  

  // --- Standard-Einstellungen ---
  defaultSettings: {
    modelVariant: 'draco',
    background: 0x000042,
    transparency: 1,
    lighting: 1,
    loadingScreenColor: '#110facff',

    // Zentrale Farbdefinitionen
    colors: {
      bones: 0xcccccc,
      teeth: 0xcccccc,
      muscles: 0xe94343,
      tendons: 0xffffff,
      arteries: 0xaa0000,
      brain: 0xffa500,
      cartilage: 0xadd8e6,
      ear: 0xf5deb3,
      eyes: 0x0000ff,
      glands: 0x800080,
      heart: 0xb22222,
      ligaments: 0xffffff,
      lungs: 0xffc0cb,
      nerves: 0xffff00,
      organs: 0x8b008b,
      skin_hair: 0xffd700,
      veins: 0x00008b
    },
    defaultColor: 0xcccccc
  },


  
  // --- Aktuelle Farben (kopiert von defaultSettings beim Init) ---
  colors: {}, // Wird in initializeGroupsFromMeta befüllt

  // Konsistente Auswahl-Verwaltung
//  selected: {
 //   root: null,        // Gesamtes Modell-Root-Objekt
//    mesh: null,        // Spezifisches Mesh
//   point: null,       // 3D-Punkt des Klicks
//    meta: null         // Zugehörige Metadaten
//  },
// currentlySelected: null, // Alias für selected.root, für Abwärtskompatibilität

  // Konsistente Auswahl-Verwaltung --CLAUDE
  selected: {
    root: null,        // Gesamtes Modell-Root-Objekt
    mesh: null,        // Spezifisches Mesh
    point: null,       // 3D-Punkt des Klicks
    meta: null         // Zugehörige Metadaten
  },
  currentlySelected: null, // Alias für selected.root, für Abwärtskompatibilität

//CLAUDE
  selection: {
    single: null,      // Aktuell ausgewähltes Objekt
    multiple: [],      // Für Mehrfachauswahl
  },


  // --- Schutzfunktionen ---
  protection: {
    bones: true,
    teeth: true
  },
  allowProtectedCut: false


  
};