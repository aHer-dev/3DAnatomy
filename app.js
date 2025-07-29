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
    if (!groups[groupName]) groups[groupName] = [];
    const meta = await getMeta();
    const groupEntries = meta.filter(entry => entry.group === groupName);
    const subgroups = [...new Set(groupEntries.map(entry => entry.subgroup || 'uncategorized'))];

    const container = document.getElementById(`${groupName}-subgroups`);
    container.innerHTML = ''; // Container leeren

    subgroups.forEach(subgroup => {
        // Subgruppen-Checkbox
        const subgroupLabel = document.createElement('label');
        subgroupLabel.innerHTML = `<input type="checkbox" class="subgroup-checkbox" data-subgroup="${subgroup}" data-group="${groupName}" aria-label="Subgruppe ${subgroup} togglen"> ${subgroup}`;
        subgroupLabel.querySelector('input').checked = true;
        groupStates[groupName][subgroup] = true;
        container.appendChild(subgroupLabel);

        // Nested Dropdown für Seiten (left, right, none)
        const sideDropdown = document.createElement('div');
        sideDropdown.className = 'item-dropdown';
        const sideButton = document.createElement('button');
        sideButton.className = 'item-dropdown-button';
        sideButton.innerText = 'Seiten auswählen';
        sideButton.setAttribute('aria-expanded', 'false');
        sideButton.onclick = function() {
            const content = this.nextElementSibling;
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
            this.parentElement.classList.toggle('active');
            this.setAttribute('aria-expanded', this.parentElement.classList.contains('active'));
        };
        sideDropdown.appendChild(sideButton);

        const sideContent = document.createElement('div');
        sideContent.className = 'item-dropdown-content';
        sideContent.style.display = 'none';
        const sides = [...new Set(groupEntries.filter(entry => (entry.subgroup || 'uncategorized') === subgroup).map(entry => entry.side || 'none'))];
        sides.forEach(side => {
            const sideLabel = document.createElement('label');
            sideLabel.innerHTML = `<input type="checkbox" class="side-checkbox" data-subgroup="${subgroup}" data-side="${side}" data-group="${groupName}" aria-label="Seite ${side} togglen"> ${side}`;
            sideContent.appendChild(sideLabel);

            // Nested Dropdown für Teile (parts)
            const partsDropdown = document.createElement('div');
            partsDropdown.className = 'item-dropdown';
            const partsButton = document.createElement('button');
            partsButton.className = 'item-dropdown-button';
            partsButton.innerText = 'Teile auswählen';
            partsButton.setAttribute('aria-expanded', 'false');
            partsButton.onclick = function() {
                const content = this.nextElementSibling;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
                this.parentElement.classList.toggle('active');
                this.setAttribute('aria-expanded', this.parentElement.classList.contains('active'));
            };
            partsDropdown.appendChild(partsButton);

            const partsContent = document.createElement('div');
            partsContent.className = 'item-dropdown-content';
            partsContent.style.display = 'none';
            const subgroupItems = groupEntries.filter(entry => (entry.subgroup || 'uncategorized') === subgroup && (entry.side || 'none') === side);
            subgroupItems.forEach(item => {
                const itemLabel = document.createElement('label');
                itemLabel.className = 'item-checkbox';
                itemLabel.innerHTML = `
                    <input type="checkbox" class="item-checkbox" data-filename="${item.filename}" data-group="${groupName}" aria-label="${item.label} togglen">
                    ${item.label}
                    <input type="color" class="color-picker" data-filename="${item.filename}" title="Farbe ändern" style="margin-left:10px; vertical-align:middle; width:20px; height:20px; border:none; background:none; cursor:pointer;">
                `;
                if (item.parts.length > 0) {
                    itemLabel.innerHTML += `<span> (Parts: ${item.parts.join(', ')})</span>`;
                }
                partsContent.appendChild(itemLabel);
            });
            partsDropdown.appendChild(partsContent);
            sideContent.appendChild(partsDropdown);
        });
        sideDropdown.appendChild(sideContent);
        container.appendChild(sideDropdown);

        // Event-Listener für Subgruppen-Checkbox
        subgroupLabel.querySelector('input').addEventListener('change', (e) => {
            const subgroup = e.target.dataset.subgroup;
            const group = e.target.dataset.group;
            const wasChecked = groupStates[group][subgroup] || false;
            groupStates[group][subgroup] = !wasChecked;
            loadSubgroup(group, subgroup, groupStates[group][subgroup]);

            // Setze Seiten- und Einzel-Checkboxes
            const sideListDiv = e.target.parentElement.nextElementSibling.querySelectorAll('.side-checkbox');
            sideListDiv.forEach(checkbox => {
                checkbox.checked = groupStates[group][subgroup];
                const partsListDiv = checkbox.parentElement.nextElementSibling.querySelectorAll('.item-checkbox input');
                partsListDiv.forEach(itemCheckbox => itemCheckbox.checked = groupStates[group][subgroup]);
            });
        });

        // Event-Listener für Seiten-Checkboxen
        sideContent.querySelectorAll('.side-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const group = e.target.dataset.group;
                const subgroup = e.target.dataset.subgroup;
                const side = e.target.dataset.side;
                const checked = e.target.checked;
                loadSide(group, subgroup, side, checked);
            });
        });

        // Event-Listener für Einzel-Elemente
        partsContent.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const group = e.target.dataset.group;
                const file = e.target.dataset.filename;
                const checked = e.target.checked;
                loadSingleItem(group, file, checked);
            });
        });

        // Event-Listener für Farbpicker
        partsContent.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', async (e) => {
                const filename = e.target.dataset.filename;
                const newColor = parseInt(e.target.value.replace('#', '0x'));
                const meta = await getMeta();
                const entry = meta.find(e => e.filename === filename);
                if (!entry) {
                    console.warn("⚠️ Kein Metadaten-Eintrag für", filename);
                    return;
                }
                for (const [model, label] of modelNames.entries()) {
                    if (label === entry.label) {
                        model.traverse(child => {
                            if (child.isMesh) {
                                child.material.color.set(newColor);
                            }
                        });
                        console.log(`✅ Farbe für ${label} geändert zu ${e.target.value}`);
                        return;
                    }
                }
                console.warn(`⚠️ Modell ${entry.label} ist noch nicht geladen. Lade es zuerst!`);
            });
        });
    });
}

// --- Laden von Subgruppen ---
async function loadSubgroup(groupName, subgroup, visible) {
    const meta = await getMeta();
    const subgroupEntries = meta.filter(entry => entry.group === groupName && (entry.subgroup === subgroup || (subgroup === 'uncategorized' && !entry.subgroup)));

    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (visible) {
        loadingDiv.style.display = 'block';
        let loadedCount = 0;
        const totalModels = subgroupEntries.length;

        const promises = subgroupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = getModelPath(entry.filename);
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
                const modelPath = getModelPath(entry.filename);
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

// --- Klick-Selection mit Tooltip und Sidebar ---
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
document.body.appendChild(tooltip);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const selectedModel = intersects[0].object.parent;
        const name = modelNames.get(selectedModel) || 'Unbekannt';
        tooltip.innerText = name;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        setTimeout(() => tooltip.style.display = 'none', 3000);
        console.log(`Klick: Zeige Name ${name}`);

        // Sidebar mit Details füllen
        getMeta().then(meta => {
            const entry = meta.find(e => e.label === name);
            if (entry) {
                document.getElementById('detail-label').innerText = `Label: ${entry.label}`;
                document.getElementById('detail-fma').innerText = `FMA-ID: ${entry.fma}`;
                document.getElementById('detail-group').innerText = `Gruppe/Subgruppe: ${entry.group}/${entry.subgroup || 'uncategorized'}`;
                document.getElementById('detail-side').innerText = `Seite: ${entry.side || 'none'}`;
                document.getElementById('detail-parts').innerText = `Teile: ${entry.parts.length > 0 ? entry.parts.join(', ') : 'none'}`;
                document.getElementById('detail-info').innerText = `Info: ${JSON.stringify(entry.info)}`;
                document.getElementById('sidebar').style.display = 'block';
            }
        });
    }
}
window.addEventListener('click', onMouseClick);

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

        // Beispiel: Fehler beim Laden eines Modells
fetch(modelPath + filename)
  .then(response => {
    if (!response.ok) {
      throw new Error("404");
    }
    return response.arrayBuffer();
  })
  .then(buffer => {
    // Weiterverarbeitung
  })
  .catch(error => {
    console.error("Datei nicht gefunden:", modelPath + filename);
    showPopup("❌ Fehler beim Laden der Gruppe. Prüfe die Dateistruktur.");
  });

        const promises = groupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = getModelPath(entry.filename);
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