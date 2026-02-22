import { getMeta, saveMeta } from './ai_store.js';

export const PRIVACY_MODE = {
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
};

export async function getPrivacyMode() {
  return getMeta('privacy_mode', PRIVACY_MODE.OFFLINE);
}

export async function setPrivacyMode(mode) {
  if (!Object.values(PRIVACY_MODE).includes(mode)) throw new Error('Mode invalide');
  return saveMeta('privacy_mode', mode);
}

export function redactSensitive(text = '') {
  return text.replace(/\b\d{8,}\b/g, '[ID-MASQUE]').replace(/\b[A-Z]{2,5}-?\d{2,}\b/g, '[CODE-MASQUE]');
}
