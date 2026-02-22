import { putEntity, getAllEntities, removeEntity } from './ai_store.js';

const DEBUG_STORE = 'debug_logs';

export async function logDecision(entry) {
  const payload = { ...entry, ts: new Date().toISOString() };
  await putEntity(DEBUG_STORE, payload);
  return payload;
}

export async function listDebugLogs(limit = 100) {
  const all = await getAllEntities(DEBUG_STORE);
  return all.sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, limit);
}

export async function clearDebugLogs() {
  const all = await getAllEntities(DEBUG_STORE);
  await Promise.all(all.map((it) => removeEntity(DEBUG_STORE, it.id)));
}
