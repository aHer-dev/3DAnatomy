// js/ui/photoMode.js
// Fotomodus: Rahmen, Format-Auswahl, Perspektiven, Screenshot

import { camera }             from '../core/camera.js';
import { controls }           from '../core/controls.js';
import { renderer }           from '../core/renderer.js';
import { scene }              from '../core/scene.js';
import { setCameraDirection } from '../core/cameraUtils.js';
import { hideControlsPanel }  from './ui-controls.js';

// ─── Konfiguration ───────────────────────────────────────────────────────────

const FORMATS = [
  { id: '3:4',  label: '3:4',  w: 600,  h: 800,  isDefault: true },
  { id: '1:1',  label: '1:1',  w: 800,  h: 800  },
  { id: '4:3',  label: '4:3',  w: 800,  h: 600  },
  { id: '16:9', label: '16:9', w: 1280, h: 720  },
  { id: '9:16', label: '9:16', w: 720,  h: 1280 },
];

const DIRS = [
  { id: 'cranial',   label: 'Kran', title: 'Von kranial (oben)'     },
  { id: 'anterior',  label: 'Ant',  title: 'Von anterior (vorne)'   },
  { id: 'posterior', label: 'Post', title: 'Von posterior (hinten)' },
  { id: 'caudal',    label: 'Kaud', title: 'Von kaudal (unten)'     },
  { id: 'left',      label: 'Li',   title: 'Von links'              },
  { id: 'right',     label: 'Re',   title: 'Von rechts'             },
];

// ─── Zustand ─────────────────────────────────────────────────────────────────

let _active        = false;
let _currentFormat = FORMATS[0];
let _overlay       = null;
let _sidebar       = null;
let _resizeHandler = null;

// ─── Initialisierung ─────────────────────────────────────────────────────────

export function initPhotoMode() {
  const btn = document.getElementById('btn-photo-mode');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (_active) exitPhotoMode();
    else enterPhotoMode();
  });
}

// ─── Aktivieren / Deaktivieren ───────────────────────────────────────────────

function enterPhotoMode() {
  if (_active) return;
  _active = true;

  // Steuerleiste schließen damit sie das Overlay nicht überdeckt
  hideControlsPanel?.();

  // Body-Klasse: hebt Hamburger-Icon über das Overlay (CSS z-index fix)
  document.body.classList.add('photo-mode-on');

  _buildOverlay();
  _buildSidebar();

  // Erst nach einem Tick messen, damit Sidebar im DOM ist
  requestAnimationFrame(() => {
    _updateFrame();
    _overlay?.classList.add('photo-overlay--visible');
    _sidebar?.classList.add('photo-sidebar--visible');
  });

  _resizeHandler = () => _updateFrame();
  window.addEventListener('resize', _resizeHandler);

  document.getElementById('btn-photo-mode')?.classList.add('photo-mode-active');
}

export function exitPhotoMode() {
  if (!_active) return;
  _active = false;

  _overlay?.classList.remove('photo-overlay--visible');
  _sidebar?.classList.remove('photo-sidebar--visible');

  // Nach Fade-out entfernen
  const ov = _overlay;
  const sb = _sidebar;
  setTimeout(() => { ov?.remove(); sb?.remove(); }, 280);

  _overlay = null;
  _sidebar = null;

  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler);
    _resizeHandler = null;
  }

  document.body.classList.remove('photo-mode-on');
  document.getElementById('btn-photo-mode')?.classList.remove('photo-mode-active');
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

function _buildOverlay() {
  _overlay = document.createElement('div');
  _overlay.id = 'photo-overlay';

  // 4 Abdunkelungs-Panels
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const p = document.createElement('div');
    p.className = `photo-vignette photo-vignette-${side}`;
    _overlay.appendChild(p);
  });

  // Rahmen (transparent, nur Border)
  const frame = document.createElement('div');
  frame.id = 'photo-frame';
  const lbl = document.createElement('div');
  lbl.id = 'photo-frame-label';
  frame.appendChild(lbl);
  _overlay.appendChild(frame);

  // Auslöser-Button
  const shutter = document.createElement('button');
  shutter.id = 'photo-shutter';
  shutter.setAttribute('aria-label', 'Foto aufnehmen');
  shutter.innerHTML = '<div class="shutter-ring"><div class="shutter-inner"></div></div>';
  shutter.addEventListener('click', _capturePhoto);
  _overlay.appendChild(shutter);

  // Schließen-Button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'photo-close';
  closeBtn.setAttribute('aria-label', 'Fotomodus beenden');
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
  closeBtn.addEventListener('click', exitPhotoMode);
  _overlay.appendChild(closeBtn);

  document.body.appendChild(_overlay);
}

// ─── Rechte Sidebar ──────────────────────────────────────────────────────────

function _buildSidebar() {
  _sidebar = document.createElement('div');
  _sidebar.id = 'photo-sidebar';

  // Format-Auswahl
  _addSection(_sidebar, 'Format', FORMATS.map(fmt => ({
    label:   fmt.label,
    title:   `${fmt.w} × ${fmt.h} px`,
    active:  fmt.id === _currentFormat.id,
    dataset: { fmt: fmt.id },
    onClick: () => {
      _currentFormat = fmt;
      _sidebar.querySelectorAll('[data-fmt]').forEach(b =>
        b.classList.toggle('psb-btn--active', b.dataset.fmt === fmt.id)
      );
      _updateFrame();
    },
  })));

  const sep = document.createElement('div');
  sep.className = 'psb-sep';
  _sidebar.appendChild(sep);

  // Perspektiven (360°)
  _addSection(_sidebar, '360°', DIRS.map(dir => ({
    label: dir.label,
    title: dir.title,
    onClick: () => {
      const target = controls.target.clone();
      const radius = camera.position.distanceTo(target);
      setCameraDirection(camera, controls, target, radius, dir.id);
    },
  })));

  document.body.appendChild(_sidebar);
}

function _addSection(parent, titleText, buttons) {
  const section = document.createElement('div');
  section.className = 'psb-section';

  const title = document.createElement('div');
  title.className = 'psb-title';
  title.textContent = titleText;
  section.appendChild(title);

  buttons.forEach(({ label, title, active, dataset, onClick }) => {
    const btn = document.createElement('button');
    btn.className = 'psb-btn';
    if (active) btn.classList.add('psb-btn--active');
    btn.textContent = label;
    if (title) btn.title = title;
    if (dataset) Object.assign(btn.dataset, dataset);
    btn.addEventListener('click', onClick);
    section.appendChild(btn);
  });

  parent.appendChild(section);
}

// ─── Rahmen-Positionierung ───────────────────────────────────────────────────

function _isMobile() {
  return window.innerWidth <= 768;
}

function _updateFrame() {
  if (!_overlay) return;

  const { w: fw, h: fh } = _currentFormat;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = _isMobile();

  let margin, topOffset, rightBound, bottomBound;

  if (mobile) {
    // Sidebar oben → freier Bereich: unter der Sidebar, über der Toolbar-Bar
    const sbH      = _sidebar ? (_sidebar.offsetHeight || 60) : 60;
    const toolbarH = 72; // Toolbar-Bar Höhe auf Mobile
    margin      = 16;
    topOffset   = sbH + margin;
    bottomBound = vh - toolbarH - margin;
    rightBound  = vw - margin;
  } else {
    // Sidebar rechts → freier Bereich: links der Sidebar
    const sbW   = _sidebar ? (_sidebar.offsetWidth || 68) : 68;
    const sbGap = 24;
    margin      = 48;
    topOffset   = margin;
    bottomBound = vh - margin;
    rightBound  = vw - sbW - sbGap - 16;
  }

  const availW = rightBound - margin;
  const availH = bottomBound - topOffset;

  const aspect = fw / fh;
  let frameW = availW;
  let frameH = frameW / aspect;
  if (frameH > availH) {
    frameH = availH;
    frameW = frameH * aspect;
  }

  const frameLeft = margin + (availW - frameW) / 2;
  const frameTop  = topOffset + (availH - frameH) / 2;

  // Vignetten
  const vTop    = _overlay.querySelector('.photo-vignette-top');
  const vBottom = _overlay.querySelector('.photo-vignette-bottom');
  const vLeft   = _overlay.querySelector('.photo-vignette-left');
  const vRight  = _overlay.querySelector('.photo-vignette-right');

  // Auf Mobile: untere Vignette stoppt vor der Toolbar-Bar, damit ☰ sichtbar bleibt
  const toolbarH = mobile ? 72 : 0;
  if (vTop)    { vTop.style.cssText    = `left:0;right:0;top:0;height:${frameTop}px`; }
  if (vBottom) { vBottom.style.cssText = mobile
    ? `left:0;right:0;top:${frameTop + frameH}px;height:${Math.max(0, vh - toolbarH - (frameTop + frameH))}px`
    : `left:0;right:0;top:${frameTop + frameH}px;bottom:0`; }
  if (vLeft)   { vLeft.style.cssText   = `left:0;width:${frameLeft}px;top:${frameTop}px;height:${frameH}px`; }
  if (vRight)  { vRight.style.cssText  = `left:${frameLeft + frameW}px;right:0;top:${frameTop}px;height:${frameH}px`; }

  // Rahmen-Box
  const frame = document.getElementById('photo-frame');
  if (frame) {
    frame.style.cssText = `left:${frameLeft}px;top:${frameTop}px;width:${frameW}px;height:${frameH}px`;
    const lbl = document.getElementById('photo-frame-label');
    if (lbl) lbl.textContent = `${_currentFormat.label}   ${_currentFormat.w} × ${_currentFormat.h}`;
  }

  // Auslöser: zentriert unter dem Rahmen (oder innerhalb wenn kein Platz)
  const shutter    = document.getElementById('photo-shutter');
  const shutterH   = mobile ? 56 : 60;
  const shutterGap = mobile ? 14 : 18;
  if (shutter) {
    let sy = frameTop + frameH + shutterGap;
    const maxY = mobile ? (vh - 72 - shutterH - 8) : (vh - 12 - shutterH);
    if (sy + shutterH > maxY) {
      sy = Math.max(frameTop + 10, frameTop + frameH - shutterH - 12);
    }
    shutter.style.cssText = `left:${Math.round(frameLeft + frameW / 2)}px;top:${Math.round(sy)}px`;
  }
}

// ─── Screenshot-Aufnahme ─────────────────────────────────────────────────────

function _capturePhoto() {
  const { w, h, label } = _currentFormat;

  // Klick-Animation
  const shutter = document.getElementById('photo-shutter');
  shutter?.classList.add('shutter--flash');
  setTimeout(() => shutter?.classList.remove('shutter--flash'), 350);

  // Aktuellen Renderer-Zustand sichern
  const origPixelRatio = renderer.getPixelRatio();
  const origBufW       = renderer.domElement.width;
  const origBufH       = renderer.domElement.height;
  const origLogW       = Math.round(origBufW / origPixelRatio);
  const origLogH       = Math.round(origBufH / origPixelRatio);
  const origAspect     = camera.aspect;

  // Renderer auf Zielauflösung skalieren (kein CSS-Update)
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // Rendern (nur 3D-Szene, keine DOM-Elemente)
  renderer.render(scene, camera);

  // Sofort nach render() capturen – gleicher synchroner Call-Stack,
  // daher ist der Buffer noch intakt (preserveDrawingBuffer: false ist OK)
  const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.93);

  // Renderer & Kamera zurücksetzen
  renderer.setPixelRatio(origPixelRatio);
  renderer.setSize(origLogW, origLogH, false);
  camera.aspect = origAspect;
  camera.updateProjectionMatrix();

  // Einen Frame neu rendern
  window.requestRender?.();

  // Download
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `bluebody-${label.replace(':', 'x')}-${ts}.jpg`;
  const link = document.createElement('a');
  link.download = name;
  link.href     = dataURL;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
