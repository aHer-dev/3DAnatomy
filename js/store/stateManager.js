// ============================================
// FIXED: StateManager - store/stateManager.js
// ============================================
import { dataPath } from '../core/path.js';
import { debug } from '../core/debug.js';

class StateManager {
  constructor() {
    this.reset();
  }

  reset() {
    this._state = {
      // Meta-Daten
      meta: [],  // WICHTIG: Als Array initialisieren, nicht null
      groupedMeta: Object.create(null),
      metaById: new Map(),
      metaByFile: new Map(),
      metaByEntryUid: new Map(),

      // Modell-Verwaltung
      groups: Object.create(null),
      groupStates: Object.create(null),
      pickableMeshes: new Set(),

      // Auswahl
      selected: null,
      currentlySelected: null,

      // Farben
      colors: Object.create(null),

      // Default-Einstellungen
      defaultSettings: {
        modelVariant: 'draco',
        background: 0x020a1d,  // Schwarzer Hintergrund wie in scene.js
        transparency: 1,
        lighting: 1,
        loadingScreenColor: '#110facff',
        colors: {
          bones: 0xcccccc,
          teeth: 0xffffff,
          muscles: 0xff0000,
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

      // Sammlung
      collection: []
    };

    // Farben aus Default-Settings kopieren
    this._state.colors = { ...this._state.defaultSettings.colors };
  }

  async initialize() {
    debug.log('state', '📂 Lade Meta-Daten...');

    try {
      const url = dataPath('meta.json');
      console.log('🔍 Lade Meta von URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validierung
      if (!Array.isArray(data)) {
        throw new Error('Meta-Daten sind kein Array');
      }

      this._state.meta = data;
      console.log(`✅ ${this._state.meta.length} Meta-Einträge geladen`);

      // WICHTIG: Indices aufbauen
      this.buildIndices();

      debug.log('state', `✅ ${this._state.meta.length} Meta-Einträge geladen und indexiert`);

    } catch (error) {
      console.error('❌ Meta-Laden fehlgeschlagen:', error);
      // Fallback auf leere Daten
      this._state.meta = [];
      this.buildIndices();
      throw new Error(`Meta-Daten konnten nicht geladen werden: ${error.message}`);
    }
  }

  buildIndices() {
    const meta = this._state.meta;

    if (!meta || !meta.length) {
      console.warn('⚠️ Keine Meta-Daten zum Indexieren');
      return;
    }

    // Gruppen-Index aufbauen
    this._state.groupedMeta = {};

    meta.forEach(entry => {
      const group = entry?.classification?.group || 'other';

      if (!this._state.groupedMeta[group]) {
        this._state.groupedMeta[group] = [];
      }
      this._state.groupedMeta[group].push(entry);
    });

    // ID-Index aufbauen
    this._state.metaById.clear();
    this._state.metaByFile.clear();
    this._state.metaByEntryUid.clear();

    const basename = (s) => s ? s.split('/').pop() : '';
    const stripExt = (s) => s ? s.replace(/\.[^/.]+$/, '') : '';

    meta.forEach(entry => {
      // ID-Index
      if (entry?.id) {
        this._state.metaById.set(entry.id, entry);
      }

      // FMA-ID
      const fmaId = entry?.info?.links?.fma;
      if (fmaId && fmaId !== entry.id) {
        this._state.metaById.set(fmaId, entry);
      }

      // Entry-UID
      if (entry?.entry_uid) {
        this._state.metaByEntryUid.set(entry.entry_uid, entry);
      }

      // Filename-Index (neue Schema-Struktur)
      const current = entry?.model?.current || 'draco';
      const variant = entry?.model?.variants?.[current];

      if (variant?.filename) {
        const file = basename(variant.filename);
        const base = stripExt(file);
        this._state.metaByFile.set(file, entry);
        if (base !== file) {
          this._state.metaByFile.set(base, entry);
        }
      }

      // Auch model.asset.file indexieren falls vorhanden
      if (entry?.model?.asset?.file) {
        const file = basename(entry.model.asset.file);
        const base = stripExt(file);
        this._state.metaByFile.set(file, entry);
        if (base !== file) {
          this._state.metaByFile.set(base, entry);
        }
      }
    });

    // Gruppen initialisieren
    const groups = Object.keys(this._state.groupedMeta);

    groups.forEach(group => {
      // Leere Arrays für Modelle
      this._state.groups[group] = this._state.groups[group] || [];

      // Sichtbarkeitszustände
      if (this._state.groupStates[group] === undefined) {
        this._state.groupStates[group] = false;
      }

      // Farben
      if (!this._state.colors[group]) {
        this._state.colors[group] = this._state.defaultSettings.colors[group] ||
          this._state.defaultSettings.defaultColor;
      }
    });

    console.log('📊 Indices erstellt:');
    console.log('  - Gruppen:', groups);
    console.log('  - IDs:', this._state.metaById.size);
    console.log('  - Files:', this._state.metaByFile.size);
    console.log('  - UIDs:', this._state.metaByEntryUid.size);

    debug.log('state', `📊 Indizes erstellt: ${groups.length} Gruppen, ${this._state.metaById.size} IDs`);
  }

  // Sichere Accessor-Methoden
  getMeta() {
    return this._state.meta || [];
  }

  getMetaById(id) {
    if (!id) return null;
    return this._state.metaById.get(id) || null;
  }

  getMetaByFile(filename) {
    if (!filename) return null;

    const basename = (s) => s.split('/').pop();
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    const file = basename(filename);
    const base = stripExt(file);

    return this._state.metaByFile.get(file) ||
      this._state.metaByFile.get(base) ||
      null;
  }

  getMetaByEntryUid(uid) {
    if (!uid) return null;
    return this._state.metaByEntryUid.get(uid) || null;
  }

  getGroupMeta(group) {
    return this._state.groupedMeta[group] || [];
  }

  getAvailableGroups() {
    return Object.keys(this._state.groupedMeta);
  }

  getGroupModels(group) {
    return this._state.groups[group] || [];
  }

  addModelToGroup(model, group) {
    if (!model) return false;

    this._state.groups[group] = this._state.groups[group] || [];

    if (!this._state.groups[group].includes(model)) {
      this._state.groups[group].push(model);
      return true;
    }

    return false;
  }

  removeModelFromGroup(model, group) {
    if (!model || !this._state.groups[group]) return false;

    const index = this._state.groups[group].indexOf(model);
    if (index !== -1) {
      this._state.groups[group].splice(index, 1);
      return true;
    }

    return false;
  }

  setGroupLoaded(group, loaded) {
    this._state.groupStates[group] = loaded;
  }

  isGroupLoaded(group) {
    return Boolean(this._state.groupStates[group]);
  }

  addPickable(mesh) {
    if (!mesh?.isMesh) return false;
    this._state.pickableMeshes.add(mesh);
    return true;
  }

  removePickable(mesh) {
    return this._state.pickableMeshes.delete(mesh);
  }

  getPickables() {
    return Array.from(this._state.pickableMeshes);
  }

  clearPickables() {
    this._state.pickableMeshes.clear();
  }

  setSelected(selection) {
    this._state.selected = selection;
    this._state.currentlySelected = selection?.root || null;
  }

  getSelected() {
    return this._state.selected;
  }

  getCurrentlySelected() {
    return this._state.currentlySelected;
  }

  getColor(group) {
    return this._state.colors[group] || this._state.defaultSettings.defaultColor;
  }

  setColor(group, color) {
    this._state.colors[group] = color;
  }

  getCollection() {
    return [...this._state.collection];
  }

  addToCollection(item) {
    if (!this._state.collection.find(existing => existing.model === item.model)) {
      this._state.collection.push(item);
      return true;
    }
    return false;
  }

  removeFromCollection(model) {
    const index = this._state.collection.findIndex(item => item.model === model);
    if (index !== -1) {
      this._state.collection.splice(index, 1);
      return true;
    }
    return false;
  }

  clearCollection() {
    this._state.collection = [];
  }

  dispose() {
    debug.log('state', '🗑️ StateManager wird aufgeräumt');
    this.reset();
  }
}

// Singleton-Instanz
export const stateManager = new StateManager();

// Für Backward Compatibility - erweiterte Proxy-Objekte
export const state = {
  // Direkte Properties
  get meta() { return stateManager._state.meta; },
  set meta(val) { stateManager._state.meta = val; },

  get groups() { return stateManager._state.groups; },
  set groups(val) { stateManager._state.groups = val; },

  get groupedMeta() { return stateManager._state.groupedMeta; },
  set groupedMeta(val) { stateManager._state.groupedMeta = val; },

  get groupStates() { return stateManager._state.groupStates; },
  set groupStates(val) { stateManager._state.groupStates = val; },

  get pickableMeshes() { return stateManager._state.pickableMeshes; },
  set pickableMeshes(val) { stateManager._state.pickableMeshes = val; },

  get selected() { return stateManager._state.selected; },
  set selected(val) { stateManager.setSelected(val); },

  get currentlySelected() { return stateManager._state.currentlySelected; },
  set currentlySelected(val) { stateManager._state.currentlySelected = val; },

  get collection() { return stateManager._state.collection; },
  set collection(val) { stateManager._state.collection = val; },

  get colors() { return stateManager._state.colors; },
  set colors(val) { stateManager._state.colors = val; },

  get defaultSettings() { return stateManager._state.defaultSettings; },
  set defaultSettings(val) { stateManager._state.defaultSettings = val; },

  get availableGroups() { return stateManager.getAvailableGroups(); },

  // Index-Maps
  get metaById() { return stateManager._state.metaById; },
  get metaByFile() { return stateManager._state.metaByFile; },
  get metaByEntryUid() { return stateManager._state.metaByEntryUid; },

  // Zusätzliche Properties für UI
  get groupVisible() { return stateManager._state.groupStates; },
  set groupVisible(val) { stateManager._state.groupStates = val; },

  get setStructures() { return stateManager._state.collection; },
  set setStructures(val) { stateManager._state.collection = val; },

  get loadingScreenColor() { return stateManager._state.defaultSettings.loadingScreenColor; },
  set loadingScreenColor(val) { stateManager._state.defaultSettings.loadingScreenColor = val; }
};

export { StateManager };