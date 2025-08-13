// analyze-deps.js
// Liest deps.json (madge) und file_sizes/lines und druckt eine kompakte Diagnose.

const fs = require('fs');

// Rohdaten lesen
const rawDeps = JSON.parse(fs.readFileSync('deps.json', 'utf8')); // { "file": ["import1","import2", ...] }

// Pfade vereinheitlichen: führende "./" entfernen und "js/" abschneiden
function normalize(p) {
    return String(p || '').replace(/^\.?\/*/, '').replace(/^js\//, '');
}

// deps.json normalisieren (Keys und Werte)
const deps = Object.fromEntries(
    Object.entries(rawDeps).map(([k, arr]) => [normalize(k), (arr || []).map(normalize)])
);

// CSV-Helfer
function readCsv(path) {
    const map = new Map();
    if (!fs.existsSync(path)) return map;
    for (const line of fs.readFileSync(path, 'utf8').trim().split('\n')) {
        const [file, val] = line.split(',');
        map.set(file, Number(val));
    }
    return map;
}

// Map normalisieren
function toNormMap(m) {
    const out = new Map();
    for (const [k, v] of m.entries()) out.set(normalize(k), v);
    return out;
}

const sizes = toNormMap(readCsv('file_sizes.csv'));  // bytes
const lines = toNormMap(readCsv('file_lines.csv'));  // loc

// In-/Out-Degree berechnen
const files = new Set(Object.keys(deps));
for (const arr of Object.values(deps)) arr.forEach(f => files.add(normalize(f)));

const outDeg = new Map(); // file -> number of imports
const inDeg = new Map(); // file -> number of dependents
for (const f of files) { outDeg.set(f, 0); inDeg.set(f, 0); }
for (const [f, imps] of Object.entries(deps)) {
    outDeg.set(f, imps.length);
    imps.forEach(t => inDeg.set(t, (inDeg.get(t) || 0) + 1));
}

// Orphans (niemand importiert sie, aber sie importieren evtl. andere)
const orphans = [...files].filter(f => (inDeg.get(f) || 0) === 0);

// Hubs (viele Abnehmer / viele Importe)
function top(map, n = 10) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([f, v]) => ({ file: f, count: v, loc: lines.get(f) || 0, bytes: sizes.get(f) || 0 }));
}

// Zyklen finden
function findCycles(graph) {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map([...files].map(f => [f, WHITE]));
    const stack = [];
    const cycles = [];

    function dfs(u) {
        color.set(u, GRAY);
        stack.push(u);
        for (const v of graph[u] || []) {
            if (!files.has(v)) continue;
            const c = color.get(v);
            if (c === GRAY) {
                const i = stack.lastIndexOf(v);
                if (i >= 0) cycles.push(stack.slice(i).concat(v));
            } else if (c === WHITE) dfs(v);
        }
        stack.pop();
        color.set(u, BLACK);
    }

    for (const f of files) if (color.get(f) === WHITE) dfs(f);
    const sig = s => s.join('->');
    const uniq = new Map();
    for (const c of cycles) uniq.set(sig(c), c);
    return [...uniq.values()];
}

const cycles = findCycles(deps);

// Ausgabe
console.log('=== TOP IN-DEG (viele Abnehmer) ===');
console.table(top(inDeg, 10));
console.log('=== TOP OUT-DEG (viele Importe) ===');
console.table(top(outDeg, 10));

console.log('=== ORPHANS (keiner importiert) ===');
console.log(orphans.slice(0, 20));

console.log('=== CYCLES ===');
for (const c of cycles.slice(0, 10)) console.log('•', c.join('  →  '));

console.log('=== GROSSE DATEIEN (>300 LOC oder >50 KB) ===');
const big = [...files].filter(f => (lines.get(f) || 0) > 300 || (sizes.get(f) || 0) > 50_000);
console.log(big);
