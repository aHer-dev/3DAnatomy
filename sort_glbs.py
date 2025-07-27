import os
import shutil
import json

# Basispfade
base_dir = '/home/pepperboy8/projects/3DAnatomy'
glb_input_dir = os.path.join(base_dir, 'all_glb')
model_dir = os.path.join(base_dir, 'models')
meta_file = os.path.join(base_dir, 'data', 'meta.json')

# Lade die Metadaten
with open(meta_file, 'r') as f:
    meta_data = json.load(f)

# Sortiere jede Datei entsprechend
for entry in meta_data:
    file_name = os.path.basename(entry['filename'])
    group = entry['group']  # z. B. 'bones', 'muscles', ...
    src = os.path.join(glb_input_dir, file_name)
    dst_dir = os.path.join(model_dir, group)
    dst = os.path.join(dst_dir, file_name)

    # Nur wenn die Quelldatei existiert
    if os.path.exists(src):
        os.makedirs(dst_dir, exist_ok=True)
        shutil.move(src, dst)
        print(f"✅ Verschoben: {file_name} → {group}/")
    else:
        print(f"⚠️ Datei fehlt: {file_name}")
