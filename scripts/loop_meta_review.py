#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Iterativer Review-Loop für meta.json:
- Baut Fix-Kandidaten/Auto-Fixes aus dem Report
- Optional: wendet Auto-Fixes direkt an (mit Backup)
- Schreibt zusätzlich eine Verdächtigen-Liste (phrases vs. current/predicted)
- Wiederholt bis keine Auto-Fixes mehr übrig sind oder max. Iterationen erreicht

Nutzung (Projekt-Root, venv aktiv):
  # nur durchlaufen & Berichte erzeugen (ohne Schreiben):
  python3 scripts/loop_meta_review.py

  # Auto-Fixes pro Runde direkt anwenden:
  python3 scripts/loop_meta_review.py --apply

  # Iterationszahl/Schwellen steuern:
  python3 scripts/loop_meta_review.py --apply --iters 5 --min-prob 0.75 --min-margin 0.25
"""
from __future__ import annotations
import subprocess, sys, json, re
from pathlib import Path
import argparse
import pandas as pd

# --- starke Phrasen: wenn gefunden, erwarten wir diese Ziel-Gruppe
PHRASE_MAP = [
    (r"\bcerebral artery\b",   "arteries"),
    (r"\blacrimal gland\b",    "glands"),
    (r"\boculomotor nerve\b",  "nerves"),
    (r"\bnasociliary nerve\b", "nerves"),
    (r"\bciliary ganglion\b",  "nerves"),
    (r"\bintercostal muscle\b","muscles"),
    (r"\bpulmonary valve\b",   "heart"),
    (r"\bpulmonary trunk\b",   "heart"),
    # Bones – gern erweitern:
    (r"\bfrontal bone\b",      "bones"),
    (r"\bparietal bone\b",     "bones"),
    (r"\btemporal bone\b",     "bones"),
    (r"\boccipital bone\b",    "bones"),
    (r"\blacrimal bone\b",     "bones"),
    (r"\bmetatarsal bone\b",   "bones"),
    (r"\bmetacarpal bone\b",   "bones"),
    (r"\brib\b",               "bones"),
    (r"\bvertebra\b",          "bones"),
]

REPORTS = Path("reports")
PRED = REPORTS / "group_predictions_processed.csv"  # primär
PRED_FALLBACK = REPORTS / "group_predictions.csv"
AUTO = REPORTS / "group_fix_auto.csv"
CAND = REPORTS / "group_fix_candidates.csv"
SUSPECTS = REPORTS / "group_suspects.csv"

def run(cmd: list[str]) -> int:
    """Subprozess ausführen und Rückgabecode liefern."""
    print("▶", " ".join(cmd))
    return subprocess.call(cmd)

def read_csv_auto(path: Path) -> pd.DataFrame:
    """CSV robust laden (Komma/Semikolon)."""
    if not path.exists():
        return pd.DataFrame()
    try:
        df = pd.read_csv(path, encoding="utf-8")
        return df if df.shape[1] > 1 else pd.read_csv(path, encoding="utf-8", sep=";")
    except Exception:
        return pd.read_csv(path, encoding="utf-8", sep=";")

def detect_phrase_target(label: str) -> str | None:
    """Zielgruppe aus starker Phrase im Label ableiten (falls vorhanden)."""
    if not isinstance(label, str) or not label:
        return None
    low = label.lower()
    for pat, grp in PHRASE_MAP:
        if re.search(pat, low):
            return grp
    return None

def build_suspects(pred_df: pd.DataFrame) -> pd.DataFrame:
    """
    Verdächtige Fälle:
    - Label triggert starke Phrase (PHRASE_MAP)
    - phrase_group unterscheidet sich von current_group UND predicted_group
    Zusätzlich sortiert nach 'margin' aufsteigend (unsicher) und 'prob' absteigend.
    """
    if pred_df.empty:
        return pred_df
    df = pred_df.copy()
    df["phrase_group"] = df["label_en"].apply(detect_phrase_target)
    mask = df["phrase_group"].notna()
    if "current_group" in df.columns:
        mask &= (df["phrase_group"] != df["current_group"])
    if "predicted_group" in df.columns:
        mask &= (df["phrase_group"] != df["predicted_group"])
    sus = df[mask].copy()

    # Numerik spalten tolerant konvertieren
    for col in ("prob","margin"):
        if col in sus.columns:
            sus[col] = pd.to_numeric(sus[col], errors="coerce")

    # Sortierung: erst unsichere (kleine margin), dann hohe prob
    sort_cols, ascending = [], []
    if "margin" in sus.columns:
        sort_cols.append("margin"); ascending.append(True)   # kleine margin zuerst
    if "prob" in sus.columns:
        sort_cols.append("prob");   ascending.append(False)  # dann hohe prob
    if sort_cols:
        sus = sus.sort_values(sort_cols, ascending=ascending, na_position="last")
    return sus

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--iters", type=int, default=3, help="Max. Iterationen")
    ap.add_argument("--apply", action="store_true", help="Auto-Fixes pro Runde anwenden")
    ap.add_argument("--min-prob", type=float, default=None, help="Absolute Schwelle prob (0..1-Skala oder Score)")
    ap.add_argument("--min-margin", type=float, default=None, help="Absolute Schwelle margin")
    ap.add_argument("--prob-q", type=float, default=0.80, help="Prob-Quantil (wenn keine absolute Schwelle)")
    ap.add_argument("--margin-q", type=float, default=0.70, help="Margin-Quantil (wenn keine absolute Schwelle)")
    args = ap.parse_args()

    # Eingabe für build_fixes_from_report zusammenstellen
    base_cmd = ["python3", "scripts/build_fixes_from_report.py",
                "--prob-q", str(args.prob_q), "--margin-q", str(args.margin_q)]
    if args.min_prob is not None:
        base_cmd += ["--min-prob", str(args.min_prob)]
    if args.min_margin is not None:
        base_cmd += ["--min-margin", str(args.min_margin)]

    for i in range(1, args.iters + 1):
        print(f"\n====== 🔁 Iteration {i}/{args.iters} ======")
        # 1) Kandidaten/Auto-Fixes bauen
        rc = run(base_cmd)
        if rc != 0:
            sys.exit("❌ build_fixes_from_report.py fehlgeschlagen")

        # 2) Auto-Fixes laden/prüfen
        auto = read_csv_auto(AUTO)
        n_auto = len(auto)
        print(f"🔎 Auto-Fixes: {n_auto}")
        if n_auto == 0:
            print("✅ Nichts mehr zu tun. Abbruch.")
            break

        # 3) Option: sofort anwenden (mit Backup)
        if args.apply:
            rc = run(["python3", "scripts/apply_group_fixes.py", "--write", "--null-subgroup"])
            if rc != 0:
                sys.exit("❌ apply_group_fixes.py fehlgeschlagen – Abbruch")
        else:
            print("ℹ️ Dry-Run: Auto-Fixes NICHT angewandt (nutze --apply, um zu schreiben).")
            # Kein Sinn, weiterzuloopen, wenn wir nicht schreiben:
            break

        # 4) Verdächtige generieren (zusätzlich)
        pred = read_csv_auto(PRED if PRED.exists() else PRED_FALLBACK)
        if pred.empty:
            print("⚠️ group_predictions*.csv nicht gefunden – überspringe suspects.")
            continue
        sus = build_suspects(pred)
        SUSPECTS.parent.mkdir(parents=True, exist_ok=True)
        sus.to_csv(SUSPECTS, index=False, encoding="utf-8")
        print(f"🕵️ Verdächtige geschrieben: {SUSPECTS} (Zeilen: {len(sus)})")

    print("\n🏁 Loop beendet.")

if __name__ == "__main__":
    main()
