// ui-collection-export.js
// 📤📥 Export/Import-Modul für Sammlungen - Modular, stabil und benutzerfreundlich

import { state } from '../store/state.js';
import { loadGroupByName } from '../features/modelLoader-core.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { setModelVisibility } from '../features/visibility.js';
import { updateSetList } from './ui-set.js';
import { renderer } from '../core/renderer.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';

/**
 * Sammlung Export/Import Manager
 * Verwaltet den Export und Import von Sammlungen mit allen visuellen Einstellungen
 */
class CollectionManager {
    constructor() {
        this.version = '3.0';
        this.fileExtension = '.bluebody';
    }

    /**
     * Initialisiert die Export/Import UI
     */
    setupUI() {
        // Prüfen ob Buttons bereits existieren
        if (document.getElementById('collection-export-import-container')) {
            return; // Bereits initialisiert
        }

        // Den Clear-Button als Referenzpunkt finden
        const clearBtn = document.getElementById('btn-clear-set');
        if (!clearBtn) {
            console.warn('⚠️ btn-clear-set Element nicht gefunden - versuche alternatives Layout');

            // Alternative: Nach dem set-list Container einfügen
            const setList = document.getElementById('set-list');
            if (!setList) {
                console.error('❌ Kein geeigneter Container für Export/Import-Buttons gefunden');
                return;
            }

            // Container für Buttons erstellen
            const controlsContainer = setList.parentElement;
            this.createAndInsertButtons(controlsContainer, setList);
            return;
        }

        // Buttons nach dem Clear-Button einfügen
        const parentContainer = clearBtn.parentElement;
        this.createAndInsertButtons(parentContainer, clearBtn);
    }

    /**
     * Erstellt und fügt die Export/Import-Buttons ein
     */
    createAndInsertButtons(parentElement, referenceElement) {
        // Button-Container erstellen
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'collection-export-import-container';
        buttonContainer.style.cssText = `
            display: flex;
            gap: 5px;
            margin-top: 5px;
            width: 100%;
        `;

        // Export-Button (Stil angepasst an App-Design)
        const exportBtn = document.createElement('button');
        exportBtn.id = 'btn-export-collection';
        exportBtn.innerHTML = '💾 Sammlung speichern';
        exportBtn.className = referenceElement.className || '';
        exportBtn.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            background: linear-gradient(135deg, #4A9EFF, #FF7A4A);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            text-align: center;
            box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
        `;

        // Import-Button (Stil angepasst an App-Design)
        const importBtn = document.createElement('button');
        importBtn.id = 'btn-import-collection';
        importBtn.innerHTML = '📂 Sammlung laden';
        importBtn.className = referenceElement.className || '';
        importBtn.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            background: linear-gradient(135deg, #4A9EFF, #FF7A4A);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            text-align: center;
            box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
        `;

        // Verstecktes File-Input für Import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'collection-file-input';
        fileInput.accept = '.json,.bluebody';
        fileInput.style.display = 'none';

        // Hover-Effekte (dezent, wie bei anderen App-Buttons)
        [exportBtn, importBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 8px 25px rgba(74, 158, 255, 0.4)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
                btn.style.boxShadow = '0 4px 15px rgba(74, 158, 255, 0.3)';
            });
        });

        // Event Listeners
        exportBtn.addEventListener('click', () => this.showSaveModal());
        importBtn.addEventListener('click', () => this.showDropModal(fileInput));
        fileInput.addEventListener('change', (e) => this.importCollection(e));

        // Buttons zum Container hinzufügen
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(importBtn);

        // Container und File-Input nach dem Referenzelement einfügen
        if (referenceElement.nextSibling) {
            parentElement.insertBefore(buttonContainer, referenceElement.nextSibling);
            parentElement.insertBefore(fileInput, buttonContainer.nextSibling);
        } else {
            parentElement.appendChild(buttonContainer);
            parentElement.appendChild(fileInput);
        }

        console.log('✅ Export/Import UI initialisiert');
    }

    /**
     * Exportiert die aktuelle Sammlung als JSON-Datei
     */
    exportCollection(customName = null) {
        if (!state.collection || state.collection.length === 0) {
            this.showToast('Die Sammlung ist leer', 'warning');
            return;
        }

        try {
            // Sammeldaten vorbereiten
            const exportData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                appInfo: {
                    name: 'BlueBody 3D',
                    exportDate: new Date().toLocaleDateString()
                },
                statistics: {
                    totalObjects: state.collection.length,
                    groups: this.getGroupStatistics()
                },
                collection: state.collection.map(item => this.serializeItem(item))
            };

            // JSON erstellen mit schöner Formatierung
            const jsonStr = JSON.stringify(exportData, null, 2);

            // Blob und Download
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Download-Link erstellen
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const baseName = customName || `sammlung_${timestamp}`;
            a.download = `${baseName}${this.fileExtension}`;

            // Download triggern
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Cleanup
            URL.revokeObjectURL(url);

            // Erfolgsmeldung
            this.showToast(`✅ ${state.collection.length} Objekte exportiert`, 'success');
            console.log('📤 Sammlung exportiert:', exportData);

        } catch (error) {
            console.error('❌ Export-Fehler:', error);
            this.showToast('Fehler beim Exportieren', 'error');
        }
    }

    /**
     * Importiert eine Sammlung aus einer JSON-Datei
     */
    async importCollection(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Datei-Input zurücksetzen für erneuten Import
        event.target.value = '';

        try {
            // Loading-Overlay anzeigen
            this.showLoadingOverlay('Importiere Sammlung...');

            // Datei lesen
            const text = await this.readFile(file);
            const data = JSON.parse(text);

            // Versions-Check
            if (!this.validateImportData(data)) {
                throw new Error('Ungültiges Dateiformat');
            }

            // Warnung bei vorhandener Sammlung
            if (state.collection.length > 0) {
                const confirmed = await this.showConfirmDialog(
                    'Vorhandene Sammlung überschreiben?',
                    `Die aktuelle Sammlung enthält ${state.collection.length} Objekte. Diese werden beim Import überschrieben.`
                );
                if (!confirmed) {
                    this.hideLoadingOverlay();
                    return;
                }
            }

            // Import durchführen
            const imported = await this.performImport(data);

            // UI aktualisieren
            updateSetList();
            renderer.render(scene, camera);

            // Erfolgsmeldung
            this.hideLoadingOverlay();
            this.showToast(
                `✅ ${imported.success} von ${imported.total} Objekten importiert`,
                imported.failed > 0 ? 'warning' : 'success'
            );

            // Detailliertes Log
            console.log('📥 Import abgeschlossen:', {
                erfolgreich: imported.success,
                fehlgeschlagen: imported.failed,
                details: imported.details
            });

        } catch (error) {
            console.error('❌ Import-Fehler:', error);
            this.hideLoadingOverlay();
            this.showToast('Fehler beim Importieren: ' + error.message, 'error');
        }
    }

    /**
     * Führt den eigentlichen Import durch
     */
    async performImport(data) {
        const results = {
            success: 0,
            failed: 0,
            total: data.collection.length,
            details: []
        };

        // Sammlung zurücksetzen
        state.collection = [];

        // Benötigte Gruppen identifizieren
        const requiredGroups = [...new Set(data.collection.map(item => item.group).filter(Boolean))];

        // Fehlende Gruppen laden
        for (const group of requiredGroups) {
            if (!state.groups[group] || state.groups[group].length === 0) {
                try {
                    this.updateLoadingText(`Lade Gruppe: ${group}...`);
                    await loadGroupByName(group, { centerCamera: false });
                    console.log(`✅ Gruppe "${group}" geladen`);
                } catch (error) {
                    console.error(`❌ Fehler beim Laden von Gruppe "${group}":`, error);
                }
            }
        }

        // Objekte importieren
        for (const savedItem of data.collection) {
            this.updateLoadingText(`Importiere: ${savedItem.name}...`);

            const model = this.findModelById(savedItem.id, savedItem.group);

            if (model) {
                // Visuelle Eigenschaften anwenden
                if (savedItem.color !== undefined && savedItem.color !== null) {
                    setModelColor(model, savedItem.color);
                }
                if (savedItem.opacity !== undefined) {
                    setModelOpacity(model, savedItem.opacity);
                }

                // Zur Sammlung hinzufügen
                const collectionItem = {
                    id: savedItem.id,
                    name: savedItem.name,
                    group: savedItem.group,
                    meta: savedItem.meta || {},
                    color: savedItem.color,
                    opacity: savedItem.opacity,
                    visible: savedItem.visible !== false,
                    model: model,
                    importedAt: Date.now()
                };

                state.collection.push(collectionItem);
                results.success++;
                results.details.push({ name: savedItem.name, status: 'success' });
            } else {
                results.failed++;
                results.details.push({
                    name: savedItem.name,
                    status: 'failed',
                    reason: 'Modell nicht gefunden'
                });
                console.warn(`⚠️ Modell nicht gefunden: ${savedItem.name} (ID: ${savedItem.id})`);
            }
        }

        return results;
    }

    /**
     * Serialisiert ein Sammlungs-Item für den Export
     * Liest Farbe und Transparenz immer direkt vom Mesh (aktueller Stand)
     */
    serializeItem(item) {
        // Immer aktuelle Werte vom Modell nehmen – nicht den u.U. veralteten item.color
        const color   = item.model ? this.extractColor(item.model)   : item.color;
        const opacity = item.model ? this.extractOpacity(item.model) : (item.opacity ?? 1);

        return {
            id: item.id || item.model?.userData?.meta?.id || item.model?.name,
            name: item.name || item.model?.name || 'Unbekannt',
            group: item.group || item.model?.userData?.group || 'unknown',
            meta: item.meta || item.model?.userData?.meta || {},
            color,
            opacity,
            visible: item.visible !== false,
            originalName: item.model?.name,
            userData: {
                fma: item.model?.userData?.meta?.fma,
                label: item.model?.userData?.meta?.label
            }
        };
    }

    /**
     * Findet ein Modell anhand seiner ID
     */
    findModelById(id, groupHint = null) {
        // Zuerst in der angegebenen Gruppe suchen
        if (groupHint && state.groups[groupHint]) {
            for (const model of state.groups[groupHint]) {
                const modelId = model.userData?.meta?.id || model.name;
                if (modelId === id) return model;
            }
        }

        // In allen Gruppen suchen
        for (const [groupName, models] of Object.entries(state.groups)) {
            for (const model of models || []) {
                const modelId = model.userData?.meta?.id || model.name;
                if (modelId === id) return model;

                // Auch nach FMA oder Label suchen als Fallback
                if (model.userData?.meta?.fma === id ||
                    model.userData?.meta?.label === id) {
                    return model;
                }
            }
        }

        return null;
    }

    /**
     * Extrahiert die Farbe eines Modells
     */
    extractColor(model) {
        if (!model) return null;
        let color = null;

        model.traverse(child => {
            if (child.isMesh && child.material && !color) {
                if (child.material.color) {
                    color = child.material.color.getHex();
                }
            }
        });

        return color;
    }

    /**
     * Extrahiert die Transparenz eines Modells
     */
    extractOpacity(model) {
        if (!model) return 1;
        let opacity = 1;

        model.traverse(child => {
            if (child.isMesh && child.material) {
                if (child.material.opacity !== undefined) {
                    opacity = Math.min(opacity, child.material.opacity);
                }
            }
        });

        return opacity;
    }

    /**
     * Validiert Import-Daten
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.collection || !Array.isArray(data.collection)) return false;
        if (!data.version) return false;

        // Version Kompatibilitäts-Check
        const majorVersion = parseInt(data.version.split('.')[0]);
        const currentMajor = parseInt(this.version.split('.')[0]);

        if (majorVersion > currentMajor) {
            console.warn('⚠️ Import-Datei hat neuere Version:', data.version);
        }

        return true;
    }

    /**
     * Gruppen-Statistiken für Export
     */
    getGroupStatistics() {
        const stats = {};
        state.collection.forEach(item => {
            const group = item.group || 'unknown';
            stats[group] = (stats[group] || 0) + 1;
        });
        return stats;
    }

    /**
     * Datei lesen Helper
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Toast-Benachrichtigung anzeigen
     */
    showToast(message, type = 'info', duration = 3000) {
        // Vorhandene Toasts entfernen
        const existing = document.getElementById('collection-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'collection-toast';
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };

        toast.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 350px;
            word-wrap: break-word;
        `;

        document.body.appendChild(toast);

        // Animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Auto-remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Loading Overlay anzeigen
     */
    showSaveModal() {
        if (document.getElementById('save-modal-overlay')) return;

        if (!state.collection || state.collection.length === 0) {
            this.showToast('Die Sammlung ist leer', 'warning');
            return;
        }

        const isMobile = window.innerWidth < 768;
        const defaultName = `Sammlung_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}`;

        const overlay = document.createElement('div');
        overlay.id = 'save-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex; justify-content: center; align-items: ${isMobile ? 'flex-end' : 'center'};
            z-index: 10000;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            animation: saveModalFadeIn 0.2s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: relative;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: ${isMobile ? '20px 20px 0 0' : '20px'};
            padding: ${isMobile ? '24px 20px 32px' : '40px'};
            width: ${isMobile ? '100%' : '360px'};
            max-width: ${isMobile ? '100%' : '90vw'};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            display: flex; flex-direction: column; align-items: stretch; gap: ${isMobile ? '14px' : '20px'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            color: white; box-sizing: border-box;
        `;

        // Titel
        const title = document.createElement('div');
        title.textContent = 'Sammlung speichern';
        title.style.cssText = `
            font-size: ${isMobile ? '16px' : '17px'};
            font-weight: 600;
            color: rgba(255,255,255,0.92);
            text-align: center;
            padding-top: 4px;
        `;

        // Hinweis
        const hint = document.createElement('div');
        hint.textContent = `${state.collection.length} Struktur${state.collection.length !== 1 ? 'en' : ''} werden gespeichert`;
        hint.style.cssText = `
            font-size: 12px;
            color: rgba(255,255,255,0.4);
            text-align: center;
            margin-top: -10px;
        `;

        // Input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultName;
        input.placeholder = 'Dateiname';
        input.style.cssText = `
            width: 100%; box-sizing: border-box;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(74,158,255,0.45);
            border-radius: 10px;
            padding: ${isMobile ? '14px 14px' : '12px 14px'};
            font-size: ${isMobile ? '16px' : '14px'};
            color: white;
            outline: none;
            transition: border-color 0.2s;
            font-family: inherit;
        `;
        input.addEventListener('focus', () => {
            input.style.borderColor = 'rgba(74,158,255,0.9)';
            input.select();
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = 'rgba(74,158,255,0.45)';
        });

        // Dateiendung-Anzeige
        const extHint = document.createElement('div');
        extHint.textContent = `Wird gespeichert als: ${defaultName}${this.fileExtension}`;
        extHint.style.cssText = `
            font-size: 11px;
            color: rgba(255,255,255,0.35);
            text-align: center;
            margin-top: -8px;
        `;
        input.addEventListener('input', () => {
            const val = input.value.trim() || defaultName;
            extHint.textContent = `Wird gespeichert als: ${val}${this.fileExtension}`;
        });

        // Speichern-Button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Speichern';
        saveBtn.style.cssText = `
            width: 100%;
            padding: ${isMobile ? '15px' : '12px'};
            background: linear-gradient(135deg, #4A9EFF, #FF7A4A);
            color: white; border: none;
            border-radius: 12px;
            font-size: ${isMobile ? '15px' : '14px'};
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.15s;
            -webkit-tap-highlight-color: transparent;
        `;
        saveBtn.addEventListener('mouseenter', () => { saveBtn.style.opacity = '0.88'; saveBtn.style.transform = 'translateY(-1px)'; });
        saveBtn.addEventListener('mouseleave', () => { saveBtn.style.opacity = '1'; saveBtn.style.transform = ''; });

        // ✕-Button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute; top: 14px; right: 18px;
            background: none; border: none; color: rgba(255,255,255,0.5);
            font-size: ${isMobile ? '20px' : '18px'};
            cursor: pointer; line-height: 1;
            transition: color 0.2s;
            padding: ${isMobile ? '6px' : '0'};
            -webkit-tap-highlight-color: transparent;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'rgba(255,255,255,0.9)');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,0.5)');

        const style = document.createElement('style');
        style.id = 'save-modal-style';
        style.textContent = `@keyframes saveModalFadeIn { from { opacity:0; } to { opacity:1; } }`;
        document.head.appendChild(style);

        const closeModal = () => {
            overlay.remove();
            document.getElementById('save-modal-style')?.remove();
        };

        const doSave = () => {
            const name = input.value.trim() || defaultName;
            closeModal();
            this.exportCollection(name);
        };

        saveBtn.addEventListener('click', doSave);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); if (e.key === 'Escape') closeModal(); });
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(hint);
        modal.appendChild(input);
        modal.appendChild(extHint);
        modal.appendChild(saveBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Input fokussieren (kurz verzögert wegen Animation)
        setTimeout(() => input.focus(), 50);
    }

    showDropModal(fileInput) {
        if (document.getElementById('drop-modal-overlay')) return;

        const isMobile = window.innerWidth < 768;

        const overlay = document.createElement('div');
        overlay.id = 'drop-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex; justify-content: center; align-items: ${isMobile ? 'flex-end' : 'center'};
            z-index: 10000;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            animation: dropModalFadeIn 0.2s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: ${isMobile ? '20px 20px 0 0' : '20px'};
            padding: ${isMobile ? '24px 20px 32px' : '40px'};
            width: ${isMobile ? '100%' : '360px'};
            max-width: ${isMobile ? '100%' : '90vw'};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            display: flex; flex-direction: column; align-items: center; gap: ${isMobile ? '14px' : '20px'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            color: white;
        `;

        const dropZone = document.createElement('div');
        dropZone.id = 'drop-zone';
        dropZone.style.cssText = `
            width: 100%; min-height: ${isMobile ? '100px' : '160px'};
            border: 2px dashed rgba(74, 158, 255, 0.6);
            border-radius: 14px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 10px;
            background: rgba(74, 158, 255, 0.07);
            cursor: pointer;
            transition: all 0.2s ease;
            padding: ${isMobile ? '20px' : '24px'};
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        `;
        dropZone.innerHTML = isMobile ? `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(74,158,255,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.9);">Datei auswählen</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.45);">.json oder .bluebody</span>
        ` : `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(74,158,255,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style="font-size:15px;font-weight:600;color:rgba(255,255,255,0.9);">Sammlung hier ablegen</span>
            <span style="font-size:12px;color:rgba(255,255,255,0.45);">.json oder .bluebody</span>
        `;

        const fileLink = document.createElement('a');
        fileLink.href = '#';
        fileLink.textContent = isMobile ? 'Dateimanager öffnen' : 'Dateimanager öffnen';
        fileLink.style.cssText = `
            font-size: ${isMobile ? '14px' : '13px'};
            color: rgba(74, 158, 255, 0.9);
            text-decoration: none;
            border-bottom: 1px solid rgba(74, 158, 255, 0.4);
            padding-bottom: 1px;
            transition: color 0.2s;
            ${isMobile ? 'padding: 10px 0; display: block;' : ''}
        `;
        fileLink.addEventListener('mouseenter', () => fileLink.style.color = 'rgba(74,158,255,1)');
        fileLink.addEventListener('mouseleave', () => fileLink.style.color = 'rgba(74,158,255,0.9)');

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute; top: 14px; right: 18px;
            background: none; border: none; color: rgba(255,255,255,0.5);
            font-size: ${isMobile ? '20px' : '18px'};
            cursor: pointer; line-height: 1;
            transition: color 0.2s;
            padding: ${isMobile ? '6px' : '0'};
            -webkit-tap-highlight-color: transparent;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'rgba(255,255,255,0.9)');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,0.5)');
        modal.style.position = 'relative';

        const style = document.createElement('style');
        style.id = 'drop-modal-style';
        style.textContent = `
            @keyframes dropModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            #drop-zone.drag-over {
                border-color: rgba(74,158,255,1);
                background: rgba(74,158,255,0.18);
                transform: scale(1.02);
            }
            #drop-zone:active {
                background: rgba(74,158,255,0.15);
            }
        `;
        document.head.appendChild(style);

        const closeModal = () => {
            overlay.remove();
            document.getElementById('drop-modal-style')?.remove();
        };

        const handleFile = (file) => {
            if (!file) return;
            closeModal();
            const fakeEvent = { target: { files: [file], value: '' } };
            this.importCollection(fakeEvent);
        };

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            closeModal();
            handleFile(e.dataTransfer.files?.[0]);
        });
        // Klick auf Drop-Zone öffnet Dateimanager → Modal schließen, originaler Handler übernimmt
        dropZone.addEventListener('click', () => { closeModal(); fileInput.click(); });

        // Dateimanager-Link
        fileLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
            fileInput.click();
        });

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        modal.appendChild(closeBtn);
        modal.appendChild(dropZone);
        modal.appendChild(fileLink);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    showLoadingOverlay(message = 'Lade...') {
        this.hideLoadingOverlay(); // Vorhandene entfernen

        const overlay = document.createElement('div');
        overlay.id = 'import-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>${message}</h3>
                <p id="loading-text">Vorbereitung...</p>
            </div>
        `;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            }
            
            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.2);
                border-top: 4px solid #4CAF50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-content h3 {
                margin: 10px 0;
                font-size: 20px;
                font-weight: 500;
            }
            
            .loading-content p {
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    /**
     * Loading Text aktualisieren
     */
    updateLoadingText(text) {
        const element = document.getElementById('loading-text');
        if (element) element.textContent = text;
    }

    /**
     * Loading Overlay verstecken
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('import-loading-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * Bestätigungs-Dialog
     */
    showConfirmDialog(title, message) {
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.id = 'confirm-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="dialog-buttons">
                        <button id="confirm-yes">Ja, fortfahren</button>
                        <button id="confirm-no">Abbrechen</button>
                    </div>
                </div>
            `;

            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
                backdrop-filter: blur(5px);
            `;

            const style = document.createElement('style');
            style.textContent = `
                .dialog-content {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                }
                
                .dialog-content h3 {
                    margin: 0 0 15px 0;
                    color: #333;
                    font-size: 20px;
                }
                
                .dialog-content p {
                    color: #666;
                    line-height: 1.5;
                    margin: 0 0 25px 0;
                }
                
                .dialog-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                .dialog-buttons button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                
                #confirm-yes {
                    background: #4CAF50;
                    color: white;
                }
                
                #confirm-yes:hover {
                    background: #45a049;
                }
                
                #confirm-no {
                    background: #f0f0f0;
                    color: #333;
                }
                
                #confirm-no:hover {
                    background: #e0e0e0;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(dialog);

            // Event Listeners
            document.getElementById('confirm-yes').onclick = () => {
                dialog.remove();
                resolve(true);
            };

            document.getElementById('confirm-no').onclick = () => {
                dialog.remove();
                resolve(false);
            };
        });
    }
}

// Singleton-Instanz exportieren
export const collectionManager = new CollectionManager();

// Auto-Init beim Import - mit Verzögerung für DOM-Bereitschaft
if (typeof document !== 'undefined') {
    // Mehrere Versuche um sicherzustellen, dass DOM bereit ist
    const initializeButtons = () => {
        // Prüfen ob Clear-Button existiert
        if (document.getElementById('btn-clear-set')) {
            collectionManager.setupUI();
        } else {
            // Nochmal in 500ms versuchen
            setTimeout(() => {
                collectionManager.setupUI();
            }, 500);
        }
    };

    // Bei DOMContentLoaded initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeButtons);
    } else {
        // DOM bereits geladen
        setTimeout(initializeButtons, 100);
    }
}