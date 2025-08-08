// js/core/path.js
// Zentrale Pfad-Helfer. EINMALIGE Quelle der Wahrheit für alle Dateipfade der App.

// Wenn du später unter einem Unterordner hostest (z. B. GitHub Pages):
//   const BASE = '/3DAnatomy';
// Für lokalen Dev-Server im Projekt-Root bleibt das leer:
const BASE = ''; // <- bei Bedarf anpassen

/**
 * Normalisiert Pfade und fügt BASE voran.
 * - Verhindert doppelte Slashes
 * - Macht Unterordner-Deployments robuster
 * @param {string} path - Relativer Pfad ab dem Projekt-Root (ohne führenden Slash)
 * @returns {string} Normalisierter Pfad mit BASE
 */
export function withBase(path) {
  // Fügt BASE und path zusammen und ersetzt Mehrfach-Slashes durch einen Slash
  return `${BASE}/${path}`.replace(/\/+/g, '/');
}

/**
 * Pfad zum Draco-Decoder-Verzeichnis.
 * Beispiel-Resultat: '/draco/' oder '/3DAnatomy/draco/'
 */
export function dracoPath() {
  return withBase('draco/');
}

/**
 * Pfad zu Modelldateien (GLB), gruppenbasiert.
 * @param {string} filename - Dateiname, z. B. 'atlas.glb'
 * @param {string} group - Gruppe, z. B. 'bones', 'teeth', ...
 * @returns {string} Vollständiger Pfad zur Modell-Datei
 */
export function modelPath(filename, group) {
  return withBase(`models/${group}/${filename}`);
}

/**
 * Pfad zu Datendateien (z. B. meta.json).
 * @param {string} file - Dateiname unter /data, z. B. 'meta.json'
 */
export function dataPath(file) {
  return withBase(`data/${file}`);
}

/**
 * Optionaler Helper für statische Assets (Icons, UI-Bilder, ...).
 * @param {string} file - Dateiname unter /assets
 */
export function assetsPath(file) {
  return withBase(`assets/${file}`);
}
