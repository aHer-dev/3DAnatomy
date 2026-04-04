// app.js – Einstiegspunkt

import { initDynamicGroupLoading } from './js/bootstrap/initGroupLoader.js';
import { startApp } from './js/bootstrap/startApp.js';
import { safeInit, safeInitSync } from './js/utils/migration-helper.js';

console.log('📦 app.js geladen');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('▶️ DOM vollständig geladen – Starte App');
  initDynamicGroupLoading();

  // Option 1: Async Version (empfohlen)
  const initSuccess = await safeInit();
  if (!initSuccess) {
    console.error('❌ Kritischer Fehler beim Laden der Module');
  }

  // Option 2: Falls async Probleme macht, sync Version:
  // if (!safeInitSync()) {
  //   console.error('❌ Kritischer Fehler beim Laden der Module');
  // }

  startApp();
});
