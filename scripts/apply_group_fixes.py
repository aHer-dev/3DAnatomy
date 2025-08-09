#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply group fixes to data/meta.json based on a CSV (default: reports/group_fix_auto.csv).

Usage (Projekt-Root):
  # 1) Dry-run (zeigt nur, was geändert würde)
  python3 scripts/apply_group_fixes.py

  # 2) Schreiben mit Backup
  python3 scripts/apply_group_fixes.py --write

  # 3) Andere Fix-Quelle verwenden
  python3 scripts/apply_group_fixes.py --fixes reports/group_fix_candidates.csv --write

  # 4) Zusätzlich subgroup -> null setzen
  python3 scripts/apply_group_fixes.py --write --null-subgroup
"""

import argparse, csv, json, sys
from pathlib import Path
from datetime import datetime

ALLOWED_GROUPS = {
    "nerves","muscles","ligaments","bones","organs","arteries","veins","brain",
    "eyes","lungs","teeth","cartilage","glands","ear","heart","skin_hair"
}

def read_csv_any(path: Path):
    """CSV mit Komma ODER Semikolon einlesen."""
    txt = path.read_text(encoding="utf-8", errors="ignore")
    try:
        # Komma versuchen
        rows = list(csv.DictReader(txt.splitlines()))
        if len(rows) and len(rows[0]) > 1:
            return rows
        # Fallback: Semikolon
        rows = list(csv.DictReader(txt.splitlines(), delimiter=';'))
        return rows
    except Exception as e:
        print(f"❌ CSV-Fehler: {e}", file=sys.stderr)
        return []

def load_meta(meta_path: Path):
    """meta.json als Liste laden."""
    data = json.loads(meta_path.read_text(encoding="utf-8"))
    assert isinstance(data, list), "meta.json muss ein Array sein."
    return data

def index_meta_by_uid(meta):
    """Index: entry_uid -> Position im Array (erste Übereinstimmung)."""
    idx = {}
    for i, e in enumerate(meta):
        uid = e.get("entry_uid") or ""
        if uid and uid not in idx:
            idx[uid] = i
    return idx

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--meta", default="data/meta.json", help="Pfad zu meta.json")
    ap.add_argument("--fixes", default="reports/group_fix_auto.csv", help="CSV mit Fixes")
    ap.add_argument("--write", action="store_true", help="Änderungen wirklich schreiben")
    ap.add_argument("--null-subgroup", action="store_true", help="classification.subgroup auf null setzen")
    args = ap.parse_args()

    meta_path = Path(args.meta)
    fixes_path = Path(args.fixes)

    if not meta_path.exists():
        sys.exit(f"❌ Nicht gefunden: {meta_path}")
    if not fixes_path.exists():
        sys.exit(f"❌ Nicht gefunden: {fixes_path}")

    # Daten laden
    meta = load_meta(meta_path)
    idx = index_meta_by_uid(meta)
    rows = read_csv_any(fixes_path)

    # Ein paar Spaltennamen prüfen
    need_cols = {"entry_uid","new_group"}
    has_cols = set(rows[0].keys()) if rows else set()
    missing = need_cols - has_cols
    if missing:
        sys.exit(f"❌ Fix-CSV braucht Spalten: {sorted(need_cols)} (fehlt: {sorted(missing)})")

    # Wenn Spalte apply_fix existiert, nur TRUE/WAHR nehmen
    apply_filter = "apply_fix" in has_cols

    changes = []
    skipped_not_found = 0
    skipped_same_group = 0
    skipped_invalid_group = 0

    for r in rows:
        if apply_filter:
            flag = (str(r.get("apply_fix","")).strip().lower() in {"true","wahr","1","yes","ja"})
            if not flag:
                continue

        uid = (r.get("entry_uid") or "").strip()
        new_group = (r.get("new_group") or "").strip()

        if not uid or not new_group:
            continue

        if new_group not in ALLOWED_GROUPS:
            skipped_invalid_group += 1
            continue

        pos = idx.get(uid)
        if pos is None:
            skipped_not_found += 1
            continue

        entry = meta[pos]
        cur_group = (entry.get("classification") or {}).get("group")

        if cur_group == new_group:
            skipped_same_group += 1
            continue

        # Änderung vormerken
        changes.append((pos, uid, cur_group, new_group))

    # Zusammenfassung
    print(f"🔎 Fix-Quelle: {fixes_path}")
    print(f"📦 meta.json Einträge: {len(meta)}")
    print(f"✅ zu ändernde Einträge: {len(changes)}")
    if skipped_not_found:
        print(f"⚠️  übersprungen (entry_uid nicht gefunden): {skipped_not_found}")
    if skipped_same_group:
        print(f"ℹ️  bereits korrekt (group identisch): {skipped_same_group}")
    if skipped_invalid_group:
        print(f"⚠️  übersprungen (ungültige Gruppe): {skipped_invalid_group}")

    # Dry-run: nur anzeigen
    for pos, uid, old, new in changes[:20]:
        print(f"  - {uid}: {old} → {new}")
    if len(changes) > 20:
        print(f"  … {len(changes)-20} weitere")

    if not args.write:
        print("\n💡 Dry-run. Mit --write werden Änderungen gespeichert (Backup inklusive).")
        return

    # Backup schreiben
    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    backup = meta_path.with_suffix(f".json.{ts}.bak")
    backup.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"🛟 Backup erstellt: {backup}")

    # Änderungen anwenden
    for pos, uid, old, new in changes:
        entry = meta[pos]
        entry.setdefault("classification", {})
        entry["classification"]["group"] = new
        if args.null_subgroup:
            entry["classification"]["subgroup"] = None

    # Speichern
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ meta.json aktualisiert: {meta_path}")

if __name__ == "__main__":
    main()
