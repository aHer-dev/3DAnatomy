export function setupLOD(model, camera) {
    const lod = new THREE.LOD();

    // Hohe Qualität (nah)
    lod.addLevel(model, 0);

    // Mittlere Qualität (mittel)
    const mediumModel = simplifyModel(model, 0.5);
    lod.addLevel(mediumModel, 50);

    // Niedrige Qualität (fern)
    const lowModel = simplifyModel(model, 0.2);
    lod.addLevel(lowModel, 100);

    return lod;
}

function simplifyModel(model, factor) {
    // Vereinfachte Version des Modells
    const simplified = model.clone();
    simplified.traverse(child => {
        if (child.geometry) {
            // Reduziere Vertices
            const positions = child.geometry.attributes.position;
            const newPositions = new Float32Array(Math.floor(positions.count * factor) * 3);
            // ... Vereinfachungslogik
        }
    });
    return simplified;
}