// js/ui.js
import * as THREE from './three.module.js';
import { loadModels } from './modelLoader.js';
import { getMeta } from './utils.js';
import { state } from './state.js';
import { scene } from './init.js';

export function setupUI() {
    console.log('setupUI gestartet');
    const infoPanel = document.getElementById('info-panel');
    const infoClose = document.getElementById('info-close');
    if (!infoPanel || !infoClose) {
        console.error('info-panel oder info-close nicht gefunden');
    } else {
        console.log('info-panel und info-close gefunden');
        infoClose.addEventListener('click', hideInfoPanel);
    }

    ['bones', 'muscles', 'tendons', 'other'].forEach(groupName => {
        state.clickCounts[groupName] = 0;
        const checkbox = document.getElementById(groupName);
        if (!checkbox) {
            console.error(`Checkbox für ${groupName} nicht gefunden`);
            return;
        }
        console.log(`Initialisiere Gruppe: ${groupName}`);
        checkbox.addEventListener('change', async (e) => {
            console.log(`Checkbox ${groupName} geändert, checked: ${e.target.checked}`);
            const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
            if (!subDropdown) {
                console.error(`Sub-Dropdown für ${groupName} nicht gefunden`);
                return;
            }
            state.clickCounts[groupName]++;
            if (state.clickCounts[groupName] === 1) {
                subDropdown.style.display = 'block';
                console.log(`Generiere Sub-Dropdown für ${groupName}`);
                await generateSubDropdown(groupName);
                const meta = await getMeta();
                const entries = meta.filter(entry => entry.group === groupName);
                console.log(`Meta für ${groupName}:`, entries.length, 'Einträge');
                await loadModels(entries, groupName, true, scene, loader);
            } else if (state.clickCounts[groupName] === 2) {
                const meta = await getMeta();
                const entries = meta.filter(entry => entry.group === groupName);
                await loadModels(entries, groupName, false, scene, loader);
                document.querySelectorAll(`#${groupName}-subgroups .subgroup-checkbox`).forEach(checkbox => {
                    checkbox.checked = false;
                    state.groupStates[groupName][checkbox.dataset.subgroup] = false;
                });
                document.querySelectorAll(`#${groupName}-subgroups .item-checkbox`).forEach(checkbox => checkbox.checked = false);
                e.target.checked = true;
            } else {
                state.clickCounts[groupName] = 0;
                subDropdown.style.display = 'none';
                e.target.checked = false;
            }
        });
    });

    // Öffne das Dropdown initial
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        console.log('Dropdown gefunden, setze .active');
        dropdown.classList.add('active');
    } else {
        console.error('Dropdown nicht gefunden');
    }

    // Suchleiste
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) {
        console.error('search-bar nicht gefunden');
    } else {
        console.log('search-bar gefunden');
        searchBar.addEventListener('input', async () => {
            const searchTerm = searchBar.value.toLowerCase();
            const meta = await getMeta();
            const results = meta.filter(entry =>
                entry.label.toLowerCase().includes(searchTerm) ||
                entry.fma.toLowerCase().includes(searchTerm)
            );
            console.log(`Suchergebnisse für "${searchTerm}":`, results.map(r => r.label));
            results.forEach(result => loadModels([result], result.group, true, scene, loader));
        });
    }

    // Transparenz-Slider
    const transparencySlider = document.getElementById('transparency-slider');
    if (!transparencySlider) {
        console.error('transparency-slider nicht gefunden');
    } else {
        console.log('transparency-slider gefunden');
        transparencySlider.addEventListener('input', (e) => {
            const transparency = parseFloat(e.target.value);
            Object.values(state.groups).flat().forEach(model => {
                model.traverse(child => {
                    if (child.isMesh) {
                        child.material.transparent = true;
                        child.material.opacity = transparency;
                    }
                });
            });
        });
    }

    // Licht-Slider
    const lightingSlider = document.getElementById('lighting-slider');
    if (!lightingSlider) {
        console.error('lighting-slider nicht gefunden');
    } else {
        console.log('lighting-slider gefunden');
        lightingSlider.addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            scene.children.forEach(child => {
                if (child instanceof THREE.DirectionalLight) {
                    child.intensity = intensity * (child.position.y === 1 ? 0.5 : child.position.x === -1 ? 0.6 : 0.8);
                } else if (child instanceof THREE.AmbientLight) {
                    child.intensity = intensity * 0.3;
                }
            });
        });
    }

    // Hintergrund-Slider
    const backgroundSlider = document.getElementById('background-slider');
    if (!backgroundSlider) {
        console.error('background-slider nicht gefunden');
    } else {
        console.log('background-slider gefunden');
        backgroundSlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            document.body.style.backgroundColor = `rgba(51, 51, 51, ${opacity})`;
        });
    }
}

export async function generateSubDropdown(groupName) {
  const meta = await getMeta();
  const container = document.getElementById(`${groupName}-subgroups`);
  container.innerHTML = '';
  const subgroups = [...new Set(
    meta.filter(entry => entry.group === groupName && entry.subgroup)
      .map(entry => entry.subgroup)
  )].sort();

  subgroups.forEach(subgroup => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'subgroup-line';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.group = groupName;
    checkbox.dataset.subgroup = subgroup;
    checkbox.className = 'subgroup-checkbox';
    checkbox.addEventListener('change', async () => {
      const meta = await getMeta();
      const entries = meta.filter(entry => entry.group === groupName && entry.subgroup === subgroup);
      loadModels(entries, groupName, checkbox.checked);
    });
    label.appendChild(checkbox);
    label.append(` ${subgroup}`);
    lineDiv.appendChild(label);

    const moreButton = document.createElement('button');
    moreButton.className = 'more-button';
    moreButton.innerText = 'mehr...';
    moreButton.addEventListener('click', () => {
      const existing = document.getElementById(`muscle-list-${subgroup}`);
      if (existing) {
        existing.remove();
      } else {
        generateMoreMuscleList(subgroup);
      }
    });
    lineDiv.appendChild(moreButton);
    lineDiv.setAttribute('data-subgroup', subgroup);
    lineDiv.classList.add('subgroup-container');
    container.appendChild(lineDiv);
  });
}

function generateMoreMuscleList(subgroup) {
  getMeta().then(meta => {
    const container = document.querySelector(`#muscles-subgroups .subgroup-container[data-subgroup="${subgroup}"]`);
    if (!container) return;

    const filtered = meta.filter(e => e.subgroup === subgroup && e.group === 'muscles').sort((a, b) =>
      parseInt(b.fma.replace(/\D/g, '')) - parseInt(a.fma.replace(/\D/g, ''))
    );

    const list = document.createElement('div');
    list.className = 'muscle-detailed-list';
    list.id = `muscle-list-${subgroup}`;

    filtered.forEach(entry => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'item-checkbox';
      checkbox.dataset.filename = entry.filename;
      checkbox.addEventListener('change', () => {
        loadModels([entry], 'muscles', checkbox.checked);
      });
      label.appendChild(checkbox);
      label.append(` ${entry.label}`);
      list.appendChild(label);
      list.appendChild(document.createElement('br'));
    });

    container.appendChild(list);
  });
}

function hideInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  infoPanel.classList.remove('visible');
  document.getElementById('info-content').innerHTML = '';
  if (state.currentlySelected?.material?.emissive) {
    state.currentlySelected.material.emissive.setHex(0x000000);
  }
  state.currentlySelected = null;
}
