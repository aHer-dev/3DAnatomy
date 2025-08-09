import pandas as pd

# Pfad zur Original-CSV
input_file = "/home/pepperboy8/Documents/3D_ANATOMY_BIG/3DAnatomy/reports/group_predictions.csv"
output_file = "/home/pepperboy8/Documents/3D_ANATOMY_BIG/3DAnatomy/reports/group_predictions_processed.csv"

# CSV laden (UTF-8)
df = pd.read_csv(input_file, encoding="utf-8")

# Mismatch-Spalte: True/False
df["Mismatch"] = df["current_group"] != df["predicted_group"]

# prob_num und margin_num als Zahlen (Fehler → NaN)
df["prob_num"] = pd.to_numeric(df["prob"], errors="coerce")
df["margin_num"] = pd.to_numeric(df["margin"], errors="coerce")

# auto_fix-Bedingung:
# prob_num >= 0.75 UND margin_num >= 0.25
# optional zusätzlich: has_phrase == True, wenn Spalte vorhanden
if "has_phrase" in df.columns:
    df["auto_fix"] = (
        (df["prob_num"] >= 0.75) &
        (df["margin_num"] >= 0.25) &
        (df["has_phrase"] == True)
    )
else:
    df["auto_fix"] = (
        (df["prob_num"] >= 0.75) &
        (df["margin_num"] >= 0.25)
    )

# Neue Datei speichern
df.to_csv(output_file, index=False, encoding="utf-8")

print(f"✅ Neue Datei gespeichert unter: {output_file}")
