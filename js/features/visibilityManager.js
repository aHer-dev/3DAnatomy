// 7. VISIBILITY MANAGER - features/visibilityManager.js
// ============================================
import * as THREE from 'three';
import { debug } from '../core/debug.js';

class VisibilityManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.originalMaterials = new WeakMap();
    }

    setState(model, state) {
        if (!model) return;

        debug.log('visibility', `Setze ${model.name || 'Model'} auf "${state}"`);

        switch (state) {
            case 'visible':
                this.setVisible(model, true, true);
                this.restoreOriginalMaterial(model);
                break;

            case 'hidden':
                this.setVisible(model, false, false);
                break;

            case 'ghost':
                this.setVisible(model, true, false);
                this.applyGhostMaterial(model, 0.15);
                break;

            default:
                console.warn(`Unbekannter Visibility-State: ${state}`);
        }
    }

    setGroupState(group, state) {
        const models = this.state.getGroupModels(group);
        models.forEach(model => this.setState(model, state));
    }

    toggleGhost(model) {
        if (!model) return;

        // Prüfe ob Model aktuell pickable ist
        let isPickable = false;
        model.traverse(node => {
            if (node.isMesh && this.state._state.pickableMeshes.has(node)) {
                isPickable = true;
            }
        });

        this.setState(model, isPickable ? 'ghost' : 'visible');
    }

    setVisible(model, visible, pickable) {
        model.visible = visible;

        model.traverse(node => {
            if (node.isMesh) {
                node.visible = visible;

                // Layer-Management
                if (visible) {
                    node.layers.enable(0); // Render Layer
                } else {
                    node.layers.disable(0);
                }

                if (pickable) {
                    node.layers.enable(1); // Pick Layer
                    this.state.addPickable(node);
                } else {
                    node.layers.disable(1);
                    this.state.removePickable(node);
                }
            }
        });
    }

    applyGhostMaterial(model, opacity = 0.15) {
        model.traverse(node => {
            if (!node.isMesh || !node.material) return;

            // Original-Material sichern
            if (!this.originalMaterials.has(node)) {
                const original = Array.isArray(node.material)
                    ? node.material.map(m => m.clone())
                    : node.material.clone();
                this.originalMaterials.set(node, original);
            }

            // Ghost-Material erstellen
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            const ghostMaterials = materials.map(mat => {
                const ghostMat = mat.clone();
                ghostMat.transparent = true;
                ghostMat.opacity = opacity;
                ghostMat.depthWrite = false;
                return ghostMat;
            });

            node.material = Array.isArray(node.material) ? ghostMaterials : ghostMaterials[0];
        });
    }

    restoreOriginalMaterial(model) {
        model.traverse(node => {
            if (!node.isMesh) return;

            const original = this.originalMaterials.get(node);
            if (original) {
                node.material = original;
                this.originalMaterials.delete(node);
            } else {
                // Fallback: Transparenz entfernen
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach(mat => {
                    if (mat) {
                        mat.transparent = false;
                        mat.opacity = 1.0;
                        mat.depthWrite = true;
                    }
                });
            }
        });
    }

    setOpacity(model, opacity) {
        if (!model) return;

        model.traverse(node => {
            if (node.isMesh && node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach(mat => {
                    if (mat) {
                        mat.transparent = opacity < 1;
                        mat.opacity = opacity;
                        mat.depthWrite = opacity >= 1;
                        mat.needsUpdate = true;
                    }
                });
            }
        });
    }

    setColor(model, color) {
        if (!model) return;

        const threeColor = typeof color === 'string' ? new THREE.Color(color) : color;

        model.traverse(node => {
            if (node.isMesh && node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach(mat => {
                    if (mat && mat.color) {
                        mat.color.copy(threeColor);
                        mat.needsUpdate = true;
                    }
                });
            }
        });
    }

    dispose() {
        debug.log('visibility', '🗑️ VisibilityManager wird aufgeräumt');
        this.originalMaterials = new WeakMap();
    }
}

export { VisibilityManager };
