import json
import os

input_dir = '/home/pepperboy8/Downloads/Obj Data'
meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta.json'
output_meta_path = '/home/pepperboy8/Documents/3DAnatomy/data/meta_extended.json'

muscle_keywords = ['muscle', 'brachii', 'dorsi', 'levator', 'extensor', 'flexor', 'abductor', 'adductor', 'scalenus', 'rhomboid', 'serratus', 'pectoralis', 'gluteus', 'vastus', 'tensor', 'semispinalis', 'interossei', 'intercostal', 'transversus', 'obliquus', 'rectus', 'trapezius', 'sternohyoid', 'omohyoid', 'sternocleidomastoid', 'longissimus', 'splenius', 'iliocostalis', 'subclavius', 'supinator', 'pronator', 'biceps', 'triceps', 'anconeus', 'puborectalis', 'coccygeus', 'piriformis', 'gemellus', 'popliteus', 'fibularis', 'tibialis', 'infraspinatus', 'supraspinatus', 'teres', 'pectineus', 'gracilis', 'semimembranosus', 'semitendinosus', 'psoas', 'iliacus', 'subscapularis', 'coracobrachialis', 'brachialis', 'deltoid', 'plantaris', 'gastrocnemius', 'sternothyroid', 'quadratus', 'opponens', 'spinalis']

with open(meta_path, 'r', encoding='utf-8') as f:
    meta = json.load(f)

existing_fj = {entry['fj'] for entry in meta}
new_entries = []

for filename in os.listdir(input_dir):
    if filename.endswith('.obj'):
        fj = filename.replace('.obj', '').split('_')[0]
        if fj not in existing_fj:
            label = filename.replace('.obj', '').split('_', 2)[-1]
            group = 'other'
            if any(keyword in label.lower() for keyword in muscle_keywords):
                group = 'muscles'
            elif 'bone' in label.lower() or 'phalanx' in label.lower() or 'vertebra' in label.lower() or 'rib' in label.lower() or 'costal' in label.lower() or 'metacarpal' in label.lower() or 'metatarsal' in label.lower():
                group = 'bones'
            elif 'tendon' in label.lower() or 'ligament' in label.lower():
                group = 'tendons'
            new_entries.append({
                'filename': f'{group}/{filename.replace(".obj", ".glb")}',
                'label': label,
                'group': group,
                'fma': '',
                'fj': fj
            })

meta.extend(new_entries)
with open(output_meta_path, 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=4)
print(f'Erweiterte meta.json erstellt: {output_meta_path}')