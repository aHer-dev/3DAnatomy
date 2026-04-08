// ============================================
// FIX 1: state.js - Bereinigter State
// ============================================

// ZENTRALE ACTIONS für alle State-Mutationen
export const StateActions = {
  // Gruppen-Management
  SET_GROUP_LOADED: 'SET_GROUP_LOADED',
  SET_GROUP_VISIBILITY: 'SET_GROUP_VISIBILITY',
  SET_MODEL_VISIBILITY: 'SET_MODEL_VISIBILITY',
  UNLOAD_GROUP: 'UNLOAD_GROUP',

  // Selection
  SET_SELECTION: 'SET_SELECTION',
  CLEAR_SELECTION: 'CLEAR_SELECTION',

  // Pickables
  ADD_PICKABLE: 'ADD_PICKABLE',
  REMOVE_PICKABLE: 'REMOVE_PICKABLE',

  // Reset
  RESET_ALL: 'RESET_ALL',
  RESET_VISIBILITY: 'RESET_VISIBILITY',

  // Colors
  SET_GROUP_COLOR: 'SET_GROUP_COLOR'
};

// ZENTRALER REDUCER - einziger Weg State zu mutieren
export function dispatch(action, payload) {
  switch (action) {
    case StateActions.SET_GROUP_LOADED:
      state.groups[payload.group] = payload.models || [];
      // Automatisch groupVisible synchronisieren
      break;

    case StateActions.SET_GROUP_VISIBILITY:
      state.groupStates[payload.group] = payload.visible;
      // groupVisible ist nur computed, nicht separat gespeichert
      break;

    case StateActions.SET_MODEL_VISIBILITY:
      if (!state.groupStates[payload.group]) {
        state.groupStates[payload.group] = { };
      }
      if (typeof state.groupStates[payload.group] === 'object') {
        state.groupStates[payload.group][payload.model] = payload.visible;
      }
      break;

    case StateActions.SET_SELECTION:
      state.selected = {
        root: payload.root || null,
        mesh: payload.mesh || null,
        point: payload.point || null,
        meta: payload.meta || null
      };
      break;

    case StateActions.CLEAR_SELECTION:
      state.selected = { root: null, mesh: null, point: null, meta: null };
      break;

    case StateActions.ADD_PICKABLE:
      state.pickableMeshes.add(payload.mesh);
      break;

    case StateActions.REMOVE_PICKABLE:
      state.pickableMeshes.delete(payload.mesh);
      break;

    case StateActions.SET_GROUP_COLOR:
      state.colors[payload.group] = payload.color;
      break;

    default:
      console.warn('Unknown action:', action);
  }
}



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
  multiSelected: new Set(),   // Mehrfachauswahl: Set<THREE.Object3D>

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
      eyes: 0xadd8e6,
      glands: 0x800080,
      heart: 0xb22222,
      ligaments: 0xffffff,
      lungs: 0xffc0cb,
      nerves: 0xffff00,
      organs: 0x8b008b,
      skin_hair: 0xffd700,
      veins: 0x00008b
    },
    resetColors: {},
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


  // Konsistente Auswahl-Verwaltung --CLAUDE
  selected: {
    root: null,        // Gesamtes Modell-Root-Objekt
    mesh: null,        // Spezifisches Mesh
    point: null,       // 3D-Punkt des Klicks
    meta: null         // Zugehörige Metadaten
  },

  // DEPRECATED-Alias: nur lesend nutzen – null-sicher
  get currentlySelected() {
    return this.selected?.root ?? null;
  },

  set currentlySelected(val) {
    console.warn('DEPRECATED: use dispatch(SET_SELECTION) instead');
    if (!this.selected) {
      this.selected = { root: null, mesh: null, point: null, meta: null };
    }
    this.selected.root = val ?? null;
  },

  // --- Schutzfunktionen ---
  protection: {
    bones: true,
    teeth: true
  },
  allowProtectedCut: false
};


// Computed Getters für abgeleitete Werte
export const getGroupVisibility = (group) => {
  const models = state.groups[group];
  if (!models?.length) return false;
  return state.groupStates[group] !== false;
};



