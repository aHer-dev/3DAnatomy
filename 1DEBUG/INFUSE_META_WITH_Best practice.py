#META ERGÄNZUNG DURCH BEST PRATICE 

import json
import os

# ✅ Deine Pfade hier anpassen:
META_PATH = "/home/pepperboy8/Documents/3D_ANATOMY_BIG/3DAnatomy/data/meta.json"  # relativer oder absoluter Pfad
BACKUP_PATH = "data/META_BACKUP/meta_backup_2025-08-06.json"

# Optional: zusätzliche Basisverzeichnisse für spätere Pfade
HIFI_BASE = "hifi"
LOFI_BASE = "lofi"

def convert_model_block(entry):
    model = entry.get("model", {})
    group = entry.get("classification", {}).get("group", "")

    filename = model.get("filename")
    if not filename or not group:
        return None  # Unvollständig – überspringen

    # Neues Modell-Format aufbauen
    new_model = {
        "current": "draco",
        "variants": {
            "draco": {
                "path": group,
                "filename": filename,
                "format": "glb"
            },
            "hifi": {
                "path": f"{HIFI_BASE}/{group}",
                "filename": filename,
                "format": "glb"
            },
            "lofi": {
                "path": f"{LOFI_BASE}/{group}",
                "filename": filename,
                "format": "glb"
            }
        },
        "default_color": model.get("default_color", "#cccccc"),
        "visible_by_default": model.get("visible_by_default", True),
        "highlight_color": model.get("highlight_color", ""),
        "rotation": model.get("rotation", [0, 0, 0]),
        "scale": model.get("scale", [1, 1, 1]),
        "bounding_box": model.get("bounding_box", [[], []]),
        "checksum": model.get("checksum", "")
    }

    return new_model

def main():
    with open(META_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"🔧 Konvertiere {len(data)} Einträge...")

    for entry in data:
        new_model = convert_model_block(entry)
        if new_model:
            entry["model"] = new_model

    # Sicherung anlegen
    with open(BACKUP_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ Backup gespeichert unter: {BACKUP_PATH}")

    # Neue meta.json speichern
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ meta.json aktualisiert mit Variantenstruktur.")

if __name__ == "__main__":
    main()
