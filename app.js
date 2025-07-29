// --- Dynamischer basePath für GitHub Pages vs. lokal ---
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/3DAnatomy" : ""; // Lokal leer, um //models/ zu vermeiden
console.log("app.js geladen, basePath: " + basePath);

// --- Initialisierung von Three.js ---
if (typeof THREE === 'undefined') {
    console.error('THREE is not defined. Überprüfe die three.js-Script in index.html');
} else {
    console.log("THREE ist definiert, Version: " + THREE.REVISION);
}

const infoPanel = document.getElementById('info-panel');
const infoContent = document.getElementById('info-content');
const infoClose = document.getElementById('info-close');

if (infoClose) {
    infoClose.addEventListener('click', () => {
        hideInfoPanel();
    });
}

// Szene, Kamera und Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);
console.log("THREE und Renderer initialisiert");

// OrbitControls für interaktive Navigation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
};
controls.minDistance = 1;
controls.maxDistance = 2000;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;
controls.maxPolarAngle = Math.PI / 2;
console.log("OrbitControls initialisiert");

// Beleuchtung für gleichmäßige Ausleuchtung
const lightFront = new THREE.DirectionalLight(0xffffff, 0.8); // Frontlicht
lightFront.position.set(1, 1, 1);
scene.add(lightFront);

const lightBack = new THREE.DirectionalLight(0xffffff, 0.6); // Rückenlicht
lightBack.position.set(-1, 1, -1);
scene.add(lightBack);

const lightTop = new THREE.DirectionalLight(0xffffff, 0.5); // Oberlicht
lightTop.position.set(0, 1, 0);
scene.add(lightTop);

const ambientLight = new THREE.AmbientLight(0x606060); // Weiches Umgebungslicht
scene.add(ambientLight);

camera.position.set(0, 2, 5); // Initiale Kameraposition

// GLTF-Loader für Modelle
const loader = new THREE.GLTFLoader();

// --- Globale Zustände ---
let clickCounts = {
    bones: 0,
    muscles: 0,
    tendons: 0,
    other: 0
};
let groups = {
    bones: [],
    muscles: [],
    tendons: [],
    other: []
};
let colors = {
    bones: 0xffffff, // Weiß
    muscles: 0xff0000, // Rot
    tendons: 0xffff00, // Gelb
    other: 0x00ff00 // Grün
};
let modelNames = new Map(); // Map: Modell -> Label
let groupStates = { // Verfolgt Subgruppen-Status
    bones: {},
    muscles: {},
    tendons: {},
    other: {}
};

function getModelPath(filename, group) {
    const path = `${basePath}/models/${group}/${filename}`.replace(/\/+/g, '/');
    return path.startsWith('/') ? path : `/${path}`;
}

// --- Metadaten-Laden mit Existenzprüfung ---
let metaData = null; // Cache für meta.json
async function getMeta() {
    if (!metaData) {
        try {
            const response = await fetch(`${basePath}/data/meta.json`.replace(/\/+/g, '/'));
            if (!response.ok) throw new Error(`Fehler beim Laden von meta.json: ${response.status}`);
            metaData = await response.json();
            console.log("meta.json geladen, Einträge:", metaData.length);
        } catch (error) {
            console.error("Fehler beim Laden von meta.json:", error);
            alert("Fehler beim Laden der Metadaten. Prüfe die Dateistruktur.");
            return [];
        }
    }
    return metaData;
}



// --- Sub-Dropdown-Generierung ---
async function generateSubDropdown(groupName) {
    const meta = await getMeta();
    const container = document.getElementById(`${groupName}-subgroups`);
    container.innerHTML = "";

    // Alle einzigartigen Subgruppen dieser Gruppe sammeln
    const subgroups = [...new Set(
        meta
            .filter(entry => entry.group === groupName && entry.subgroup)
            .map(entry => entry.subgroup)
    )];

    // Sortiere Subgruppen alphabetisch
    subgroups.sort();

    subgroups.forEach(subgroup => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.group = groupName;
        checkbox.dataset.subgroup = subgroup;
        checkbox.checked = false;

        checkbox.addEventListener("change", () => {
            toggleSubgroup(groupName, subgroup, checkbox.checked);
        });

        label.appendChild(checkbox);
        label.append(` ${subgroup}`);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
    });
}

function toggleSubgroup(groupName, subgroup, visible) {
    loadSubgroup(groupName, subgroup, visible);
}

// --- Laden von Subgruppen ---
async function loadSubgroup(groupName, subgroup, visible) {
    const meta = await getMeta();
    const subgroupEntries = meta.filter(entry => entry.group === groupName && (entry.subgroup === subgroup || (subgroup === 'uncategorized' && !entry.subgroup)));

    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');
const infoClose = document.getElementById('info-close');

        // Panel schließen bei Button-Klick
        infoClose.addEventListener('click', () => {
        hideInfoPanel();
        });

    if (visible) {
        loadingDiv.style.display = 'block';
        let loadedCount = 0;
        const totalModels = subgroupEntries.length;

        const promises = subgroupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = getModelPath(entry.filename, groupName);
                fetch(modelPath, { method: 'HEAD' }).then(res => {
                    if (!res.ok) {
                        console.error(`Datei nicht gefunden: ${modelPath}`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        reject(new Error(`Datei ${modelPath} nicht gefunden`));
                        return;
                    }
                    loader.load(
                        modelPath,
                        (gltf) => {
                            const model = gltf.scene;
                            model.rotation.x = -Math.PI / 2;
                            model.visible = true;
                            const safeColor = colors[groupName] ?? 0xffffff;
                            model.traverse(child => {
                                if (child.isMesh) {
                                    child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                                }
                            });

                            scene.add(model);
                            groups[groupName].push(model);
                            modelNames.set(model, entry.label);

                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            resolve();
                        },
                        undefined,
                        (error) => {
                            console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            reject(error);
                        }
                    );
                }).catch(error => {
                    console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
                    loadedCount++;
                    const progress = Math.round((loadedCount / totalModels) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressText.innerText = `${progress}%`;
                    reject(error);
                });
            });
        });

        await Promise.all(promises).catch(() => {
            alert("Einige Modelle konnten nicht geladen werden. Prüfe die Dateistruktur.");
        });
        loadingDiv.style.display = 'none';
    } else {
        groups[groupName] = groups[groupName].filter(model => {
            const label = modelNames.get(model);
            const isInSubgroup = subgroupEntries.some(entry => entry.label === label);
            if (isInSubgroup) {
                scene.remove(model);
                model.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
                modelNames.delete(model);
                return false;
            }
            return true;
        });
    }
}

// --- Laden von Seiten (left, right, none) ---
async function loadSide(groupName, subgroup, side, visible) {
    const meta = await getMeta();
    const sideEntries = meta.filter(entry => 
        entry.group === groupName && 
        (entry.subgroup === subgroup || (subgroup === 'uncategorized' && !entry.subgroup)) && 
        (entry.side || 'none') === side
    );

    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (visible) {
        loadingDiv.style.display = 'block';
        let loadedCount = 0;
        const totalModels = sideEntries.length;

        const promises = sideEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = getModelPath(entry.filename, groupName);
                fetch(modelPath, { method: 'HEAD' }).then(res => {
                    if (!res.ok) {
                        console.error(`Datei nicht gefunden: ${modelPath}`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        reject(new Error(`Datei ${modelPath} nicht gefunden`));
                        return;
                    }
                    loader.load(
                        modelPath,
                        (gltf) => {
                            const model = gltf.scene;
                            model.rotation.x = -Math.PI / 2;
                            model.visible = true;
                            const safeColor = colors[groupName] ?? 0xffffff;
                            model.traverse(child => {
                                if (child.isMesh) {
                                    child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                                }
                            });

                            scene.add(model);
                            groups[groupName].push(model);
                            modelNames.set(model, entry.label);

                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            resolve();
                        },
                        undefined,
                        (error) => {
                            console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            reject(error);
                        }
                    );
                }).catch(error => {
                    console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
                    loadedCount++;
                    const progress = Math.round((loadedCount / totalModels) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressText.innerText = `${progress}%`;
                    reject(error);
                });
            });
        });

        await Promise.all(promises).catch(() => {
            alert("Einige Modelle konnten nicht geladen werden. Prüfe die Dateistruktur.");
        });
        loadingDiv.style.display = 'none';
    } else {
        groups[groupName] = groups[groupName].filter(model => {
            const label = modelNames.get(model);
            const isInSide = sideEntries.some(entry => entry.label === label);
            if (isInSide) {
                scene.remove(model);
                model.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
                modelNames.delete(model);
                return false;
            }
            return true;
        });
    }
}

// --- Laden eines einzelnen Modells ---
async function loadSingleItem(groupName, filename, visible) {
    const meta = await getMeta();
    const entry = meta.find(e => e.filename === filename);
    if (!entry) {
        console.warn(`⚠️ Kein Metadaten-Eintrag für ${filename}`);
        return;
    }

    const modelPath = getModelPath(filename);

    if (visible) {
        fetch(modelPath, { method: 'HEAD' }).then(res => {
            if (!res.ok) {
                console.error(`Datei nicht gefunden: ${modelPath}`);
                alert(`Modell ${entry.label} konnte nicht geladen werden: Datei nicht gefunden.`);
                return;
            }
            loader.load(
                modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    model.rotation.x = -Math.PI / 2;
                    model.visible = true;
                    const safeColor = colors[groupName] ?? 0xffffff;
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                        }
                    });

                    scene.add(model);
                    groups[groupName].push(model);
                    modelNames.set(model, entry.label);
                    console.log(`✅ Einzelnes Modell geladen: ${entry.label}`);
                },
                undefined,
                (error) => {
                    console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                    alert(`Fehler beim Laden von ${entry.label}: ${error.message}`);
                }
            );
        }).catch(error => {
            console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
            alert(`Modell ${entry.label} konnte nicht geladen werden: ${error.message}`);
        });
    } else {
        groups[groupName] = groups[groupName].filter(model => {
            const label = modelNames.get(model);
            if (label === entry.label) {
                scene.remove(model);
                model.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
                modelNames.delete(model);
                return false;
            }
            return true;
        });
    }
}

// --- Gruppen-Checkboxen-Logik ---
['bones', 'muscles', 'tendons', 'other'].forEach(groupName => {
    document.getElementById(groupName).addEventListener('change', (e) => {
        const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
        clickCounts[groupName]++;
        if (clickCounts[groupName] === 1) {
            subDropdown.style.display = 'block';
            generateSubDropdown(groupName);
            loadGroup(groupName);
            console.log(`Gruppe ${groupName} aktiviert, Sub-Dropdown geöffnet, Modelle geladen`);
        } else if (clickCounts[groupName] === 2) {
            groups[groupName].forEach(model => {
                scene.remove(model);
                model.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
                modelNames.delete(model);
            });
            groups[groupName] = [];
            groupStates[groupName] = {};
            document.querySelectorAll(`#${groupName}-subgroups .subgroup-checkbox`).forEach(checkbox => {
                checkbox.checked = false;
                groupStates[groupName][checkbox.dataset.subgroup] = false;
            });
            document.querySelectorAll(`#${groupName}-subgroups .item-checkbox`).forEach(checkbox => checkbox.checked = false);
            e.target.checked = true;
            console.log(`Gruppe ${groupName} entladen, Sub-Dropdown bleibt offen`);
        } else {
            clickCounts[groupName] = 0;
            subDropdown.style.display = 'none';
            e.target.checked = false;
            console.log(`Gruppe ${groupName} deaktiviert, Sub-Dropdown geschlossen`);
        }
    });
});

// --- Farbänderung für Gruppen ---
function changeColor(groupName, colorHex) {
    colors[groupName] = parseInt(colorHex.replace('#', '0x'));
    groups[groupName].forEach(model => {
        model.traverse(child => {
            if (child.isMesh) {
                child.material.color.set(colors[groupName]);
            }
        });
    });
    console.log(`Farbe geändert: ${groupName} -> ${colorHex}`);
}

// --- Farbänderung für einzelnes Modell ---
function changeModelColorByLabel(label, colorHex) {
    const hex = parseInt(colorHex.replace('#', '0x'));
    for (const [model, name] of modelNames.entries()) {
        if (name === label) {
            model.traverse(child => {
                if (child.isMesh) {
                    child.material.color.set(hex);
                }
            });
            console.log(`✅ Farbe für ${label} auf ${colorHex} gesetzt`);
            return;
        }
    }
    console.warn(`⚠️ Modell mit Label "${label}" nicht gefunden`);
}



const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const selectedModel = clickedObject.parent;
        const modelLabel = modelNames.get(selectedModel);

        if (modelLabel) {
            getMeta().then(meta => {
                const entry = meta.find(e => e.label === modelLabel);
                if (entry) {
                    showInfoPanel(entry);          // Infofenster anzeigen
                    highlightObject(clickedObject); // Objekt hervorheben
                }
            });
        } else {
            console.warn("❓ Kein Label für das angeklickte Modell gefunden.");
        }
    } else {
        hideInfoPanel();  // Kein Objekt getroffen → Panel schließen
        currentlySelected = null;
    }
}


window.addEventListener('click', onMouseClick);

// Infopanele

function showInfoPanel(meta) {
  infoContent.innerHTML = `
    <p><strong>Label:</strong> ${meta.label}</p>
    ${meta.fma ? `<p><strong>FMA-ID:</strong> ${meta.fma}</p>` : ""}
    ${meta.group ? `<p><strong>Gruppe:</strong> ${meta.group}</p>` : ""}
    ${meta.subgroup && meta.subgroup !== "none" ? `<p><strong>Subgruppe:</strong> ${meta.subgroup}</p>` : ""}
    ${meta.side && meta.side !== "none" ? `<p><strong>Seite:</strong> ${meta.side}</p>` : ""}
    ${meta.info?.origin ? `<p><strong>Ursprung:</strong> ${meta.info.origin}</p>` : ""}
    ${meta.info?.insertion ? `<p><strong>Ansatz:</strong> ${meta.info.insertion}</p>` : ""}
    ${meta.info?.function ? `<p><strong>Funktion:</strong> ${meta.info.function}</p>` : ""}
  `;

  infoPanel.classList.add('visible');
}

function hideInfoPanel() {
  infoPanel.classList.remove('visible');
  infoContent.innerHTML = '';
  if (currentlySelected?.material?.emissive) {
    currentlySelected.material.emissive.setHex(0x000000);
  }
  currentlySelected = null;
}


// --- Suchleiste mit Autovervollständigung ---
const searchBar = document.getElementById('search-bar');
searchBar.addEventListener('input', async () => {
    const searchTerm = searchBar.value.toLowerCase();
    const meta = await getMeta();
    const results = meta.filter(entry => 
        entry.label.toLowerCase().includes(searchTerm) || 
        entry.fma.toLowerCase().includes(searchTerm)
    );
    // TODO: Ergebnisse in einer Dropdown-Liste anzeigen
    if (results.length > 0) {
        console.log(`Suchergebnisse für "${searchTerm}":`, results.map(r => r.label));
        results.forEach(result => {
            loadSingleItem(result.group, result.filename, true);
        });
    } else {
        console.log(`Keine Ergebnisse für "${searchTerm}"`);
    }
});

// --- Werkzeugleiste: Transparenz, Beleuchtung, Hintergrund ---
document.getElementById('transparency-slider').addEventListener('input', (e) => {
    const transparency = parseFloat(e.target.value);
    Object.values(groups).flat().forEach(model => {
        model.traverse(child => {
            if (child.isMesh) {
                child.material.transparent = true;
                child.material.opacity = transparency;
            }
        });
    });
    console.log(`Transparenz gesetzt: ${transparency}`);
});

let currentlySelected = null;

function highlightObject(object) {
  // Vorheriges Objekt zurücksetzen
  if (currentlySelected) {
    currentlySelected.material.emissive?.setHex(0x000000);
  }

  // Neues Objekt hervorheben
  if (object.material.emissive) {
    object.material.emissive.setHex(0x222222);
  }

  currentlySelected = object;
}

document.getElementById('lighting-slider').addEventListener('input', (e) => {
    const intensity = parseFloat(e.target.value);
    lightFront.intensity = intensity * 0.8;
    lightBack.intensity = intensity * 0.6;
    lightTop.intensity = intensity * 0.5;
    ambientLight.intensity = intensity * 0.3;
    console.log(`Beleuchtung gesetzt: ${intensity}`);
});

document.getElementById('background-slider').addEventListener('input', (e) => {
    const opacity = parseFloat(e.target.value);
    document.body.style.backgroundColor = `rgba(51, 51, 51, ${opacity})`;
    console.log(`Hintergrund-Transparenz gesetzt: ${opacity}`);
});

// --- Werkzeugleiste: Annotations, Quiz, Export (Platzhalter) ---
document.getElementById('annotations-button').addEventListener('click', () => {
    console.log('Annotations-Funktion wird implementiert');
    alert('Annotations-Funktion: Noch nicht implementiert');
});

document.getElementById('quiz-button').addEventListener('click', async () => {
    const meta = await getMeta();
    const randomModel = meta[Math.floor(Math.random() * meta.length)];
    alert(`Quiz: Welches Modell ist das? (Label: ${randomModel.label})`);
    console.log('Quiz-Modus gestartet:', randomModel.label);
});

document.getElementById('export-button').addEventListener('click', () => {
    console.log('Export-Funktion wird implementiert');
    alert('Export-Funktion: Noch nicht implementiert');
});

// --- Farbpicker-Events ---
document.getElementById('color-bones').addEventListener('input', (e) => changeColor('bones', e.target.value));
document.getElementById('color-muscles').addEventListener('input', (e) => changeColor('muscles', e.target.value));
document.getElementById('color-tendons').addEventListener('input', (e) => changeColor('tendons', e.target.value));
document.getElementById('color-other').addEventListener('input', (e) => changeColor('other', e.target.value));

// --- Screenshot-Button ---
document.getElementById('screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = '3d-anatomy-screenshot.png';
    link.click();
});

// --- Speichern-Button ---
document.getElementById('save').addEventListener('click', () => {
    const state = {
        groups: {
            bones: document.getElementById('bones').checked,
            muscles: document.getElementById('muscles').checked,
            tendons: document.getElementById('tendons').checked,
            other: document.getElementById('other').checked
        },
        colors: colors
    };
    prompt('Kopiere diesen Code, um die Einstellungen zu speichern:', JSON.stringify(state));
});

// --- Laden-Button ---
document.getElementById('load').addEventListener('click', async () => {
    const code = document.getElementById('load-code').value;
    if (code) {
        try {
            const state = JSON.parse(code);
            document.getElementById('bones').checked = state.groups.bones;
            toggleGroup('bones', state.groups.bones);
            document.getElementById('muscles').checked = state.groups.muscles;
            toggleGroup('muscles', state.groups.muscles);
            document.getElementById('tendons').checked = state.groups.tendons;
            toggleGroup('tendons', state.groups.tendons);
            document.getElementById('other').checked = state.groups.other;
            toggleGroup('other', state.groups.other);
            changeColor('bones', `#${state.colors.bones.toString(16).padStart(6, '0')}`);
            document.getElementById('color-bones').value = `#${state.colors.bones.toString(16).padStart(6, '0')}`;
            changeColor('muscles', `#${state.colors.muscles.toString(16).padStart(6, '0')}`);
            document.getElementById('color-muscles').value = `#${state.colors.muscles.toString(16).padStart(6, '0')}`;
            changeColor('tendons', `#${state.colors.tendons.toString(16).padStart(6, '0')}`);
            document.getElementById('color-tendons').value = `#${state.colors.tendons.toString(16).padStart(6, '0')}`;
            changeColor('other', `#${state.colors.other.toString(16).padStart(6, '0')}`);
            document.getElementById('color-other').value = `#${state.colors.other.toString(16).padStart(6, '0')}`;
        } catch (error) {
            console.error('Fehler beim Laden des Codes: ', error);
            alert('Fehler beim Laden der Einstellungen: Ungültiger Code');
        }
    }
});

// --- Gruppen-Toggle-Funktion ---
function toggleGroup(groupName, visible) {
    if (visible) {
        loadGroup(groupName);
    } else {
        groups[groupName].forEach(model => {
            scene.remove(model);
            model.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
            modelNames.delete(model);
        });
        groups[groupName] = [];
    }
}

// --- Laden einer Gruppe ---
function loadGroup(groupName) {
    console.log(`Lade Gruppe: ${groupName}`);
    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (!loadingDiv || !progressBar || !progressText) {
        console.error('Ladebalken-Elemente fehlen:', { loadingDiv, progressBar, progressText });
        alert('Fehler: Ladebalken nicht gefunden.');
        return;
    }

    if (!renderer.getContext()) {
        console.error('WebGL nicht verfügbar auf diesem Gerät');
        alert('Fehler: WebGL wird nicht unterstützt. Versuche einen anderen Browser.');
        return;
    }

    getMeta().then(meta => {
        const groupEntries = meta.filter(entry => entry.group === groupName);
        const totalModels = groupEntries.length;

        if (totalModels > 0) loadingDiv.style.display = 'block';

        let loadedCount = 0;


        const promises = groupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = getModelPath(entry.filename, groupName); // ✅
                fetch(modelPath, { method: 'HEAD' }).then(res => {
                    if (!res.ok) {
                        console.error(`Datei nicht gefunden: ${modelPath}`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        reject(new Error(`Datei ${modelPath} nicht gefunden`));
                        return;
                    }
                    loader.load(
                        modelPath,
                        (gltf) => {
                            const model = gltf.scene;
                            model.rotation.x = -Math.PI / 2;
                            model.visible = true;
                            const safeColor = colors[groupName] ?? 0xffffff;
                            model.traverse(child => {
                                if (child.isMesh) {
                                    child.material = new THREE.MeshStandardMaterial({ color: safeColor });
                                }
                            });

                            scene.add(model);
                            groups[groupName].push(model);
                            modelNames.set(model, entry.label);

                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            resolve();
                        },
                        undefined,
                        (error) => {
                            console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                            loadedCount++;
                            const progress = Math.round((loadedCount / totalModels) * 100);
                            progressBar.style.width = `${progress}%`;
                            progressText.innerText = `${progress}%`;
                            reject(error);
                        }
                    );
                }).catch(error => {
                    console.error(`Fehler beim Prüfen von ${modelPath}: ${error}`);
                    loadedCount++;
                    const progress = Math.round((loadedCount / totalModels) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressText.innerText = `${progress}%`;
                    reject(error);
                });
            });
        });

        Promise.all(promises).then(() => {
            loadingDiv.style.display = 'none';
            setTimeout(() => {
                const box = new THREE.Box3().setFromObject(scene);
                const center = new THREE.Vector3();
                box.getCenter(center);
                const size = box.getSize(new THREE.Vector3()).length();
                const distance = size * 1.5;
                camera.position.set(center.x, center.y, center.z + distance);
                camera.lookAt(center);
                controls.target.copy(center);
                controls.update();
                console.log("Kamera automatisch auf Zentrum ausgerichtet:", center);
            }, 100);
        }).catch(error => {
            console.error('Fehler beim parallelen Laden:', error);
            alert('Fehler beim Laden der Gruppe. Prüfe die Dateistruktur.');
        });
    }).catch(error => {
        console.error(`Fehler beim Laden von meta.json: ${error}`);
        alert('Fehler beim Laden der Metadaten.');
    });
}

// --- Dropdown-Toggle-Funktion ---
function toggleDropdown(button) {
    const dropdown = button.parentElement;
    const content = button.nextElementSibling;
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
    button.setAttribute('aria-expanded', content.style.display === 'block');
}

// --- Menu-Toggle für Hamburger-Menü ---
function toggleMenu() {
    const controls = document.getElementById('controls');
    const menuIcon = document.getElementById('menu-icon');
    if (controls.style.display === 'none' || controls.style.display === '') {
        controls.style.display = 'block';
        menuIcon.classList.add('open');
    } else {
        controls.style.display = 'none';
        menuIcon.classList.remove('open');
    }
}

// --- Lizenz-Dropdown-Toggle ---
function toggleLicense() {
    const licenseDropdown = document.getElementById('license-dropdown');
    licenseDropdown.classList.toggle('active');
}

// --- Schließen von Lizenz-Dropdown bei Klick außerhalb ---
document.addEventListener('click', (event) => {
    const licenseDropdown = document.getElementById('license-dropdown');
    if (!event.target.closest('.license-link') && licenseDropdown.classList.contains('active')) {
        licenseDropdown.classList.remove('active');
    }
});

// --- Initiale Einstellungen ---
document.getElementById('controls').style.display = 'none';
loadGroup('bones'); // Anfangs nur Bones laden

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- Fenstergröße anpassen ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function showPopup(message) {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.backgroundColor = "#f44336";
  popup.style.color = "white";
  popup.style.padding = "12px 18px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3)";
  popup.style.zIndex = 10000;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 5000);
}