// Lizenz-Panel anzeigen/verstecken
import { licenseHTML } from './licenseContent.js';

function setExpandedState(isOpen) {
  const footerBtn = document.getElementById('btn-toggle-license');
  const menuBtn = document.getElementById('btn-toggle-license-menu');
  const info = document.getElementById('license-info');

  footerBtn?.setAttribute('aria-expanded', String(isOpen));
  menuBtn?.setAttribute('aria-expanded', String(isOpen));
  info?.setAttribute('aria-hidden', String(!isOpen));
}

function ensureLicenseBindings(info) {
  if (!info || info.dataset.bound) return;

  const closeBtn = info.querySelector('#btn-close-license');
  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeLicense();
  });

  info.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    const panel = document.getElementById('license-info');
    if (!panel || panel.classList.contains('hidden')) return;

    const footerBtn = document.getElementById('btn-toggle-license');
    const menuBtn = document.getElementById('btn-toggle-license-menu');
    const target = event.target;
    if (panel.contains(target) || footerBtn?.contains(target) || menuBtn?.contains(target)) {
      return;
    }

    closeLicense();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLicense();
    }
  });

  info.dataset.bound = '1';
}

export function closeLicense() {
  const info = document.getElementById('license-info');
  if (!info) return;

  info.classList.add('hidden');
  info.classList.remove('active');
  setExpandedState(false);
}

export function toggleLicense() {
  const info = document.getElementById('license-info');
  if (!info) return;

  if (!info.dataset.injected) {
    info.innerHTML = licenseHTML;      // Text mit CC BY 4.0, three.js MIT, Draco Apache-2.0, OBO-Hinweis
    info.dataset.injected = '1';
  }
  ensureLicenseBindings(info);

  const hidden = info.classList.contains('hidden');
  info.classList.toggle('hidden', !hidden);
  info.classList.toggle('active', hidden);
  setExpandedState(hidden);
}
