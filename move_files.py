import os
import json
import shutil

# Pfade
models_dir = '/home/pepperboy8/Documents/3DAnatomy/models'
meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta.json'

# Lade meta.json
try:
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
except Exception as e:
    print(f'Fehler beim Laden von meta.json: {e}')
    exit(1)

# Verschiebe Dateien
for entry in meta:
    current_path = os.path.join(models_dir, entry['filename'])
    correct_group = entry['group']
    correct_path = os.path.join(models_dir, correct_group, os.path.basename(entry['filename']))
    if os.path.exists(current_path) and current_path != correct_path:
        os.makedirs(os.path.dirname(correct_path), exist_ok=True)
        shutil.move(current_path, correct_path)
        print(f'Verschoben: {current_path} -> {correct_path}')
    elif not os.path.exists(current_path):
        print(f'Warnung: {current_path} existiert nicht')
print('Fertig: Dateien verschoben')