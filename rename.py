import os
import json

models_dir = '/home/pepperboy8/projects/3DAnatomy/models'
meta_path = '/home/pepperboy8/projects/3DAnatomy/data/meta.json'

# Lade meta.json
with open(meta_path, 'r') as f:
    meta = json.load(f)

# Liste der erwarteten Unterordner
valid_groups = ['bones', 'muscles', 'other', 'tendons']

# Iteriere durch alle Einträge in meta.json
for entry in meta:
    if 'filename' in entry and ' ' in entry['filename']:
        # Splitte den Pfad in group und filename
        parts = entry['filename'].split('/', 1)
        if len(parts) != 2:
            print(f'Ungültiger Pfad in meta.json: {entry["filename"]}')
            continue
        
        group, old_filename = parts
        # Prüfe, ob der group-Ordner gültig ist
        if group not in valid_groups:
            print(f'Ungültiger Unterordner in meta.json: {group} für {old_filename}')
            continue

        # Neuer Dateiname mit Unterstrichen
        new_filename = old_filename.replace(' ', '_')
        old_path = os.path.join(models_dir, group, old_filename)
        new_path = os.path.join(models_dir, group, new_filename)

        # Prüfe, ob die alte Datei existiert
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            print(f'Renamed in {group}: {old_filename} -> {new_filename}')
            # Aktualisiere meta.json
            entry['filename'] = f'{group}/{new_filename}'
        else:
            print(f'File not found: {old_path}')

# Speichere aktualisierte meta.json
with open(meta_path, 'w') as f:
    json.dump(meta, f, indent=4)

print('Done! Commit and push.')