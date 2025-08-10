// ============================================
// 2. STATE MANAGER - store/stateManager.js
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
      meta: null,
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
        background: 0x111111,
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
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this._state.meta = await response.json();
      this.buildIndices();

      debug.log('state', `✅ ${this._state.meta.length} Meta-Einträge geladen`);

    } catch (error) {
      throw new Error(`Meta-Daten konnten nicht geladen werden: ${error.message}`);
    }
  }

  buildIndices() {
    const meta = this._state.meta;

    // Gruppen-Index
    this._state.groupedMeta = meta.reduce((acc, entry) => {
      const group = entry?.classification?.group || 'other';
      (acc[group] ||= []).push(entry);
      return acc;
    }, {});

    // ID-Index
    this._state.metaById.clear();
    this._state.metaByFile.clear();
    this._state.metaByEntryUid.clear();

    const basename = (s) => s.split('/').pop();
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    meta.forEach(entry => {
      // ID-Index
      if (entry.id) {
        this._state.metaById.set(entry.id, entry);
      }

      // FMA-ID
      const fmaId = entry?.info?.links?.fma;
      if (fmaId && fmaId !== entry.id) {
        this._state.metaById.set(fmaId, entry);
      }

      // Entry-UID
      if (entry.entry_uid) {
        this._state.metaByEntryUid.set(entry.entry_uid, entry);
      }

      // Filename-Index (neue Schema-Struktur)
      const current = entry?.model?.current || 'draco';
      const variant = entry?.model?.variants?.[current];

      if (variant?.filename) {
        const file = basename(variant.filename);
        const base = stripExt(file);
        this._state.metaByFile.set(file, entry);
        this._state.metaByFile.set(base, entry);
      }
    });

    // Gruppen initialisieren
    Object.keys(this._state.groupedMeta).forEach(group => {
      this._state.groups[group] ||= [];
      this._state.groupStates[group] ||= false;

      if (!this._state.colors[group]) {
        this._state.colors[group] = this._state.defaultSettings.colors[group] ||
          this._state.defaultSettings.defaultColor;
      }
    });

    debug.log('state', `📊 Indizes erstellt: ${this._state.metaById.size} IDs, ${this._state.metaByFile.size} Dateien`);
  }

  // Sichere Accessor-Methoden
  getMeta() {
    return this._state.meta || [];
  }

  getMetaById(id) {
    return this._state.metaById.get(id) || null;
  }

  getMetaByFile(filename) {
    const basename = (s) => s.split('/').pop();
    const stripExt = (s) => s.replace(/\.[^/.]+$/, '');

    const file = basename(filename);
    const base = stripExt(file);

    return this._state.metaByFile.get(file) || this._state.metaByFile.get(base) || null;
  }

  getMetaByEntryUid(uid) {
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

    this._state.groups[group] ||= [];

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

// store/stateManager.js - Am Ende hinzufügen:
export const stateManager = new StateManager();

// Für Backward Compatibility (temporär):
export const state = {
  get groups() { return stateManager._state.groups; },
  get groupedMeta() { return stateManager._state.groupedMeta; },
  get pickableMeshes() { return stateManager._state.pickableMeshes; },
  get selected() { return stateManager._state.selected; },
  set selected(val) { stateManager.setSelected(val); },
  get collection() { return stateManager._state.collection; },
  set collection(val) { stateManager._state.collection = val; },
  get colors() { return stateManager._state.colors; },
  get defaultSettings() { return stateManager._state.defaultSettings; },
  get availableGroups() { return stateManager.getAvailableGroups(); },
  // ... weitere Proxies nach Bedarf
};

export { StateManager };