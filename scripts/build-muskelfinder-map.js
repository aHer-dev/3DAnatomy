#!/usr/bin/env node
/**
 * build-muskelfinder-map.js
 *
 * Liest die Muskelfinder-Datenquellen sowie data/meta.json aus 3DAnatomy und
 * erzeugt:
 *   - data/muskelfinder-map.json
 *   - data/muskelfinder-map.generated.json
 *   - data/muskelfinder-map.report.json
 *
 * Ziel:
 *   - bestehende manuelle Zuordnungen aus muskelfinder-map.manual.json beibehalten
 *   - einfache 1:1- oder links/rechts-Matches automatisch vorschlagen
 *   - mehrdeutige und fehlende Faelle sauber zur Review ausgeben
 *
 * Verwendung:
 *   node scripts/build-muskelfinder-map.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const META_FILE = path.join(ROOT_DIR, 'data', 'meta.json');
const MAP_FILE = path.join(ROOT_DIR, 'data', 'muskelfinder-map.json');
const MANUAL_MAP_FILE = path.join(ROOT_DIR, 'data', 'muskelfinder-map.manual.json');
const GENERATED_MAP_FILE = path.join(ROOT_DIR, 'data', 'muskelfinder-map.generated.json');
const REPORT_FILE = path.join(ROOT_DIR, 'data', 'muskelfinder-map.report.json');
const DETAILS_FILE = path.join(ROOT_DIR, 'data', 'muskelfinder-details.json');

const MUSKELFINDER_DIR = path.join(ROOT_DIR, '..', 'Muskelfinder', 'data');
const MUSKELFINDER_FILES = [
  'obere-extremitaet.json',
  'untere-extremitaet.json',
  'wirbelsaeule.json',
  'kopf-hals.json'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/[–—-]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^m\s+/, 'musculus ')
    .replace(/^mm\s+/, 'musculi ');
}

function buildMuscleKey(name = '') {
  const normalized = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^mm?\.\s*/, '')
    .replace(/^musculi\s+/, '')
    .replace(/^musculus\s+/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return normalized ? `m_${normalized}` : '';
}

function buildDetailBaseKey(muscle) {
  const parts = [muscle.muscleKey || 'm_unknown'];
  const region = slugify(muscle.region || '');
  const subgroup = slugify(muscle.subgroup || '');

  if (region) parts.push(region);
  if (subgroup) parts.push(subgroup);

  return parts.join('__');
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function getEntrySide(entry) {
  const explicit = String(entry?.classification?.side || '').trim().toLowerCase();
  if (explicit) return explicit;

  const english = String(entry?.labels?.en || '').trim().toLowerCase();
  if (/\bright\b/.test(english)) return 'right';
  if (/\bleft\b/.test(english)) return 'left';

  return '';
}

function simplifyCandidate(entry) {
  return {
    id: entry.id,
    group: entry?.classification?.group || '',
    side: getEntrySide(entry),
    latinLabel: entry?.labels?.la || '',
    englishLabel: entry?.labels?.en || ''
  };
}

function loadMuskelfinderMuscles() {
  const muscles = [];
  const detailBaseCounts = new Map();

  for (const file of MUSKELFINDER_FILES) {
    const fullPath = path.join(MUSKELFINDER_DIR, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Muskelfinder-Datei nicht gefunden: ${fullPath}`);
    }

    const rows = readJson(fullPath).Sheet1 || [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const muscle = {
        name: row.Name,
        muscleKey: buildMuscleKey(row.Name),
        normalizedName: normalizeLabel(row.Name),
        region: row.region || '',
        subgroup: row.subgroup || '',
        sourceFile: file,
        sourceRow: row,
        sourceRowIndex: rowIndex
      };

      const detailBaseKey = buildDetailBaseKey(muscle);
      const detailIndex = (detailBaseCounts.get(detailBaseKey) || 0) + 1;
      detailBaseCounts.set(detailBaseKey, detailIndex);

      muscle.detailKey = detailIndex === 1
        ? detailBaseKey
        : `${detailBaseKey}__${detailIndex}`;

      muscles.push(muscle);
    }
  }

  return muscles;
}

function normalizeSectionLine(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSectionItems(value) {
  if (value == null || value === '') {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => ({ text: normalizeSectionLine(line) }))
      .filter((item) => item.text);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeSectionItems(item));
  }

  if (typeof value === 'object') {
    const label = normalizeSectionLine(value.Part || value.part || value.label || '');
    const text = normalizeSectionLine(
      value.Location ||
      value.location ||
      value.text ||
      value.value ||
      value.name ||
      ''
    );

    if (label || text) {
      return [{ label, text }];
    }
  }

  return [{ text: normalizeSectionLine(value) }].filter((item) => item.text);
}

function buildDetailSections(row) {
  const sectionConfigs = [
    ['origin', 'Ursprung', row.Origin],
    ['insertion', 'Ansatz', row.Insertion],
    ['movement', 'Bewegung', row.Movements],
    ['function', 'Funktion', row.Function],
    ['innervation', 'Innervation', row.Segments],
    ['clinical', 'Klinischer Bezug', row.clinicalNote]
  ];

  return sectionConfigs
    .map(([id, label, value]) => {
      const items = normalizeSectionItems(value);
      if (!items.length) return null;
      return { id, label, items };
    })
    .filter(Boolean);
}

function buildMuskelfinderDetailsEntry(muscle) {
  return {
    detailKey: muscle.detailKey,
    muscleKey: muscle.muscleKey,
    name: muscle.name,
    region: muscle.region,
    subgroup: muscle.subgroup,
    sourceFile: muscle.sourceFile,
    sourceRowIndex: muscle.sourceRowIndex,
    sections: buildDetailSections(muscle.sourceRow)
  };
}

function buildDetailsLookup(muscles) {
  const byMuscleKey = new Map();

  for (const muscle of muscles) {
    if (!muscle.muscleKey) continue;
    if (!byMuscleKey.has(muscle.muscleKey)) {
      byMuscleKey.set(muscle.muscleKey, []);
    }
    byMuscleKey.get(muscle.muscleKey).push(muscle);
  }

  return { byMuscleKey };
}

function resolveDetailKeyForMapEntry(entry, lookup) {
  const candidates = lookup.byMuscleKey.get(entry?.muscleKey || '') || [];
  if (!candidates.length) return null;

  let filtered = candidates;
  const name = String(entry?.muskelfinderNames?.[0] || '').trim();
  if (name) {
    const byName = filtered.filter((candidate) => candidate.name === name);
    if (byName.length) filtered = byName;
  }

  const region = String(entry?.region || '').trim();
  if (region) {
    const byRegion = filtered.filter((candidate) => candidate.region === region);
    if (byRegion.length) filtered = byRegion;
  }

  const subgroup = String(entry?.subgroup || '').trim();
  if (subgroup) {
    const bySubgroup = filtered.filter((candidate) => candidate.subgroup === subgroup);
    if (bySubgroup.length) filtered = bySubgroup;
  }

  return filtered[0]?.detailKey || null;
}

function buildDetailsPayload(muscles, generatedEntries) {
  const entries = muscles
    .map(buildMuskelfinderDetailsEntry)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const modelToDetailKey = Object.create(null);
  const conflicts = [];

  for (const entry of generatedEntries) {
    const detailKey = entry?.detailKey || null;
    if (!detailKey) continue;

    for (const id of entry.ids || []) {
      if (!id) continue;

      if (modelToDetailKey[id] && modelToDetailKey[id] !== detailKey) {
        conflicts.push({
          id,
          detailKeys: [modelToDetailKey[id], detailKey]
        });
        continue;
      }

      modelToDetailKey[id] = detailKey;
    }
  }

  const mappedDetailKeys = new Set(Object.values(modelToDetailKey));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'scripts/build-muskelfinder-map.js',
    summary: {
      totalDetailEntries: entries.length,
      mappedDetailEntries: mappedDetailKeys.size,
      unmappedDetailEntries: entries.length - mappedDetailKeys.size,
      mappedModelIds: Object.keys(modelToDetailKey).length,
      mappingConflicts: conflicts.length
    },
    entries,
    modelToDetailKey,
    mappingConflicts: conflicts
  };
}

function buildMetaIndexes(meta) {
  const muscles = meta.filter((entry) => entry?.classification?.group === 'muscles');
  const byLatinLabel = new Map();
  const byEnglishLabel = new Map();
  const byAlias = new Map();

  for (const entry of muscles) {
    const latin = normalizeLabel(entry?.labels?.la || '');
    const english = normalizeLabel(entry?.labels?.en || '');

    if (latin) {
      if (!byLatinLabel.has(latin)) byLatinLabel.set(latin, []);
      byLatinLabel.get(latin).push(entry);
    }

    if (english) {
      if (!byEnglishLabel.has(english)) byEnglishLabel.set(english, []);
      byEnglishLabel.get(english).push(entry);
    }

    for (const alias of buildEntryAliases(entry)) {
      if (!byAlias.has(alias)) byAlias.set(alias, []);
      byAlias.get(alias).push(entry);
    }
  }

  return { muscles, byLatinLabel, byEnglishLabel, byAlias };
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const id = entry?.id || '';
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function addAlias(aliases, alias) {
  if (alias) aliases.add(alias);
}

function stripEnglishSideMarkers(value = '') {
  return normalizeLabel(value)
    .replace(/\bof\s+(right|left)\s+(hand|foot)\b/g, 'of $2')
    .replace(/\bof\s+(right|left)\s+/g, 'of ')
    .replace(/^(right|left)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEntryAliases(entry) {
  const aliases = new Set();
  const latin = normalizeLabel(entry?.labels?.la || '');
  const english = normalizeLabel(entry?.labels?.en || '');
  const englishWithoutSide = stripEnglishSideMarkers(entry?.labels?.en || '');

  addAlias(aliases, latin);
  addAlias(aliases, english);
  addAlias(aliases, englishWithoutSide);

  const addMusculusAlias = (value, plural = false) => {
    const normalized = normalizeLabel(value);
    if (!normalized) return;
    if (normalized.startsWith('musculus ') || normalized.startsWith('musculi ')) {
      addAlias(aliases, normalized);
      return;
    }
    addAlias(aliases, `${plural ? 'musculi' : 'musculus'} ${normalized}`);
  };

  if (englishWithoutSide) {
    addMusculusAlias(englishWithoutSide, englishWithoutSide.startsWith('set of'));
  }

  let match = englishWithoutSide.match(/^(ascending|descending|transverse|clavicular|acromial|spinal|abdominal|sternocostal)\s+part of\s+(.+)$/);
  if (match) {
    const partMap = {
      ascending: 'ascendens',
      descending: 'descendens',
      transverse: 'transversa',
      clavicular: 'clavicularis',
      acromial: 'acromialis',
      spinal: 'spinalis',
      abdominal: 'abdominalis',
      sternocostal: 'sternocostalis'
    };
    const part = partMap[match[1]];
    const base = normalizeLabel(match[2]);
    addAlias(aliases, `musculus ${base}`);
    addAlias(aliases, `musculus ${base} pars ${part}`);
  }

  match = englishWithoutSide.match(/^(long|short|lateral|medial|humeral|ulnar|oblique|transverse)\s+head of\s+(.+)$/);
  if (match) {
    const headMap = {
      long: 'longum',
      short: 'breve',
      lateral: 'laterale',
      medial: 'mediale',
      humeral: 'humerale',
      ulnar: 'ulnare',
      oblique: 'obliquum',
      transverse: 'transversum'
    };
    const part = headMap[match[1]];
    const base = normalizeLabel(match[2]);
    addAlias(aliases, `musculus ${base}`);
    addAlias(aliases, `musculus ${base} caput ${part}`);
  }

  match = englishWithoutSide.match(/^set of\s+(.+?)\s+of\s+(hand|foot)$/);
  if (match) {
    const baseMap = {
      'lumbricals': 'musculi lumbricales',
      'palmar interossei': 'musculi interossei palmares',
      'dorsal interossei': 'musculi interossei dorsales'
    };
    const base = baseMap[match[1]];
    const suffix = match[2] === 'hand' ? 'manus' : 'pedis';
    if (base) {
      addAlias(aliases, base);
      addAlias(aliases, `${base} ${suffix}`);
    }
  }

  match = englishWithoutSide.match(/^(first|second|third|fourth)\s+lumbrical of\s+foot$/);
  if (match) {
    addAlias(aliases, 'musculi lumbricales');
    addAlias(aliases, 'musculi lumbricales pedis');
  }

  match = englishWithoutSide.match(/^(first|second|third)\s+plantar interosseous of\s+foot$/);
  if (match) {
    addAlias(aliases, 'musculi interossei plantares');
    addAlias(aliases, 'musculi interossei plantares pedis');
  }

  match = englishWithoutSide.match(/^(.+?)\s+of\s+(hand|foot)$/);
  if (match) {
    const base = normalizeLabel(match[1]);
    const suffix = match[2] === 'hand' ? 'manus' : 'pedis';
    addAlias(aliases, `musculus ${base}`);
    addAlias(aliases, `musculus ${base} ${suffix}`);
  }

  match = englishWithoutSide.match(/^(obturator)\s+(internus|externus)$/);
  if (match) {
    addAlias(aliases, `musculus obturator ${match[2]}`);
    addAlias(aliases, `musculus obturatorius ${match[2]}`);
  }

  if (latin === 'musculus flexor accessorius') {
    addAlias(aliases, 'musculus quadratus plantae');
  }

  if (latin.includes('musculus semispinalis ')) {
    addAlias(aliases, 'musculus semispinalis');
  }

  if (latin.includes('musculus iliocostalis ')) {
    addAlias(aliases, 'musculi iliocostales');
  }

  if (latin.includes('musculus longissimus ')) {
    addAlias(aliases, 'musculi longissimi');
  }

  if (latin.includes('musculus splenius ')) {
    addAlias(aliases, 'musculi splenii');
  }

  if (latin.includes('musculus rotator ')) {
    addAlias(aliases, 'musculi rotatores');
  }

  if (latin.includes('interspinal')) {
    addAlias(aliases, 'musculi interspinales');
  }

  if (latin.includes('medial lumbar intertransversarius')) {
    addAlias(aliases, 'musculi intertransversarii mediales');
  }

  if (latin === 'musculus platysma') {
    addAlias(aliases, 'platysma');
  }

  return [...aliases];
}

function buildTargetAliases(muscle) {
  const aliases = new Set([muscle.normalizedName]);
  const rawName = String(muscle.name || '');

  const withoutParen = rawName.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  addAlias(aliases, normalizeLabel(withoutParen));

  for (const match of rawName.matchAll(/\(([^)]*)\)/g)) {
    addAlias(aliases, normalizeLabel(match[1]));
  }

  for (const alias of [...aliases]) {
    addAlias(aliases, alias.replace(/\b(i|ii|iii|iv|v)\b/g, '').replace(/\s+/g, ' ').trim());
  }

  if (muscle.muscleKey === 'm_quadratus_plantae') {
    addAlias(aliases, 'musculus flexor accessorius');
  }

  if (muscle.muscleKey === 'm_platysma') {
    addAlias(aliases, 'musculus platysma');
  }

  for (const alias of [...aliases]) {
    addAlias(aliases, alias.replace(/\bobturatorius\b/g, 'obturator'));
    addAlias(aliases, alias.replace(/\bdeltoideus\b/g, 'deltoid'));
    addAlias(aliases, alias.replace(/\bplatysma\b/g, 'musculus platysma'));
  }

  for (const alias of [...aliases]) {
    const match = alias.match(/^(musculus .+?)\s+caput\s+([a-z]+)\s+und\s+([a-z]+)$/);
    if (match) {
      addAlias(aliases, `${match[1]} caput ${match[2]}`);
      addAlias(aliases, `${match[1]} caput ${match[3]}`);
    }
  }

  return uniqueStrings([...aliases]);
}

function filterCandidatesForSubgroup(candidates, muscle) {
  if (!candidates.length) return candidates;

  const subgroup = normalizeLabel(muscle.subgroup || '');
  if (subgroup === 'hand') {
    const handOnly = candidates.filter((entry) => {
      const label = normalizeLabel(`${entry?.labels?.la || ''} ${entry?.labels?.en || ''}`);
      return /\b(hand|manus|palmar|pollicis)\b/.test(label) && !/\b(foot|pedis|hallucis)\b/.test(label);
    });
    if (handOnly.length) return handOnly;

    const footLike = candidates.filter((entry) => {
      const label = normalizeLabel(`${entry?.labels?.la || ''} ${entry?.labels?.en || ''}`);
      return /\b(foot|pedis|hallucis|plantar)\b/.test(label);
    });
    if (footLike.length === candidates.length) return [];
  }

  if (subgroup === 'fuss') {
    const footOnly = candidates.filter((entry) => {
      const label = normalizeLabel(`${entry?.labels?.la || ''} ${entry?.labels?.en || ''}`);
      return /\b(foot|pedis|hallucis|plantar)\b/.test(label) && !/\b(hand|manus|palmar|pollicis)\b/.test(label);
    });
    if (footOnly.length) return footOnly;

    const handLike = candidates.filter((entry) => {
      const label = normalizeLabel(`${entry?.labels?.la || ''} ${entry?.labels?.en || ''}`);
      return /\b(hand|manus|palmar|pollicis)\b/.test(label);
    });
    if (handLike.length === candidates.length) return [];
  }

  return candidates;
}

function preferSidedEntries(candidates) {
  const sided = candidates.filter((entry) => ['right', 'left'].includes(getEntrySide(entry)));
  if (sided.length >= 2) {
    return uniqueEntries(sided);
  }
  return candidates;
}

function getCandidates(muscle, indexes) {
  const aliases = buildTargetAliases(muscle);
  const found = [];

  for (const alias of aliases) {
    const directLatin = indexes.byLatinLabel.get(alias) || [];
    const directEnglish = indexes.byEnglishLabel.get(alias) || [];
    const directAlias = indexes.byAlias.get(alias) || [];
    found.push(...directLatin, ...directEnglish, ...directAlias);
  }

  const candidates = preferSidedEntries(filterCandidatesForSubgroup(uniqueEntries(found), muscle));
  return { aliases, candidates };
}

function isStableMatch(candidates, targetAliases) {
  if (!candidates.length || candidates.length > 8) {
    return false;
  }

  const rightCount = candidates.filter((entry) => getEntrySide(entry) === 'right').length;
  const leftCount = candidates.filter((entry) => getEntrySide(entry) === 'left').length;

  if (!rightCount || !leftCount || rightCount !== leftCount) {
    return false;
  }

  const aliasSets = candidates.map((entry) => new Set(buildEntryAliases(entry)));
  const matchingAlias = targetAliases.find((alias) => aliasSets.every((entryAliases) => entryAliases.has(alias)));
  if (matchingAlias) {
    return true;
  }

  return aliasSets.every((entryAliases) => targetAliases.some((alias) => entryAliases.has(alias)));
}

function buildGeneratedEntry(muscle, candidates, source) {
  const sortedIds = candidates
    .map((entry) => entry.id)
    .sort((a, b) => a.localeCompare(b, 'de'));

  return {
    muscleKey: muscle.muscleKey,
    group: 'muscles',
    muskelfinderNames: [muscle.name],
    latinLabel: candidates[0]?.labels?.la || muscle.name,
    ids: sortedIds,
    source,
    region: muscle.region,
    subgroup: muscle.subgroup
  };
}

function main() {
  if (!fs.existsSync(META_FILE)) {
    throw new Error(`meta.json nicht gefunden: ${META_FILE}`);
  }
  const manualSourceFile = fs.existsSync(MANUAL_MAP_FILE) ? MANUAL_MAP_FILE : MAP_FILE;

  if (!fs.existsSync(manualSourceFile)) {
    throw new Error(`Manuelle Map nicht gefunden: ${manualSourceFile}`);
  }

  const meta = readJson(META_FILE);
  const manualMap = readJson(manualSourceFile);
  const muscles = loadMuskelfinderMuscles();
  const indexes = buildMetaIndexes(meta);
  const detailsLookup = buildDetailsLookup(muscles);

  const manualEntries = Array.isArray(manualMap.entries) ? manualMap.entries : [];
  const manualKeys = new Set(manualEntries.map((entry) => entry.muscleKey).filter(Boolean));

  const exactMatches = [];
  const ambiguousMatches = [];
  const missingMatches = [];

  for (const muscle of muscles) {
    if (!muscle.muscleKey) {
      missingMatches.push({
        muscleKey: '',
        name: muscle.name,
        region: muscle.region,
        subgroup: muscle.subgroup,
        sourceFile: muscle.sourceFile,
        reason: 'invalid-muscle-key'
      });
      continue;
    }

    if (manualKeys.has(muscle.muscleKey)) {
      continue;
    }

    const { aliases, candidates } = getCandidates(muscle, indexes);
    if (!candidates.length) {
      missingMatches.push({
        muscleKey: muscle.muscleKey,
        name: muscle.name,
        region: muscle.region,
        subgroup: muscle.subgroup,
        sourceFile: muscle.sourceFile,
        reason: 'no-meta-match'
      });
      continue;
    }

    if (isStableMatch(candidates, aliases)) {
      exactMatches.push({
        ...buildGeneratedEntry(muscle, candidates, candidates.length > 2 ? 'generated-group' : 'generated-alias'),
        sourceFile: muscle.sourceFile
      });
      continue;
    }

    ambiguousMatches.push({
      muscleKey: muscle.muscleKey,
      name: muscle.name,
      region: muscle.region,
      subgroup: muscle.subgroup,
      sourceFile: muscle.sourceFile,
      matchCount: candidates.length,
      candidates: candidates.map(simplifyCandidate)
    });
  }

  const generatedEntries = [
    ...manualEntries.map((entry) => ({ ...entry, source: entry.source || 'manual' })),
    ...exactMatches.map(({ sourceFile, ...entry }) => entry)
  ].map((entry) => {
    const detailKey = resolveDetailKeyForMapEntry(entry, detailsLookup);
    return detailKey ? { ...entry, detailKey } : entry;
  }).sort((a, b) => {
    const left = a.muskelfinderNames?.[0] || a.latinLabel || a.muscleKey || '';
    const right = b.muskelfinderNames?.[0] || b.latinLabel || b.muscleKey || '';
    return left.localeCompare(right, 'de');
  });

  const generatedMap = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'scripts/build-muskelfinder-map.js',
    manualSource: path.basename(manualSourceFile),
    summary: {
      manualEntries: manualEntries.length,
      generatedExactEntries: exactMatches.length,
      totalEntries: generatedEntries.length
    },
    entries: generatedEntries
  };

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'scripts/build-muskelfinder-map.js',
    summary: {
      muskelfinderMuscles: muscles.length,
      metaMuscleEntries: indexes.muscles.length,
      manualEntries: manualEntries.length,
      exactMatches: exactMatches.length,
      ambiguousMatches: ambiguousMatches.length,
      missingMatches: missingMatches.length,
      autoCoveragePercent: muscles.length
        ? Number((((manualEntries.length + exactMatches.length) / muscles.length) * 100).toFixed(1))
        : 0
    },
    exactMatches,
    ambiguousMatches,
    missingMatches
  };

  const detailsPayload = buildDetailsPayload(muscles, generatedEntries);

  writeJson(MAP_FILE, generatedMap);
  writeJson(GENERATED_MAP_FILE, generatedMap);
  writeJson(REPORT_FILE, report);
  writeJson(DETAILS_FILE, detailsPayload);

  console.log('✅ Muskelfinder-Mapping ausgewertet');
  console.log(`   Muskelfinder-Muskeln: ${report.summary.muskelfinderMuscles}`);
  console.log(`   Manuelle Eintraege:   ${report.summary.manualEntries}`);
  console.log(`   Exakte Treffer:       ${report.summary.exactMatches}`);
  console.log(`   Mehrdeutig:           ${report.summary.ambiguousMatches}`);
  console.log(`   Fehlend:              ${report.summary.missingMatches}`);
  console.log(`   Autom. Abdeckung:     ${report.summary.autoCoveragePercent}%`);
  console.log(`\n   Datei: ${path.relative(ROOT_DIR, MAP_FILE)}`);
  console.log(`   Datei: ${path.relative(ROOT_DIR, GENERATED_MAP_FILE)}`);
  console.log(`   Datei: ${path.relative(ROOT_DIR, REPORT_FILE)}`);
  console.log(`   Datei: ${path.relative(ROOT_DIR, DETAILS_FILE)}`);
}

try {
  main();
} catch (error) {
  console.error('❌ build-muskelfinder-map fehlgeschlagen:', error.message);
  process.exitCode = 1;
}
