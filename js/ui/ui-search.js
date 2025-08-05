// ui-search.js
import { state } from '../state.js';
import { scene, loader } from '../init.js';
import { getMeta } from '../utils.js';
import { highlightObject, showInfoPanel } from '../interaction.js';
import { loadModels } from '../modelLoader/index.js';

export function setupSearchUI() {
  const searchBar = document.getElementById('search-bar');
  const searchResults = document.getElementById('search-results');

  searchBar?.addEventListener('input', async () => {
    const searchTerm = searchBar.value.toLowerCase().trim();
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';

    if (searchTerm === '') return;
    const meta = await getMeta();

    const results = meta.filter(entry =>
      entry.label.toLowerCase().includes(searchTerm) ||
      entry.fma.toLowerCase().includes(searchTerm)
    );

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.textContent = `${result.label} (${result.group})`;
      item.dataset.entry = JSON.stringify(result);
      item.addEventListener('click', async () => {
        const entry = JSON.parse(item.dataset.entry);
        await loadModels([entry], entry.group, true, scene, loader);
        const model = state.groups[entry.group]?.find(m => state.modelNames.get(m) === entry.label);
        if (model) {
          highlightObject(model);
          showInfoPanel(entry, model);
        }
        searchResults.style.display = 'none';
        searchBar.value = '';
      });
      searchResults.appendChild(item);
    });

    if (results.length > 0) {
      searchResults.style.display = 'block';
    }
  });
}
