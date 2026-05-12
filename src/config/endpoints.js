// Routing + elevation provider endpoints. Override via Vite env vars (VITE_BROUTER_URL, etc.)
// FOSSGIS public instances — no SLA. Plan to self-host post-launch.
export const ENDPOINTS = {
  brouter: import.meta.env.VITE_BROUTER_URL ?? 'https://brouter.de/brouter',
  valhalla: import.meta.env.VITE_VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de/route',
  openElevation: import.meta.env.VITE_OPEN_ELEVATION_URL ?? 'https://api.open-elevation.com/api/v1/lookup',
  openTopoData: import.meta.env.VITE_OPENTOPODATA_URL ?? 'https://api.opentopodata.org/v1/srtm30m',
};

export const BROUTER_PROFILES = {
  foot:    'hiking-mountain',
  cycling: 'trekking',
  mtb:     'mtb',
};
export const VALHALLA_PROFILES = {
  car:  'auto',
  boat: 'pedestrian', // Valhalla has no boat profile; placeholder until we add manual mode
};
