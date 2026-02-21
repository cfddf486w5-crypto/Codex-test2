const DB_NAME = 'dlwms_ia_ultimate';
const DB_VERSION = 2;
const LOCAL_VERSION = 'v2';
const STORES = [
  'rules', 'weights', 'vectors', 'decisions', 'stats', 'preferences', 'thresholds',
  'datasets', 'requests', 'excelRows', 'excelColumns', 'voiceCommands', 'palettes',
];

let dbPromise;
const localWriteQueue = new Map();
let flushTimer;

export function initDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          const s = db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
          s.createIndex('updatedAt', 'updatedAt');
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode = 'readonly') {
  return initDB().then((db) => db.transaction(store, mode).objectStore(store));
}

export async function putRecord(store, value) {
  const payload = { ...value, updatedAt: Date.now() };
  const os = await tx(store, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.put(payload);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(store) {
  const os = await tx(store);
  return new Promise((resolve, reject) => {
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(store) {
  const os = await tx(store, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function exportAllData() {
  const exportObj = { meta: { db: DB_NAME, version: DB_VERSION, exportedAt: Date.now() } };
  for (const store of STORES) exportObj[store] = await getAll(store);
  return exportObj;
}

export async function importAllData(data) {
  for (const store of STORES) {
    await clearStore(store);
    if (Array.isArray(data[store])) {
      for (const item of data[store]) await putRecord(store, item);
    }
  }
}

function safeJSONParse(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function validateShape(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return true;
  return typeof value === 'object' || ['string', 'number', 'boolean'].includes(typeof value);
}

function flushLocalQueue() {
  flushTimer = null;
  for (const [key, value] of localWriteQueue.entries()) {
    try {
      localStorage.setItem(key, JSON.stringify({ version: LOCAL_VERSION, value }));
      localWriteQueue.delete(key);
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        localStorage.setItem('storage_diag', JSON.stringify({
          ts: Date.now(),
          error: 'QuotaExceededError',
          pending: [...localWriteQueue.keys()],
        }));
      }
      break;
    }
  }
}

export function getConfig(key, fallback = null) {
  const payload = safeJSONParse(localStorage.getItem(key), null);
  if (!payload) return fallback;
  if (payload.version && validateShape(payload.value)) return payload.value;
  if (validateShape(payload)) return payload;
  return fallback;
}

export function setConfig(key, value) {
  localWriteQueue.set(key, value);
  if (flushTimer) return;
  flushTimer = setTimeout(flushLocalQueue, 120);
}

export function flushConfigWrites() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushLocalQueue();
  }
}
