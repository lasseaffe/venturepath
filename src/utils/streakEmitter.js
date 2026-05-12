import { emitCrossApp } from './crossAppEmitter.js';

const HF_STREAK_URL = 'http://localhost:3000/api/streak/tick';

export function emitLegConfirmed({ legId } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'leg_confirmed', metadata: { legId } });
}

export function emitCampPitched({ stayId } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'camp_pitched', metadata: { stayId } });
}

export function emitExpeditionLogged({ tripName } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'expedition_logged', metadata: { tripName } });
}
