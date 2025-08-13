// js/modelLoader/progress.js - PROGRESS BAR FIX

let currentProgress = 0;
let isShowing = false;

/**
 * ✅ VERBESSERTE showLoadingBar mit korrekter Element-Suche
 */
export function showLoadingBar() {
  // Mehrere mögliche IDs versuchen
  const possibleIds = [
    'loading-bar',
    'progress-bar',
    'progress-bar-fill',
    'initial-loading-screen'
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
  if (!isShowing) {
    console.warn('⚠️ updateLoadingBar aufgerufen, aber Bar nicht sichtbar');
    return;
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
}

/**
 * ✅ NEUE FUNKTION: Dynamische Progress Bar erstellen falls keine vorhanden
 */
function createDynamicProgressBar() {
  console.log('🔧 Erstelle dynamische Progress Bar...');

  // Container-Element finden oder erstellen
  let container = document.getElementById('initial-loading-screen') ||
    document.body;

  // Progress Bar HTML erstellen
  const progressHTML = `
        <div id="dynamic-loading-bar" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            z-index: 10000;
            background: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
        ">
            <div style="margin-bottom: 10px;">Laden...</div>
            <div style="
                width: 100%;
                height: 20px;
                background: #333;
                border-radius: 10px;
                overflow: hidden;
            ">
                <div id="dynamic-progress-fill" style="
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    width: 0%;
                    transition: width 0.3s ease;
                "></div>
            </div>
            <div id="dynamic-progress-text" style="margin-top: 10px;">0%</div>
        </div>
    `;

  container.insertAdjacentHTML('beforeend', progressHTML);

  // Event-Listener für Updates
  document.addEventListener('progressUpdate', (e) => {
    const fill = document.getElementById('dynamic-progress-fill');
    const text = document.getElementById('dynamic-progress-text');

    if (fill) fill.style.width = `${e.detail.percent}%`;
    if (text) text.textContent = `${Math.round(e.detail.percent)}%`;
  });

  // Event-Listener für Completion
  document.addEventListener('progressComplete', () => {
    const dynamicBar = document.getElementById('dynamic-loading-bar');
    if (dynamicBar) {
      dynamicBar.style.opacity = '0';
      setTimeout(() => dynamicBar.remove(), 300);
    }
  });

  isShowing = true;
  console.log('✅ Dynamische Progress Bar erstellt');
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