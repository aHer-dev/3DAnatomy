#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt reports/group_predictions.csv direkt aus data/meta.json.
Einfache Heuristik:
- starker Treffer: Pfad stimmt mit Gruppe überein (+100)
- starke Phrasen (z. B. 'cerebral artery', 'intervertebral disk', 'pulmonary valve') -> Zielgruppe +120
- Stichworte pro Gruppe (bones, muscles, ...) in label/synonyms/filename -> +10 je Fund

Ausgabe-Spalten (kompatibel zu deinen Reports):
entry_uid,current_group,predicted_group,prob,margin,second_group,second_prob,label_en,file,path,reasons
"""

import json, re, csv
from pathlib import Path

ALLOWED = ["nerves","muscles","ligaments","bones","organs","arteries","veins","brain",
           "eyes","lungs","teeth","cartilage","glands","ear","heart","skin_hair"]

# 1) starke Phrasen mit klarer Zielgruppe (Priorität!)
PHRASES = [
    (r"\bcerebral artery\b",   "arteries"),
    (r"\blacrimal gland\b",    "glands"),
    (r"\boculomotor nerve\b",  "nerves"),
    (r"\bnasociliary nerve\b", "nerves"),
    (r"\bciliary ganglion\b",  "nerves"),
    (r"\bintercostal muscle\b","muscles"),
    (r"\bpulmonary valve\b",   "heart"),
    (r"\bpulmonary trunk\b",   "heart"),
    # Wichtig: Bandscheiben vor bones
    (r"\bintervertebral disk\b","cartilage"),
    # Bones
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

# 2) leichte Stichworte pro Gruppe (erweiterbar)
KW = {
    "teeth":     ["tooth","teeth","incisor","canine","premolar","molar","gingiva"],
    "nerves":    ["nerve","ganglion","plexus","ramus","branch"],
    "muscles":   ["muscle","musculus","intercostal","biceps","triceps","gluteus","levator"],
    "ligaments": ["ligament","lig.","ligamentum","tendon","raphe","iliotibial"],
    "arteries":  ["artery","arterial","aorta","carotid","trunk","arch"],
    "veins":     ["vein","venous","vena","sinus"],
    "organs":    ["liver","kidney","stomach","spleen","pancreas","bladder","prostate","duct"],
    "brain":     ["gyrus","ventricle","thalamus","cerebellum","corpus callosum","insula"],
    "eyes":      ["eye","eyeball","iris","lens","sclera","retina","lacrimal","palpebrae","tarsal"],
    "lungs":     ["lung","bronch","trachea","pulmonary"],
    "glands":    ["gland","pituitary","pineal","adrenal","thyroid","parathyroid","lacrimal"],
    "teeth":     ["tooth","teeth","incisor","canine","premolar","molar","gingiva"],
    "bones":     ["bone","vertebra","rib","mandible","maxilla","frontal","parietal","temporal","occipital"],
    "cartilage": ["cartilage","chondral","epiglottic","meniscus","disk"],
    "heart":     ["atrium","ventricle","valve","papillary","septal","coronary"],
    "skin_hair": ["skin","hair","eyelash","eyebrow"],
    "ear":       ["ear","auricle","cochlea","vestibule"],
}

def text_of(entry):
    """Label + Synonyme + Datei zu einem Text zusammenziehen."""
    parts = []
    lab = (entry.get("labels") or {}).get("en") or ""
    parts.append(lab)
    sy  = (entry.get("synonyms") or {}).get("en") or []
    parts.extend(sy if isinstance(sy, list) else [])
    file = (((entry.get("model") or {}).get("asset") or {}).get("file")) or \
           (((entry.get("model") or {}).get("variants") or {}).get("draco") or {}).get("filename") or ""
    parts.append(file)
    return " ".join([str(p) for p in parts if p]).lower(), lab or ""

def score_entry(entry):
    txt, label = text_of(entry)
    model = entry.get("model") or {}
    asset = model.get("asset") or {}
    path  = asset.get("path") or (model.get("variants",{}).get("draco",{}) or {}).get("path") or ""
    current = (entry.get("classification") or {}).get("group") or ""
    uid = entry.get("entry_uid") or ""

    scores = {g:0 for g in ALLOWED}
    reasons = {g:[] for g in ALLOWED}

    # starke Phrase zuerst (erzwingt hohe Punkte)
    for pat, grp in PHRASES:
        if re.search(pat, txt, flags=re.IGNORECASE):
            scores[grp] += 120
            reasons[grp].append(f"+phrase({pat.strip('^$')})")

    # Pfadbonus
    if path in ALLOWED:
        scores[path] += 100
        reasons[path].append(f"+path({path})")

    # Stichworte
    for g, kws in KW.items():
        for kw in kws:
            if kw in txt:
                scores[g] += 10
                reasons[g].append(f"+kw({kw})")

    # Top 2 finden
    top = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:2]
    (g1, s1) = top[0]
    (g2, s2) = top[1] if len(top) > 1 else ("", 0)
    margin = s1 - s2
    # reasons zusammenziehen
    r = ";".join(reasons[g1]) if reasons[g1] else ""

    file = asset.get("file") or (model.get("variants",{}).get("draco",{}) or {}).get("filename") or ""
    return {
        "entry_uid": uid,
        "current_group": current,
        "predicted_group": g1,
        "prob": s1,
        "margin": margin,
        "second_group": g2,
        "second_prob": s2,
        "label_en": label,
        "file": file,
        "path": path,
        "reasons": r
    }

def main():
    meta_path = Path("data/meta.json")
    out = Path("reports/group_predictions.csv")
    out.parent.mkdir(parents=True, exist_ok=True)

    data = json.loads(meta_path.read_text(encoding="utf-8"))
    rows = [score_entry(e) for e in data]
    # schreiben
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"✅ geschrieben: {out} (rows={len(rows)})")

if __name__ == "__main__":
    main()
