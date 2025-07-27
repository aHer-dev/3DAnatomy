import json
import os

# Pfade
models_dir = '/home/pepperboy8/projects/3DAnatomy/models'
meta_path = '/home/pepperboy8/projects/3DAnatomy/data/meta_extended.json'
output_meta_path = '/home/pepperboy8/projects/3DAnatomy/data/meta.json'

print("Starte Skript...")

# Schlüsselwörter für Gruppen
muscle_keywords = ['muscle', 'brachii', 'dorsi', 'levator', 'extensor', 'flexor', 'abductor', 'adductor', 'scalenus', 'rhomboid', 'serratus', 'pectoralis', 'gluteus', 'vastus', 'tensor', 'semispinalis', 'interossei', 'intercostal', 'transversus', 'obliquus', 'rectus', 'trapezius', 'sternohyoid', 'omohyoid', 'sternocleidomastoid', 'longissimus', 'splenius', 'iliocostalis', 'subclavius', 'supinator', 'pronator', 'biceps', 'triceps', 'anconeus', 'puborectalis', 'coccygeus', 'piriformis', 'gemellus', 'popliteus', 'fibularis', 'tibialis', 'infraspinatus', 'supraspinatus', 'teres', 'pectineus', 'gracilis', 'semimembranosus', 'semitendinosus', 'psoas', 'iliacus', 'subscapularis', 'coracobrachialis', 'brachialis', 'deltoid', 'plantaris', 'gastrocnemius', 'sternothyroid', 'quadratus']
tendon_keywords = ['tendon', 'ligament', 'retinaculum']
bone_keywords = ['bone', 'phalanx', 'vertebra', 'rib', 'costal', 'metacarpal', 'metatarsal', 'calcaneus', 'talus', 'navicular', 'cuneiform', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate', 'scaphoid', 'lunate', 'triquetral', 'radius', 'ulna', 'humerus', 'clavicle', 'scapula', 'femur', 'tibia', 'fibula', 'patella', 'sacrum', 'mandible', 'maxilla', 'zygomatic', 'nasal', 'lacrimal', 'palatine', 'sphenoid', 'ethmoid', 'occipital', 'parietal', 'temporal', 'hyoid', 'vomer']

# Lade meta_extended.json
print("Lade meta_extended.json...")
try:
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    print(f"meta_extended.json geladen, {len(meta)} Einträge gefunden")
except Exception as e:
    print(f'Fehler beim Laden von meta_extended.json: {e}')
    exit(1)

# Korrigiere bestehende Einträge
print("Korrigiere bestehende Einträge...")
for entry in meta:
    label = entry['label'].lower()
    if any(keyword in label for keyword in muscle_keywords):
        entry['group'] = 'muscles'
    elif any(keyword in label for keyword in tendon_keywords):
        entry['group'] = 'tendons'
    elif any(keyword in label for keyword in bone_keywords):
        entry['group'] = 'bones'
    else:
        entry['group'] = 'other'
    # Aktualisiere Dateipfad, falls 'filename' existiert
    if 'filename' in entry:
        entry['filename'] = f"{entry['group']}/{os.path.basename(entry['filename'])}"
    else:
        # Falls 'filename' fehlt, erstelle einen basierend auf fj und label
        fj = entry['fj']
        filename_base = f"{fj}_{entry['label'].replace(' ', '_')}.glb"
        entry['filename'] = f"{entry['group']}/{filename_base}"
    print(f"Eintrag bearbeitet: {entry['fj']}, Gruppe: {entry['group']}")

# Sammle alle .glb-Dateien aus den Unterordnern
print("Sammle .glb-Dateien...")
existing_fj = {entry['fj'] for entry in meta}
new_entries = []
for group in ['bones', 'muscles', 'tendons', 'other']:
    group_dir = os.path.join(models_dir, group)
    if os.path.exists(group_dir):
        print(f"Prüfe Ordner: {group_dir}")
        for filename in os.listdir(group_dir):
            if filename.endswith('.glb'):
                fj = filename.split('_')[0]
                if fj not in existing_fj:
                    label = '_'.join(filename.replace('.glb', '').split('_')[1:])
                    new_group = 'other'
                    if any(keyword in label.lower() for keyword in muscle_keywords):
                        new_group = 'muscles'
                    elif any(keyword in label.lower() for keyword in tendon_keywords):
                        new_group = 'tendons'
                    elif any(keyword in label.lower() for keyword in bone_keywords):
                        new_group = 'bones'
                    new_entries.append({
                        'filename': f'{new_group}/{filename}',
                        'label': label.replace('_', ' '),
                        'group': new_group,
                        'fma': '',
                        'fj': fj
                    })
                    print(f"Neuer Eintrag hinzugefügt: {fj}, Gruppe: {new_group}")
    else:
        print(f"Ordner nicht gefunden: {group_dir}")

meta.extend(new_entries)
print("Schreibe korrigierte meta.json...")
with open(output_meta_path, 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=4)
print(f"Korrigierte meta.json erstellt: {output_meta_path}")
print(f"Anzahl Einträge: {len(meta)}")