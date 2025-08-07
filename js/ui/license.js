// Lizenz-Panel anzeigen/verstecken
export function toggleLicense() {
  const button = document.getElementById('btn-toggle-license');
  const info = document.getElementById('license-info');

  if (!info || !button) {
    console.error('❌ Lizenz-Elemente nicht gefunden');
    return;
  }

  const isVisible = info.classList.contains('active');

  if (isVisible) {
    info.classList.remove('active');
    info.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    info.setAttribute('aria-hidden', 'true');
  } else {
    info.classList.remove('hidden'); // ❗ wichtig
    info.classList.add('active');
    button.setAttribute('aria-expanded', 'true');
    info.setAttribute('aria-hidden', 'false');
  }

  console.log("✅ Lizenz-Toggle ausgeführt");
}