// src/utils/rolePackingConfig.js

export const ROLE_PROMPTS = {
  LEADER: [
    { label: 'All permits confirmed?', type: 'checkbox', critical: true },
    { label: 'Squad readiness checked?', type: 'checkbox', critical: true },
    { label: 'Emergency contacts distributed?', type: 'checkbox', critical: false },
  ],
  SCOUT: [
    { label: 'Power bank charged?', type: 'checkbox', critical: true },
    { label: 'Local SIM acquired?', type: 'checkbox', critical: false },
    { label: 'Offline maps downloaded?', type: 'checkbox', critical: true },
    { label: 'Navigation device charged?', type: 'checkbox', critical: true },
  ],
  MEDIC: [
    { label: 'First aid kit expiry date', type: 'date', critical: true },
    { label: 'Medication expiry date', type: 'date', critical: true },
    { label: 'Local emergency number saved?', type: 'checkbox', critical: true },
    { label: 'Allergy list shared with squad?', type: 'checkbox', critical: false },
  ],
};
