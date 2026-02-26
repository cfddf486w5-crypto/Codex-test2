import { getDiagnosticsSnapshot } from '../../core/runtime.js';
import { loadRuntimeConfig } from './runtime-config.js';
import { listOperations } from './offline-queue.js';

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function getHealthStatus() {
  const runtime = loadRuntimeConfig();
  const local = {
    status: 'local-ok',
    version: runtime.APP_VERSION,
    buildDate: runtime.BUILD_DATE,
    dbReady: true,
    lastSyncAt: localStorage.getItem('DLWMS_LAST_SYNC_AT') || null,
    queueDepth: listOperations().filter((item) => item.status !== 'sent').length,
    mode: 'offline-fallback',
    diagnostics: getDiagnosticsSnapshot(),
  };

  if (!runtime.BACKEND_ENABLED || !navigator.onLine) return local;
  try {
    const remote = await fetchJson(`${runtime.API_BASE_URL}/api/health`);
    return { ...local, ...remote, mode: 'backend' };
  } catch {
    return local;
  }
}

export async function getServerTime() {
  const runtime = loadRuntimeConfig();
  if (!runtime.BACKEND_ENABLED || !navigator.onLine) {
    return { source: 'local', iso: new Date().toISOString() };
  }
  try {
    const remote = await fetchJson(`${runtime.API_BASE_URL}/api/time`);
    return { source: 'server', ...remote };
  } catch {
    return { source: 'local-fallback', iso: new Date().toISOString() };
  }
}
