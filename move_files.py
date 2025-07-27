import os
import json
import shutil

# Pfade
models_dir = '/home/pepperboy8/projects/3DAnatomy/models'
meta_path = '/home/pepperboy8/projects/3DAnatomy/data/meta.json'

print("Starte Skript...")

# Lade meta.json
print("Lade meta.json...")
try:
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    print(f"meta.json geladen, {len(meta)} Einträge gefunden")
except Exception as e:
    print(f'Fehler beim Laden von meta.json: {e}')
    exit(1)

# Verschiebe Dateien
print("Verschiebe .glb-Dateien...")
for entry in meta:
    current_path = None
    for group in ['bones', 'muscles', 'tendons', 'other']:
        possible_path = os.path.join(models_dir, group, os.path.basename(entry['filename']))
        if os.path.exists(possible_path):
            current_path = possible_path
            break
    correct_group = entry['group']
    correct_path = os.path.join(models_dir, correct_group, os.path.basename(entry['filename']))
    if current_path and current_path != correct_path:
        os.makedirs(os.path.dirname(correct_path), exist_ok=True)
        shutil.move(current_path, correct_path)
        print(f'Verschoben: {current_path} -> {correct_path}')
    elif not current_path:
        print(f'Warnung: {entry["filename"]} nicht gefunden')

print('Fertig: Dateien verschoben')