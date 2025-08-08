// utils/path.js – Hilfsfunktionen für Pfad-Management
const isGitHub = window.location.hostname.includes("github.io");
export const basePath = isGitHub ? "/3DAnatomy" : "";

/**
 * Gibt sauberen Modellpfad zurück
 */
export function getModelPath(filename, group) {
    const path = `${basePath}/models/${group}/${filename}`.replace(/\/+/g, '/');
    return path.startsWith('/') ? path : `/${path}`;
}
