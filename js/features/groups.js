//3. GROUPS WRAPPER - features/groups.js
// ============================================
// Wrapper für Backward Compatidddddlity mit altem Code

let appInstance = null;

export function setAppInstance(app) {
    appInstance = app;
}

export async function loadGroup(groupName, subgroup = null, centerCamera = false) {
    if (!appInstance) {
        throw new Error('App nicht initialisiert! Bootstrap fehlt.');
    }
    return appInstance.managers.loader.loadGroup(groupName, { centerCamera });
}

export async function unloadGroup(groupName) {
    if (!appInstance) {
        throw new Error('App nicht initialisiert!');
    }
    return appInstance.managers.loader.unloadGroup(groupName);
}

export function unloadWholeGroup(groupName) {
    // Alias für unloadGroup
    return unloadGroup(groupName);
}

export function isGroupLoaded(groupName) {
    if (!appInstance) return false;
    return appInstance.managers.state.isGroupLoaded(groupName);
}

export function setGroupVisibility(groupName, visible) {
    if (!appInstance) return;
    const state = visible ? 'visible' : 'hidden';
    appInstance.managers.visibility.setGroupState(groupName, state);
}

export function restoreGroupState(groupName) {
    if (!appInstance) return;

    const state = appInstance.managers.state;
    const visibility = appInstance.managers.visibility;

    const models = state.getGroupModels(groupName);
    const savedState = state._state.groupStates[groupName];

    if (typeof savedState === 'boolean') {
        // Simple visible/hidden
        visibility.setGroupState(groupName, savedState ? 'visible' : 'hidden');
    } else if (typeof savedState === 'object') {
        // Per-model states
        models.forEach(model => {
            const modelState = savedState[model.name];
            if (modelState) {
                visibility.setState(model, modelState);
            }
        });
    }
}
