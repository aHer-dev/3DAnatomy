#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
report_group_predictions.py
Erstellt einen CSV-Report mit Gruppen-Vorhersagen (Prozent) für jede Meta-Entität.
- Nutzt Keywords/Phasen + Pfad-Präfix + Konfliktwörter aus data/group_rules.json
- Normalisiert Scores via Softmax -> Prozent
- Sortiert absteigend nach Top-Wahrscheinlichkeit
- Optional: nur Mismatches (predicted != current) filtern, Score-Schwellen setzen

Nutzung (vom Projekt-Root):
  python3 scripts/report_group_predictions.py
  python3 scripts/report_group_predictions.py --mismatches-only
  python3 scripts/report_group_predictions.py --min-prob 0.6 --min-margin 0.25

Ergebnis:
  reports/group_predictions.csv
"""

import csv
import json
import math
import re
import unicodedata
from pathlib import Path
import argparse
from typing import Dict, List, Tuple


# ------------------------------
# Konfiguration (Gewichte)
# ------------------------------
WEIGHTS = {
    "path_prefix": 0.60,   # starker Hinweis: Pfad beginnt/enthält Gruppe
    "phrase": 0.50,        # langer Ausdruck (>= 2 Wörter) gefunden
    "keyword": 0.30,       # einzelnes Keyword
    "synonym": 0.20,       # Synonym-Treffer
    "file_hint": 0.10,     # Dateiname/Rootname enthält Gruppenbegriff
    "ambiguous": 0.05,     # sehr generisch (falls verwendet)
    "conflict_penalty": -0.40  # Konfliktwort der Konkurrenz gefunden
}

# Felder, aus denen ein Suchtext gebaut wird (wenn vorhanden)
TEXT_FIELDS = [
    ("labels", "en"),
    ("labels", "de"),
    ("labels", "la"),
    ("synonyms", "en"),
    ("synonyms", "de"),
    ("info.keywords", "en"),
    ("info.keywords", "de"),
]

# ------------------------------
# Hilfsfunktionen
# ------------------------------
def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))

def normalize_text(s: str) -> str:
    """Kleinbuchstaben, Unicode-Normalisierung, Satzzeichen entfernen, Bindestriche zu Leerzeichen."""
    s = s or ""
    s = unicodedata.normalize("NFKD", s)
    s = s.lower()
    s = s.replace("-", " ").replace("_", " ")
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)  # alles außer Wort/Space weg
    s = re.sub(r"\s+", " ", s).strip()
    return s

def join_and_normalize(items: List[str]) -> str:
    return normalize_text(" ".join([x for x in items if x]))

def softmax(scores: Dict[str, float]) -> Dict[str, float]:
    """Softmax über Gruppen -> Wahrscheinlichkeiten (0..1). Negative Scores sind okay."""
    # numerisch stabil: e^(s - max)
    m = max(scores.values()) if scores else 0.0
    exps = {g: math.exp(s - m) for g, s in scores.items()}
    Z = sum(exps.values()) or 1.0
    return {g: exps[g] / Z for g in scores}

def has_phrase(hay: str, phrase: str) -> bool:
    """Prüft, ob phrase (normalisiert) als zusammenhängende Folge vorkommt."""
    p = normalize_text(phrase)
    if not p:
        return False
    # Wörtergrenze grob absichern
    return f" {p} " in f" {hay} "

def path_matches_group(asset_path: str, group: str) -> bool:
    """Prüft, ob der Pfad eindeutig auf die Gruppe hindeutet (z. B. 'hifi/teeth' → 'teeth')."""
    p = normalize_text(asset_path)
    g = normalize_text(group)
    parts = [x for x in p.split("/") if x]
    return (g in parts) or p.startswith(g)

def build_search_text(entry: dict) -> Tuple[str, Dict[str, str]]:
    """Baut einen großen Suchtext + einige Einzelstrings (file, path, root)."""
    chunks: List[str] = []

    # Labels/Synonyme/Keywords
    for top, sub in TEXT_FIELDS:
        if "." in top:
            # "info.keywords"
            t1, t2 = top.split(".")
            val = entry.get(t1, {}).get(t2, {}).get(sub, [])
        else:
            # "labels" / "synonyms"
            val = entry.get(top, {}).get(sub, "")
        if isinstance(val, list):
            chunks.extend([str(x) for x in val])
        elif isinstance(val, str):
            chunks.append(val)

    # Datei/Pfad/Root
    asset = entry.get("model", {}).get("asset", {}) or {}
    file_ = asset.get("file") or asset.get("fileKey") or ""
    path_ = asset.get("path") or ""
    root_ = entry.get("model", {}).get("root_name") or ""

    # Name ebenfalls berücksichtigen
    name_like = [entry.get("id", ""), entry.get("entry_uid", "")]
    chunks.extend([file_, path_, root_] + name_like)

    fulltext = join_and_normalize(chunks)
    return fulltext, {
        "file": normalize_text(file_),
        "path": normalize_text(path_),
        "root": normalize_text(root_)
    }

# ------------------------------
# Kern: Scoring je Gruppe
# ------------------------------
def score_entry(entry: dict, groups_rules: Dict[str, List[str]], conflicts: Dict[str, List[str]], group_priority: Dict[str, int]) -> Tuple[Dict[str, float], Dict[str, List[str]]]:
    """Gibt (scores pro Gruppe, reasons pro Gruppe) zurück."""
    text, extras = build_search_text(entry)
    scores: Dict[str, float] = {g: 0.0 for g in groups_rules.keys()}
    reasons: Dict[str, List[str]] = {g: [] for g in groups_rules.keys()}

    # Pfad-Prior: wenn Pfad Gruppe enthält
    for g in scores.keys():
        if path_matches_group(extras["path"], g):
            scores[g] += WEIGHTS["path_prefix"]
            reasons[g].append(f"+path({g})")

    # Phrasen/Keywords
    for g, words in groups_rules.items():
        # längere Phrasen zuerst (einfach nach Länge sortieren)
        for w in sorted(words, key=lambda x: len(x), reverse=True):
            if " " in w and has_phrase(text, w):
                scores[g] += WEIGHTS["phrase"]
                reasons[g].append(f"+phrase({w})")
            else:
                # Einfaches Keyword (ganze Wörter bevorzugen)
                token = normalize_text(w)
                if has_phrase(text, token):
                    scores[g] += WEIGHTS["keyword"]
                    reasons[g].append(f"+kw({w})")

        # Dateiname/Root-Hinweis (schwach)
        for hint in (extras["file"], extras["root"]):
            if not hint:
                continue
            if has_phrase(hint, g):
                scores[g] += WEIGHTS["file_hint"]
                reasons[g].append(f"+filehint({g})")

    # Konflikte bestrafen
    for g, bads in conflicts.items():
        for b in bads:
            if has_phrase(text, b):
                scores[g] += WEIGHTS["conflict_penalty"]
                reasons[g].append(f"-conflict({b})")

    # Stabilisieren: tie-break mit group_priority bei quasi Gleichstand
    # (wird erst später angewandt, wenn wir top/second bestimmen)
    return scores, reasons

def pick_top(scores: Dict[str, float], priority: Dict[str, int]) -> Tuple[str, float, str, float]:
    """Top und Second auswählen; bei Fast-Gleichstand entscheidet Priorität (kleiner = höher)."""
    # Sortierung: erst Score desc, dann Priority asc
    sorted_groups = sorted(scores.items(), key=lambda kv: (-kv[1], priority.get(kv[0], 999)))
    (g1, s1), (g2, s2) = (sorted_groups[0], sorted_groups[1] if len(sorted_groups) > 1 else (None, 0.0))
    return g1, s1, g2, s2

# ------------------------------
# CLI / Main
# ------------------------------
def main():
    ap = argparse.ArgumentParser(description="Erzeuge einen CSV-Report mit Gruppen-Vorhersage (Prozent) je Meta-Eintrag.")
    ap.add_argument("--meta", default="data/meta.json", help="Pfad zur Meta-Datei")
    ap.add_argument("--rules", default="data/group_rules.json", help="Pfad zu den Regeln (JSON)")
    ap.add_argument("--out", default="reports/group_predictions.csv", help="Ziel-CSV")
    ap.add_argument("--mismatches-only", action="store_true", help="Nur Einträge mit predicted_group != current_group")
    ap.add_argument("--min-prob", type=float, default=0.0, help="Nur Einträge mit Top-Probability >= dieser Schwelle (0..1)")
    ap.add_argument("--min-margin", type=float, default=0.0, help="Nur Einträge, bei denen (top - second) >= margin (0..1)")
    args = ap.parse_args()

    meta_path = Path(args.meta)
    rules_path = Path(args.rules)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    meta = load_json(meta_path)

    # Regeln laden: { group_priority, groups: {group:[...keywords...]}, conflicting_terms: {group:[...]} }
    rules = load_json(rules_path)
    group_priority: Dict[str, int] = rules.get("group_priority", {})
    groups_rules: Dict[str, List[str]] = rules.get("groups", {})
    conflicts: Dict[str, List[str]] = rules.get("conflicting_terms", {})

    rows = []

    for e in meta:
        entry_uid = e.get("entry_uid", "")
        lab_en = e.get("labels", {}).get("en", "")
        group_cur = (e.get("classification") or {}).get("group", "")
        asset = (e.get("model") or {}).get("asset", {}) or {}
        file_ = asset.get("file", "")
        path_ = asset.get("path", "")

        scores, reasons = score_entry(e, groups_rules, conflicts, group_priority)
        probs = softmax(scores)
        g1, s1, g2, s2 = pick_top(scores, group_priority)

        # Filter anwenden
        prob1 = probs.get(g1, 0.0)
        prob2 = probs.get(g2, 0.0) if g2 else 0.0
        margin = prob1 - prob2

        if args.min_prob and prob1 < args.min_prob:
            continue
        if args.min_margin and margin < args.min_margin:
            continue
        if args.mismatches_only and g1 == group_cur:
            continue

        # Kurze Reason-Zusammenfassung für Top-Group
        reason_short = ";".join(reasons.get(g1, [])[:6])

        rows.append({
            "entry_uid": entry_uid,
            "current_group": group_cur,
            "predicted_group": g1,
            "prob": f"{prob1*100:.1f}",
            "margin": f"{margin*100:.1f}",
            "second_group": g2 or "",
            "second_prob": f"{probs.get(g2, 0.0)*100:.1f}" if g2 else "",
            "label_en": lab_en,
            "file": file_,
            "path": path_,
            "reasons": reason_short
        })

    # Sortierung: nach prob desc, dann margin desc
    rows.sort(key=lambda r: (-float(r["prob"]), -float(r["margin"])))

    # CSV schreiben
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "entry_uid","current_group","predicted_group","prob","margin",
            "second_group","second_prob","label_en","file","path","reasons"
        ])
        w.writeheader()
        w.writerows(rows)

    print(f"✅ Report geschrieben: {out_path}  (Zeilen: {len(rows)})")

if __name__ == "__main__":
    main()
