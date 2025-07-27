import os
import json

# Pfade
base_dir = '/home/pepperboy8/projects/3DAnatomy'
glb_input_dir = os.path.join(base_dir, 'all_glb')
meta_file = os.path.join(base_dir, 'data', 'meta.json')

# Lade die Metadaten
with open(meta_file, 'r') as f:
    meta_data = json.load(f)

# Alle erwarteten Dateinamen aus der JSON
expected_files = {os.path.basename(entry['filename']) for entry in meta_data}

# Alle tatsächlich vorhandenen Dateien im all_glb-Ordner
actual_files = {f for f in os.listdir(glb_input_dir) if f.endswith('.glb')}

# Übrig gebliebene oder fehlende Dateien
unmatched_files = actual_files - expected_files
missing_files = expected_files - actual_files

if unmatched_files:
    print("🟡 Nicht zugeordnete Dateien im 'all_glb'-Ordner:")
    for f in sorted(unmatched_files):
        print(" -", f)
else:
    print("✅ Keine überflüssigen Dateien im 'all_glb'-Ordner.")

if missing_files:
    print("\n🔴 Dateien fehlen laut meta.json:")
    for f in sorted(missing_files):
        print(" -", f)
else:
    print("✅ Alle erwarteten Dateien laut meta.json sind vorhanden.")
