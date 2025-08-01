import os
import shutil
from pathlib import Path

# === Konfiguration ===
quellverzeichnis = Path(".").resolve()
zielverzeichnis = quellverzeichnis / "export"
dateiliste = [
    "index.html", "style.css",
    "app.js", "js/init.js", "js/ui.js", "js/utils.js",
    "js/state.js", "js/modelLoader.js", "js/interaction.js"
]

# === Zielordner erstellen ===
os.makedirs(zielverzeichnis, exist_ok=True)

# === Dateien kopieren ===
for rel_path in dateiliste:
    quelle = quellverzeichnis / rel_path
    ziel = zielverzeichnis / Path(rel_path).name
    if quelle.exists():
        shutil.copy2(quelle, ziel)
        print(f"Kopiert: {rel_path}")
    else:
        print(f"Nicht gefunden (übersprungen): {rel_path}")

# === Ordnerstruktur ohne .glb-Dateien erzeugen ===
struktur_datei = zielverzeichnis / "ordnerstruktur.txt"

with open(struktur_datei, "w", encoding="utf-8") as f:
    for root, dirs, files in os.walk(quellverzeichnis):
        rel_root = os.path.relpath(root, quellverzeichnis)
        indent = "│   " * (rel_root.count(os.sep)) if rel_root != "." else ""
        f.write(f"{indent}├── {os.path.basename(root) if rel_root != '.' else '.'}\n")
        for file in sorted(files):
            if not file.endswith(".glb"):
                f.write(f"{indent}│   ├── {file}\n")

print("\nFertig! Dateien exportiert und Ordnerstruktur gespeichert.")
