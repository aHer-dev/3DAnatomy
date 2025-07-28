import json

with open('data/meta.json', 'r') as f:
    meta = json.load(f)

for entry in meta:
    label = entry['label'].lower()
    if any(kw in label for kw in ['deltoid', 'pectoralis', 'biceps', 'scalene', 'levator', 'trapezius', 'serratus', 'rhomboid', 'coracobrachialis', 'scapula', 'humerus', 'radius', 'ulna']):
        entry['subgroup'] = 'upper-body'
    elif any(kw in label for kw in ['hallucis', 'vastus', 'gastrocnemius', 'tibialis', 'semitendinosus', 'popliteus', 'calcaneus', 'femur', 'tibia', 'fibula', 'metatarsal']):
        entry['subgroup'] = 'legs'
    elif any(kw in label for kw in ['intercostal', 'transversus thoracis', 'vertebra', 'rib', 'diaphragm']):
        entry['subgroup'] = 'trunk'
    elif any(kw in label for kw in ['maxilla', 'mandible', 'palatine', 'nasal', 'cervical', 'sternocleidomastoid']):
        entry['subgroup'] = 'head-neck'
    else:
        entry['subgroup'] = 'uncategorized'

with open('data/meta.json', 'w') as f:
    json.dump(meta, f, indent=2)