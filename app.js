// Dynamischer basePath für GitHub Pages vs. lokal
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/3DAnatomy" : "";

console.log("app.js geladen, basePath: " + basePath);

// Überprüfe, ob THREE definiert ist
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

// OrbitControls für Interaktion
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Stelle sicher, dass Rechtsklick für vertikale Bewegung (Panning) funktioniert
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
};

// Optional: Zoom-Grenzen etwas großzügiger
controls.minDistance = 1;
controls.maxDistance = 2000;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;
controls.maxPolarAngle = Math.PI / 2;

console.log("OrbitControls initialisiert");

// Verbesserte Beleuchtung für gleichmäßige Ausleuchtung
const lightFront = new THREE.DirectionalLight(0xffffff, 0.8); // Von vorne
lightFront.position.set(1, 1, 1);
scene.add(lightFront);

const lightBack = new THREE.DirectionalLight(0xffffff, 0.6); // Von hinten
lightBack.position.set(-1, 1, -1);
scene.add(lightBack);

const lightTop = new THREE.DirectionalLight(0xffffff, 0.5); // Von oben
lightTop.position.set(0, 1, 0);
scene.add(lightTop);

const ambientLight = new THREE.AmbientLight(0x606060); // Etwas stärker für Weichheit
scene.add(ambientLight);

camera.position.set(0, 2, 5); // Aufrecht

const loader = new THREE.GLTFLoader();

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
// Map für Model-Namen (für Klick-Selection)
let modelNames = new Map(); // model -> label
let groupStates = { // Verfolgt Subgruppen-Status
    bones: {},
    muscles: {},
    tendons: {},
    other: {}
};

// Subgruppen aus meta.json laden (einmalig)
let metaData = null; // Cache für meta.json
async function getMeta() {
    if (!metaData) {
        const response = await fetch(basePath + '/data/meta.json');
        if (!response.ok) throw new Error(`Fehler beim Laden von meta.json: ${response.status}`);
        metaData = await response.json();
    }
    return metaData;
}

// Generiere Sub-Dropdown für eine Gruppe
async function generateSubDropdown(groupName) {
    const meta = await getMeta();
    const groupEntries = meta.filter(entry => entry.group === groupName);
    const subgroups = [...new Set(groupEntries.map(entry => entry.subgroup || 'uncategorized'))];

    const container = document.getElementById(`${groupName}-subgroups`);
    container.innerHTML = ''; // Leeren

    subgroups.forEach(subgroup => {
        // Subgruppen-Checkbox
        const subgroupLabel = document.createElement('label');
        subgroupLabel.innerHTML = `<input type="checkbox" class="subgroup-checkbox" data-subgroup="${subgroup}" data-group="${groupName}"> ${subgroup}`;
        subgroupLabel.querySelector('input').checked = true; // Aktiviere Subgruppen-Checkbox
        groupStates[groupName][subgroup] = true; // Setze Status
        container.appendChild(subgroupLabel);

        // Nested Dropdown für Einzel-Elemente
        const itemDropdown = document.createElement('div');
        itemDropdown.className = 'item-dropdown';
        const itemButton = document.createElement('button');
        itemButton.className = 'item-dropdown-button';
        itemButton.innerText = 'Einzelne Elemente anzeigen';
        itemButton.onclick = function() {
            const content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = 'none';
            } else {
                content.style.display = 'block';
            }
            this.parentElement.classList.toggle('active');
        };
        itemDropdown.appendChild(itemButton);

        const itemContent = document.createElement('div');
        itemContent.className = 'item-dropdown-content';
        itemContent.style.display = 'none';
        const subgroupItems = groupEntries.filter(entry => (entry.subgroup || 'uncategorized') === subgroup);
        subgroupItems.forEach(item => {
            const itemLabel = document.createElement('label');
            itemLabel.className = 'item-checkbox';
            itemLabel.innerHTML = `<input type="checkbox" class="item-checkbox" data-filename="${item.filename}" data-group="${groupName}"> ${item.label}`;
            itemContent.appendChild(itemLabel);
        });
        itemDropdown.appendChild(itemContent);
        container.appendChild(itemDropdown);

        // Toggle für Subgruppen-Checkbox
        subgroupLabel.querySelector('input').addEventListener('change', (e) => {
            const subgroup = e.target.dataset.subgroup;
            const group = e.target.dataset.group;
            const wasChecked = groupStates[group][subgroup] || false;
            groupStates[group][subgroup] = !wasChecked;

            loadSubgroup(group, subgroup, groupStates[group][subgroup]);

            // Setze Einzel-Checkboxes
            const itemListDiv = e.target.parentElement.nextElementSibling.querySelector('.item-dropdown-content');
            itemListDiv.querySelectorAll('input').forEach(checkbox => {
                checkbox.checked = groupStates[group][subgroup];
            });
        });

        // Event-Listener für einzelne Elemente
        itemContent.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                loadSingleItem(e.target.dataset.group, e.target.dataset.filename, e.target.checked);
            });
        });
    });
}

// Lade Subgruppe
async function loadSubgroup(groupName, subgroup, visible) {
    const meta = await getMeta();
    const subgroupEntries = meta.filter(entry => entry.group === groupName && (entry.subgroup === subgroup || (subgroup === 'uncategorized' && !entry.subgroup)));
    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (!loadingDiv || !progressBar || !progressText) {
        console.error('Ladebalken-Elemente fehlen:', { loadingDiv, progressBar, progressText });
        alert('Fehler: Ladebalken nicht gefunden.');
        return;
    }

    if (visible) {
        loadingDiv.style.display = 'block';
        let loadedCount = 0;
        const totalModels = subgroupEntries.length;

        const promises = subgroupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = basePath + '/models/' + entry.filename;
                console.log(`Lade Subgruppen-Modell: ${modelPath}`);
                loader.load(
                    modelPath,
                    (gltf) => {
                        const model = gltf.scene;
                        model.rotation.x = -Math.PI / 2;
                        model.visible = true;
                        model.traverse(child => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial({ color: colors[groupName] });
                            }
                        });
                        scene.add(model);
                        groups[groupName].push(model);
                        modelNames.set(model, entry.label);
                        console.log(`Subgruppen-Modell geladen: ${entry.filename}`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                        alert(`Fehler beim Laden eines Modells in ${groupName}/${subgroup}.`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        reject(error);
                    }
                );
            });
        });

        await Promise.all(promises);
        loadingDiv.style.display = 'none';
        console.log('Ladebalken ausgeblendet, Subgruppen-Modelle sichtbar');
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
        // Deaktiviere Einzel-Checkboxes
        document.querySelectorAll(`.item-checkbox[data-group="${groupName}"]`).forEach(checkbox => {
            const entry = subgroupEntries.find(e => e.filename === checkbox.dataset.filename);
            if (entry) checkbox.checked = false;
        });
    }
}

// Lade einzelnes Element
async function loadSingleItem(groupName, filename, visible) {
    const meta = await getMeta();
    const entry = meta.find(e => e.filename === filename);
    if (!entry) return;

    const loadingDiv = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (visible) {
        loadingDiv.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.innerText = '0%';

        loader.load(
            basePath + '/models/' + filename,
            (gltf) => {
                const model = gltf.scene;
                model.rotation.x = -Math.PI / 2;
                model.visible = true;
                model.traverse(child => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({ color: colors[groupName] });
                    }
                });
                scene.add(model);
                groups[groupName].push(model);
                modelNames.set(model, entry.label);
                console.log(`Einzelnes Modell geladen: ${filename}`);
                progressBar.style.width = '100%';
                progressText.innerText = '100%';
                setTimeout(() => {
                    loadingDiv.style.display = 'none';
                }, 500);
            },
            undefined,
            (error) => {
                console.error(`Fehler beim Laden von ${filename}: ${error}`);
                alert(`Fehler beim Laden eines Elements.`);
            }
        );
    } else {
        groups[groupName] = groups[groupName].filter(model => {
            if (modelNames.get(model) === entry.label) {
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

['bones', 'muscles', 'tendons', 'other'].forEach(groupName => {
    document.getElementById(groupName).addEventListener('change', (e) => {
        const subDropdown = document.getElementById(`${groupName}-sub-dropdown`);
        clickCounts[groupName]++;

        if (clickCounts[groupName] === 1) {
            // 1. Klick → Anzeigen & Laden
            
            subDropdown.style.display = 'block';
            generateSubDropdown(groupName);
            loadGroup(groupName);
            console.log(`Gruppe ${groupName} aktiviert, Sub-Dropdown geöffnet, Modelle geladen`);
        } else if (clickCounts[groupName] === 2) {
            // 2. Klick → Entladen, aber Sub-Dropdown bleibt offen
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
            e.target.checked = true; // Checkbox bleibt angehakt
            console.log(`Gruppe ${groupName} entladen, Sub-Dropdown bleibt offen`);
        } else {
            // 3. Klick → Alles zurücksetzen
            clickCounts[groupName] = 0;
            subDropdown.style.display = 'none';
            e.target.checked = false;
            console.log(`Gruppe ${groupName} deaktiviert, Sub-Dropdown geschlossen`);
        }
    });
});


// Klick-Selection mit Tooltip
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
    }
}

window.addEventListener('click', onMouseClick);

// Ladebalken-Variablen
let loadedModels = 0;
let totalModels = 0;

function updateLoadingBar(loaded, total) {
    const loadingBar = document.getElementById('loading-bar');
    const progress = document.getElementById('progress');
    const loadingText = document.getElementById('loading-text');
    
    loadingBar.style.display = 'block';
    const percentage = (loaded / total) * 100;
    progress.style.width = `${percentage}%`;
    loadingText.textContent = `Loading ${loaded} of ${total} models...`;
    
    if (loaded === total) {
        setTimeout(() => {
            loadingBar.style.display = 'none';
        }, 500); // Verstecke nach 0.5s
    }
}

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

        if (totalModels > 0) {
            loadingDiv.style.display = 'block';
            console.log('Ladebalken sichtbar gesetzt');
        }

        let loadedCount = 0;

        const promises = groupEntries.map(entry => {
            return new Promise((resolve, reject) => {
                const modelPath = basePath + '/models/' + entry.filename;
                console.log(`Lade Modell: ${modelPath}`);
                loader.load(
                    modelPath,
                    (gltf) => {
                        const model = gltf.scene;
                        model.rotation.x = -Math.PI / 2;
                        model.visible = true;
                        model.traverse(child => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial({ color: colors[groupName] });
                            }
                        });
                        scene.add(model);
                        groups[groupName].push(model);
                        modelNames.set(model, entry.label);
                        console.log(`Modell geladen: ${entry.filename}`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.error(`Fehler beim Laden von ${modelPath}: ${error}`);
                        alert(`Fehler beim Laden eines Modells in ${groupName}.`);
                        loadedCount++;
                        const progress = Math.round((loadedCount / totalModels) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.innerText = `${progress}%`;
                        reject(error);
                    }
                );
            });
        });

        Promise.all(promises).then(() => {
            loadingDiv.style.display = 'none';
            console.log('Ladebalken ausgeblendet, Modelle sichtbar');

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
        }).catch(error => console.error('Fehler beim parallelen Laden:', error));
    }).catch(error => {
        console.error(`Fehler beim Laden von meta.json: ${error}`);
        alert('Fehler beim Laden der Metadaten.');
    });
}

// Anfangs nur bones laden
loadGroup('bones');

// Checkboxen-Events



// Farbpicker-Events
document.getElementById('color-bones').addEventListener('input', (e) => changeColor('bones', e.target.value));
document.getElementById('color-muscles').addEventListener('input', (e) => changeColor('muscles', e.target.value));
document.getElementById('color-tendons').addEventListener('input', (e) => changeColor('tendons', e.target.value));
document.getElementById('color-other').addEventListener('input', (e) => changeColor('other', e.target.value));

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

// Screenshot-Button
document.getElementById('screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = '3d-anatomy-screenshot.png';
    link.click();
});

// Speichern-Button
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

// Laden-Button
document.getElementById('load').addEventListener('click', () => {
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
        }
    }
});

// Dropdown-Toggle-Funktion
function toggleDropdown(button) {
    const dropdown = button.parentElement;
    const content = button.nextElementSibling;
    if (content.style.display === "block") {
        content.style.display = "none";
    } else {
        content.style.display = "block";
    }
}

// Menu-Toggle-Funktion für Hamburger-Menü
function toggleMenu() {
    const controls = document.getElementById('controls');
    const menuIcon = document.getElementById('menu-icon');
    if (controls.style.display === "none" || controls.style.display === "") {
        controls.style.display = "block";
        menuIcon.classList.add('open'); // Animation aktivieren
    } else {
        controls.style.display = "none";
        menuIcon.classList.remove('open');
    }
}

// Lizenz-Dropdown-Toggle
function toggleLicense() {
    const licenseDropdown = document.getElementById('license-dropdown');
    licenseDropdown.classList.toggle('active');
}

// Schließe Dropdown bei Klick außerhalb
document.addEventListener('click', (event) => {
    const licenseDropdown = document.getElementById('license-dropdown');
    if (!event.target.closest('.license-link') && licenseDropdown.classList.contains('active')) {
        licenseDropdown.classList.remove('active');
    }
});

// Initiale Sichtbarkeit von Controls auf ausgeblendet setzen
document.getElementById('controls').style.display = 'none';

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Fenstergröße anpassen
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});