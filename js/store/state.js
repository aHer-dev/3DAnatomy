export const state = {
  // --- Meta & Daten ---
  clickCounts: {},
  setStructures: [],
  availableGroups: [
    'bones', 'teeth', 'eyes', 'nerves', 'ligaments', 'brain',
    'arteries', 'muscles', 'glands', 'veins', 'organs',
    'lungs', 'heart', 'cartilage', 'skin_hair', 'ear'
  ],
  groupedMeta: {},        // { groupName: [metaEntry, ...] }
  groups: {},
  modelNames: new Map(),
  groupStates: {},
  subgroupStates: {},
  collection: [],

  // --- Standard-Einstellungen ---
  defaultSettings: {
    modelVariant: 'draco',
    background: 0x111111, // oder 0x202020 – gut lesbarer Dark-Mode
    transparency: 1,
    lighting: 1,
    loadingScreenColor: '#110facff',

    // ✅ Farben hier zentral definieren
    colors: {
      bones: 0xcccccc,       // Grau
      teeth: 0xffffff,       // Weiß
      muscles: 0xff0000,     // Rot
      tendons: 0xffffff,     // Weiß
      arteries: 0xaa0000,    // Dunkelrot
      brain: 0xffa500,       // Orange
      cartilage: 0xadd8e6,   // Hellblau
      ear: 0xf5deb3,         // Beige
      eyes: 0x0000ff,        // Blau
      glands: 0x800080,      // Lila
      heart: 0xb22222,       // Feuerrot
      ligaments: 0xffffff,   // Weiß
      lungs: 0xffc0cb,       // Pink
      nerves: 0xffff00,      // Gelb
      organs: 0x8b008b,      // Dunkelmagenta
      skin_hair: 0xffd700,   // Gold
      veins: 0x00008b        // Dunkelblau
    },
    defaultColor: 0xcccccc   // Fallback
  },

  // --- Aktuelle Farben (vom UI änderbar) ---
  colors: {
    bones: 0xcccccc,
    muscles: 0xff0000,
  },

  // --- Auswahl & Interaktion ---
  currentlySelected: null,  // aktuell ausgewähltes Root-Objekt (oder null)
  interactionMode: 'select',// 'select' | 'cut' | 'multi'
  selection: [],            // temporäre Mehrfachauswahl (für „Multi“-Modus)

  // --- Schutzfunktionen / Schneidemodus ---
  protection: {
    bones: true,             // geschützte Gruppen sind im Schneidemodus nicht schneidbar
    teeth: true
  },
  allowProtectedCut: false,  // wenn true: Schutz temporär ignorieren

  // --- Sonstiges/UI ---
  // hier kannst du später UI-Presets, LOD/Batch-Settings etc. ablegen
};
