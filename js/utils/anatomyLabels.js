const SIDE_TO_LATIN = {
    left: 'sinister',
    right: 'dexter'
};

const GROUP_TO_GENERIC_LATIN = {
    arteries: 'Arteria',
    bones: 'Os',
    brain: 'Structura encephali',
    cartilage: 'Cartilago',
    ear: 'Structura auris',
    eyes: 'Structura oculi',
    glands: 'Glandula',
    heart: 'Structura cordis',
    ligaments: 'Ligamentum',
    lungs: 'Structura pulmonis',
    muscles: 'Musculus',
    nerves: 'Nervus',
    organs: 'Organum',
    skin_hair: 'Structura cutis',
    teeth: 'Dens',
    veins: 'Vena'
};

const LATIN_SIDE_SUFFIX_PATTERN = /^(.*?)(?:\s+(dexter|sinister|dextra|sinistra|dextrum|sinistrum))(\s*\(.+\))?$/i;

const ORDINAL_TO_ROMAN = {
    first: 'I',
    second: 'II',
    third: 'III',
    fourth: 'IV',
    fifth: 'V',
    sixth: 'VI',
    seventh: 'VII',
    eighth: 'VIII',
    ninth: 'IX',
    tenth: 'X',
    eleventh: 'XI'
};

const HEAD_ADJECTIVE_TO_LATIN = {
    humeral: 'humerale',
    lateralis: 'laterale',
    long: 'longum',
    medial: 'mediale',
    medialis: 'mediale',
    oblique: 'obliquum',
    short: 'breve',
    transverse: 'transversum'
};

function normalizeText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
}

function unwrapEntry(source) {
    if (!source || typeof source !== 'object') return null;
    if (source.labels || source.classification || source.id || source.latinLabel) return source;
    if (source.userData?.meta) return source.userData.meta;
    if (source.userData?.entry) return source.userData.entry;
    if (source.entry && typeof source.entry === 'object') return source.entry;
    if (source.meta && typeof source.meta === 'object' && (source.meta.labels || source.meta.classification || source.meta.id)) {
        return source.meta;
    }
    return source;
}

function getEntryGroup(entry) {
    return normalizeText(entry?.classification?.group || entry?.group).toLowerCase();
}

function stripEnglishSide(value = '') {
    return normalizeText(value)
        .replace(/^(left|right)\s+/i, '')
        .replace(/\bof\s+(left|right)\s+/gi, 'of ')
        .replace(/\b(left|right)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasLatinSide(value = '') {
    return /\b(dexter|sinister|dextra|sinistra|dextrum|sinistrum)\b/i.test(value);
}

function appendLatinSide(label, source) {
    const cleaned = normalizeText(label);
    const latinSide = getLatinSideLabel(source);
    if (!cleaned || !latinSide || hasLatinSide(cleaned)) {
        return cleaned;
    }
    return `${cleaned} ${latinSide}`;
}

function inferSideFromText(value = '') {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return '';
    if (/\b(right|rechts|dexter|dextra|dextrum)\b/.test(normalized)) return 'right';
    if (/\b(left|links|sinister|sinistra|sinistrum)\b/.test(normalized)) return 'left';
    return '';
}

function cleanupPseudoLatinLabel(value = '') {
    let label = normalizeText(value);
    if (!label) return '';

    label = label
        .replace(/^Musculus set of (levatores costarum (?:breves|longi))$/i, 'Musculi $1')
        .replace(/^Musculus (humeral|lateralis|medialis|long|short|oblique|transverse) head of (.+)$/i, (_, adjective, structure) => {
            const latinAdjective = HEAD_ADJECTIVE_TO_LATIN[String(adjective).toLowerCase()] || adjective;
            return `Musculus ${normalizeText(structure)} caput ${latinAdjective}`;
        })
        .replace(/\bof hand\b/gi, 'manus')
        .replace(/\bof foot\b/gi, 'pedis');

    return normalizeText(label);
}

function buildToothLatinLabel(english = '') {
    const base = stripEnglishSide(english);
    if (!base) return '';

    const toothTypeMap = {
        molar: 'molaris',
        premolar: 'praemolaris'
    };
    const jawMap = {
        lower: 'inferior',
        upper: 'superior'
    };
    const incisorPositionMap = {
        central: 'centralis',
        lateral: 'lateralis'
    };
    const toothOrdinalMap = {
        first: 'primus',
        second: 'secundus'
    };

    if (base === 'Maxillary gingiva') return 'Gingiva maxillaris';
    if (base === 'Mandibular gingiva') return 'Gingiva mandibularis';

    let match = base.match(/^(first|second) (lower|upper) (molar|premolar) tooth$/i);
    if (match) {
        const [, ordinal, jaw, type] = match;
        return `Dens ${toothTypeMap[type.toLowerCase()]} ${toothOrdinalMap[ordinal.toLowerCase()]} ${jawMap[jaw.toLowerCase()]}`;
    }

    match = base.match(/^(lower|upper) (central|lateral) incisor tooth$/i);
    if (match) {
        const [, jaw, position] = match;
        return `Dens incisivus ${incisorPositionMap[position.toLowerCase()]} ${jawMap[jaw.toLowerCase()]}`;
    }

    match = base.match(/^(lower|upper) canine tooth$/i);
    if (match) {
        const [, jaw] = match;
        return `Dens caninus ${jawMap[jaw.toLowerCase()]}`;
    }

    return '';
}

function buildBoneLatinLabel(english = '') {
    const base = stripEnglishSide(english);
    if (/^Sesamoid bone of foot$/i.test(base)) {
        return 'Os sesamoideum pedis';
    }
    return '';
}

function buildCartilageLatinLabel(english = '') {
    const base = stripEnglishSide(english);
    if (!base) return '';

    const exactMap = {
        'aryepiglotticus': 'Musculus aryepiglotticus',
        'arytenoid cartilage': 'Cartilago arytaenoidea',
        'conus elasticus': 'Conus elasticus',
        'corniculate cartilage': 'Cartilago corniculata',
        'cricoid cartilage': 'Cartilago cricoidea',
        'cuneiform cartilage': 'Cartilago cuneiformis',
        'hyo-epiglottic ligament': 'Ligamentum hyoepiglotticum',
        'intervertebral disk': 'Discus intervertebralis',
        'intervertebral disk of axis': 'Discus intervertebralis axis',
        'thyro-epiglottic ligament': 'Ligamentum thyroepiglotticum',
        'thyrohyoid membrane': 'Membrana thyrohyoidea',
        'thyroid cartilage': 'Cartilago thyroidea'
    };

    const exactHit = exactMap[base.toLowerCase()];
    if (exactHit) return exactHit;

    let match = base.match(/^(first|second|third|fourth|fifth|sixth|seventh) costal cartilage$/i);
    if (match) {
        const [, ordinal] = match;
        return `Cartilago costalis ${ORDINAL_TO_ROMAN[ordinal.toLowerCase()]}`;
    }

    match = base.match(/^Intervertebral disk of (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh) (cervical|thoracic|lumbar) vertebra$/i);
    if (match) {
        const [, ordinal, region] = match;
        const regionMap = {
            cervical: 'cervicalis',
            lumbar: 'lumbalis',
            thoracic: 'thoracicae'
        };
        return `Discus intervertebralis vertebrae ${regionMap[region.toLowerCase()]} ${ORDINAL_TO_ROMAN[ordinal.toLowerCase()]}`;
    }

    return '';
}

function buildLatinFromEnglish(entry) {
    const english = normalizeText(entry?.labels?.en || entry?.label || '');
    if (!english) return '';

    switch (getEntryGroup(entry)) {
        case 'bones':
            return buildBoneLatinLabel(english);
        case 'cartilage':
            return buildCartilageLatinLabel(english);
        case 'teeth':
            return buildToothLatinLabel(english);
        default:
            return '';
    }
}

export function inferStructureSide(source) {
    const entry = unwrapEntry(source);
    if (!entry) return '';

    const candidates = [
        entry?.classification?.side,
        entry?.side,
        entry?.labels?.la,
        entry?.labels?.en,
        entry?.labels?.de,
        entry?.label,
        entry?.name
    ];

    for (const candidate of candidates) {
        const side = inferSideFromText(candidate);
        if (side) return side;
    }

    return '';
}

export function getLatinSideLabel(source) {
    const side = inferStructureSide(source);
    return SIDE_TO_LATIN[side] || '';
}

export function getStructureDisplayLabel(source) {
    const entry = unwrapEntry(source);
    if (!entry) return 'Structura anatomica';

    const cleanedLatin = cleanupPseudoLatinLabel(entry?.labels?.la || entry?.latinLabel || '');
    if (cleanedLatin) {
        return appendLatinSide(cleanedLatin, entry);
    }

    const synthesizedLatin = buildLatinFromEnglish(entry);
    if (synthesizedLatin) {
        return appendLatinSide(synthesizedLatin, entry);
    }

    const genericLabel = GROUP_TO_GENERIC_LATIN[getEntryGroup(entry)] || 'Structura anatomica';
    const identifier = normalizeText(entry?.id || entry?.fma || entry?.info?.links?.fma || '');
    const withSide = appendLatinSide(genericLabel, entry);
    return identifier ? `${withSide} (${identifier})` : withSide;
}

function splitStructureLabel(label = '') {
    const normalized = normalizeText(label);
    const match = normalized.match(LATIN_SIDE_SUFFIX_PATTERN);
    if (!match) return null;

    const [, prefix = '', side = '', suffix = ''] = match;
    if (!prefix || !side) return null;

    return {
        prefix: normalizeText(prefix),
        side: normalizeText(side),
        suffix: suffix || ''
    };
}

export function renderStructureLabel(target, source) {
    if (!target) return '';

    const label = typeof source === 'string'
        ? normalizeText(source)
        : getStructureDisplayLabel(source);

    target.replaceChildren();

    const split = splitStructureLabel(label);
    if (!split) {
        target.textContent = label;
        return label;
    }

    target.appendChild(document.createTextNode(`${split.prefix} `));

    const side = document.createElement('span');
    side.className = 'anatomy-side-label';
    side.textContent = split.side;
    target.appendChild(side);

    if (split.suffix) {
        target.appendChild(document.createTextNode(split.suffix));
    }

    return label;
}

export function decorateStructureEntry(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    const label = getStructureDisplayLabel(entry);
    entry.label = label;
    entry.displayLabel = label;
    return entry;
}

export function getStructureSearchText(source) {
    const entry = unwrapEntry(source);
    if (!entry) return '';

    return [
        entry?.label,
        entry?.displayLabel,
        entry?.labels?.la,
        entry?.labels?.en,
        entry?.labels?.de,
        entry?.id,
        entry?.fma,
        entry?.info?.links?.fma
    ]
        .map((value) => normalizeText(value).toLowerCase())
        .filter(Boolean)
        .join(' ');
}
