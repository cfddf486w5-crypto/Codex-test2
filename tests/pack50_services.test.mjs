import assert from 'node:assert/strict';
import { loadRuntimeConfig, saveFeatureFlags } from '../app/services/runtime-config.js';
import { enqueueOperation, listOperations, updateOperationStatus } from '../app/services/offline-queue.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

globalThis.crypto ??= { randomUUID: () => 'uuid-test' };

const storage = createMemoryStorage();

const config = loadRuntimeConfig(storage);
assert.equal(config.APP_VERSION, 'dev');
assert.equal(config.FEATURE_FLAGS.pdf, true);

saveFeatureFlags({ pdf: false, ia_chat: false }, storage);
const configAfter = loadRuntimeConfig(storage);
assert.equal(configAfter.FEATURE_FLAGS.pdf, false);
assert.equal(configAfter.FEATURE_FLAGS.ia_chat, false);

const op = enqueueOperation('import.inventory', { rows: 10 }, storage);
assert.equal(op.status, 'pending');
assert.equal(listOperations(storage).length, 1);

updateOperationStatus(op.id, 'sent', null, storage);
assert.equal(listOperations(storage)[0].status, 'sent');

console.log('pack50_services.test.mjs: OK');
