// civil-engineer: defines PE inspection fields and structural detection helpers
module.exports = {
  name: 'civil-engineer',
  intervalMs: 1000 * 60 * 60 * 24,
  staleAfterMs: 1000 * 60 * 60 * 24 * 7,
  PE_FIELDS: [
    'installation_date',
    'pile_manufacturer',
    'installation_contractor',
    'equipment_id',
    'min_allowable_torque',
    'max_allowable_torque',
    'shaft_diameter',
    'helix_configuration',
    'actual_tip_embedment',
    'actual_installation_torque',
    'ultimate_capacity',
    'allowable_capacity'
  ],
  structuralKeywords: ['load', 'capacity', 'torque', 'embedment', 'helix', 'bearing', 'sagging', 'sinkhole', 'settlement'],
  isStructuralClaim(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    for (const k of module.exports.structuralKeywords) if (t.includes(k)) return true;
    return false;
  }
};
