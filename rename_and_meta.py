import os
import json

# Pfade
obj_dir = '/home/pepperboy8/Downloads/Obj Data'  # .obj-Ordner
meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta.json'  # meta.json

meta = []
for filename in os.listdir(obj_dir):
    if filename.endswith('.obj'):
        parts = filename.replace('.obj', '').split('_')
        if len(parts) >= 4:
            fj = parts[0]  # z. B. FJ4
            bp = parts[1]  # z. B. BP62301
            fma = parts[2].replace('FMA', '')  # z. B. 32642
            label = ' '.join(parts[3:])  # z. B. Middle phalanx of right second toe
            group = 'unknown'
            lower_label = label.lower()
            if 'phalanx' in lower_label or 'toe' in lower_label or 'finger' in lower_label or 'bone' in lower_label:
                group = 'bones'
            elif 'muscle' in lower_label or 'brachii' in lower_label or 'dorsi' in lower_label:
                group = 'muscles'
            meta.append({
                'filename': f"muscles/{filename.replace('.obj', '.glb')}" if 'muscle' in lower_label or 'brachii' in lower_label or 'dorsi' in lower_label else f"bones/{filename.replace('.obj', '.glb')}",
                'label': label,
                'group': group,
                'fma': fma,
                'fj': fj
            })

# Speichern
os.makedirs(os.path.dirname(meta_path), exist_ok=True)
with open(meta_path, 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=4)
print(f'meta.json erstellt: {meta_path}')