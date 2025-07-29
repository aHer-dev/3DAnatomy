// js/state.js
export let clickCounts = { bones: 0, muscles: 0, tendons: 0, other: 0 };
export let groups = { bones: [], muscles: [], tendons: [], other: [] };
export let colors = { bones: 0xffffff, muscles: 0xff0000, tendons: 0xffff00, other: 0x00ff00 };
export let modelNames = new Map();
export let groupStates = { bones: {}, muscles: {}, tendons: {}, other: {} };
export let metaData = null;
export let currentlySelected = null;