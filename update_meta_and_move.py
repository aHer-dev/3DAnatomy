import os
import json
import shutil

models_dir = "/home/pepperboy8/Documents/3DAnatomy/models"
meta_file = "/home/pepperboy8/Documents/3DAnatomy/data/meta.json"
meta = []

# Subgruppen für Muskeln
muscle_subgroups = {
    "deltoideus": "arm-schulter",
    "deltoid": "arm-schulter",
    "biceps_brachii": "arm-schulter",
    "triceps_brachii": "arm-schulter",
    "pronator_teres": "arm-schulter",
    "extensor": "arm-schulter",
    "flexor": "arm-schulter",
    "abductor": "arm-schulter",
    "opponens": "arm-schulter",
    "lumbrical": "arm-schulter",
    "pronator_quadratus": "arm-schulter",
    "supinatorугловые мышцы": "arm-schulter",
    "brachialis": "arm-schulter",
    "coracobrachialis": "arm-schulter",
    "anconeus": "arm-schulter",
    "trapezius": "schulterguertel-rumpf",
    "rhomboid": "schulterguertel-rumpf",
    "serratus": "schulterguertel-rumpf",
    "pectoralis": "schulterguertel-rumpf",
    "longissimus": "schulterguertel-rumpf",
    "semispinalis": "schulterguertel-rumpf",
    "transversus_thoracis": "schulterguertel-rumpf",
    "intercostal": "schulterguertel-rumpf",
    "levator_scapulae": "schulterguertel-rumpf",
    "subclavius": "schulterguertel-rumpf",
    "infraspinatus": "schulterguertel-rumpf",
    "teres_major": "schulterguertel-rumpf",
    "teres_minor": "schulterguertel-rumpf",
    "subscapularis": "schulterguertel-rumpf",
    "gluteus": "unterkoerper-huefte-oberschenkel",
    "biceps_femoris": "unterkoerper-huefte-oberschenkel",
    "semitendinosus": "unterkoerper-huefte-oberschenkel",
    "semimembranosus": "unterkoerper-huefte-oberschenkel",
    "vastus": "unterkoerper-huefte-oberschenkel",
    "rectus_femoris": "unterkoerper-huefte-oberschenkel",
    "adductor": "unterkoerper-huefte-oberschenkel",
    "gracilis": "unterkoerper-huefte-oberschenkel",
    "iliacus": "unterkoerper-huefte-oberschenkel",
    "psoas_major": "unterkoerper-huefte-oberschenkel",
    "piriformis": "unterkoerper-huefte-oberschenkel",
    "obturator": "unterkoerper-huefte-oberschenkel",
    "gemellus": "unterkoerper-huefte-oberschenkel",
    "quadratus_femoris": "unterkoerper-huefte-oberschenkel",
    "pectineus": "unterkoerper-huefte-oberschenkel",
    "sartorius": "unterkoerper-huefte-oberschenkel",
    "gastrocnemius": "unterkoerper-unterschenkel-fuss",
    "tibialis": "unterkoerper-unterschenkel-fuss",
    "soleus": "unterkoerper-unterschenkel-fuss",
    "hallucis": "unterkoerper-unterschenkel-fuss",
    "digitorum": "unterkoerper-unterschenkel-fuss",
    "fibularis": "unterkoerper-unterschenkel-fuss",
    "plantaris": "unterkoerper-unterschenkel-fuss",
    "popliteus": "unterkoerper-unterschenkel-fuss",
    "flexor_accessorius": "unterkoerper-unterschenkel-fuss",
    "abductor_hallucis": "unterkoerper-unterschenkel-fuss",
    "extensor_hallucis_brevis": "unterkoerper-unterschenkel-fuss",
    "obliquus": "head-neck",
    "rectus_inferior": "head-neck",
    "rectus_superior": "head-neck",
    "rectus_lateralis": "head-neck",
    "rectus_medialis": "head-neck",
    "rectus_capitis": "head-neck",
    "longus_colli": "head-neck",
    "levator_palpebrae": "head-neck",
    "vocalis": "head-neck",
    "uvular": "head-neck",
    "cricothyroid": "head-neck",
    "sternocleidomastoid": "head-neck",
    "digastric": "head-neck",
    "mylohyoid": "head-neck",
    "geniohyoid": "head-neck",
    "stylohyoid": "head-neck",
    "sternohyoid": "head-neck",
    "sternothyroid": "head-neck",
    "thyrohyoid": "head-neck",
    "omohyoid": "head-neck",
    "platysma": "head-neck",
    "genioglossus": "head-neck",
    "hyoglossus": "head-neck",
    "palatopharyngeus": "head-neck",
    "salpingopharyngeus": "head-neck",
    "tensor_veli_palatini": "head-neck",
    "pharyngeal_constrictor": "head-neck",
    "cricoarytenoideus": "head-neck",
    "thyroarytenoideus": "head-neck",
    "aryepiglotticus": "head-neck",
    "intertransversarius": "schulterguertel-rumpf",
    "interspinalis": "schulterguertel-rumpf",
    "rotator": "schulterguertel-rumpf",
    "splenius": "head-neck",
    "scalenus": "head-neck",
    "coccygeus": "unterkoerper-huefte-oberschenkel",
    "pubococcygeus": "unterkoerper-huefte-oberschenkel",
    "puborectalis": "unterkoerper-huefte-oberschenkel",
    "iliococcygeus": "unterkoerper-huefte-oberschenkel",
    "inferior_oblique": "head-neck",
    "superior_oblique": "head-neck",
    "flexor_pollicis": "arm-schulter",
    "extensor_carpi_radialis": "arm-schulter",
    "extensor_digiti_minimi": "arm-schulter",
    "extensor_pollicis": "arm-schulter",
    "flexor_carpi_radialis": "arm-schulter",
    "palmaris_longus": "arm-schulter",
    "extensor_indicis": "arm-schulter",
    "stylopharyngeus": "head-neck",
    "gracilis": "unterkoerper-huefte-oberschenkel",
    "semitendinosus": "unterkoerper-huefte-oberschenkel",
    "semimembranosus": "unterkoerper-huefte-oberschenkel",
    "supraspinatus": "schulterguertel-rumpf",
    "brachioradialis": "arm-schulter",
    "flexor_digiti_minimi_brevis": "arm-schulter",
    "iliocostalis": "schulterguertel-rumpf",
    "sternocostal_part_of_pectoralis_major": "schulterguertel-rumpf",
    "crico-arytenoid": "head-neck",
    "thyro-arytenoid": "head-neck",
    "oblique_arytenoid": "head-neck",
    "transverse_arytenoid": "head-neck",
    "thyro-arytenoid_proper": "head-neck",
    "fibularis": "unterkoerper-unterschenkel-fuss",
    "external_intercostal": "schulterguertel-rumpf",
    "innermost_intercostal": "schulterguertel-rumpf",
    "internal_intercostal": "schulterguertel-rumpf",
    "arytenoid_cartilage": "head-neck",
    "mylohyoid": "head-neck",
    "geniohyoid": "head-neck",
    "stylohyoid": "head-neck",
    "sternohyoid": "head-neck",
    "thyrohyoid": "head-neck",
    "omohyoid": "head-neck"
}

# Hilfsfunktion für Muskel-Erkennung
def is_muscle_label(label):
    label_norm = label.lower().replace('_', ' ').replace('-', ' ')
    muscle_keywords = [
        'muscle', 'deltoid', 'deltoideus', 'trapezius', 'biceps', 'triceps',
        'vastus', 'tibialis', 'gastrocnemius', 'rectus', 'gluteus', 'adductor',
        'hallucis', 'digitorum', 'obliquus', 'levator', 'serratus', 'rhomboid',
        'longissimus', 'semispinalis', 'transversus thoracis', 'vocalis', 'pectoralis',
        'abductor', 'lumbrical', 'interosseous', 'intercostal', 'colli', 'capitis',
        'opponens', 'uvular', 'cricothyroid', 'pronator', 'teres', 'supinator',
        'brachialis', 'coracobrachialis', 'anconeus', 'coccygeus', 'pubococcygeus',
        'puborectalis', 'iliococcygeus', 'external oblique', 'serratus posterior',
        'rotator', 'splenius', 'clavicular', 'acromial', 'spinal', 'head', 'part',
        'clavicular part', 'acromial part', 'spinal part', 'ascending', 'transverse',
        'descending', 'long head', 'short head', 'lateral head', 'medial head',
        'oblique head', 'transverse head', 'scalenus', 'sternocleidomastoid',
        'digastric', 'mylohyoid', 'geniohyoid', 'stylohyoid', 'sternohyoid',
        'sternothyroid', 'thyrohyoid', 'omohyoid', 'platysma', 'genioglossus',
        'hyoglossus', 'palatopharyngeus', 'salpingopharyngeus', 'tensor veli palatini',
        'pharyngeal constrictor', 'cricoarytenoideus', 'thyroarytenoideus', 'aryepiglotticus',
        'sartorius', 'infraspinatus', 'teres_major', 'teres_minor', 'subscapularis',
        'subclavius', 'levator scapulae', 'psoas major', 'iliacus', 'piriformis',
        'obturator internus', 'obturator externus', 'gemellus', 'quadratus femoris',
        'pectineus', 'soleus', 'plantaris', 'popliteus', 'flexor accessorius',
        'abductor hallucis', 'extensor hallucis brevis', 'inferior oblique',
        'superior oblique', 'flexor pollicis', 'extensor carpi radialis', 'extensor digiti minimi',
        'extensor pollicis', 'flexor carpi radialis', 'palmaris longus', 'extensor indicis',
        'stylopharyngeus', 'gracilis', 'semitendinosus', 'semimembranosus', 'supraspinatus',
        'brachioradialis', 'flexor digiti minimi brevis', 'intertransversarius',
        'iliocostalis', 'sternocostal part of pectoralis major', 'crico-arytenoid',
        'thyro-arytenoid', 'oblique arytenoid', 'transverse arytenoid', 'thyro-arytenoid proper',
        'fibularis', 'external intercostal', 'innermost intercostal', 'internal intercostal',
        'arytenoid cartilage', 'mylohyoid', 'geniohyoid', 'stylohyoid', 'sternohyoid',
        'thyrohyoid', 'omohyoid'
    ]
    return any(kw in label_norm for kw in muscle_keywords)

# Hilfsfunktion für Ligament-Erkennung
def is_ligament_label(label):
    label_norm = label.lower().replace('_', ' ').replace('-', ' ')
    ligament_keywords = [
        'ligament', 'tendon', 'membrane', 'fascia', 'retinaculum', 'linea alba',
        'iliotibial tract', 'external anal sphincter', 'tensor fasciae latae'
    ]
    return any(kw in label_norm for kw in ligament_keywords)

# Hilfsfunktion für Knochen-Erkennung
def is_bone_label(label):
    label_norm = label.lower().replace('_', ' ').replace('-', ' ')
    bone_keywords = [
        'bone', 'vertebra', 'rib', 'phalanx', 'metacarpal', 'metatarsal', 'tibia',
        'fibula', 'femur', 'clavicle', 'scapula', 'humerus', 'radius', 'ulna',
        'trapezium', 'trapezoid', 'triquetral', 'tooth', 'atlas', 'axis', 'sternum',
        'ethmoid', 'mandible', 'cartilage', 'cuneiform', 'navicular', 'calcaneus',
        'manubrium', 'cricoid', 'sesamoid', 'hyoid', 'incisor',
        'patella', 'talus', 'maxilla', 'palatine', 'nasal', 'zygomatic', 'lacrimal',
        'occipital', 'temporal', 'parietal', 'sphenoid', 'vomer', 'xiphoid', 'costal',
        'sacrum', 'hamate', 'capitate', 'lunate', 'pisiform', 'scaphoid', 'intervertebral disk'
    ]
    # Ausschluss von Muskeln mit "cartilage" in Namen
    if any(kw in label_norm for kw in ['crico-arytenoid', 'thyro-arytenoid', 'arytenoid cartilage']):
        return False
    return any(kw in label_norm for kw in bone_keywords)

# Prioritäten für Ordner
priority = {"muscles": 3, "ligaments": 2, "bones": 1, "other": 0}

# Liste der zu korrigierenden Dateien (aus bones_muscles.txt)
muscle_files_to_correct = [
    "FJ1472M_BP50120_FMA38508_Left_extensor_carpi_ulnaris.glb",
    "FJ1472_BP50088_FMA38507_Right_extensor_carpi_ulnaris.glb",
    "FJ2775_BP47562_FMA55114_Left_arytenoid_cartilage.glb",
    "FJ2778_BP46811_FMA46581_Left_lateral_crico-arytenoid.glb",
    "FJ2782_BP46742_FMA46578_Left_posterior_crico-arytenoid.glb",
    "FJ2784_BP46749_FMA46590_Left_thyro-arytenoid.glb",
    "FJ2792_BP47828_FMA55113_Right_arytenoid_cartilage.glb",
    "FJ2796_BP46792_FMA46580_Right_lateral_crico-arytenoid.glb",
    "FJ2800_BP47041_FMA46577_Right_posterior_crico-arytenoid.glb",
    "FJ2802_BP46907_FMA46589_Right_thyro-arytenoid.glb",
    "FJ4473_BP47741_FMA46600_Left_thyro-arytenoid_proper.glb",
    "FJ4502_BP47672_FMA46599_Right_thyro-arytenoid_proper.glb"
]

# Sammle alle Dateien zuerst, um Duplikate zu identifizieren
file_map = {}  # Dictionary: fma -> (filename, group)
for group in ['muscles', 'ligaments', 'bones', 'other']:
    group_dir = os.path.join(models_dir, group)
    if not os.path.exists(group_dir):
        print(f"Ordner {group_dir} existiert nicht, überspringe...")
        continue
    for filename in os.listdir(group_dir):
        if filename.endswith('.glb'):
            parts = filename.split('_')
            fma = parts[2]
            current_priority = priority.get(group, 0)
            # Behalte die Datei mit höherer Priorität
            if fma not in file_map or current_priority > priority.get(file_map[fma][1], 0):
                file_map[fma] = (filename, group)

# Verarbeite Dateien
seen_fma = set()
for fma, (filename, group) in file_map.items():
    # Extrahiere Infos
    parts = filename.split('_')
    fj = parts[0]
    bp = parts[1]
    label = '_'.join(parts[3:]).replace('.glb', '')
    clean_label = label.replace('_', ' ')
    side = 'left' if 'left' in label.lower() else 'right' if 'right' in label.lower() else 'none'
    subgroup = 'none'
    parts_list = []

    # Gruppe bestimmen
    is_muscle = is_muscle_label(label) or filename in muscle_files_to_correct
    is_ligament = is_ligament_label(label)
    is_bone = is_bone_label(label)

    # Priorität: Muskel > Ligament > Knochen
    target_group = 'other'
    if is_muscle:
        target_group = 'muscles'
        for muscle, sg in muscle_subgroups.items():
            if muscle.lower() in label.lower() or filename in muscle_files_to_correct:
                subgroup = sg
                # Anteile für Muskeln
                if 'head' in label.lower() or 'part' in label.lower():
                    parts_list = [p.replace('_', ' ').title() for p in label.split('_') if 'head' in p.lower() or 'part' in p.lower()]
                break
    elif is_ligament:
        target_group = 'ligaments'
    elif is_bone:
        target_group = 'bones'
    else:
        target_group = 'other'
        subgroup = 'trunk' if 'diaphragma' in label.lower() else 'none'

    # Verschiebe Datei, wenn notwendig
    current_path = os.path.join(models_dir, group, filename)
    target_dir = os.path.join(models_dir, target_group)
    target_path = os.path.join(target_dir, filename)
    if group != target_group:
        os.makedirs(target_dir, exist_ok=True)
        if os.path.exists(current_path):
            shutil.move(current_path, target_path)
            print(f"Verschoben: {current_path} → {target_path}")
        else:
            print(f"Datei nicht gefunden: {current_path}")

    # Latein-Label
    latin_label = clean_label.replace('Left', 'sinister').replace('Right', 'dexter')
    if target_group == 'bones':
        latin_label = 'Os ' + latin_label.lower()
    elif target_group == 'muscles':
        latin_label = 'Musculus ' + latin_label.lower()
    elif target_group == 'ligaments':
        latin_label = 'Ligamentum ' + latin_label.lower()

    # Vermeide Duplikate
    if fma not in seen_fma:
        seen_fma.add(fma)
        meta.append({
            "label": latin_label,
            "group": target_group,
            "fma": fma,
            "fj": fj,
            "filename": filename,
            "subgroup": subgroup,
            "side": side,
            "parts": parts_list,
            "info": {}
        })

# Entferne Duplikate mit schlechterer Priorität
for fma, (best_file, best_group) in file_map.items():
    best_path = os.path.join(models_dir, best_group, best_file)
    if not os.path.exists(best_path):
        print(f"⚠️ Warnung: Best-Datei fehlt: {best_path}")
        continue  # nicht löschen, wenn beste Datei nicht existiert

    for group in ['bones', 'ligaments', 'muscles', 'other']:
        group_dir = os.path.join(models_dir, group)
        if not os.path.exists(group_dir):
            continue
        for fname in os.listdir(group_dir):
            if not fname.endswith(".glb"):
                continue
            parts = fname.split('_')
            if len(parts) < 4:
                continue
            if parts[2] == fma:
                path = os.path.join(group_dir, fname)
                if path != best_path:
                    print(f"🗑️ Entferne Duplikat: {path}")
                    os.remove(path)

# Sortiere meta.json (subgroup → label)
meta.sort(key=lambda x: (x['subgroup'], x['label']))

# Speichere
with open(meta_file, 'w') as f:
    json.dump(meta, f, indent=2)
print("meta.json aktualisiert und Dateien verschoben.")