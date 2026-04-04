// js/interaction/boxSelect.js
// Rechteck-Auswahl: aktiv wenn Tool === BOX, OrbitControls wird kurz pausiert

import * as THREE from 'three';
import { camera } from '../core/camera.js';
import { renderer } from '../core/renderer.js';
import { controls } from '../core/controls.js';
import { state } from '../store/state.js';
import { addToMultiSelect } from './multiSelect.js';
import { getActiveTool, TOOL, onToolChange, setActiveTool } from '../ui/toolbar.js';

const _v   = new THREE.Vector3();
const _box = new THREE.Box3();
const DRAG_MIN_PX = 8;

function getModelRoot(mesh) {
    let cur = mesh;
    while (cur && !cur.userData?.isModelRoot && cur.parent) cur = cur.parent;
    return cur?.userData?.isModelRoot ? cur : mesh;
}

function getMeshesInScreenRect(rect) {
    const found = new Set();
    const canvasRect = renderer.domElement.getBoundingClientRect();

    for (const mesh of (state.pickableMeshes || new Set())) {
        if (!mesh.visible || !mesh.geometry) continue;

        mesh.geometry.computeBoundingBox();
        _box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
        _box.getCenter(_v);
        _v.project(camera);

        if (_v.z > 1) continue; // hinter der Kamera

        const sx = (_v.x *  0.5 + 0.5) * canvasRect.width  + canvasRect.left;
        const sy = (_v.y * -0.5 + 0.5) * canvasRect.height + canvasRect.top;

        if (sx >= rect.left && sx <= rect.right && sy >= rect.top && sy <= rect.bottom) {
            found.add(getModelRoot(mesh));
        }
    }
    return found;
}

export function setupBoxSelect(domElement, onSelectComplete) {
    let startX, startY, isDragging = false;

    const box = document.createElement('div');
    box.id = 'selection-box';
    box.style.display = 'none';
    document.body.appendChild(box);

    function showBox(x1, y1, x2, y2) {
        box.style.left   = Math.min(x1, x2) + 'px';
        box.style.top    = Math.min(y1, y2) + 'px';
        box.style.width  = Math.abs(x2 - x1) + 'px';
        box.style.height = Math.abs(y2 - y1) + 'px';
        box.style.display = 'block';
    }

    function hideBox() { box.style.display = 'none'; }

    function getClientXY(e) {
        if (e.touches?.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onStart(e) {
        if (getActiveTool() !== TOOL.BOX) return;
        const { x, y } = getClientXY(e);
        startX = x;
        startY = y;
        isDragging = false;
        // OrbitControls pausieren damit kein Pan passiert
        controls.enabled = false;
    }

    function onMove(e) {
        if (getActiveTool() !== TOOL.BOX || startX === undefined) return;
        const { x, y } = getClientXY(e);
        const dx = x - startX, dy = y - startY;
        if (!isDragging && Math.hypot(dx, dy) > DRAG_MIN_PX) isDragging = true;
        if (isDragging) showBox(startX, startY, x, y);
    }

    function onEnd(e) {
        if (getActiveTool() !== TOOL.BOX) return;
        controls.enabled = true; // OrbitControls wieder aktivieren

        if (!isDragging) {
            startX = undefined;
            isDragging = false;
            return;
        }

        const { x, y } = e.changedTouches
            ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
            : { x: e.clientX, y: e.clientY };

        const rect = {
            left:   Math.min(startX, x),
            right:  Math.max(startX, x),
            top:    Math.min(startY, y),
            bottom: Math.max(startY, y),
        };

        hideBox();
        startX  = undefined;
        isDragging = false;

        const roots = getMeshesInScreenRect(rect);
        let added = 0;
        for (const root of roots) {
            if (addToMultiSelect(root)) added++;
        }

        // Nach Auswahl zurück zum Auswahl-Werkzeug
        setActiveTool(TOOL.SELECT);
        if (added > 0) onSelectComplete();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape' && getActiveTool() === TOOL.BOX) {
            hideBox();
            controls.enabled = true;
            startX = undefined;
            isDragging = false;
            setActiveTool(TOOL.SELECT);
        }
    }

    // Wenn Tool wechselt während Drag läuft → aufräumen
    onToolChange(tool => {
        if (tool !== TOOL.BOX && isDragging) {
            hideBox();
            controls.enabled = true;
            startX = undefined;
            isDragging = false;
        }
    });

    // Mouse
    domElement.addEventListener('pointerdown', onStart);
    domElement.addEventListener('pointermove', onMove);
    domElement.addEventListener('pointerup',   onEnd);
    // Touch
    domElement.addEventListener('touchstart', onStart, { passive: true });
    domElement.addEventListener('touchmove',  onMove,  { passive: true });
    domElement.addEventListener('touchend',   onEnd);
    window.addEventListener('keydown', onKeyDown);

    return () => {
        domElement.removeEventListener('pointerdown', onStart);
        domElement.removeEventListener('pointermove', onMove);
        domElement.removeEventListener('pointerup',   onEnd);
        domElement.removeEventListener('touchstart',  onStart);
        domElement.removeEventListener('touchmove',   onMove);
        domElement.removeEventListener('touchend',    onEnd);
        window.removeEventListener('keydown', onKeyDown);
        box.remove();
    };
}
