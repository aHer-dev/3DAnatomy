export const state = {
  clickCounts: {},               // Zählt Klicks je Gruppe
  setStructures: [],            // Sammlung ausgewählter Modelle
  groups: {},                   // z. B. { ligaments: [model1, model2] }
  colors: {},                   // z. B. { ligaments: 0xB31919 }
  modelNames: new Map(),        // Modell-Referenzierung via Label
  groupStates: {},              // Sichtbarkeit je Gruppe
  subgroupStates: {},           // Sichtbarkeit je Subgruppe
  currentlySelected: null,      // Aktives Objekt
  availableGroups: [],          // Dynamisch befüllt aus meta.json
  defaultSettings: {
    transparency: 1,
    lighting: 1,
    background: 1,
    colors: {},                 // Wird dynamisch ergänzt
    loadingScreenColor: '#200f84ff'
  }
};
