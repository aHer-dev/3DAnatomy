import json
import os
import shutil

# Pfade
meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta.json'
output_meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta_updated.json'
models_dir = '/home/pepperboy8/Documents/3DAnatomy/models'

# Muskel-Schlüsselwörter
muscle_keywords = [
    'muscle', 'brachii', 'dorsi', 'levator', 'extensor', 'flexor', 'abductor', 'adductor',
    'scalenus', 'rhomboid', 'serratus', 'pectoralis', 'gluteus', 'vastus', 'tensor',
    'semispinalis', 'interossei', 'intercostal', 'transversus', 'obliquus', 'rectus',
    'trapezius', 'sternohyoid', 'omohyoid', 'sternocleidomastoid', 'longissimus', 'splenius',
    'iliocostalis', 'subclavius', 'supinator', 'pronator', 'biceps', 'triceps', 'anconeus',
    'puborectalis', 'coccygeus', 'piriformis', 'gemellus', 'popliteus', 'fibularis', 'tibialis',
    'infraspinatus', 'supraspinatus', 'teres', 'pectineus', 'gracilis', 'semimembranosus',
    'semitendinosus', 'psoas', 'iliacus', 'subscapularis', 'coracobrachialis', 'brachialis',
    'deltoid', 'plantaris', 'gastrocnemius', 'sternothyroid', 'quadratus', 'opponens', 'spinalis'
]

# Erstelle Ordner
for group in ['bones', 'muscles', 'tendons', 'other']:
    os.makedirs(os.path.join(models_dir, group), exist_ok=True)

# Lade meta.json
with open(meta_path, 'r', encoding='utf-8') as f:
    meta = json.load(f)

# Gruppen korrigieren und Dateien verschieben
for entry in meta:
    label = entry['label'].lower()
    old_filename = entry['filename']
    old_path = os.path.join(models_dir, old_filename)

    # Neue Gruppe bestimmen
    if any(keyword in label for keyword in muscle_keywords):
        new_group = 'muscles'
    elif 'bone' in label or 'phalanx' in label or 'vertebra' in label or 'rib' in label or 'costal' in label or 'metacarpal' in label or 'metatarsal' in label:
        new_group = 'bones'
    elif 'tendon' in label or 'ligament' in label:
        new_group = 'tendons'
    else:
        new_group = 'other'

    # Aktualisiere Gruppe und Dateipfad
    entry['group'] = new_group
    new_filename = os.path.join(new_group, os.path.basename(old_filename))
    entry['filename'] = new_filename
    new_path = os.path.join(models_dir, new_filename)

    # Verschiebe Datei, wenn sie existiert
    if os.path.exists(old_path):
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        shutil.move(old_path, new_path)
        print(f'Verschoben: {old_path} -> {new_path}')
    else:
        print(f'Warnung: {old_path} existiert nicht')

# Speichern
with open(output_meta_path, 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=4)
print(f'Neue meta.json erstellt: {output_meta_path}')