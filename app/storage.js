const DB_NAME = 'dlwms_ia_ultimate';
const DB_VERSION = 1;
const STORES = [
  'rules',
  'weights',
  'vectors',
  'decisions',
  'stats',
  'preferences',
  'thresholds',
  'datasets',
];

let dbPromise;

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
  const exportObj = {};
  for (const store of STORES) exportObj[store] = await getAll(store);
  return exportObj;
}

export async function importAllData(data) {
  for (const store of STORES) {
    await clearStore(store);
    if (Array.isArray(data[store])) {
      for (const item of data[store]) {
        await putRecord(store, item);
      }
    }
  }
}

export function getConfig(key, fallback = null) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function setConfig(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
