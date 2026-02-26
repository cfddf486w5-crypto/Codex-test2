const DEFAULT_FLAGS = {
  pdf: true,
  ia_chat: true,
  split_bins_max: 3,
  palettes_est: true,
  debug_rejected_moves: false,
};

const DEFAULT_ENV = {
  API_BASE_URL: '',
  APP_VERSION: 'dev',
  BUILD_DATE: 'dev',
  FEATURE_FLAGS: { ...DEFAULT_FLAGS },
  BACKEND_ENABLED: false,
};

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getWindowEnv() {
  const scope = typeof window !== 'undefined' ? window : {};
  return scope.__DLWMS_ENV__ || {};
}

export function loadRuntimeConfig(storage = localStorage) {
  const env = getWindowEnv();
  const persisted = safeParseJson(storage?.getItem?.('DLWMS_RUNTIME_CONFIG_V1'), {});
  const resolved = {
    API_BASE_URL: String(env.API_BASE_URL ?? persisted.API_BASE_URL ?? DEFAULT_ENV.API_BASE_URL),
    APP_VERSION: String(env.APP_VERSION ?? persisted.APP_VERSION ?? DEFAULT_ENV.APP_VERSION),
    BUILD_DATE: String(env.BUILD_DATE ?? persisted.BUILD_DATE ?? DEFAULT_ENV.BUILD_DATE),
    FEATURE_FLAGS: {
      ...DEFAULT_FLAGS,
      ...safeParseJson(env.FEATURE_FLAGS, env.FEATURE_FLAGS || {}),
      ...(persisted.FEATURE_FLAGS || {}),
    },
  };
  resolved.BACKEND_ENABLED = Boolean(resolved.API_BASE_URL);
  return resolved;
}

export function saveFeatureFlags(nextFlags, storage = localStorage) {
  const current = loadRuntimeConfig(storage);
  const payload = {
    ...current,
    FEATURE_FLAGS: {
      ...current.FEATURE_FLAGS,
      ...(nextFlags || {}),
    },
  };
  storage?.setItem?.('DLWMS_RUNTIME_CONFIG_V1', JSON.stringify(payload));
  return payload.FEATURE_FLAGS;
}

export function getFeatureFlags(storage = localStorage) {
  return loadRuntimeConfig(storage).FEATURE_FLAGS;
}
