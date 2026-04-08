import { dataPath } from '../core/path.js';

const DETAILS_URL = dataPath('muskelfinder-details.json');

let detailsPromise = null;

async function getMuskelfinderDetailsIndex() {
  if (!detailsPromise) {
    detailsPromise = fetch(DETAILS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Muskelfinder-Details konnten nicht geladen werden (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        const entries = Array.isArray(payload?.entries) ? payload.entries : [];
        const entriesByKey = Object.create(null);

        for (const entry of entries) {
          const detailKey = String(entry?.detailKey || '').trim();
          if (!detailKey) continue;
          entriesByKey[detailKey] = entry;
        }

        return {
          entriesByKey,
          modelToDetailKey: payload?.modelToDetailKey || Object.create(null)
        };
      })
      .catch((error) => {
        console.warn('⚠️ Muskelfinder-Details nicht verfügbar:', error);
        return {
          entriesByKey: Object.create(null),
          modelToDetailKey: Object.create(null)
        };
      });
  }

  return detailsPromise;
}

export async function getMuskelfinderDetailsForMeta(meta) {
  if (!meta || meta?.classification?.group !== 'muscles') {
    return null;
  }

  const detailsIndex = await getMuskelfinderDetailsIndex();
  const candidateIds = [
    meta?.id,
    meta?.info?.links?.fma
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const id of candidateIds) {
    const detailKey = detailsIndex.modelToDetailKey?.[id];
    if (!detailKey) continue;

    const entry = detailsIndex.entriesByKey?.[detailKey];
    if (entry) {
      return entry;
    }
  }

  return null;
}
