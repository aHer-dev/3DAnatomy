// app.js – Einstiegspunkt
import { initSplashScreenExit } from './js/bootstrap/initSplashScreen.js';
import { initDynamicGroupLoading } from './js/bootstrap/initGroupLoader.js';
import { startApp } from './js/bootstrap/startApp.js';

console.log('📦 app.js geladen');

document.addEventListener('DOMContentLoaded', () => {
  console.log('▶️ DOM vollständig geladen – Starte App');
  initSplashScreenExit();
  initDynamicGroupLoading();
  startApp();
});