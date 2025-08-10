// js/core/raycaster.js
// Hybrid: Offizielle Three.js Octree + Custom Mesh-Raycasting
import * as THREE from 'three';
import { Octree } from '../three-addons/math/Octree.js'; // ✅ Ihre offizielle Octree
import { state } from '../store/state.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';

// Mesh-orientierte Spatial Hash für Raycasting-Performance
class MeshSpatialHash {
    constructor(cellSize = 10) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.meshes = new Set();
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

        for (const mesh of this.meshes) {
            if (!mesh.geometry) continue;

            // Bounding Box berechnen
            mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox.clone();
            box.applyMatrix4(mesh.matrixWorld);

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
        const step = this.cellSize * 0.5; // Kleinere Schritte für bessere Abdeckung
        const direction = ray.direction.clone();
        const origin = ray.origin.clone();

        // Ray in Schritten abgehen
        for (let distance = 0; distance < maxDistance; distance += step) {
            const point = origin.clone().add(direction.clone().multiplyScalar(distance));
            const key = this.getKey(point.x, point.y, point.z);

            const cellMeshes = this.grid.get(key);
            if (cellMeshes) {
                for (const mesh of cellMeshes) {
                    candidates.add(mesh);
                }
            }
        }

        return Array.from(candidates);
    }

    // Debug-Info
    getDebugInfo() {
        return {
            totalMeshes: this.meshes.size,
            totalCells: this.grid.size,
            cellSize: this.cellSize,
            needsRebuild: this.needsRebuild
        };
    }
}

// Optimierte Raycaster-Klasse
class OptimizedRaycaster {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.spatialHash = new MeshSpatialHash(10); // 10 Units Zellgröße
        this.collisionOctree = null; // Für Physik (falls benötigt)

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

            // Pickable Meshes synchronisieren
            this.syncPickableMeshes();

            // Spatial Hash für Kandidaten nutzen
            const candidates = this.spatialHash.queryRay(this.raycaster.ray, 1000);

            if (candidates.length === 0) {
                state.selected = null;
                return null;
            }

            // Optimierte Intersection nur mit Kandidaten
            const intersections = this.raycaster.intersectObjects(candidates, false);

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

    // Pickable Meshes mit Spatial Hash synchronisieren
    syncPickableMeshes() {
        const statePickables = state.pickableMeshes || new Set();

        // Entfernte Meshes löschen
        for (const mesh of this.spatialHash.meshes) {
            if (!statePickables.has(mesh)) {
                this.spatialHash.removeMesh(mesh);
            }
        }

        // Neue Meshes hinzufügen
        for (const mesh of statePickables) {
            if (!this.spatialHash.meshes.has(mesh)) {
                this.spatialHash.addMesh(mesh);
            }
        }
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
        this.spatialHash = new MeshSpatialHash(10);
        this.collisionOctree = null;
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