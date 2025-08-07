// js/bootstrap/initStaticAssets.js
// 🔧 Initialisiert Ladebilder (Sticker) und Favicon dynamisch je nach BasePath

import { basePath } from '../utils/index.js';

/**
 * Setzt dynamisch Pfade für Lade-Sticker und Favicon.
 * Sorgt für korrekte Darstellung auch bei Deployment auf z. B. GitHub Pages.
 */
export function initStaticAssets() {
    ['loading-sticker', 'live-loading-sticker'].forEach(id => {
        const img = document.getElementById(id);
        if (img) {
            img.src = `${basePath}/images/${id}.png`.replace(/\/+/g, '/');
        }
    });

    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) {
        faviconLink.href = `${basePath}/favicon.ico`;
    }

    console.log('🧩 Statische Assets initialisiert.');
}
