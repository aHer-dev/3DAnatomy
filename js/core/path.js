// ============================================
// path.js - Zentrale Pfadverwaltung (FINAL BEREINIGT)
// ============================================

// Basis-URL für alle Ressourcen (leer = relative Pfade)
const BASE = '';

/**
 * Fügt die Basis-URL zu einem Pfad hinzu
 * @param {string} path
 * @returns {string}
 */
export function withBase(path) {
  if (!path) return BASE;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return BASE ? `${BASE}/${cleanPath}` : cleanPath;
}

/**
 * Erstellt Pfad zu einer Datei im data-Verzeichnis
 * @param {string} file
 * @returns {string}
 */
export function dataPath(file) {
  return withBase(`data/${file}`);
}

/**
 * Erstellt Pfad zu einem Modell
 * @param {string} filename
 * @param {string} group
 * @returns {string}
 */
export function modelPath(filename, group = '') {
  if (group) {
    return withBase(`models/${group}/${filename}`);
  }
  return withBase(`models/${filename}`);
}

/**
 * Erstellt Pfad zu einer Textur
 * @param {string} filename
 * @returns {string}
 */
export function texturePath(filename) {
  return withBase(`textures/${filename}`);
}

/**
 * Erstellt Pfad zum DRACO Decoder Verzeichnis
 * WICHTIG: NUR EINE VERSION dieser Funktion!
 * @param {string} file - Optional: spezifische Datei im draco Ordner
 * @returns {string}
 */
export function dracoPath(file = '') {
  if (file) {
    return withBase(`draco/${file}`);
  }
  // DRACOLoader erwartet einen Pfad mit trailing slash
  return withBase('draco') + '/';
}

/**
 * Erstellt Pfad zu einem Asset
 * @param {string} filename
 * @returns {string}
 */
export function assetPath(filename) {
  return withBase(`assets/${filename}`);
}

/**
 * Prüft ob ein Pfad absolut ist (http/https)
 * @param {string} path
 * @returns {boolean}
 */
export function isAbsolutePath(path) {
  return /^https?:\/\//.test(path);
}

/**
 * Normalisiert einen Pfad (entfernt doppelte Slashes etc.)
 * @param {string} path
 * @returns {string}
 */
export function normalizePath(path) {
  return path.replace(/\/+/g, '/').replace(/\/$/, '');
}

/**
 * Gibt die Basis-URL zurück
 * @returns {string}
 */
export function getBase() {
  return BASE;
}

/**
 * Erstellt einen vollständigen URL aus einem relativen Pfad
 * @param {string} path
 * @returns {string}
 */
export function toFullUrl(path) {
  if (isAbsolutePath(path)) return path;

  // Für lokale Entwicklung
  if (window.location.protocol === 'file:') {
    return path;
  }

  const base = window.location.origin;
  const pathname = window.location.pathname.replace(/\/[^\/]*$/, '');
  return `${base}${pathname}/${withBase(path)}`;
}