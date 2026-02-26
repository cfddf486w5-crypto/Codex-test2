const KEY = 'DLWMS_OPLOG_V1';
const MAX_ITEMS = 5000;

function read(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items, storage = localStorage) {
  const normalized = items.slice(0, MAX_ITEMS);
  storage.setItem(KEY, JSON.stringify(normalized));
  return normalized;
}

export function enqueueOperation(type, payload, storage = localStorage) {
  const queue = read(storage);
  queue.unshift({
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    type: String(type || 'unknown'),
    payload: payload || {},
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
  return write(queue, storage)[0];
}

export function listOperations(storage = localStorage) {
  return read(storage);
}

export function updateOperationStatus(id, status, error, storage = localStorage) {
  const queue = read(storage);
  const next = queue.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      status,
      error: error ? String(error) : undefined,
      updatedAt: new Date().toISOString(),
    };
  });
  write(next, storage);
}

export async function flushQueue({ sender, storage = localStorage, onProgress } = {}) {
  if (typeof sender !== 'function') return { sent: 0, errors: 0 };
  const queue = read(storage);
  let sent = 0;
  let errors = 0;

  for (const item of queue) {
    if (item.status !== 'pending' && item.status !== 'error') continue;
    try {
      await sender(item);
      updateOperationStatus(item.id, 'sent', null, storage);
      sent += 1;
      onProgress?.({ ...item, status: 'sent' });
    } catch (error) {
      updateOperationStatus(item.id, 'error', error?.message || String(error), storage);
      errors += 1;
      onProgress?.({ ...item, status: 'error' });
    }
  }

  return { sent, errors };
}
