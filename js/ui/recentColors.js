/**
 * @file recentColors.js
 * @description Zuletzt verwendete Farben – persistent via localStorage.
 *
 * Verwendung:
 *   attachRecentColors(colorInput, onColorPick)
 *
 * Fügt unterhalb des color-Inputs eine Reihe von Farbkreisen ein.
 * Wenn der Nutzer im Picker eine Farbe bestätigt (change-Event),
 * wird sie in die Liste aufgenommen.
 * Ein Klick auf einen Kreis setzt den Picker und ruft onColorPick(hex) auf.
 */

const STORAGE_KEY = 'bb_recent_colors';
const MAX_COLORS  = 5;

// ─── Daten ────────────────────────────────────────────────────────────────────

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Neue Farbe vorne einfügen (Duplikate entfernen, max MAX_COLORS) */
function addColor(hex) {
  const norm = hex.toLowerCase();
  let list = load().filter(c => c !== norm);
  list.unshift(norm);
  if (list.length > MAX_COLORS) list = list.slice(0, MAX_COLORS);
  save(list);
}

export function getRecentColors() {
  return load();
}

// ─── UI ───────────────────────────────────────────────────────────────────────

/**
 * Hängt eine Farbkreis-Reihe direkt nach dem colorInput-Element ein.
 *
 * @param {HTMLInputElement} colorInput  – <input type="color">
 * @param {(hex: string) => void} onColorPick  – wird aufgerufen wenn Kreis geklickt
 * @returns {() => void}  cleanup-Funktion (entfernt Swatches + Listener)
 */
export function attachRecentColors(colorInput, onColorPick) {
  if (!colorInput) return () => {};

  // Wrapper direkt nach dem Input einfügen
  const wrapper = document.createElement('div');
  wrapper.className = 'rc-swatches';

  // In Edit-Panels sitzt der Color-Input oft in einem Label mit Flex-Layout.
  // Dort den Wrapper nach der ganzen Zeile einfügen, damit die Swatches klein bleiben.
  const parentLabel = colorInput.closest('label');
  if (parentLabel && parentLabel.contains(colorInput)) {
    parentLabel.insertAdjacentElement('afterend', wrapper);
  } else {
    colorInput.insertAdjacentElement('afterend', wrapper);
  }

  // Swatches rendern
  function render() {
    wrapper.innerHTML = '';
    const colors = load();

    if (colors.length === 0) {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'flex';

    colors.forEach(hex => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'rc-swatch';
      swatch.title = hex;
      swatch.style.backgroundColor = hex;
      swatch.setAttribute('aria-label', `Farbe ${hex} verwenden`);

      swatch.addEventListener('click', () => {
        colorInput.value = hex;
        // input-Event triggern damit die Farbe sofort angewendet wird
        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
        onColorPick?.(hex);
        addColor(hex);
        render();
      });

      wrapper.appendChild(swatch);
    });
  }

  render();

  // Wenn der Picker geschlossen wird → Farbe in Historie aufnehmen
  function onChange() {
    addColor(colorInput.value);
    render();
  }

  colorInput.addEventListener('change', onChange);

  // Cleanup
  return () => {
    colorInput.removeEventListener('change', onChange);
    wrapper.remove();
  };
}
