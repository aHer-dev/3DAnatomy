module.exports = {
    options: {
        doNotFollow: { path: 'node_modules' },
        exclude: { path: 'node_modules|three.module.js' },
        reporterOptions: { dot: { collapsePattern: '^(js/)?(core|features|modelLoader|ui|bootstrap)/' } }
    },
    forbidden: [
        // keine Rückimporte nach oben
        {
            name: 'ui-not-imported-by-lower', severity: 'error',
            from: { path: '^js/(core|modelLoader|features)/' },
            to: { path: '^js/ui/' }
        },
        {
            name: 'features-not-imported-by-lower', severity: 'error',
            from: { path: '^js/(core|modelLoader)/' },
            to: { path: '^js/features/' }
        },
        {
            name: 'modelLoader-not-imported-by-core', severity: 'error',
            from: { path: '^js/core/' },
            to: { path: '^js/modelLoader/' }
        },

        // Verbot: Barrels, die „nach oben“ re-exportieren
        {
            name: 'no-cross-layer-reexport', severity: 'error',
            from: { path: '^js/modelLoader/index\\.js$' },
            to: { path: '^js/features/' }
        },

        // harte Verbote: Zyklen & unbekannte
        { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
        { name: 'no-orphan', severity: 'warn', from: { orphan: true }, to: {} }
    ]
};
