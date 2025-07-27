#!/bin/bash

JSON_FILE="/home/pepperboy8/projects/3DAnatomy/data/meta.json"
MODELS_DIR="/home/pepperboy8/projects/3DAnatomy/models"

echo "🔍 Prüfe Dateien laut $JSON_FILE..."
fehlende=()

# Alle 'filename'-Einträge auslesen
jq -r '.[].filename' "$JSON_FILE" | while read -r relative_path; do
    full_path="$MODELS_DIR/$relative_path"
    if [ ! -f "$full_path" ]; then
        echo "⚠️  Datei fehlt: $relative_path"
        fehlende+=("$relative_path")
    fi
done

echo ""
echo "✅ Überprüfung abgeschlossen."
