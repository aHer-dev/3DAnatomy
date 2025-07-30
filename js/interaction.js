import * as THREE from './three.module.js';
import { scene, camera } from './init.js';
import { state } from './state.js';
import { getMeta } from './utils.js';

export function setupInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Initialisiere Panel als offen
    const controls = document.getElementById('controls');
    if (controls) {
        controls.style.display = 'block';
        console.log('Panel initial offen gesetzt');
    }

    document.getElementById('menu-icon').addEventListener('click', () => {
        window.toggleMenu();
        const menuIcon = document.getElementById('menu-icon');
        menuIcon.classList.toggle('open');
    });

    // Kein Schließen bei externen Klicks (auskommentiert)
    /*
    document.addEventListener('click', (event) => {
        setTimeout(() => {
            const controls = document.getElementById('controls');
            const menuIcon = document.getElementById('menu-icon');
            const clickedInsideControls = controls.contains(event.target);
            const clickedMenuIcon = menuIcon.contains(event.target);
            if (!clickedInsideControls && !clickedMenuIcon) {
                if (controls.style.display === 'block') {
                    controls.style.display = 'none';
                    console.log('Menü wurde geschlossen (nach Timeout)');
                }
            } else {
                console.log('Menü bleibt offen (Klick innerhalb)');
            }
        }, 10);
    });
    */
}

function showInfoPanel(meta) {
    console.log('showInfoPanel aufgerufen mit meta:', meta);
    const infoContent = document.getElementById('info-content');
    if (!infoContent) {
        console.error('info-content nicht gefunden');
        return;
    }

    infoContent.innerHTML = `
        <p><strong>Label:</strong> ${meta.label}</p>
        ${meta.fma ? `<p><strong>FMA-ID:</strong> ${meta.fma}</p>` : ''}
        ${meta.group ? `<p><strong>Gruppe:</strong> ${meta.group}</p>` : ''}
        ${meta.subgroup && meta.subgroup !== 'none' ? `<p><strong>Subgruppe:</strong> ${meta.subgroup}</p>` : ''}
        ${meta.side && meta.side !== 'none' ? `<p><strong>Seite:</strong> ${meta.side}</p>` : ''}
        ${meta.info?.origin ? `<p><strong>Ursprung:</strong> ${meta.info.origin}</p>` : ''}
        ${meta.info?.insertion ? `<p><strong>Ansatz:</strong> ${meta.info.insertion}</p>` : ''}
        ${meta.info?.function ? `<p><strong>Funktion:</strong> ${meta.info.function}</p>` : ''}
    `;

    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) {
        console.error('info-panel nicht gefunden');
        return;
    }

    infoPanel.classList.remove('hidden');
    infoPanel.classList.add('visible');
    console.log('Info-Panel angezeigt');
}

function hideInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    infoPanel.classList.add('hidden');
    infoPanel.classList.remove('visible');
    document.getElementById('info-content').innerHTML = '';
    if (state.currentlySelected?.material?.emissive) {
        state.currentlySelected.material.emissive.setHex(0x000000);
    }
    state.currentlySelected = null;
}

function highlightObject(object) {
    if (state.currentlySelected) {
        state.currentlySelected.material.emissive?.setHex(0x000000);
    }
    if (object.material.emissive) {
        object.material.emissive.setHex(0x222222);
    }
    state.currentlySelected = object;
}

window.toggleMenu = function () {
    const controls = document.getElementById('controls');
    const isVisible = controls.style.display === 'block';

    controls.style.display = isVisible ? 'none' : 'block';
    console.log('ToggleMenu: display = ' + controls.style.display);

    if (!isVisible) {
        document.querySelectorAll('[id$="-sub-dropdown"]').forEach(drop => {
            drop.style.display = 'none';
        });
        document.querySelectorAll('.dropdown-content').forEach(content => {
            content.style.display = 'none';
        });
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
};

window.toggleLicense = function () {
    const dropdown = document.getElementById('license-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
};