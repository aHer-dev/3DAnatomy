export const state = {
  clickCounts: {},
  setStructures: [],
  groups: {},
  modelNames: new Map(),
  groupStates: {},
  subgroupStates: {},
  currentlySelected: null,
  groupedMeta: {},
  collection: [],


  availableGroups: [
    'bones', 'teeth', 'eyes', 'nerves', 'ligaments', 'brain',
    'arteries', 'muscles', 'glands', 'veins', 'organs',
    'lungs', 'heart', 'cartilage', 'skin_hair', 'ear'
  ],

  defaultSettings: {
    modelVariant: 'draco',
    defaultColor: 0xcccccc,
    background: 0x111111, // oder 0x202020 – gut lesbarer Dark-Mode
    transparency: 1,
    lighting: 1,
    loadingScreenColor: '#110facff',

    // ✅ Farben hier zentral definieren
    colors: {
      bones: 0xcccccc, // Grau
      teeth: 0xffffff, // Weiß
      muscles: 0xff0000, // Rot
      tendons: 0xffffff, // Weiß
      arteries: 0xaa0000, // Dunkelrot
      brain: 0xffa500, // Orange
      cartilage: 0xadd8e6, // Hellblau
      ear: 0xf5deb3, // Beige
      eyes: 0x0000ff, // Blau
      glands: 0x800080, // Lila
      heart: 0xb22222, // Feuerrot
      ligaments: 0xffffff, // Weiß
      lungs: 0xffc0cb, // Pink
      nerves: 0xffff00, // Gelb
      organs: 0x8b008b, // Dunkelmagenta
      skin_hair: 0xffd700, // Gold
      veins: 0x00008b // Dunkelblau
    },
    defaultColor: 0xcccccc // Fallback
  },


  // Aktuelle Farben (wird ggf. vom UI verändert)
  colors: {
    bones: 0xcccccc,
    muscles: 0xff0000,
  }
};
