# scripts/build_manual_fixes_from_labels.py
from pathlib import Path
import pandas as pd

pred = Path("reports/group_predictions_processed.csv")
if not pred.exists():
    pred = Path("reports/group_predictions.csv")

df = pd.read_csv(pred, encoding="utf-8")
map_df = pd.read_csv("reports/manual_label_map.csv", encoding="utf-8")

# normalisieren (Trim)
df["label_en_norm"] = df["label_en"].astype(str).str.strip()
map_df["label_en_norm"] = map_df["label_en"].astype(str).str.strip()

fix = df.merge(map_df[["label_en_norm","corrected_group"]],
               on="label_en_norm", how="inner")

# nur echte Änderungen
fix = fix[fix["current_group"] != fix["corrected_group"]].copy()
fix = fix.rename(columns={"corrected_group":"new_group"})

out = Path("reports/group_fix_manual.csv")
fix[["entry_uid","current_group","new_group","label_en"]].to_csv(out, index=False, encoding="utf-8")
print(f"✅ geschrieben: {out} | Zeilen: {len(fix)}")

