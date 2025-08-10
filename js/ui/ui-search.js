// js/ui/ui-search.js (an neue App-Struktur angepasst)
export function setupSearchUI(managers) {
  const searchBar = document.getElementById('search-bar');
  const searchResults = document.getElementById('search-results');
  if (!managers || !searchBar || !searchResults) return;

  // getMeta kann sync oder async sein – beides unterstützen
  const getAllMeta = async () => {
    try {
      const res = managers.state?.getMeta?.();
      return (res && typeof res.then === 'function') ? await res : (res || []);
    } catch {
      return [];
    }
  };

  searchBar.addEventListener('input', async () => {
    const q = (searchBar.value || '').trim().toLowerCase();
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    if (!q) return;

    const meta = await getAllMeta();

    // Suche über neues Schema: labels.en + info.links.fma
    const results = meta.filter(e => {
      const label = (e?.labels?.en || '').toLowerCase();
      const fma = (e?.info?.links?.fma || '').toLowerCase();
      return label.includes(q) || fma.includes(q);
    });

    for (const entry of results) {
      const item = document.createElement('div');
      item.className = 'search-item';
      const group = entry?.classification?.group || 'other';
      item.textContent = `${entry?.labels?.en || entry.id || 'Unknown'} (${group})`;

      item.addEventListener('click', async () => {
        try {
          // Einzelnes Modell gezielt laden (kein Gruppenvoll-Load)
          const model = await managers.loader?.loadEntry(entry);

          if (model && managers.visibility?.setState) {
            managers.visibility.setState(model, 'visible');
          }
          if (model && managers.state?.setSelected) {
            managers.state.setSelected(model, entry);
          }
          if (managers.interaction?.showInfoPanel) {
            managers.interaction.showInfoPanel(entry, model);
          }

          // UI zurücksetzen
          searchResults.style.display = 'none';
          searchBar.value = '';
        } catch (err) {
          console.error('Suche: Laden/Anzeige fehlgeschlagen', err);
        }
      });

      searchResults.appendChild(item);
    }

    if (results.length) {
      searchResults.style.display = 'block';
    }
  });
}
