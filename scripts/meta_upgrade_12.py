#!/usr/bin/env python3
# Ergänzt display/licence/attribution + meta_schema=1.2 (nicht-destruktiv)

import json, datetime as dt
from pathlib import Path

META = Path("data/meta.json")

def upgrade_entry(e: dict) -> bool:
    changed = False

    # display
    disp = (e.get("display") or {})
    # Werte aus alten Feldern übernehmen, falls vorhanden
    if "visible_by_default" not in disp:
        vbd = (e.get("model") or {}).get("visible_by_default")
        if isinstance(vbd, bool):
            disp["visible_by_default"] = vbd; changed = True
    disp.setdefault("opacity", 1.0)
    disp.setdefault("default_color", (e.get("model") or {}).get("default_color", "#cccccc"))
    disp.setdefault("pickable", True)
    disp.setdefault("preload", False)
    e["display"] = disp

    # license / attribution (aus e.meta.* heben, wenn vorhanden)
    lic = e.get("license") or {}
    meta = e.get("meta") or {}
    if not lic and meta.get("license"):
        # mappe bekannte Codes
        code = meta.get("license").strip()
        lic = {
            "id": "CC-BY-SA-2.1-JP" if "2.1" in code else code,
            "name": "CC BY-SA 2.1 JP",
            "url": "https://creativecommons.org/licenses/by-sa/2.1/jp/"
        }; changed = True
    e["license"] = lic or {"id":"CC-BY-SA-2.1-JP","name":"CC BY-SA 2.1 JP","url":"https://creativecommons.org/licenses/by-sa/2.1/jp/"}

    if "attribution" not in e and meta.get("attribution"):
        e["attribution"] = meta.get("attribution"); changed = True
    e.setdefault("attribution", "© 2008 DBCLS / BodyParts3D")

    # schema-tag
    if e.get("meta_schema") != "1.2":
        e["meta_schema"] = "1.2"; changed = True

    return changed

def main(write=False):
    data = json.loads(META.read_text(encoding="utf-8"))
    changed_cnt = 0
    for e in data:
        if upgrade_entry(e): changed_cnt += 1

    if write:
        backup = META.with_suffix(META.suffix + "." + dt.datetime.now().isoformat(timespec="seconds").replace(":","-") + ".bak")
        backup.write_text(META.read_text(encoding="utf-8"), encoding="utf-8")
        META.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"🛟 Backup: {backup}\n✅ meta.json aktualisiert ({changed_cnt} Einträge verändert)")
    else:
        print(f"🔎 Dry-run: {changed_cnt} Einträge würden geändert")

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    main(write=args.write)
