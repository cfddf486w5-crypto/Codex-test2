const DB_NAME = 'dlwms_ai_db';
const DB_VERSION = 2;
const FALLBACK_KEY = 'dlwms_ai_fallback';

export const STORES = [
  'rules',
  'sops',
  'faqs',
  'examples',
  'docs',
  'chunks',
  'feedback',
  'chat_history',
  'datasets',
  'meta',
  'debug_logs',
];

let dbPromise;

const canUseIndexedDB = () => typeof indexedDB !== 'undefined';
const nowIso = () => new Date().toISOString();
const makeId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function loadFallback() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveFallback(data) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
}

export async function initStore() {
  if (!canUseIndexedDB()) return { mode: 'localStorage' };
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  await dbPromise;
  return { mode: 'indexedDB' };
}

async function withStore(storeName, mode = 'readonly') {
  const db = await dbPromise;
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function putEntity(store, entity) {
  const record = { createdAt: nowIso(), updatedAt: nowIso(), ...entity };
  if (!record.id) record.id = makeId();
  if (!canUseIndexedDB()) {
    const fallback = loadFallback();
    fallback[store] = fallback[store] || {};
    fallback[store][record.id] = record;
    saveFallback(fallback);
    return record;
  }
  const objectStore = await withStore(store, 'readwrite');
  await new Promise((resolve, reject) => {
    const req = objectStore.put(record);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  return record;
}

export async function getAllEntities(store) {
  if (!canUseIndexedDB()) {
    const fallback = loadFallback();
    return Object.values(fallback[store] || {});
  }
  const objectStore = await withStore(store);
  return new Promise((resolve, reject) => {
    const req = objectStore.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeEntity(store, id) {
  if (!canUseIndexedDB()) {
    const fallback = loadFallback();
    if (fallback[store]) delete fallback[store][id];
    saveFallback(fallback);
    return true;
  }
  const objectStore = await withStore(store, 'readwrite');
  await new Promise((resolve, reject) => {
    const req = objectStore.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  return true;
}

export async function saveMeta(key, value) {
  return putEntity('meta', { id: key, value, updatedAt: nowIso() });
}

export async function getMeta(key, defaultValue = null) {
  const all = await getAllEntities('meta');
  return all.find((item) => item.id === key)?.value ?? defaultValue;
}
