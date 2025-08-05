import json

# 📍 Pfad zu deiner meta.json
META_PATH = "/home/pepperboy8/Documents/3D_ANATOMY_BIG/3DAnatomy/data/meta.json"

with open(META_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"🔍 Überprüfe {len(data)} Einträge...\n")

# 🔎 Suche nach Einträgen ohne gültigen model.filename
fehlende = []
for entry in data:
    if not entry.get("model") or not entry["model"].get("filename"):
        fehlende.append(entry.get("id", "(ohne ID)"))

# 📋 Ergebnis anzeigen
if fehlende:
    print("⚠️ Fehlende oder ungültige model.filename bei folgenden IDs:")
    for id in fehlende:
        print("  -", id)
else:
    print("✅ Alle Einträge haben gültige model.filename-Felder.")
