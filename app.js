// app.js
import { startApp } from './js/bootstrap/startApp.js';
import { debug } from './js/core/debug.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await startApp();
  } catch (error) {
    console.error('App-Start fehlgeschlagen:', error);
  }
});

// Debug-Konsole (für Entwicklung)
if (window.location.search.includes('debug')) {
  debug.enable();
}