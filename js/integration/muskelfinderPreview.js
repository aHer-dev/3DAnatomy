function readPreviewParams() {
  const params = new URLSearchParams(window.location.search);
  const muscleKey = params.get('muscleKey')?.trim() || '';
  const muscle = params.get('muscle')?.trim() || '';
  const source = params.get('source')?.trim() || '';

  return {
    muscleKey,
    muscle,
    source
  };
}

export function isMuskelfinderPreviewMode() {
  const request = readPreviewParams();
  return request.source === 'muskelfinder' && Boolean(request.muscleKey || request.muscle);
}

export function applyMuskelfinderPreviewClass() {
  if (!document.body) {
    return false;
  }

  const active = isMuskelfinderPreviewMode();
  document.body.classList.toggle('muskelfinder-preview-mode', active);
  document.body.dataset.muskelfinderPreview = active ? 'true' : 'false';
  return active;
}
