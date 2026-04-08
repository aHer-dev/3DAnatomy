// js/ui/toolbar.js
// Werkzeug-Toolbar: Select | Multi | Box | Fokus/360°

import { camera } from '../core/camera.js';
import { controls } from '../core/controls.js';
import { focusOnObject, setCameraDirection } from '../core/cameraUtils.js';
import { state } from '../store/state.js';

export const TOOL = {
    SELECT: 'select',
    MULTI:  'multi',
    BOX:    'box',
    FOCUS:  'focus',
};

let _activeTool = TOOL.SELECT;
let _focusState  = null; // { center, radius } des aktuell fokussierten Objekts
const _listeners = new Set();

export function getActiveTool() { return _activeTool; }

export function setActiveTool(tool) {
    if (!Object.values(TOOL).includes(tool)) return;
    _activeTool = tool;

    if (tool === TOOL.FOCUS) {
        _triggerFocus();
    } else {
        _hideDirPanel();
    }

    _updateUI();
    _listeners.forEach(fn => fn(tool));
}

export function onToolChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

// ─── Fokus-Logik ─────────────────────────────────────────────────────────────

function _triggerFocus() {
    const model = state.selected?.root || state.currentlySelected || null;
    if (!model) {
        // Kein Modell ausgewählt → Panel trotzdem zeigen,
        // aktuelles Orbit-Zentrum und Abstand als Referenz nutzen
        _focusState = {
            center: controls.target.clone(),
            radius: camera.position.distanceTo(controls.target),
        };
        _showDirPanel();
        return;
    }
    _focusState = focusOnObject(camera, controls, model);
    if (_focusState) _showDirPanel();
}

// ─── Richtungs-Panel (erscheint über der Toolbar) ────────────────────────────

const DIRS = [
    { id: 'cranial',   label: 'Kran' },
    { id: 'anterior',  label: 'Ant'  },
    { id: 'posterior', label: 'Post' },
    { id: 'caudal',    label: 'Kaud' },
    { id: 'left',      label: 'Li'   },
    { id: 'right',     label: 'Re'   },
];

function _showDirPanel() {
    let panel = document.getElementById('toolbar-dir-panel');
    if (panel) { panel.style.display = 'flex'; return; }

    panel = document.createElement('div');
    panel.id = 'toolbar-dir-panel';

    DIRS.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.className = 'dir-btn';
        btn.textContent = label;
        btn.title = _dirTitle(id);
        btn.addEventListener('click', () => {
            if (_focusState) {
                setCameraDirection(camera, controls, _focusState.center, _focusState.radius, id);
            }
        });
        panel.appendChild(btn);
    });

    // Panel über der Toolbar einhängen
    const toolbar = document.getElementById('anatomy-toolbar');
    toolbar?.parentElement?.insertBefore(panel, toolbar);
}

function _hideDirPanel() {
    const panel = document.getElementById('toolbar-dir-panel');
    if (panel) panel.style.display = 'none';
    _focusState = null;
}

function _dirTitle(id) {
    return {
        cranial:   'Von kranial (oben)',
        caudal:    'Von kaudal (unten)',
        anterior:  'Von anterior (vorne)',
        posterior: 'Von posterior (hinten)',
        left:      'Von links',
        right:     'Von rechts',
    }[id] || id;
}

// ─── Layer-Gruppen (Skelett & Muskulatur) ────────────────────────────────────

const LAYER_GROUPS = {
    bones:   ['bones', 'cartilage', 'teeth'],
    muscles: ['muscles', 'ligaments'],
};

const _layerState = {
    bones:   true,   // default AN
    muscles: false,  // default AUS
};

export function getLayerActive(system) {
    return _layerState[system] ?? true;
}

export function syncToolbarLayerButtons() {
    Object.keys(LAYER_GROUPS).forEach((system) => {
        const groups = LAYER_GROUPS[system] || [];
        _layerState[system] = groups.some((group) => (state.groups[group]?.length ?? 0) > 0);
    });

    document.querySelectorAll('.toolbar-layer-btn').forEach((btn) => {
        const system = btn.dataset.system;
        const isActive = !!_layerState[system];
        btn.classList.toggle('layer-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

async function _toggleLayer(system, btn) {
    const groups = LAYER_GROUPS[system];
    const isLoaded = groups.some(g => (state.groups[g]?.length ?? 0) > 0);

    btn.disabled = true;
    btn.classList.add('toolbar-btn--loading');
    const label = btn.querySelector('.toolbar-label');
    const originalLabel = label?.textContent || '';
    if (label) label.textContent = isLoaded ? 'Entlade…' : 'Lade…';

    try {
        if (isLoaded) {
            const { unloadGroupSilent } = await import('../bootstrap/initGroupLoader.js');
            for (const g of groups) await unloadGroupSilent(g);
            _layerState[system] = false;
        } else {
            const { loadGroupByName } = await import('../features/modelLoader-core.js');
            const { showLoadingBar, hideLoadingBar } = await import('../modelLoader/progress.js');
            showLoadingBar();
            try {
                for (const g of groups) await loadGroupByName(g, { centerCamera: false });
            } finally {
                hideLoadingBar();
            }
            _layerState[system] = true;
        }
    } catch (e) {
        console.warn('Layer-Toggle Fehler:', e);
    }

    btn.disabled = false;
    btn.classList.remove('toolbar-btn--loading');
    if (label) label.textContent = originalLabel;
    btn.classList.toggle('layer-active', _layerState[system]);
    btn.setAttribute('aria-pressed', String(_layerState[system]));

    window.requestRender?.();
}

function _buildLayerButtons(toolbar) {
    const sep = document.createElement('div');
    sep.className = 'toolbar-sep';
    toolbar.appendChild(sep);

    const layers = [
        {
            system: 'bones',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                     <path d="M9 3a2 2 0 0 1 0 4h6a2 2 0 0 1 0-4"/>
                     <path d="M9 21a2 2 0 0 0 0-4h6a2 2 0 0 0 0 4"/>
                     <line x1="9.5" y1="7" x2="9.5" y2="17"/>
                     <line x1="14.5" y1="7" x2="14.5" y2="17"/>
                   </svg>`,
            label: 'Knochen',
            title: 'Knochen / Knorpel / Zähne ein-/ausblenden',
        },
        {
            system: 'muscles',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M7 19c-1-2-1-5 1-8l3-6c.5-1 1.5-1 2 0l1 2c1.5-1.5 3-1 3.5 1l.5 3c.5 2 0 4-1 5.5"/>
                     <path d="M7 19 Q12 22 17 19"/>
                   </svg>`,
            label: 'Muskeln',
            title: 'Muskeln ein-/ausblenden',
        },
    ];

    layers.forEach(({ system, icon, label, title }) => {
        const btn = document.createElement('button');
        btn.className = 'toolbar-btn toolbar-layer-btn';
        btn.dataset.system = system;
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.setAttribute('aria-pressed', String(_layerState[system]));
        btn.innerHTML = `${icon}<span class="toolbar-label">${label}</span>`;

        if (_layerState[system]) btn.classList.add('layer-active');

        btn.addEventListener('click', () => _toggleLayer(system, btn));

        toolbar.appendChild(btn);
    });
}

// ─── Toolbar aufbauen ────────────────────────────────────────────────────────

let _expanded = false;

export function setupToolbar() {
    if (document.getElementById('anatomy-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'anatomy-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Werkzeuge');

    const tools = [
        {
            id: TOOL.SELECT,
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M5 3l14 9-7 1-4 7z"/>
                   </svg>`,
            label: 'Auswählen',
            title: 'Einzelauswahl (Klick)',
            collapsible: false,
        },
        {
            id: TOOL.MULTI,
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M5 3l14 9-7 1-4 7z"/>
                     <circle cx="18" cy="6" r="4" fill="currentColor" stroke="none"/>
                     <line x1="16" y1="6" x2="20" y2="6"/>
                     <line x1="18" y1="4" x2="18" y2="8"/>
                   </svg>`,
            label: 'Mehrfach',
            title: 'Mehrfachauswahl (Klick zum Hinzufügen)',
            collapsible: true,
        },
        {
            id: TOOL.BOX,
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2">
                     <rect x="4" y="4" width="16" height="16" rx="1"/>
                   </svg>`,
            label: 'Rechteck',
            title: 'Rechteck-Auswahl (Ziehen)',
            collapsible: true,
        },
        {
            id: TOOL.FOCUS,
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <circle cx="12" cy="12" r="3"/>
                     <path d="M3 12h2M19 12h2M12 3v2M12 19v2"/>
                     <path d="M5.6 5.6l1.4 1.4M16.9 16.9l1.5 1.5M5.6 18.4l1.4-1.4M16.9 7.1l1.5-1.5"/>
                   </svg>`,
            label: '360°',
            title: 'Auf Auswahl fokussieren + Ansicht wählen',
            collapsible: true,
        },
    ];

    tools.forEach(({ id, icon, label, title, collapsible }) => {
        const btn = document.createElement('button');
        btn.className = 'toolbar-btn';
        if (collapsible) btn.classList.add('toolbar-btn--collapsible');
        btn.dataset.tool = id;
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.innerHTML = `${icon}<span class="toolbar-label">${label}</span>`;
        btn.addEventListener('click', () => setActiveTool(id));
        toolbar.appendChild(btn);
    });

    // Pfeil-Toggle-Button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toolbar-toggle';
    toggleBtn.className = 'toolbar-toggle-btn';
    toggleBtn.title = 'Weitere Werkzeuge';
    toggleBtn.setAttribute('aria-label', 'Weitere Werkzeuge ein-/ausblenden');
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
    </svg>`;
    toggleBtn.addEventListener('click', () => _toggleExpand(toggleBtn));
    // Den Toggle-Button nach dem SELECT-Button einfügen (vor den collapsible Buttons)
    const firstCollapsible = toolbar.querySelector('.toolbar-btn--collapsible');
    toolbar.insertBefore(toggleBtn, firstCollapsible);

    _buildLayerButtons(toolbar);

    document.body.appendChild(toolbar);
    _updateUI();
}


function _toggleExpand(toggleBtn) {
    _expanded = !_expanded;
    document.querySelectorAll('.toolbar-btn--collapsible').forEach(btn => {
        btn.classList.toggle('toolbar-btn--visible', _expanded);
    });
    toggleBtn.classList.toggle('toolbar-toggle-btn--open', _expanded);
}

function _updateUI() {
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === _activeTool);
    });
}
