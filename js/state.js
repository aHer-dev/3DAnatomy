export const state = {
  clickCounts: { bones: 0, muscles: 0, tendons: 0, other: 0 },
  groups: { bones: [], muscles: [], tendons: [], other: [] },
  colors: { bones: 0xffffff, muscles: 0xff0000, tendons: 0xffff00, other: 0x00ff00 },
  modelNames: new Map(),
  groupStates: { bones: {}, muscles: {}, tendons: {}, other: {} }, // Für Subgruppen-Zustände
  subgroupStates: { bones: {}, muscles: {}, tendons: {}, other: {} }, // Für detaillierte Listen
  currentlySelected: null
};
