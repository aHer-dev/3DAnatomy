#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt Fix-Reports aus group_predictions*.csv, ohne meta.json zu verändern.

Schreibt:
  - reports/group_fix_candidates.csv  (alle vorgeschlagenen Umhängungen)
  - reports/group_fix_auto.csv        (nur "sichere" Auto-Fixes)
  - reports/group_confusion.csv       (Pivot: current vs predicted – aus ALLEN Zeilen)

Nutzung (Projekt-Root):
  python3 scripts/build_fixes_from_report.py
  # Optional absolute Schwellen (0..1, falls deine prob/margin skaliert sind):
  python3 scripts/build_fixes_from_report.py --min-prob 0.75 --min-margin 0.25
  # Oder Quantile (Standard: prob 0.80, margin 0.70):
  python3 scripts/build_fixes_from_report.py --prob-q 0.80 --margin-q 0.70
"""

from pathlib import Path
import argparse
import pandas as pd
import numpy as np
import re

# ─────────────────────────────────────────────────────────────────────────────
# 1) Regeln: starke Phrasen → erzwingen eine Zielgruppe (unabhängig vom Score)
#    (Du kannst diese Liste später beliebig erweitern.)
# ─────────────────────────────────────────────────────────────────────────────
PHRASE_MAP = [

    (r"\bcerebral artery\b",         "arteries"),
    (r"\blacrimal gland\b",          "glands"),
    (r"\boculomotor nerve\b",        "nerves"),
    (r"\bnasociliary nerve\b",       "nerves"),
    (r"\bciliary ganglion\b",        "nerves"),
    (r"\bintercostal muscle\b",      "muscles"),
    (r"\bpulmonary valve\b",         "heart"),
    (r"\bpulmonary trunk\b",         "heart"),
    (r"\bintervertebral (disc|disk)\b", "cartilage"),
    # Knochen – Beispiele:
        (r"\bfrontal bone\b", "bones"),
    (r"\bparietal bone\b", "bones"),
    (r"\btemporal bone\b", "bones"),
    (r"\boccipital bone\b", "bones"),
    (r"\blacrimal bone\b", "bones"),
    (r"\bmetatarsal bone\b", "bones"),
    (r"\bmetacarpal bone\b", "bones"),
    (r"\brib\b", "bones"),
    (r"\bvertebra\b", "bones"),
]

# ─────────────────────────────────────────────────────────────────────────────
# 2) CSV-Reader: versucht Komma, sonst Semikolon (robust gegen Excel-Export)
# ─────────────────────────────────────────────────────────────────────────────
def read_csv_auto(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_csv(path, encoding="utf-8")
        # Falls „alles in einer Spalte“ passiert ist → Semikolon erneut versuchen
        if df.shape[1] == 1:
            df = pd.read_csv(path, encoding="utf-8", sep=";")
        return df
    except Exception:
        # letzter Versuch
        return pd.read_csv(path, encoding="utf-8", sep=";")

# ─────────────────────────────────────────────────────────────────────────────
# 3) Helper
# ─────────────────────────────────────────────────────────────────────────────
def to_num(series: pd.Series) -> pd.Series:
    """Zahlen robust parsen (ersetzt Komma durch Punkt, coerced auf float)."""
    s = series.astype(str).str.replace(",", ".", regex=False)
    return pd.to_numeric(s, errors="coerce")

def phrase_new_group(label_en: str) -> str | None:
    """Phrasen-Override auf label_en (case-insensitive)."""
    if not isinstance(label_en, str) or not label_en:
        return None
    text = label_en.lower()
    for pat, grp in PHRASE_MAP:
        if re.search(pat, text, flags=re.IGNORECASE):
            return grp
    return None

# ─────────────────────────────────────────────────────────────────────────────
# 4) Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp",
                    default="reports/group_predictions_processed.csv",
                    help="Primäre Eingabedatei; Fallback: reports/group_predictions.csv")
    ap.add_argument("--out-candidates", default="reports/group_fix_candidates.csv")
    ap.add_argument("--out-auto",       default="reports/group_fix_auto.csv")
    ap.add_argument("--out-confusion",  default="reports/group_confusion.csv")

    # Absolute Schwellen (0..1). Wenn None, werden Quantile verwendet.
    ap.add_argument("--min-prob", type=float, default=None,
                    help="Minimale Top-Wahrscheinlichkeit (z.B. 0.75).")
    ap.add_argument("--min-margin", type=float, default=None,
                    help="Minimale Differenz Top-Second (z.B. 0.25).")

    # Quantile (nur genutzt, wenn min-prob / min-margin None sind)
    ap.add_argument("--prob-q", type=float, default=0.80,
                    help="Quantil für prob, wenn keine absolute Schwelle gesetzt ist.")
    ap.add_argument("--margin-q", type=float, default=0.70,
                    help="Quantil für margin, wenn keine absolute Schwelle gesetzt ist.")
    args = ap.parse_args()

    # Eingabedatei bestimmen
    base = Path(".")
    p1 = base / args.inp
    p2 = base / "reports" / "group_predictions.csv"
    src = p1 if p1.exists() else p2
    if not src.exists():
        raise SystemExit(f"❌ Eingabe nicht gefunden: {p1} oder {p2}")

    # Ausgabepfade
    out_cand = base / args.out_candidates
    out_auto = base / args.out_auto
    out_conf = base / args.out_confusion
    out_cand.parent.mkdir(parents=True, exist_ok=True)

    # CSV laden (ALLZEILEN) und Pflichtspalten prüfen
    df_all = read_csv_auto(src)
    needed = {"entry_uid", "current_group", "predicted_group", "label_en"}
    missing = [c for c in needed if c not in df_all.columns]
    if missing:
        raise SystemExit(f"❌ Spalten fehlen: {missing}")

    # prob/margin (falls vorhanden) numerisch machen
    if "prob" in df_all.columns:
        df_all["prob_num"] = to_num(df_all["prob"])
    if "margin" in df_all.columns:
        df_all["margin_num"] = to_num(df_all["margin"])

    # Nur echte Abweichungen weiterverarbeiten (kein Phantom-Zeug)
    mis = df_all[df_all["current_group"] != df_all["predicted_group"]].copy()

    # Falls es gar keine Mismatches gibt → leere Reports, Confusion trotzdem schreiben
    if mis.empty:
        pd.DataFrame(columns=["entry_uid","current_group","predicted_group","new_group","fix_reason",
                              "prob","margin","label_en","file","path","reasons","auto_fix"]
                    ).to_csv(out_cand, index=False, encoding="utf-8")
        pd.DataFrame(columns=["entry_uid","current_group","predicted_group","new_group","fix_reason",
                              "prob","margin","label_en","file","path","reasons","auto_fix"]
                    ).to_csv(out_auto, index=False, encoding="utf-8")
        try:
            piv = pd.pivot_table(
                df_all, index="current_group", columns="predicted_group",
                values="entry_uid", aggfunc="count", fill_value=0
            )
            piv.to_csv(out_conf, encoding="utf-8")
        except Exception:
            pass
        print("✅ Fix-Kandidaten: 0")
        print("✅ Auto-Fixes: 0")
        print("ℹ️ Keine Mismatches gefunden.")
        print(f"\n📄 candidates: {out_cand}")
        print(f"📄 auto      : {out_auto}")
        print(f"📄 confusion : {out_conf}")
        return

    # Schwellen bestimmen (absolut oder per Quantil)
    if "prob_num" in mis.columns:
        min_prob = args.min_prob if args.min_prob is not None else np.nanquantile(mis["prob_num"], args.prob_q)
    else:
        min_prob = None
    if "margin_num" in mis.columns:
        min_margin = args.min_margin if args.min_margin is not None else np.nanquantile(mis["margin_num"], args.margin_q)
    else:
        min_margin = None

    # Für jede Mismatch-Zeile new_group bestimmen (Phrase > Scores > leer)
    new_groups, reasons, auto_flags = [], [], []
    for _, row in mis.iterrows():
        label = row.get("label_en", "")
        pred  = row.get("predicted_group", "")
        # 1) Phrase-Override?
        ng_phrase = phrase_new_group(label)
        phrase_hit = ng_phrase is not None
        # 2) Score-Schwellen?
        meets_prob   = (min_prob   is not None and pd.notna(row.get("prob_num")))   and (row["prob_num"]   >= min_prob)
        meets_margin = (min_margin is not None and pd.notna(row.get("margin_num"))) and (row["margin_num"] >= min_margin)
        meets_scores = (meets_prob and meets_margin)
        # 3) Entscheidung
        if phrase_hit:
            ng, rs = ng_phrase, ["phrase"]
        elif meets_scores:
            ng, rs = pred, ["scores"]
        else:
            ng, rs = "", []
        new_groups.append(ng)
        reasons.append(",".join(rs))
        auto_flags.append(bool(phrase_hit or meets_scores))

    mis["new_group"]  = new_groups
    mis["fix_reason"] = reasons
    mis["auto_fix"]   = auto_flags

    # Kandidaten: nur wo new_group gesetzt ist und sich von current unterscheidet
    cand = mis[(mis["new_group"] != "") & (mis["new_group"] != mis["current_group"])].copy()

    # Sortierung: Auto-Fix → prob → margin → label_en
    sort_cols, ascending = [], []
    if "auto_fix" in cand.columns:   sort_cols.append("auto_fix");   ascending.append(False)
    if "prob_num" in cand.columns:   sort_cols.append("prob_num");   ascending.append(False)
    if "margin_num" in cand.columns: sort_cols.append("margin_num"); ascending.append(False)
    sort_cols.append("label_en");    ascending.append(True)
    cand = cand.sort_values(sort_cols, ascending=ascending, na_position="last")

    # Speichern: Kandidaten
    cand_cols = ["entry_uid","current_group","predicted_group","new_group","fix_reason",
                 "prob","margin","label_en","file","path","reasons","auto_fix"]
    cand_cols = [c for c in cand_cols if c in cand.columns]
    cand.to_csv(out_cand, index=False, encoding="utf-8")

    # Speichern: Auto-Fix-Subset
    auto = cand[cand["auto_fix"]].copy()
    auto.to_csv(out_auto, index=False, encoding="utf-8")

    # Confusion immer aus ALLEN Zeilen (inkl. Diagonalen)
    try:
        piv = pd.pivot_table(
            df_all, index="current_group", columns="predicted_group",
            values="entry_uid", aggfunc="count", fill_value=0
        )
        piv.to_csv(out_conf, encoding="utf-8")
    except Exception:
        pass

    # Konsole: Zusammenfassung
    print("✅ Fix-Kandidaten:", len(cand))
    print("✅ Auto-Fixes:", len(auto))
    if (min_prob is not None) and (min_margin is not None):
        print(f"ℹ️ Schwellen: prob≥{min_prob:.3f} | margin≥{min_margin:.3f}")
    else:
        print(f"ℹ️ Schwellen (Quantile): prob Q{args.prob_q:.2f} | margin Q{args.margin_q:.2f}")
    if not cand.empty:
        pairs = cand.groupby(["current_group","new_group"]).size().reset_index(name="count")
        print("\nTop-Paare (current → new):")
        for _, r in pairs.sort_values("count", ascending=False).head(10).iterrows():
            print(f"  {r['current_group']:>12}  →  {r['new_group']:<12}  x{r['count']}")
    print(f"\n📄 candidates: {out_cand}")
    print(f"📄 auto      : {out_auto}")
    print(f"📄 confusion : {out_conf}")

if __name__ == "__main__":
    main()
