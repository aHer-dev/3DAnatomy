export const state = {
  clickCounts: {},
  setStructures: [],
  groups: {},
  modelNames: new Map(),
  groupStates: {},
  subgroupStates: {},
  currentlySelected: null,
  availableGroups: [],
  groupedMeta: {},

  defaultSettings: {
    modelVariant: 'draco',
    defaultColor: 0xcccccc,
    transparency: 1,
    lighting: 1,
    background: 1,
    loadingScreenColor: '#200f84ff',

    // ✅ Farben hier zentral definieren
    colors: {
      bones: 0xcccccc,
      teeth: 0xffffff,
      muscles: 0xff0000,
      ligaments: 0x00ff00,
      arteries: 0xff6666,
      veins: 0x6666ff,
      nerves: 0xffff00,
      brain: 0xf2c2f2,
      organs: 0xf5b183,
      skin_hair: 0xf9dcc4,
      eyes: 0xeeeeff,
      glands: 0xffeedd,
      cartilage: 0xbbbbaa,
      heart: 0xff8888,
      lungs: 0xaaffff,
      ear: 0xffddaa,
    }
  },

  // Aktuelle Farben (wird ggf. vom UI verändert)
  colors: {
    bones: 0xcccccc,
    muscles: 0xff0000,
  }
};
