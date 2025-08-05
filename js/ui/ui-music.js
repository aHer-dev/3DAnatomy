// ui-music.js

export function setupMusicUI() {
  const audio = document.getElementById('background-music');
  const toggleBtn = document.getElementById('toggle-music');
  const licenseBtn = document.getElementById('show-license');
  const licenseBox = document.getElementById('license-box');

  if (!audio || !toggleBtn || !licenseBox || !licenseBtn) {
    console.warn('⚠️ Musik/Lizenz-UI: Elemente fehlen.');
    return;
  }

  // Musik toggeln
  toggleBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.volume = 0.4;
      audio.loop = true;
      audio.play();
      toggleBtn.textContent = '🔇';
    } else {
      audio.pause();
      toggleBtn.textContent = '🔊';
    }
  });

  // Lizenzfenster toggeln
  licenseBtn.addEventListener('click', () => {
    licenseBox.classList.toggle('visible');
  });

  console.log('🎵 Musik & Lizenzsteuerung aktiviert.');
}
