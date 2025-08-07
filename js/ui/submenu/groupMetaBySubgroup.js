// js/ui/submenu/groupMetaBySubgroup.js
/**
 * Gruppiert Meta-Einträge nach ihrer Subgruppe innerhalb einer anatomischen Gruppe.
 * @param {Array} meta – vollständige Metadaten
 * @param {string} group – Gruppenname (z. B. "muscles")
 * @returns {Object} – { [subgroupName]: [entry1, entry2, ...] }
 */
export function groupMetaBySubgroup(meta, group) {
    const grouped = {};

    meta
        .filter(entry => entry.group === group)
        .forEach(entry => {
            const sub = entry.subgroup || 'Allgemein';
            if (!grouped[sub]) grouped[sub] = [];
            grouped[sub].push(entry);
        });

    return grouped;
}
