/**
 * @file ui-presets.js
 * @description Preset-Bibliothek – zeigt Presets aus data/presets/index.json
 *
 * Preset hinzufügen:
 *   1. .bluebody Datei in data/presets/ legen
 *   2. Eintrag in data/presets/index.json hinzufügen
 *   3. git push
 */

import { state }                          from '../store/state.js';
import { loadGroupByName }                from '../features/modelLoader-core.js';
import { setModelColor, setModelOpacity } from '../features/appearance.js';
import { updateSetList, showCollectionRobust } from './ui-set.js';

const MANIFEST_PATH = 'data/presets/index.json';

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'info', duration = 3000) {
  document.getElementById('collection-toast')?.remove();
  const colors = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
  const toast = document.createElement('div');
  toast.id = 'collection-toast';
  toast.textContent = message;
  toast.style.cssText = `position:fixed;top:70px;right:20px;background:${colors[type]};
    color:white;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;
    font-size:14px;font-weight:bold;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3);
    opacity:0;transform:translateX(100%);transition:all .3s ease;
    max-width:320px;word-wrap:break-word`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Manifest laden ───────────────────────────────────────────────────────────

async function loadManifest() {
  try {
    const res = await fetch(`${MANIFEST_PATH}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('⚠️ Preset-Manifest konnte nicht geladen werden:', err);
    return { presets: [] };
  }
}

// ─── Preset anwenden ─────────────────────────────────────────────────────────

async function applyPreset(preset) {
  const label = document.getElementById('preset-btn-label');
  const btn   = document.getElementById('btn-preset');
  if (label) label.textContent = 'Lädt…';
  if (btn)   btn.disabled = true;
  closeDropdown();

  try {
    const res = await fetch(`data/presets/${encodeURIComponent(preset.file)}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`Datei nicht gefunden: ${preset.file}`);
    const data = await res.json();

    if (!data.collection || !Array.isArray(data.collection)) {
      throw new Error('Ungültiges Preset-Format');
    }

    // Overlay
    _showOverlay(`Lade: ${preset.name}`);

    // Gruppen laden
    const needed = [...new Set(data.collection.map(i => i.group).filter(Boolean))];
    for (const group of needed) {
      if (!state.groups[group] || state.groups[group].length === 0) {
        _setOverlayText(`Lade ${group}…`);
        try { await loadGroupByName(group, { centerCamera: false }); }
        catch (e) { console.error(`Gruppe "${group}" konnte nicht geladen werden:`, e); }
      }
    }

    // Sammlung aufbauen
    state.collection = [];
    _setOverlayText('Wende Preset an…');

    for (const item of data.collection) {
      const model = _findModel(item.id, item.group);
      if (!model) { console.warn(`⚠️ Nicht gefunden: ${item.name}`); continue; }
      if (item.color  != null) setModelColor(model, item.color);
      if (item.opacity != null) setModelOpacity(model, item.opacity);
      state.collection.push({
        id: item.id, name: item.name, group: item.group,
        meta: item.meta || {}, color: item.color,
        opacity: item.opacity, visible: item.visible !== false, model,
      });
    }

    updateSetList();
    _hideOverlay();
    await showCollectionRobust();

  } catch (err) {
    _hideOverlay();
    showToast(`Fehler: ${err.message}`, 'error');
  } finally {
    if (label) label.textContent = 'Presets';
    if (btn)   btn.disabled = false;
  }
}

// ─── Modell-Suche ─────────────────────────────────────────────────────────────

function _findModel(id, groupHint) {
  if (!id) return null;
  const sid = String(id);
  if (groupHint && state.groups[groupHint]) {
    for (const m of state.groups[groupHint]) if (_match(m, sid)) return m;
  }
  for (const models of Object.values(state.groups)) {
    for (const m of models || []) if (_match(m, sid)) return m;
  }
  return null;
}
function _match(model, sid) {
  return String(model.userData?.meta?.id  ?? '') === sid ||
         String(model.userData?.meta?.fma ?? '') === sid ||
         String(model.name)                       === sid;
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

function _showOverlay(title) {
  _hideOverlay();
  const el = document.createElement('div');
  el.id = 'preset-overlay';
  el.innerHTML = `
    <div style="text-align:center;color:white;font-family:Arial,sans-serif">
      <div style="width:48px;height:48px;border:3px solid #333;border-top:3px solid #FF7A4A;
                  border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
      <h3 style="margin:0 0 8px">${title}</h3>
      <p id="preset-overlay-text" style="margin:0;opacity:.7;font-size:14px">Vorbereitung…</p>
    </div>`;
  el.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,.88);display:flex;justify-content:center;
    align-items:center;z-index:10000;backdrop-filter:blur(4px)`;
  document.body.appendChild(el);
}
function _setOverlayText(t) { const e = document.getElementById('preset-overlay-text'); if (e) e.textContent = t; }
function _hideOverlay()      { document.getElementById('preset-overlay')?.remove(); }

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function closeDropdown() {
  document.getElementById('preset-dropdown-list')?.classList.remove('preset-dropdown--open');
  document.getElementById('btn-preset')?.setAttribute('aria-expanded', 'false');
}

function _renderDropdown(list, presets) {
  list.innerHTML = '';

  if (presets.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'preset-item preset-item--empty';
    empty.textContent = 'Keine Presets vorhanden';
    list.appendChild(empty);
    return;
  }

  const useCategories = presets.some(p => p.category && p.category.trim());

  if (useCategories) {
    _renderCategorized(list, presets);
  } else {
    presets.forEach(p => list.appendChild(_makeItem(p)));
  }
}

function _makeItem(preset) {
  const li = document.createElement('li');
  li.className = 'preset-item';
  li.setAttribute('role', 'option');
  li.setAttribute('tabindex', '0');
  const name = document.createElement('span');
  name.className = 'preset-item__name';
  name.textContent = preset.name;
  li.appendChild(name);
  if (preset.description) {
    const desc = document.createElement('span');
    desc.className = 'preset-item__desc';
    desc.textContent = preset.description;
    li.appendChild(desc);
  }
  li.addEventListener('click', () => applyPreset(preset));
  li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') applyPreset(preset); });
  return li;
}

function _renderCategorized(list, presets) {
  const tree = new Map();
  for (const p of presets) {
    const parts = (p.category || '').split('/').map(s => s.trim());
    const main = parts[0] || 'Weitere';
    const sub  = parts[1] || '';
    if (!tree.has(main)) tree.set(main, new Map());
    const subMap = tree.get(main);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(p);
  }

  const ORDER = ['Knochen', 'Muskeln', 'Organe', 'Nerven', 'Gefäße', 'Weitere'];
  const sorted = [...tree.keys()].sort((a, b) => {
    const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, 'de');
  });

  for (const main of sorted) {
    const subMap = tree.get(main);
    const lbl = document.createElement('li');
    lbl.className = 'preset-section-label';
    lbl.textContent = main;
    list.appendChild(lbl);

    for (const [sub, items] of subMap) {
      if (sub) {
        const sl = document.createElement('li');
        sl.className = 'preset-subsection-label';
        sl.textContent = sub;
        list.appendChild(sl);
      }
      for (const p of items) {
        const item = _makeItem(p);
        if (sub) item.classList.add('preset-item--indented');
        list.appendChild(item);
      }
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function setupPresetsUI() {
  const container = document.getElementById('preset-control');
  const btn       = document.getElementById('btn-preset');
  const list      = document.getElementById('preset-dropdown-list');
  if (!container || !btn || !list) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = list.classList.toggle('preset-dropdown--open');
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', e => {
    if (!container.contains(e.target)) closeDropdown();
  });

  const manifest = await loadManifest();
  _renderDropdown(list, manifest.presets || []);
}
