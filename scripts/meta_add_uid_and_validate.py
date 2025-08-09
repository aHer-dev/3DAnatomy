#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
meta_add_uid_and_validate.py
----------------------------
Ergänzt jedem Eintrag ein eindeutiges 'entry_uid' und validiert:
- 'entry_uid' eindeutig (Hard Error wenn nicht)
- 'model.asset.{path,file,url,fileKey}' vorhanden (muss nach deiner Migration so sein)
- doppelte 'id' (FMA) nur noch als WARNING, nicht als Error

Nutzung:
  python3 scripts/meta_add_uid_and_validate.py --write --sample 3
  # Dry-Run:
  python3 scripts/meta_add_uid_and_validate.py --sample 2
"""

from __future__ import annotations
import json, sys
from pathlib import Path
import argparse
import datetime as dt

META_PATH_DEFAULT = "data/meta.json"

def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))

def dump_json(p: Path, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def backup(p: Path) -> Path:
    stamp = dt.datetime.now().isoformat(timespec="seconds").replace(":", "-")
    b = p.with_suffix(p.suffix + f".{stamp}.bak")
    b.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
    return b

def make_uid(entry: dict) -> str:
    eid = entry.get("id", "unknown")
    asset = (entry.get("model") or {}).get("asset") or {}
    file_key = asset.get("fileKey") or asset.get("file") or ""
    return f"{eid}__{file_key}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--meta", default=META_PATH_DEFAULT)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--sample", type=int, default=0)
    args = ap.parse_args()

    meta_path = Path(args.meta)
    data = load_json(meta_path)

    errors = 0
    warns = 0

    # 1) ensure entry_uid
    changed = 0
    for e in data:
        uid = e.get("entry_uid")
        if not uid:
            e["entry_uid"] = make_uid(e)
            changed += 1

    # 2) validate uniqueness
    seen_uid = {}
    seen_filekey = {}
    ids_count = {}

    for e in data:
        eid = e.get("id")
        ids_count[eid] = ids_count.get(eid, 0) + 1

        asset = (e.get("model") or {}).get("asset") or {}
        for k in ("path", "file", "url"):
            if not asset.get(k):
                print(f"❌ {eid}: missing model.asset.{k}", file=sys.stderr)
                errors += 1

        file_key = asset.get("fileKey") or asset.get("file")
        if not file_key:
            print(f"❌ {eid}: missing fileKey", file=sys.stderr)
            errors += 1
        else:
            if file_key in seen_filekey:
                # mehrere Einträge teilen sich dieselbe Datei -> i. d. R. ein Datenproblem
                print(f"❌ duplicate fileKey: {file_key} (ids: {seen_filekey[file_key]} & {eid})", file=sys.stderr)
                errors += 1
            else:
                seen_filekey[file_key] = eid

        uid = e.get("entry_uid")
        if not uid:
            print(f"❌ {eid}: missing entry_uid", file=sys.stderr); errors += 1
        else:
            if uid in seen_uid:
                print(f"❌ duplicate entry_uid: {uid}", file=sys.stderr); errors += 1
            else:
                seen_uid[uid] = True

    # 3) report duplicates by id as WARNING
    dup_ids = {i:c for i,c in ids_count.items() if c > 1}
    if dup_ids:
        warns += sum(1 for _ in dup_ids)
        print(f"⚠️  duplicate FMA ids (grouped): {len(dup_ids)} distinct ids have >1 records")
        # optionally list top few
        top = sorted(dup_ids.items(), key=lambda kv: kv[1], reverse=True)[:10]
        for i,c in top:
            print(f"   - {i}: {c} records")

    print(f"\n📊 Result: entries={len(data)} | changed(entry_uid added)={changed} | errors={errors} | warnings={warns}")

    if errors:
        print("❌ Aborting due to errors.", file=sys.stderr)
        sys.exit(1)

    if args.sample:
        print("\n🔎 Sample:")
        for e in data[:args.sample]:
            a = (e.get("model") or {}).get("asset") or {}
            print(f"  - {e.get('entry_uid')} | {e.get('id')} | {a.get('url')}")

    if args.write:
        b = backup(meta_path)
        dump_json(meta_path, data)
        print(f"🛟 Backup: {b}")
        print(f"✅ meta.json updated with entry_uid")
    else:
        print("ℹ️ Dry-run. Use --write to persist changes.")

if __name__ == "__main__":
    main()
