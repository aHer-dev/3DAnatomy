export const state = {
  clickCounts: {},
  setStructures: [],
  groups: {},
  modelNames: new Map(),
  groupStates: {},
  subgroupStates: {},
  currentlySelected: null,
  availableGroups: [],
  groupedMeta: {}, // Erforderlich für O(1)-Filterung
  defaultSettings: {
    modelVariant: 'draco',
    defaultColor: 0xcccccc,
    transparency: 1,
    lighting: 1,
    background: 1,
    loadingScreenColor: '#200f84ff'
  },
  colors: {
    bones: 0xcccccc,
    muscles: 0xff0000,
  }
};