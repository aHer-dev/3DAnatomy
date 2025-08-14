// js/modelLoader/progress.js - PROGRESS BAR FIX

let currentProgress = 0;
let isShowing = false;

/**
 * ✅ VERBESSERTE showLoadingBar mit korrekter Element-Suche
 */
export function showLoadingBar() {
  if (window?.__DISABLE_PROGRESS_OVERLAY || document.getElementById('dynamic-circle-overlay')) return;
  // Mehrere mögliche IDs versuchen
  const possibleIds = [
    'loading-bar',
    'progress-bar',
    'progress-bar-fill'
  ];

  let bar = null;
  let progressText = null;

  // Versuche verschiedene Progress-Bar Elemente zu finden
  for (const id of possibleIds) {
    const element = document.getElementById(id);
    if (element) {
      bar = element;
      break;
    }
  }

  // Fallback: Schaue nach Klassen
  if (!bar) {
    bar = document.querySelector('.progress-bar') ||
      document.querySelector('.loading-bar') ||
      document.querySelector('[class*="progress"]') ||
      document.querySelector('[id*="progress"]');
  }

  // Text-Element suchen
  progressText = document.getElementById('progress-text') ||
    document.querySelector('.progress-text') ||
    document.querySelector('[class*="progress-text"]');

  if (!bar) {
    console.warn('⚠️ Kein Loading-Bar Element gefunden. Erstelle dynamisch...');
    createDynamicProgressBar();
    // Fallback-Bar gilt als "sichtbar"
    currentProgress = 0;
    isShowing = true;
    return;
  }

  // Progress zurücksetzen
  currentProgress = 0;
  isShowing = true;

  // Element sichtbar machen und auf 0% setzen
  if (bar.style) {
    bar.style.display = 'block';
    bar.style.width = '0%';
    bar.style.opacity = '1';
  }

  // Text-Element aktualisieren
  if (progressText) {
    progressText.textContent = '0%';
    progressText.style.display = 'block';
  }

  console.log('📊 Loading Bar gezeigt:', bar.id || bar.className);
}

/**
 * ✅ VERBESSERTE updateLoadingBar mit besserer Element-Erkennung
 */
export function updateLoadingBar(percent) {
    if (window?.__DISABLE_PROGRESS_OVERLAY) return; // ← Legacy-Bar komplett aus
    if (!isShowing) {
      // robust: bei erstem Update automatisch anzeigen
      try { showLoadingBar(); } catch { }
    }

  // Prozent normalisieren
  const normalizedPercent = Math.max(0, Math.min(100, percent));
  currentProgress = normalizedPercent;

  // Bar-Element finden (wie in showLoadingBar)
  let bar = document.getElementById('loading-bar') ||
    document.getElementById('progress-bar') ||
    document.getElementById('progress-bar-fill') ||
    document.querySelector('.progress-bar') ||
    document.querySelector('.loading-bar') ||
    document.querySelector('[class*="progress"]');

  // Text-Element finden
  let progressText = document.getElementById('progress-text') ||
    document.querySelector('.progress-text') ||
    document.querySelector('[class*="progress-text"]');

  if (bar) {
    // Width setzen
    if (bar.style) {
      bar.style.width = `${normalizedPercent}%`;
    }

    // Alternative: data-Attribut für CSS-basierte Bars
    try { bar.style.setProperty?.('--progress', `${normalizedPercent}%`); } catch { }
    bar.setAttribute('data-progress', normalizedPercent);

    console.log(`📊 Progress aktualisiert: ${normalizedPercent}%`);
  } else {
    console.warn('⚠️ Progress Bar Element nicht gefunden für Update');
  }

  // Text aktualisieren
  if (progressText) {
    progressText.textContent = `${Math.round(normalizedPercent)}%`;
  }

  // Für den Fallback: Custom Event senden
  document.dispatchEvent(new CustomEvent('progressUpdate', {
    detail: { percent: normalizedPercent }
  }));
  
    // Auto-Close bei 100 %
    if (normalizedPercent >= 100) {
        setTimeout(() => { try { hideLoadingBar(); } catch { } }, 200);
    }
}

/**
 * ✅ VERBESSERTE hideLoadingBar mit Fade-Out
 */
export function hideLoadingBar() {
  if (!isShowing) return;

  const bars = [
    document.getElementById('loading-bar'),
    document.getElementById('progress-bar'),
    document.getElementById('progress-bar-fill'),
    document.querySelector('.progress-bar'),
    document.querySelector('.loading-bar')
  ].filter(Boolean);

  const progressTexts = [
    document.getElementById('progress-text'),
    document.querySelector('.progress-text')
  ].filter(Boolean);

  // Fade-Out Animation
  bars.forEach(bar => {
    if (bar && bar.style) {
      bar.style.transition = 'opacity 0.3s ease';
      bar.style.opacity = '0';

      setTimeout(() => {
        bar.style.display = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '1'; // Für nächstes Mal zurücksetzen
      }, 300);
    }
  });

  // Text ausblenden
  progressTexts.forEach(text => {
    if (text && text.style) {
      text.style.display = 'none';
    }
  });

  isShowing = false;
  currentProgress = 0;

  console.log('📊 Loading Bar versteckt');

  // Custom Event für Completion
  document.dispatchEvent(new CustomEvent('progressComplete'));
  try { hideDynamicProgressBar(); } catch { }
}

/**
 * ✅ NEUE FUNKTION: Dynamische Progress Bar erstellen falls keine vorhanden
 */
// Schmale, nicht-blockierende Loading-Bar (unten), Theme: Blau→Orange
function createDynamicProgressBar() {
  if (window?.__DISABLE_PROGRESS_OVERLAY || document.getElementById('dynamic-circle-overlay')) return;
  window.__dynProgressInit = true;

  // Container: ganz unten, klickt nicht in die UI rein
  const overlay = document.createElement('div');
  overlay.id = 'dynamic-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    left: 40px;
    right: 40px;
    bottom: 40px;
    height: 4px;
    z-index: 3001;
    pointer-events: none;
  `;

  // Track
  const track = document.createElement('div');
  track.style.cssText = `
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.35);
  `;

  // Fill
  const fill = document.createElement('div');
  fill.id = 'dynamic-progress-fill';
  fill.style.cssText = `
    width: 0%;
    height: 100%;
    transition: width 250ms cubic-bezier(0.4,0,0.2,1);
    background: linear-gradient(90deg, #4A9EFF, #FF7A4A);
  `;

  // Optional: versteckter Text für Screenreader
  const sr = document.createElement('div');
  sr.id = 'dynamic-progress-text';
  sr.setAttribute('aria-live', 'polite');
  sr.style.cssText = `
    position: absolute; width:1px; height:1px; overflow:hidden; clip:rect(1px,1px,1px,1px);
  `;
  sr.textContent = '0%';

  track.appendChild(fill);
  overlay.appendChild(track);
  overlay.appendChild(sr);
  document.body.appendChild(overlay);

  // Listener nur einmal registrieren
  if (!window.__dynProgressListener) {
    window.__dynProgressListener = (e) => {
      const pct = Math.max(0, Math.min(100, Number(e?.detail?.percent ?? 0)));
      const f = document.getElementById('dynamic-progress-fill');
      const t = document.getElementById('dynamic-progress-text');
      if (f) f.style.width = pct + '%';
      if (t) t.textContent = Math.round(pct) + '%';
    };
    document.addEventListener('progressUpdate', window.__dynProgressListener);
  }
    // Fallback gilt als sichtbar
      isShowing = true;
   currentProgress = 0;

}

// Öffentliche Hilfen, falls du sie brauchst:
function hideDynamicProgressBar() {
  // sauber entfernen + Listener lösen
  const ov = document.getElementById('dynamic-loading-overlay');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  if (window.__dynProgressListener) {
    document.removeEventListener('progressUpdate', window.__dynProgressListener);
    window.__dynProgressListener = null;
  }
  window.__dynProgressInit = false;
}

function updateDynamicProgress(percent) {
  document.dispatchEvent(new CustomEvent('progressUpdate', { detail: { percent } }));
}

/**
 * ✅ NEUE FUNKTION: Progress Status abfragen
 */
export function getProgress() {
  return {
    percent: currentProgress,
    isShowing: isShowing
  };
}

/**
 * ✅ NEUE FUNKTION: Progress Bar manuell testen
 */
export function testProgressBar() {
  console.log('🧪 Teste Progress Bar...');

  showLoadingBar();

  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    updateLoadingBar(progress);

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => hideLoadingBar(), 1000);
    }
  }, 200);
}

// Debug: Progress Bar testen (nur im Development-Modus)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  window.testProgress = testProgressBar;
  window.progressUtils = { showLoadingBar, updateLoadingBar, hideLoadingBar, getProgress };
}

// =============== CIRCULAR PROGRESS OVERLAY (CENTER) ===============
let __circle = {
  overlay: null,
  fg: null,
  text: null,
  listener: null,
  circumference: 0
};
const CELEBRATE_MS = 2200; // 2.2 Sekunden „Willkommen!“ anzeigen


/**
 * Zeigt einen zentrierten, runden Progress-Indikator (SVG).
 * Nutzt dasselbe Custom-Event 'progressUpdate' wie deine Leiste
 */
export function showLoadingCircle({ size = 140, stroke = 8, label = 'Strukturen werden geladen…' } = {}) {
  if (__circle.overlay) return; // schon aktiv

  // Overlay (zentriert, klickt nicht in die UI, hoher z-index)
  const overlay = document.createElement('div');
  overlay.id = 'dynamic-circle-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; display:flex; align-items:center; justify-content:center;
    z-index: 4000; pointer-events: none;
  `;

  // Wrapper mit leichtem Glass-Look (sehr dezent)
    const wrap = document.createElement('div');
   wrap.style.cssText = `
    width:${size + 48}px; min-height:${size + 48}px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
    background: rgba(20,25,45,0.35); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  `;


    // Label oben
      const title = document.createElement('div');
    title.setAttribute('role', 'status');
    title.style.cssText = `
   font: 600 14px system-ui, -apple-system, Segoe UI, Inter, sans-serif;
    color: rgba(255,255,255,0.85); letter-spacing:.02em; text-align:center;
    pointer-events:none;
  `;
  title.textContent = label;



  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.style.display = 'block';
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Kreisgeometrie
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  __circle.circumference = circumference;

  // Defs: Gradient für den Vordergrund
  const defs = document.createElementNS(svgNS, 'defs');
  const lg = document.createElementNS(svgNS, 'linearGradient');
  lg.setAttribute('id', 'circleGrad');
  lg.setAttribute('x1', '0%'); lg.setAttribute('y1', '0%');
  lg.setAttribute('x2', '100%'); lg.setAttribute('y2', '0%');

  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#4A9EFF');
  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#FF7A4A');

  lg.appendChild(stop1); lg.appendChild(stop2); defs.appendChild(lg);

  // Hintergrundkreis (Track)
  const bg = document.createElementNS(svgNS, 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'rgba(255,255,255,0.12)');
  bg.setAttribute('stroke-width', stroke);

  // Vordergrundkreis (Progress)
  const fg = document.createElementNS(svgNS, 'circle');
  fg.setAttribute('cx', cx); fg.setAttribute('cy', cy); fg.setAttribute('r', r);
  fg.setAttribute('fill', 'none');
  fg.setAttribute('stroke', 'url(#circleGrad)');
  fg.setAttribute('stroke-width', stroke);
  fg.setAttribute('stroke-linecap', 'round');
  fg.setAttribute('transform', `rotate(-90 ${cx} ${cy})`); // Start oben
  fg.style.strokeDasharray = `${circumference}`;
  fg.style.strokeDashoffset = `${circumference}`;
  fg.style.transition = 'stroke-dashoffset 250ms cubic-bezier(0.4,0,0.2,1)';

  svg.appendChild(defs);
  svg.appendChild(bg);
  svg.appendChild(fg);

  // Prozenttext in der Mitte
  const txt = document.createElement('div');
  txt.style.cssText = `
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
   font: 600 14px system-ui, -apple-system, Segoe UI, Inter, sans-serif;
    color: rgba(255,255,255,0.85); letter-spacing: .04em;
    pointer-events: none;
  `; 
  txt.textContent = '0%';

  // Stacken
  const stack = document.createElement('div');
  stack.style.cssText = `position: relative; width: ${size}px; height: ${size}px;`;
  stack.appendChild(svg);
  stack.appendChild(txt);

  wrap.appendChild(title);
  wrap.appendChild(stack);
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  // Listener nur für den Kreis auf eigenem Kanal
  const onProgress = (e) => {
    const pct = Math.max(0, Math.min(100, Number(e?.detail?.percent ?? 0)));
    const offset = circumference * (1 - pct / 100);
    fg.style.strokeDashoffset = `${offset}`;
    txt.textContent = `${Math.round(pct)}%`;

    if (pct >= 100) {
      if (__circle.done) return;           // mehrfaches Schließen verhindern
      __circle.done = true;

      // Kreis dezent ausblenden
      stack.style.transition = 'opacity 300ms ease, transform 300ms ease';
      stack.style.opacity = '0';
      stack.style.transform = 'scale(0.98)';

      // „Willkommen!“ fett, größer, mit Gradient
      title.textContent = 'Willkommen!';
      Object.assign(title.style, {
        fontWeight: '800',
        fontSize: '20px',
        backgroundImage: 'linear-gradient(90deg, #4A9EFF, #FF7A4A)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center'
      });

      // ⬇️ Diese drei Zeilen sorgen für perfekte Zentrierung:
      wrap.style.gap = '0px';                      // keinen Abstand mehr zwischen Elementen
      setTimeout(() => { stack.style.display = 'none'; }, 300); // Kreis nach Fade-Out entfernen
      // (wrap hat bereits display:flex; align-items:center; justify-content:center; → Text zentriert)

      // Nach fester Verweilzeit ausblenden
      setTimeout(() => {
        overlay.style.transition = 'opacity 300ms ease';
        overlay.style.opacity = '0';
        setTimeout(() => hideLoadingCircle(), 320);
      }, CELEBRATE_MS); // z. B. 2200 ms
    }
  };

  document.addEventListener('circleProgress', onProgress);
  __circle = { overlay, fg, text: txt, listener: onProgress, circumference };
}

/** Manuell aktualisieren (falls du kein progressUpdate dispatchst) */
export function updateLoadingCircle(percent) {
    document.dispatchEvent(new CustomEvent('circleProgress', { detail: { percent } }));
}

/** Ausblenden & aufräumen */
export function hideLoadingCircle() {
  if (__circle.listener) {
    document.removeEventListener('circleProgress', __circle.listener);
  }
  if (__circle.overlay && __circle.overlay.parentNode) {
    __circle.overlay.parentNode.removeChild(__circle.overlay);
  }
  __circle = { overlay: null, fg: null, text: null, listener: null, circumference: 0 };

   // 🔔 Signal: Overlay ist vollständig verschwunden
     document.dispatchEvent(new Event('circleOverlayHidden'));
}
// ==================================================================