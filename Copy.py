#!/usr/bin/env python3
import os
import shutil

SRC = "/home/pepperboy8/Documents/3D_ANATOMY_BIG/3DAnatomy"
DEST = os.path.join(SRC, "projectCopy")

# Zielordner frisch anlegen
if os.path.exists(DEST):
    shutil.rmtree(DEST)
os.makedirs(DEST)

# Definiere Ziel-Ordner-Zuordnung
file_map = {
    # Einstieg & App
    "index.html": "entry",
    "app.js": "entry",
    "startApp.js": "entry",

    # Core
    "scene.js": "core",
    "camera.js": "core",
    "renderer.js": "core",
    "controls.js": "core",
    "cameraUtils.js": "core",
    "lights.js": "core",

    # Modelle
    "modelLoader-core.js": "models",
    "dracoLoader.js": "models",
    "groups.js": "models",
    "visibility.js": "models",
    "color.js": "models",
    "appearance.js": "models",

    # Interaktion
    "raycastOnClick.js": "interaction",
    "infoPanel.js": "interaction",
    "highlightModel.js": "interaction",

    # UI
    "ui-init.js": "ui",
    "ui-reset.js": "ui",
    "ui-search.js": "ui",

    # Daten
    "state.js": "data",
    "meta.js": "data",
    "path.js": "data",
}

# Unterordner im Ziel anlegen
for folder in set(file_map.values()):
    os.makedirs(os.path.join(DEST, folder), exist_ok=True)

# Alle passenden Dateien kopieren
for root, dirs, files in os.walk(SRC):
    # Bestimmte Ordner überspringen
    dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "projectCopy")]

    for file in files:
        if file in file_map:
            src_file = os.path.join(root, file)
            dest_file = os.path.join(DEST, file_map[file], file)
            shutil.copy2(src_file, dest_file)
            print(f"Kopiert: {file} -> {file_map[file]}/")

print(f"Fertig! Struktur erstellt in: {DEST}")
