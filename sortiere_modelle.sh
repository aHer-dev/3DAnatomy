#!/bin/bash

JSON_FILE="/home/pepperboy8/projects/3DAnatomy/data/meta.json"
SRC_DIR="/home/pepperboy8/projects/3DAnatomy/all_glb"
TARGET_BASE="/home/pepperboy8/projects/3DAnatomy/models"

echo "🚚 Starte das Verschieben der Dateien gemäß meta.json ..."

# Durchlaufe jede Datei aus der JSON
jq -r '.[] | "\(.filename)"' "$JSON_FILE" | while read -r rel_path; do
    # Zielordner und Dateiname extrahieren
    target_path="$TARGET_BASE/$rel_path"
    target_dir=$(dirname "$target_path")
    filename=$(basename "$rel_path")

    # Quelle
    src_file="$SRC_DIR/$filename"

    # Falls Quelldatei existiert, verschieben
    if [ -f "$src_file" ]; then
        mkdir -p "$target_dir"
        mv "$src_file" "$target_path"
        echo "✅ Verschoben: $filename -> $rel_path"
    else
        echo "⚠️  Nicht gefunden: $filename"
    fi
done

echo "✅ Alle vorhandenen Dateien wurden sortiert."
