// js/utils.js
const isGitHub = window.location.hostname.includes("github.io");
export const basePath = isGitHub ? "/3DAnatomy" : "";
export function getModelPath(filename, group) {
  const path = `${basePath}/models/${group}/${filename}`.replace(/\/+/g, '/');
  return path.startsWith('/') ? path : `/${path}`;
}

let cachedMeta = null;

export async function getMeta() {
  if (!cachedMeta) {
    try {
      const response = await fetch(`${basePath}/data/meta.json`.replace(/\/+/g, '/'));
      if (!response.ok) throw new Error(`Fehler beim Laden von meta.json: ${response.status}`);
      cachedMeta = await response.json();
      console.log("meta.json geladen, Einträge:", cachedMeta.length);
    } catch (error) {
      console.error("Fehler beim Laden von meta.json:", error);
      alert("Fehler beim Laden der Metadaten. Prüfe die Dateistruktur.");
      return [];
    }
  }
  return cachedMeta;
}
