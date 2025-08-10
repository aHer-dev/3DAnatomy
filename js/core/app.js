// ============================================
// FIXED: app.js - Mit korrektem Model Loading
// ============================================
import * as THREE from 'three';
import { scene } from './scene.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';
import { initControls, controls } from './controls.js';
import { StateManager } from '../store/stateManager.js';
import { VisibilityManager } from '../features/visibilityManager.js';
import { ModelLoader } from '../modelLoader/modelLoaderManager.js';
import { InteractionManager } from '../interaction/interactionManager.js';
import { ErrorManager } from './errorManager.js';
import { debug } from './debug.js';
import { setAppInstance } from '../features/groups.js';

class App {
    constructor() {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = null; // Wird in init() gesetzt

        // Manager mit korrekten Dependencies
        this.managers = {};
        this.managers.state = new StateManager();
        this.managers.error = new ErrorManager();
        this.managers.visibility = new VisibilityManager(this.managers.state);
        this.managers.loader = new ModelLoader(this.managers.state, this.managers.visibility);
        this.managers.interaction = new InteractionManager(
            this.managers.state,
            this.managers.visibility
        );

        this.cleanupFunctions = [];
        this.isInitialized = false;
    }

    async init() {
        try {
            debug.log('app', '🚀 Initialisiere App...');

            // 1) State vorbereiten
            await this.managers.state.initialize();

            // 2) App-Instanz registrieren
            setAppInstance(this);

            // WICHTIG: App global verfügbar machen für Debug
            if (typeof window !== 'undefined') {
                window.__app = this;
                console.log('🐛 App-Instanz verfügbar unter window.__app');
            }

            // 3) Controls erzeugen
            initControls();
            this.controls = controls;
            this.controls.target.set(0, 1.0, 0);
            this.controls.update();

            // 4) Initiale Gruppen laden
            await this.loadInitialGroups();

            // 5) Event Handler
            this.setupEventHandlers();

            // 6) UI initialisieren
            await this.initializeUI();

            // 7) Animation starten
            this.animate();

            // 8) Einmal rendern für initialen Frame
            this.renderer.render(this.scene, this.camera);

            this.isInitialized = true;

            // Debug: Zeige was in der Szene ist
            let meshCount = 0;
            this.scene.traverse(obj => {
                if (obj.isMesh) meshCount++;
            });
            console.log(`🏠 Initiale Gruppen geladen. Meshes in Szene: ${meshCount}`);

            debug.log('app', '✅ App erfolgreich initialisiert');

        } catch (error) {
            this.managers.error.handleCritical('App-Initialisierung fehlgeschlagen', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async loadInitialGroups() {
        const initialGroups = ['bones', 'teeth'];
        console.log('📦 Lade initiale Gruppen:', initialGroups);

        for (const group of initialGroups) {
            try {
                console.log(`  → Lade Gruppe "${group}"...`);

                // Modelle laden
                const models = await this.managers.loader.loadGroup(group);

                if (models && models.length > 0) {
                    console.log(`  ✓ ${models.length} Modelle aus "${group}" geladen`);

                    // Gruppe als sichtbar markieren
                    this.managers.visibility.setGroupState(group, 'visible');
                    this.managers.state.setGroupLoaded(group, true);
                } else {
                    console.warn(`  ⚠ Keine Modelle in Gruppe "${group}" gefunden`);
                }

            } catch (error) {
                console.error(`  ✗ Fehler beim Laden von "${group}":`, error);
                this.managers.error.handleError(`Fehler beim Laden von Gruppe "${group}"`, error);
            }
        }

        // Kamera auf geladene Modelle ausrichten
        this.fitCameraToContent();
    }

    fitCameraToContent() {
        const box = new THREE.Box3();
        let hasContent = false;

        this.scene.traverse(obj => {
            if (obj.isMesh && obj.visible) {
                box.expandByObject(obj);
                hasContent = true;
            }
        });

        if (hasContent && !box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Kamera positionieren
            const distance = maxDim * 2;
            this.camera.position.set(
                center.x,
                center.y + maxDim * 0.5,
                center.z + distance
            );

            // Controls-Ziel setzen
            this.controls.target.copy(center);
            this.controls.update();

            console.log('📷 Kamera auf Inhalt ausgerichtet');
        }
    }

    setupEventHandlers() {
        // Resize Handler
        const resizeHandler = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', resizeHandler);
        this.cleanupFunctions.push(() => window.removeEventListener('resize', resizeHandler));

        // Controls Change Handler
        let previousPosition = this.camera.position.clone();
        const controlsHandler = () => {
            const distanceMoved = this.camera.position.distanceTo(previousPosition);
            if (distanceMoved > 0.01) {
                this.managers.interaction.hideInfoPanel();
                previousPosition.copy(this.camera.position);
            }
        };

        this.controls.addEventListener('change', controlsHandler);
        this.cleanupFunctions.push(() => this.controls.removeEventListener('change', controlsHandler));

        // Hotkeys
        this.setupHotkeys();
    }

    setupHotkeys() {
        const hotkeyHandler = (e) => {
            if (this.isTypingTarget(document.activeElement)) return;

            const selected = this.managers.state.getSelected();
            if (!selected) return;

            switch (e.key.toLowerCase()) {
                case 'g':
                    this.managers.visibility.toggleGhost(selected.root);
                    break;
                case 'h':
                    this.managers.visibility.setState(selected.root, 'hidden');
                    break;
                case 's':
                    this.managers.visibility.setState(selected.root, 'visible');
                    break;
                case 'd':
                    // Debug: Zeige Szenen-Info
                    if (e.shiftKey) {
                        this.debugSceneInfo();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', hotkeyHandler);
        this.cleanupFunctions.push(() => window.removeEventListener('keydown', hotkeyHandler));
    }

    debugSceneInfo() {
        console.group('🔍 Scene Debug Info');

        let meshCount = 0;
        let visibleCount = 0;
        const groups = {};

        this.scene.traverse(obj => {
            if (obj.isMesh) {
                meshCount++;
                if (obj.visible) visibleCount++;

                const entry = obj.parent?.userData?.entry;
                if (entry) {
                    const group = entry.classification?.group || 'unknown';
                    groups[group] = (groups[group] || 0) + 1;
                }
            }
        });

        console.log('Total Meshes:', meshCount);
        console.log('Visible Meshes:', visibleCount);
        console.log('Pickable Meshes:', this.managers.state._state.pickableMeshes.size);
        console.log('Groups:', groups);
        console.log('Camera Position:', this.camera.position.toArray());
        console.log('Controls Target:', this.controls.target.toArray());

        console.groupEnd();
    }

    isTypingTarget(element) {
        return element && (
            element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable
        );
    }

    async initializeUI() {
        const { setupUI } = await import('../ui/ui-init.js');
        setupUI(this.managers);
    }

    animate() {
        const animateFrame = () => {
            if (!this.isInitialized) return;

            requestAnimationFrame(animateFrame);

            // Update controls
            if (this.controls) {
                this.controls.update();
            }

            // Render scene
            this.renderer.render(this.scene, this.camera);
        };

        animateFrame();
    }

    async reset() {
        try {
            debug.log('app', '🔄 Reset wird durchgeführt...');

            // Alle Gruppen entladen
            await this.managers.loader.unloadAllGroups();

            // State zurücksetzen
            this.managers.state.reset();
            await this.managers.state.initialize();

            // Initiale Gruppen neu laden
            await this.loadInitialGroups();

            // Kamera zurücksetzen
            this.fitCameraToContent();

            debug.log('app', '✅ Reset abgeschlossen');

        } catch (error) {
            this.managers.error.handleError('Reset fehlgeschlagen', error);
        }
    }

    dispose() {
        debug.log('app', '🗑️ App wird aufgeräumt...');

        this.isInitialized = false;

        // Cleanup-Funktionen ausführen
        this.cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (error) {
                console.warn('Cleanup-Fehler:', error);
            }
        });

        // Manager aufräumen
        Object.values(this.managers).forEach(manager => {
            if (manager.dispose) {
                manager.dispose();
            }
        });

        // Global reference entfernen
        if (window.__app === this) {
            delete window.__app;
        }

        debug.log('app', '✅ Cleanup abgeschlossen');
    }
}

export { App };