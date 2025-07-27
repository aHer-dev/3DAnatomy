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
    
    // Debugging: Prüfen, ob DOM-Elemente vorhanden sind
    if (!loadingDiv || !progressBar || !progressText) {
        console.error('Ladebalken-Elemente fehlen:', { loadingDiv, progressBar, progressText });
        alert('Fehler: Ladebalken nicht gefunden. Seite könnte nicht korrekt laden.');
        return;
    }

    // Debugging: WebGL-Kompatibilität prüfen
    if (!renderer.getContext()) {
        console.error('WebGL nicht verfügbar auf diesem Gerät');
        alert('Fehler: WebGL wird auf diesem Gerät nicht unterstützt. Versuche einen anderen Browser oder Gerät.');
        return;
    }

    fetch(basePath + '/data/meta.json')
      .then(response => {
        if (!response.ok) throw new Error(`Fehler beim Laden von meta.json: ${response.status}`);
        return response.json();
      })
      .then(meta => {
        console.log(`meta.json geladen, ${meta.length} Einträge`);
        const groupEntries = meta.filter(entry => entry.group === groupName);
        const totalModels = groupEntries.length;

        if (totalModels > 0) {
            loadingDiv.style.display = 'block';
            console.log('Ladebalken sichtbar gesetzt');
        } else {
            console.log('Keine Modelle in Gruppe:', groupName);
            return;
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
                        model.visible = false;
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial({ color: colors[groupName] });
                            }
                        });
                        // Optional: Modelle optimieren (SimplifyModifier)
                        // const modifier = new THREE.SimplifyModifier();
                        // model.traverse((child) => {
                        //     if (child.isMesh) {
                        //         const simplified = modifier.modify(child.geometry, child.geometry.attributes.position.count * 0.5);
                        //         child.geometry = simplified;
                        //     }
                        // });
                        scene.add(model);
                        groups[groupName].push(model);
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
                        alert(`Fehler beim Laden eines Modells in Gruppe ${groupName}.`);
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
            groups[groupName].forEach(m => m.visible = true);
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
      })
      .catch(error => {
          console.error(`Fehler beim Laden von meta.json: ${error}`);
          alert('Fehler beim Laden der Metadaten. Überprüfe deine Internetverbindung.');
      });
}

// Anfangs nur bones laden
loadGroup('bones');

// Checkboxen-Events
document.getElementById('bones').addEventListener('change', (e) => toggleGroup('bones', e.target.checked));
document.getElementById('muscles').addEventListener('change', (e) => toggleGroup('muscles', e.target.checked));
document.getElementById('tendons').addEventListener('change', (e) => toggleGroup('tendons', e.target.checked));
document.getElementById('other').addEventListener('change', (e) => toggleGroup('other', e.target.checked));

function toggleGroup(groupName, visible) {
    console.log(`Toggle Gruppe: ${groupName}, Sichtbar: ${visible}`);
    if (visible && groups[groupName].length === 0) {
        loadGroup(groupName);
    } else {
        groups[groupName].forEach(model => model.visible = visible);
    }
}

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