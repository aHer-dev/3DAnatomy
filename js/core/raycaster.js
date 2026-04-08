// js/core/raycaster.js
// Hybrid: Offizielle Three.js Octree + Custom Mesh-Raycasting
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js'
import { state } from '../store/state.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';

// Dirty-Flag: wird gesetzt wenn pickableMeshes sich geändert hat
let _pickablesDirty = true;

export function markPickablesDirty() {
    _pickablesDirty = true;
}

// Mesh-orientierte Spatial Hash für Raycasting-Performance
class MeshSpatialHash {
    constructor(cellSize = 4) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.meshes = new Set();
        this.boundingBoxes = new Map();
        this.boundingSpheres = new Map();
        this.needsRebuild = true;
    }

    // Hash-Schlüssel für 3D-Position berechnen
    getKey(x, y, z) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }

    // Mesh hinzufügen
    addMesh(mesh) {
        if (!mesh?.isMesh || this.meshes.has(mesh)) return;

        this.meshes.add(mesh);
        this.needsRebuild = true;
    }

    // Mesh entfernen
    removeMesh(mesh) {
        if (!this.meshes.has(mesh)) return;

        this.meshes.delete(mesh);
        this.needsRebuild = true;
    }

    // Spatial Hash aufbauen
    rebuild() {
        if (!this.needsRebuild) return;

        this.grid.clear();
        this.boundingBoxes.clear();
        this.boundingSpheres.clear();

        for (const mesh of this.meshes) {
            if (!mesh.geometry) continue;
            mesh.updateWorldMatrix?.(true, false);

            // Bounding Box berechnen
            if (!mesh.geometry.boundingBox) {
                mesh.geometry.computeBoundingBox();
            }
            if (!mesh.geometry.boundingSphere) {
                mesh.geometry.computeBoundingSphere();
            }
            const box = mesh.geometry.boundingBox.clone();
            box.applyMatrix4(mesh.matrixWorld);
            this.boundingBoxes.set(mesh, box);

            const sphere = mesh.geometry.boundingSphere?.clone();
            if (sphere) {
                sphere.applyMatrix4(mesh.matrixWorld);
                this.boundingSpheres.set(mesh, sphere);
            }

            // Mesh in alle betroffenen Zellen eintragen
            const minKey = this.getKey(box.min.x, box.min.y, box.min.z);
            const maxKey = this.getKey(box.max.x, box.max.y, box.max.z);

            const [minX, minY, minZ] = minKey.split(',').map(Number);
            const [maxX, maxY, maxZ] = maxKey.split(',').map(Number);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    for (let z = minZ; z <= maxZ; z++) {
                        const key = `${x},${y},${z}`;
                        if (!this.grid.has(key)) {
                            this.grid.set(key, new Set());
                        }
                        this.grid.get(key).add(mesh);
                    }
                }
            }
        }

        this.needsRebuild = false;
        console.log(`🗂️ Spatial Hash aufgebaut: ${this.meshes.size} Meshes in ${this.grid.size} Zellen`);
    }

    // Meshes entlang einem Ray finden
    queryRay(ray, maxDistance = 1000) {
        this.rebuild();

        const candidates = new Set();
        const visitedKeys = new Set();
        const step = this.cellSize * 0.5; // Kleinere Schritte für bessere Abdeckung
        const point = new THREE.Vector3();

        // Ray in Schritten abgehen
        for (let distance = 0; distance < maxDistance; distance += step) {
            ray.at(distance, point);
            const key = this.getKey(point.x, point.y, point.z);
            if (visitedKeys.has(key)) continue;
            visitedKeys.add(key);

            const cellMeshes = this.grid.get(key);
            if (cellMeshes) {
                for (const mesh of cellMeshes) {
                    candidates.add(mesh);
                }
            }
        }

        return Array.from(candidates).filter(mesh => {
            const box = this.boundingBoxes.get(mesh);
            return box ? ray.intersectsBox(box) : true;
        });
    }

    // Debug-Info
    getDebugInfo() {
        return {
            totalMeshes: this.meshes.size,
            totalCells: this.grid.size,
            totalBoundingBoxes: this.boundingBoxes.size,
            totalBoundingSpheres: this.boundingSpheres.size,
            cellSize: this.cellSize,
            needsRebuild: this.needsRebuild
        };
    }

    getBoundingBox(mesh) {
        return this.boundingBoxes.get(mesh) || null;
    }

    getBoundingSphere(mesh) {
        return this.boundingSpheres.get(mesh) || null;
    }
}

// Optimierte Raycaster-Klasse
class OptimizedRaycaster {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.spatialHash = new MeshSpatialHash(); // feinere Zellgröße über Default
        this.collisionOctree = null; // Für Physik (falls benötigt)
        this.cachedPickCandidates = [];

        // Layer für Picking
        this.raycaster.layers.set(1);
    }

    // Mesh zum Picking-System hinzufügen
    addMesh(mesh) {
        this.spatialHash.addMesh(mesh);
    }

    // Mesh aus Picking-System entfernen
    removeMesh(mesh) {
        this.spatialHash.removeMesh(mesh);
    }

    // Collision Octree für Physik erstellen (optional)
    buildCollisionOctree(scene) {
        this.collisionOctree = new Octree();
        this.collisionOctree.fromGraphNode(scene);
        console.log('🌳 Collision Octree aufgebaut');
        return this.collisionOctree;
    }

    // Model-Root finden
    getModelRoot(obj) {
        let current = obj;
        while (current && !current.userData?.isModelRoot && current.parent) {
            current = current.parent;
        }
        return current?.userData?.isModelRoot ? current : obj;
    }

    isCandidatePickable(mesh) {
        return !!(
            mesh?.isMesh &&
            mesh.visible &&
            mesh.geometry &&
            mesh.userData?.pickable !== false &&
            mesh.layers?.test?.(this.raycaster.layers)
        );
    }

    getPickCandidates() {
        this.syncPickableMeshes();
        return this.cachedPickCandidates;
    }

    getRayQueryDistance() {
        const far = Number.isFinite(camera?.far) ? camera.far : 1000;
        return Math.min(Math.max(far, this.spatialHash.cellSize), 1000);
    }

    getSpatialCandidates(allCandidates) {
        if (allCandidates.length <= 24) return allCandidates;

        const spatialCandidates = this.spatialHash
            .queryRay(this.raycaster.ray, this.getRayQueryDistance())
            .filter(mesh => this.isCandidatePickable(mesh));
        const spatialSource =
            spatialCandidates.length > 0 && spatialCandidates.length < allCandidates.length
                ? spatialCandidates
                : allCandidates;

        const sphereCandidates = spatialSource.filter(mesh => {
            const sphere = this.spatialHash.getBoundingSphere(mesh);
            return sphere ? this.raycaster.ray.intersectsSphere(sphere) : true;
        });

        const sphereSource =
            sphereCandidates.length > 0 && sphereCandidates.length < spatialSource.length
                ? sphereCandidates
                : spatialSource;

        const boxCandidates = sphereSource.filter(mesh => {
            const box = this.spatialHash.getBoundingBox(mesh);
            return box ? this.raycaster.ray.intersectsBox(box) : true;
        });

        if (boxCandidates.length > 0 && boxCandidates.length < sphereSource.length) {
            return boxCandidates;
        }
        if (sphereCandidates.length > 0 && sphereCandidates.length < spatialSource.length) {
            return sphereCandidates;
        }
        if (spatialCandidates.length > 0 && spatialCandidates.length < allCandidates.length) {
            return spatialCandidates;
        }
        return allCandidates;
    }

    raycastBackfaces(candidates) {
        const mutatedMaterials = [];

        for (const mesh of candidates) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
                if (!mat || mat.side === THREE.DoubleSide) continue;
                mutatedMaterials.push([mat, mat.side]);
                mat.side = THREE.DoubleSide;
            }
        }

        try {
            return this.raycaster.intersectObjects(candidates, false);
        } finally {
            for (const [mat, side] of mutatedMaterials) {
                mat.side = side;
            }
        }
    }

    // Hauptfunktion: Optimiertes Mesh-Picking
    pickAt(clientX, clientY) {
        try {
            // Canvas-Koordinaten zu NDC
            const rect = renderer.domElement.getBoundingClientRect();
            const ndc = {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1,
            };

            // Raycaster konfigurieren
            this.raycaster.setFromCamera(ndc, camera);

            const allCandidates = this.getPickCandidates();

            if (allCandidates.length === 0) {
                state.selected = null;
                return null;
            }

            const candidates = this.getSpatialCandidates(allCandidates);
            const usedSpatialSubset = candidates !== allCandidates;
            let intersections = this.raycaster.intersectObjects(candidates, false);

            if (intersections.length === 0 && usedSpatialSubset) {
                intersections = this.raycaster.intersectObjects(allCandidates, false);
            }

            // Backface-Fallback nur bei echtem Bedarf ausführen.
            if (intersections.length === 0) {
                intersections = this.raycastBackfaces(candidates);
            }
            if (intersections.length === 0 && usedSpatialSubset) {
                intersections = this.raycastBackfaces(allCandidates);
            }

            if (intersections.length === 0) {
                state.selected = null;
                return null;
            }

            // Bester Treffer
            const hit = intersections[0];
            const root = this.getModelRoot(hit.object);

            const selection = {
                root,
                mesh: hit.object,
                point: hit.point.clone(),
                distance: hit.distance,
                uv: hit.uv?.clone() || null,
                normal: hit.face?.normal?.clone() || null
            };

            state.selected = selection;
            return selection;

        } catch (error) {
            console.error('Fehler beim Raycasting:', error);
            state.selected = null;
            return null;
        }
    }

    // Pickable Meshes mit Spatial Hash synchronisieren – nur wenn dirty
    syncPickableMeshes() {
        if (!_pickablesDirty) return;
        _pickablesDirty = false;

        const statePickables = state.pickableMeshes || new Set();

        for (const mesh of this.spatialHash.meshes) {
            if (!statePickables.has(mesh)) this.spatialHash.removeMesh(mesh);
        }
        for (const mesh of statePickables) {
            if (!this.spatialHash.meshes.has(mesh)) this.spatialHash.addMesh(mesh);
        }

        this.cachedPickCandidates = Array.from(statePickables).filter(mesh => this.isCandidatePickable(mesh));
    }

    // NDC-Koordinaten berechnen
    getPointerNDC(event, domElement) {
        try {
            const rect = domElement.getBoundingClientRect();
            const isTouch = 'touches' in event && event.touches?.length > 0;
            const clientX = isTouch ? event.touches[0].clientX : event.clientX;
            const clientY = isTouch ? event.touches[0].clientY : event.clientY;

            return {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1
            };
        } catch (error) {
            console.error('Fehler bei NDC-Berechnung:', error);
            return { x: 0, y: 0 };
        }
    }

    // Collision Detection mit offizieller Octree (für Physik)
    checkCollision(capsule) {
        if (!this.collisionOctree) return false;
        return this.collisionOctree.capsuleIntersect(capsule);
    }

    // Ray-Triangle Intersection mit offizieller Octree
    rayIntersect(ray) {
        if (!this.collisionOctree) return false;
        return this.collisionOctree.rayIntersect(ray);
    }

    // Debug-Informationen
    getDebugInfo() {
        const spatialInfo = this.spatialHash.getDebugInfo();
        return {
            ...spatialInfo,
            hasCollisionOctree: !!this.collisionOctree,
            pickableMeshes: state.pickableMeshes?.size || 0,
            performance: this.getPerformanceMetrics()
        };
    }

    // Performance-Metriken
    getPerformanceMetrics() {
        const totalMeshes = this.spatialHash.meshes.size;
        const avgCandidates = totalMeshes > 0 ? Math.ceil(totalMeshes / 10) : 0; // Geschätzt

        return {
            totalMeshes,
            estimatedCandidatesPerRay: avgCandidates,
            performanceGain: totalMeshes > 0 ? Math.round((totalMeshes / Math.max(avgCandidates, 1)) * 100) / 100 : 1
        };
    }

    // Räume Spatial Hash auf
    clear() {
        this.spatialHash = new MeshSpatialHash();
        this.collisionOctree = null;
        this.cachedPickCandidates = [];
    }
}

// Singleton-Instanz
const optimizedRaycaster = new OptimizedRaycaster();

// === ÖFFENTLICHE API ===

// Hauptfunktionen (kompatibel mit bestehender Codebase)
export function pickAt(clientX, clientY) {
    return optimizedRaycaster.pickAt(clientX, clientY);
}

export function getPointerNDC(event, domElement) {
    return optimizedRaycaster.getPointerNDC(event, domElement);
}

// Erweiterte Raycasting-API
export function addPickableMesh(mesh) {
    optimizedRaycaster.addMesh(mesh);
}

export function removePickableMesh(mesh) {
    optimizedRaycaster.removeMesh(mesh);
}

// Physik/Collision API (nutzt offizielle Octree)
export function buildCollisionOctree(scene) {
    return optimizedRaycaster.buildCollisionOctree(scene);
}

export function checkCollision(capsule) {
    return optimizedRaycaster.checkCollision(capsule);
}

export function rayIntersectGeometry(ray) {
    return optimizedRaycaster.rayIntersect(ray);
}

// Performance & Debug
export function getRaycastDebugInfo() {
    return optimizedRaycaster.getDebugInfo();
}

export function clearRaycastStructures() {
    optimizedRaycaster.clear();
}

export function rebuildRaycastStructures() {
    optimizedRaycaster.spatialHash.needsRebuild = true;
}

// Legacy-Support & Zugriff auf interne Systeme
export { optimizedRaycaster };
export const officialOctree = Octree; // Direkter Zugriff auf Three.js Octree
