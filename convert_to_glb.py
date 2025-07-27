import bpy
import os
import json

# Pfade
input_dir = '/home/pepperboy8/Downloads/Obj Data'
output_dir = '/home/pepperboy8/Documents/3DAnatomy/models'
meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta_updated.json'

# Erstelle Unterordner
for group in ['bones', 'muscles', 'tendons', 'other']:
    os.makedirs(os.path.join(output_dir, group), exist_ok=True)

# Lade meta.json
with open(meta_path, 'r', encoding='utf-8') as f:
    meta = json.load(f)
meta_dict = {entry['fj']: entry['group'] for entry in meta}

# Konvertiere .obj zu .glb
for filename in os.listdir(input_dir):
    if filename.endswith('.obj'):
        fj = filename.replace('.obj', '').split('_')[0]
        group = meta_dict.get(fj, 'other')
        bpy.ops.wm.read_factory_settings(use_empty=True)
        input_path = os.path.join(input_dir, filename)
        if os.path.exists(input_path):
            bpy.ops.wm.obj_import(filepath=input_path)  # Aktualisierter Operator
            output_path = os.path.join(output_dir, group, filename.replace('.obj', '.glb'))
            bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
            print(f'Konvertiert: {filename} -> {output_path}')
        else:
            print(f'Warnung: {input_path} existiert nicht')