export const state = {
  clickCounts: { bones: 0, muscles: 0, tendons: 0, other: 0 }, // Kann bleiben, wird aber nicht mehr für Laden verwendet
  groups: { bones: [], muscles: [], tendons: [], other: [] },
  colors: { bones: 0xffffff, muscles: 0xff0000, tendons: 0xffff00, other: 0x00ff00 },
  modelNames: new Map(),
  groupStates: { bones: {}, muscles: {}, tendons: {}, other: {} },
  subgroupStates: { bones: {}, muscles: {}, tendons: {}, other: {} },
  currentlySelected: null,
  defaultSettings: { // Neu: Für Reset
    transparency: 1,
    lighting: 1,
    background: 1,
    colors: { bones: 0xffffff, muscles: 0xff0000, tendons: 0xffff00, other: 0x00ff00 }
  }
};