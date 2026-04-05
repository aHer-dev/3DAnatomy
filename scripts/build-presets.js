#!/usr/bin/env node
/**
 * build-presets.js
 *
 * Scannt data/presets/ nach .bluebody Dateien und aktualisiert data/presets/index.json.
 *
 * Verwendung:
 *   node scripts/build-presets.js
 *
 * Verhalten:
 *   - Neue .bluebody Dateien → werden mit leerem name/category eingetragen
 *   - Bestehende Einträge → name, category, description bleiben erhalten
 *   - Gelöschte Dateien → werden aus index.json entfernt
 *   - index.json wird neu geschrieben (alphabetisch nach Dateiname sortiert)
 *
 * Kategorie-Struktur (optional, für spätere Gruppierung):
 *   Jeder Eintrag hat ein "category" Feld.
 *   Leer = kein Filter, "Knochen/Schädel" = Gruppe Schädel unter Knochen usw.
 *
 *   Vordefinierte Kategorien:
 *     Knochen/Schädel
 *     Knochen/Wirbelsäule
 *     Knochen/Thorax
 *     Knochen/Obere Extremität
 *     Knochen/Untere Extremität
 *     Knochen/Becken
 *     Muskeln/Kopf & Hals
 *     Muskeln/Schulter & Arm
 *     Muskeln/Rumpf
 *     Muskeln/Bein & Hüfte
 *
 *   Einfach in index.json eintragen, die App gruppiert automatisch.
 */

const fs   = require('fs');
const path = require('path');

const PRESETS_DIR   = path.join(__dirname, '..', 'data', 'presets');
const MANIFEST_FILE = path.join(PRESETS_DIR, 'index.json');

// ─── Bestehende index.json einlesen (um Namen/Kategorien zu erhalten) ─────────

let existing = { version: '1.0', presets: [] };
if (fs.existsSync(MANIFEST_FILE)) {
  try {
    existing = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch {
    console.warn('⚠️  index.json konnte nicht gelesen werden – wird neu erstellt.');
  }
}

// Lookup: Dateiname → bestehender Eintrag
const existingByFile = {};
for (const p of (existing.presets || [])) {
  if (p.file) existingByFile[p.file] = p;
}

// ─── .bluebody Dateien scannen ────────────────────────────────────────────────

const files = fs.readdirSync(PRESETS_DIR)
  .filter(f => f.endsWith('.bluebody'))
  .sort((a, b) => a.localeCompare(b, 'de'));

if (files.length === 0) {
  console.log('ℹ️  Keine .bluebody Dateien in data/presets/ gefunden.');
}

// ─── Einträge zusammenführen ──────────────────────────────────────────────────

const presets = files.map(file => {
  const prev = existingByFile[file];

  // Dateiname ohne Endung als Fallback-Name
  const fallbackName = file.replace(/\.bluebody$/i, '');

  return {
    name:        prev?.name        ?? fallbackName,
    file,
    category:    prev?.category    ?? '',
    description: prev?.description ?? '',
  };
});

// ─── index.json schreiben ─────────────────────────────────────────────────────

const output = {
  version: '1.0',
  presets,
};

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');

// ─── Zusammenfassung ──────────────────────────────────────────────────────────

const added   = presets.filter(p => !existingByFile[p.file]).length;
const removed = Object.keys(existingByFile).filter(f => !files.includes(f)).length;
const total   = presets.length;

console.log(`✅ data/presets/index.json aktualisiert`);
console.log(`   ${total} Preset(s) gesamt | +${added} neu | -${removed} entfernt`);

if (presets.length > 0) {
  console.log('\n   Einträge:');
  presets.forEach(p => {
    const cat = p.category ? ` [${p.category}]` : ' [keine Kategorie]';
    console.log(`   • ${p.name}${cat}`);
  });
}

console.log('\n💡 Tipp: Kategorie in index.json eintragen, z.B.:');
console.log('   "category": "Knochen/Schädel"');
console.log('   Die App gruppiert den Preset dann automatisch.\n');
