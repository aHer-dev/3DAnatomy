// Lizenz-Panel anzeigen/verstecken
// Lizenz-Panel anzeigen/verstecken
import { licenseHTML } from './licenseContent.js';


export function toggleLicense() {
  const btn = document.getElementById('btn-toggle-license');
  const info = document.getElementById('license-info');
  if (!btn || !info) return;

  if (!info.dataset.injected) {
    info.innerHTML = licenseHTML;      // Text mit CC BY 4.0, three.js MIT, Draco Apache-2.0, OBO-Hinweis
    info.dataset.injected = '1';
  }

  const hidden = info.classList.contains('hidden');
  info.classList.toggle('hidden', !hidden);
  info.classList.toggle('active', hidden);
  btn.setAttribute('aria-expanded', String(hidden));
  info.setAttribute('aria-hidden', String(!hidden));
}