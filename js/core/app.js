// ============================================
// 1. CORE APP CONTROLLER - core/app.js
// ============================================
import * as THREE from 'three';
import { scene } from './scene.js';
import { camera } from './camera.js';
import { renderer } from './renderer.js';
import { controls } from './controls.js';
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
        this.controls = controls;

        // Manager mit korrekten Dependencies
        this.managers = {};
        this.managers.state = new StateManager();
        this.managers.error = new ErrorManager();

        // ✅ Mit Dependencies injizieren:
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

            // Meta-Daten laden und State initialisieren
            await this.managers.state.initialize();

            // App-Instanz setzen
            setAppInstance(this);

            // Initiale Gruppen laden (bones + teeth)
            await this.loadInitialGroups();

            // Event-Handler einrichten
            this.setupEventHandlers();

            // UI initialisieren - ✅ Manager übergeben!
            await this.initializeUI();

            // Animation starten
            this.animate();

            this.isInitialized = true;
            debug.log('app', '✅ App erfolgreich initialisiert');

        } catch (error) {
            this.managers.error.handleCritical('App-Initialisierung fehlgeschlagen', error);
        }
    }

    async loadInitialGroups() {
        const initialGroups = ['bones', 'teeth'];

        for (const group of initialGroups) {
            try {
                await this.managers.loader.loadGroup(group);
                this.managers.visibility.setGroupState(group, 'visible');
                this.managers.state.setGroupLoaded(group, true);
            } catch (error) {
                this.managers.error.handleError(`Fehler beim Laden von Gruppe "${group}"`, error);
            }
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
                    this.managers.visibility.toggleGhost(selected);
                    break;
                case 'h':
                    this.managers.visibility.setState(selected, 'hidden');
                    break;
                case 's':
                    this.managers.visibility.setState(selected, 'visible');
                    break;
            }
        };

        window.addEventListener('keydown', hotkeyHandler);
        this.cleanupFunctions.push(() => window.removeEventListener('keydown', hotkeyHandler));
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
        setupUI(this.managers);  // ✅ Manager übergeben!
    }

    animate() {
        const animateFrame = () => {
            if (!this.isInitialized) return;

            requestAnimationFrame(animateFrame);
            this.controls.update();
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

            // Initiale Gruppen neu laden
            await this.loadInitialGroups();

            // Kamera zurücksetzen
            if (this.controls.reset) {
                this.controls.reset();
            }

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

        debug.log('app', '✅ Cleanup abgeschlossen');
    }
}

export { App };