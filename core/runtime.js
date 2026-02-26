const RUNTIME_LOG_KEY = 'DLWMS_RUNTIME_LOG_BUFFER_V1';
const DIAG_TOGGLE_KEY = 'DLWMS_DIAGNOSTICS_ENABLED_V1';
const LAST_IMPORT_KEY = 'DLWMS_LAST_IMPORT_META_V1';
const MAX_LOGS = 200;

const state = {
  logs: [],
  errors: [],
  diagnosticsEnabled: false,
  syncInProgress: false,
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function persistLogs() {
  try {
    localStorage.setItem(RUNTIME_LOG_KEY, JSON.stringify(state.logs.slice(0, MAX_LOGS)));
  } catch {
    // best effort
  }
}

function pushLog(level, message, meta = {}) {
  const row = { level, message: String(message || ''), meta, at: nowIso() };
  state.logs.unshift(row);
  if (level === 'error') state.errors.unshift(row);
  state.logs = state.logs.slice(0, MAX_LOGS);
  state.errors = state.errors.slice(0, 30);
  persistLogs();
  return row;
}

export const runtimeLogger = {
  info(message, meta) { return pushLog('info', message, meta); },
  warn(message, meta) { return pushLog('warn', message, meta); },
  error(message, meta) { return pushLog('error', message, meta); },
  exportJson() { return JSON.stringify({ logs: state.logs, exportedAt: nowIso() }, null, 2); },
  getErrors() { return [...state.errors]; },
};

export function markLastImport(meta) {
  const payload = {
    fileName: meta?.fileName || 'unknown',
    rows: Number(meta?.rows || 0),
    at: nowIso(),
  };
  localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(payload));
}

function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    runtimeLogger.error(event.message || 'window.error', {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || 'Unhandled rejection');
    runtimeLogger.error(reason, { type: 'unhandledrejection' });
  });
}

function estimateStorageBytes() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || '';
    const value = localStorage.getItem(key) || '';
    bytes += key.length + value.length;
  }
  return bytes * 2;
}

export function setSyncState(active) {
  state.syncInProgress = Boolean(active);
}

export function getDiagnosticsSnapshot() {
  const lastImport = safeJsonParse(localStorage.getItem(LAST_IMPORT_KEY), null);
  return {
    appVersion: document.documentElement.dataset.uiVersion || 'unknown',
    buildDate: document.documentElement.dataset.buildDate || 'dev',
    diagnosticsEnabled: state.diagnosticsEnabled,
    online: navigator.onLine,
    syncInProgress: state.syncInProgress,
    storageBytes: estimateStorageBytes(),
    lastImport,
    recentErrors: runtimeLogger.getErrors().slice(0, 5),
  };
}

export function bindDiagnosticsPanel() {
  const toggle = document.getElementById('settingsDiagnosticsToggle');
  const refreshBtn = document.getElementById('settingsDiagnosticsRefresh');
  const copyBtn = document.getElementById('settingsDiagnosticsCopy');
  const exportBtn = document.getElementById('settingsDiagnosticsExportLogs');
  const panel = document.getElementById('settingsDiagnosticsPanel');

  if (!toggle || !panel) return;

  state.diagnosticsEnabled = localStorage.getItem(DIAG_TOGGLE_KEY) === '1';
  toggle.checked = state.diagnosticsEnabled;

  const render = () => {
    const diag = getDiagnosticsSnapshot();
    panel.hidden = !state.diagnosticsEnabled;
    panel.textContent = JSON.stringify(diag, null, 2);
  };

  toggle.addEventListener('change', () => {
    state.diagnosticsEnabled = toggle.checked;
    localStorage.setItem(DIAG_TOGGLE_KEY, state.diagnosticsEnabled ? '1' : '0');
    runtimeLogger.info('diagnostics.toggle', { enabled: state.diagnosticsEnabled });
    render();
  });

  refreshBtn?.addEventListener('click', render);
  copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(panel.textContent || '{}');
    runtimeLogger.info('diagnostics.copy');
  });
  exportBtn?.addEventListener('click', () => {
    const blob = new Blob([runtimeLogger.exportJson()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dlwms-runtime-logs.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  render();
}

export function initRuntimeCore() {
  state.logs = safeJsonParse(localStorage.getItem(RUNTIME_LOG_KEY), []);
  installGlobalErrorHandlers();
  runtimeLogger.info('runtime.init');
}
