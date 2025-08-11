// js/bootstrap/initGroupLoader.js
// 📦 Initialisiert das dynamische Laden anatomischer Gruppen (z. B. Muskeln) durch Buttons

import { createGLTFLoader } from '../loaders/gltfLoaderFactory.js';
import { loadModels, showLoadingBar, hideLoadingBar } from '../modelLoader/index.js';
import { scene } from '../core/scene.js';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';

/**
 * Fügt EventListener zu Gruppenbuttons hinzu (z. B. Muskeln).
 * Ladeprozess mit DRACO-Kompression und Fortschrittsanzeige.
 */
export function initDynamicGroupLoading() {
    const loader = createGLTFLoader();

    // Liste aller möglichen Gruppen aus den Buttons
    const buttonGroups = [
        'bones', 'muscles', 'tendons', 'ligaments',
        'arteries', 'brain', 'cartilage', 'ear',
        'eyes', 'glands', 'heart', 'lungs',
        'nerves', 'organs', 'skin_hair', 'teeth', 'veins'
    ];

    console.log('🔍 Suche Gruppen-Buttons...');
    let boundCount = 0;

    // Für jede Gruppe einen Event-Listener binden
    buttonGroups.forEach(groupName => {
        const btnId = `btn-load-${groupName}`;
        const btn = document.getElementById(btnId);

        if (!btn) {
            console.warn(`⚠️ Button nicht gefunden: ${btnId}`);
            return;
        }

        // Event-Listener hinzufügen
        btn.addEventListener('click', async () => {
            console.log(`🔄 Lade Gruppe: ${groupName}`);

            // Metadaten für diese Gruppe holen
            const entries = state.groupedMeta?.[groupName] || [];

            if (!entries.length) {
                console.warn(`⚠️ Keine Modelle für Gruppe "${groupName}" in Metadaten gefunden`);
                alert(`Keine Modelle für "${groupName}" verfügbar.`);
                return;
            }

            try {
                btn.disabled = true;
                btn.textContent = `${groupName} lädt...`;
                showLoadingBar();

                // Modelle laden
                await loadModels(
                    entries,
                    groupName,
                    false, // centerCamera
                    scene,
                    loader,
                    camera,
                    controls,
                    renderer
                );

                // Status aktualisieren
                state.groupStates[groupName] = true;

                console.log(`✅ Gruppe "${groupName}" geladen (${entries.length} Modelle)`);

                // Button-Text aktualisieren
                btn.textContent = `${groupName} ✓`;
                btn.style.backgroundColor = '#2a5a2a'; // Grün wenn geladen

            } catch (err) {
                console.error(`❌ Fehler beim Laden von "${groupName}":`, err);
                alert(`Fehler beim Laden von "${groupName}": ${err.message}`);
                btn.textContent = `${groupName} ❌`;
            } finally {
                hideLoadingBar();
                btn.disabled = false;
            }
        });

        boundCount++;
        console.log(`✅ Button gebunden: ${btnId}`);
    });

    // Legacy-Support für "tendons" -> "ligaments"
    const tendonsBtn = document.getElementById('btn-load-tendons');
    if (tendonsBtn && state.groupedMeta?.ligaments) {
        tendonsBtn.addEventListener('click', async () => {
            console.log('🔄 Lade ligaments über tendons-Button (Legacy)');

            const entries = state.groupedMeta.ligaments || [];
            if (!entries.length) {
                alert('Keine Bänder/Sehnen verfügbar.');
                return;
            }

            try {
                tendonsBtn.disabled = true;
                showLoadingBar();

                await loadModels(
                    entries,
                    'ligaments',
                    false,
                    scene,
                    loader,
                    camera,
                    controls,
                    renderer
                );

                state.groupStates.ligaments = true;
                console.log('✅ Ligaments über tendons-Button geladen');

            } catch (err) {
                console.error('❌ Fehler:', err);
            } finally {
                hideLoadingBar();
                tendonsBtn.disabled = false;
            }
        });
        boundCount++;
    }

    console.log(`📦 Dynamisches Gruppenladen initialisiert (${boundCount} Buttons gebunden)`);

    // Debug: Zeige verfügbare Gruppen in Metadaten
    if (state.groupedMeta) {
        const availableGroups = Object.keys(state.groupedMeta);
        console.log('📊 Verfügbare Gruppen in Metadaten:', availableGroups);

        availableGroups.forEach(group => {
            const count = state.groupedMeta[group]?.length || 0;
            console.log(`  - ${group}: ${count} Modelle`);
        });
    } else {
        console.error('❌ state.groupedMeta ist nicht initialisiert!');
    }
}