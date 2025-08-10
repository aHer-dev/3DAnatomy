// ============================================
// 4. MODEL LOADER MANAGER - modelLoader/modelLoaderManager.js
// ============================================

import { createGLTFLoader } from '../modelLoader/gltfLoaderFactory.js';
import { modelPath, withBase } from '../core/path.js'; // path-API nutzen
import { scene } from '../core/scene.js';
import { debug } from '../core/debug.js';

class ModelLoader {
    constructor(stateManager, visibilityManager) {
        this.state = stateManager;
        this.visibility = visibilityManager;
        this.loader = createGLTFLoader();
        this.loadingPromises = new Map();
    }

    async loadGroup(groupName, options = {}) {
        const { centerCamera = false, onProgress = null } = options;

        if (this.loadingPromises.has(groupName)) {
            debug.log('loader', `Gruppe "${groupName}" wird bereits geladen`);
            return this.loadingPromises.get(groupName);
        }

        const loadPromise = this._doLoadGroup(groupName, { centerCamera, onProgress });
        this.loadingPromises.set(groupName, loadPromise);

        try {
            const result = await loadPromise;
            return result;
        } finally {
            this.loadingPromises.delete(groupName);
        }
    }

    async _doLoadGroup(groupName, { centerCamera, onProgress }) {
        const entries = this.state.getGroupMeta(groupName);

        if (!entries.length) {
            throw new Error(`Keine Einträge für Gruppe "${groupName}" gefunden`);
        }

        debug.log('loader', `Lade ${entries.length} Modelle aus Gruppe "${groupName}"`);

        const BATCH_SIZE = 3;
        const loadedModels = [];
        const errors = [];
        let processed = 0;

        // Batch-Loading für bessere Performance
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (entry) => {
                try {
                    const model = await this.loadEntry(entry);
                    if (model) {
                        loadedModels.push(model);
                        this.state.addModelToGroup(model, groupName);
                        this.visibility.setState(model, 'visible');
                    }
                    return model;
                } catch (error) {
                    errors.push({ entry: entry.id, error });
                    debug.log('loader', `❌ Fehler bei ${entry.id}: ${error.message}`);
                    return null;
                }
            });

            await Promise.allSettled(batchPromises);
            processed += batch.length;

            if (onProgress) {
                onProgress(processed / entries.length);
            }
        }

        if (errors.length > 0) {
            console.warn(`${errors.length} Modelle konnten nicht geladen werden:`, errors);
        }

        this.state.setGroupLoaded(groupName, true);
        debug.log('loader', `✅ Gruppe "${groupName}" geladen: ${loadedModels.length}/${entries.length} Modelle`);

        return loadedModels;
    }

    async loadEntry(entry) {
        const current = entry?.model?.current || 'draco';
        const variant = entry?.model?.variants?.[current];

        if (!variant?.filename) {
            throw new Error(`Keine Datei für Eintrag ${entry?.id} gefunden`);
        }

        // 1) Pfadquelle: bevorzugt variant.path (z.B. "teeth", "ligaments"), sonst group
        const vPath = (variant?.path || entry?.classification?.group || '').trim();

        // 2) Sicher den finalen URL bauen:
        // - Falls meta schon "models/..." liefert, direkt via withBase
        // - Sonst sauber via modelPath(prefix "models/")
        const url = vPath.startsWith('models/')
            ? withBase(`${vPath}/${variant.filename}`)
            : modelPath(variant.filename, vPath);

        // Model laden
        const gltf = await this.loader.loadAsync(url);
        const model = gltf.scene;

        // Metadaten anhängen (WICHTIG!)
        model.userData.entry = entry;
        model.userData.meta = entry;  // Backward compatibility
        model.userData.isModelRoot = true;
        model.name = entry.id || variant.filename;

        // In Szene einfügen
        scene.add(model);

        // Pickables registrieren
        model.traverse(node => {
            if (node.isMesh) {
                node.layers.enable(0);  // Render layer
                node.layers.enable(1);  // Pick layer
                this.state.addPickable(node);
            }
        });

        return model;
    }

    async unloadGroup(groupName) {
        const models = this.state.getGroupModels(groupName);

        models.forEach(model => {
            // Pickables entfernen
            model.traverse(node => {
                if (node.isMesh) {
                    this.state.removePickable(node);
                }
            });

            // Aus Szene entfernen
            scene.remove(model);

            // Geometrie und Materialien aufräumen
            this.disposeModel(model);
        });

        // Aus State entfernen
        this.state._state.groups[groupName] = [];
        this.state.setGroupLoaded(groupName, false);

        debug.log('loader', `🗑️ Gruppe "${groupName}" entladen`);
    }

    async unloadAllGroups() {
        const groupNames = this.state.getAvailableGroups();

        for (const groupName of groupNames) {
            if (this.state.isGroupLoaded(groupName)) {
                await this.unloadGroup(groupName);
            }
        }

        debug.log('loader', '🗑️ Alle Gruppen entladen');
    }

    disposeModel(model) {
        model.traverse(node => {
            if (node.isMesh) {
                // Geometrie aufräumen
                if (node.geometry) {
                    node.geometry.dispose();
                }

                // Materialien aufräumen
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => mat.dispose());
                    } else {
                        node.material.dispose();
                    }
                }
            }
        });
    }

    dispose() {
        debug.log('loader', '🗑️ ModelLoader wird aufgeräumt');
        this.loadingPromises.clear();

        if (this.loader.dispose) {
            this.loader.dispose();
        }
    }
}

export { ModelLoader };
