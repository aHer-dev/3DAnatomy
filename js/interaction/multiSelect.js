// js/interaction/multiSelect.js
// Mehrfachauswahl: Highlight, Toggle, Clear

import * as THREE from 'three';
import { state } from '../store/state.js';
import { getStructureDisplayLabel } from '../utils/anatomyLabels.js';

const HIGHLIGHT_MULTI = 0x1a1a4a;   // dezentes Blau für Mehrfachauswahl

function _getName(model) {
    return getStructureDisplayLabel(model) || model.name || '?';
}

function _applyHighlight(model, hex) {
    model.traverse(child => {
        if (child.isMesh && child.material) {
            if (!child.material.emissive) {
                child.material.emissive = new THREE.Color(hex);
            } else {
                child.material.emissive.setHex(hex);
            }
            child.material.needsUpdate = true;
        }
    });
}

function _clearHighlight(model) {
    model.traverse(child => {
        if (child.isMesh && child.material?.emissive) {
            child.material.emissive.setHex(0x000000);
            child.material.needsUpdate = true;
        }
    });
}

export function addToMultiSelect(model) {
    if (!model || state.multiSelected.has(model)) return false;
    state.multiSelected.add(model);
    _applyHighlight(model, HIGHLIGHT_MULTI);
    return true;
}

export function removeFromMultiSelect(model) {
    if (!model || !state.multiSelected.has(model)) return false;
    state.multiSelected.delete(model);
    _clearHighlight(model);
    return true;
}

export function toggleMultiSelect(model) {
    if (state.multiSelected.has(model)) {
        removeFromMultiSelect(model);
        return false; // entfernt
    } else {
        addToMultiSelect(model);
        return true;  // hinzugefügt
    }
}

export function clearMultiSelect() {
    for (const model of state.multiSelected) {
        _clearHighlight(model);
    }
    state.multiSelected.clear();
}

export function getMultiSelectedArray() {
    return Array.from(state.multiSelected);
}

export function getModelName(model) {
    return _getName(model);
}
