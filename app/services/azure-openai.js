const AZURE_OPENAI_STORAGE_KEY = 'DLWMS_AZURE_OPENAI_V1';

const DEFAULT_AZURE_CFG = {
  endpoint: 'https://alexdam28-2806-resource.services.ai.azure.com',
  deployment: 'gpt-4.1',
  apiVersion: '2024-10-21',
  apiKey: '',
  systemPrompt: [
    'Tu es un assistant IA senior spécialisé WMS (entrepôt, réception, inventaire, qualité, sécurité, amélioration continue).',
    'Objectif: fournir des réponses concrètes, fiables, structurées et orientées action, en français clair.',
    'Méthode: 1) reformuler brièvement le besoin, 2) proposer un plan priorisé, 3) détailler les étapes opérationnelles, 4) finir par un contrôle qualité et risques.',
    'Quand utile, fournis tableaux, checklists et estimations (temps, impact, effort).',
    'Si une donnée manque, indique l’hypothèse retenue puis propose les informations à confirmer.',
  ].join('\n'),
  temperature: 0.2,
  maxTokens: 1400,
};

const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 1;
const MIN_MAX_TOKENS = 256;
const MAX_MAX_TOKENS = 4000;

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeEndpoint(value = '') {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.includes('/api/projects/')) return parsed.origin;
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function loadAzureOpenAiConfig(storage = localStorage) {
  const persisted = safeParseJson(storage?.getItem?.(AZURE_OPENAI_STORAGE_KEY), {});
  const temperature = Number(persisted.temperature);
  const maxTokens = Number(persisted.maxTokens);
  return {
    endpoint: normalizeEndpoint(persisted.endpoint ?? DEFAULT_AZURE_CFG.endpoint),
    deployment: String(persisted.deployment ?? DEFAULT_AZURE_CFG.deployment).trim(),
    apiVersion: String(persisted.apiVersion ?? DEFAULT_AZURE_CFG.apiVersion).trim() || DEFAULT_AZURE_CFG.apiVersion,
    apiKey: String(persisted.apiKey ?? DEFAULT_AZURE_CFG.apiKey),
    systemPrompt: String(persisted.systemPrompt ?? DEFAULT_AZURE_CFG.systemPrompt).trim() || DEFAULT_AZURE_CFG.systemPrompt,
    temperature: Number.isFinite(temperature) ? Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, temperature)) : DEFAULT_AZURE_CFG.temperature,
    maxTokens: Number.isFinite(maxTokens) ? Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(maxTokens))) : DEFAULT_AZURE_CFG.maxTokens,
  };
}

export function saveAzureOpenAiConfig(nextConfig, storage = localStorage) {
  const payload = {
    ...loadAzureOpenAiConfig(storage),
    ...(nextConfig || {}),
  };
  payload.endpoint = normalizeEndpoint(payload.endpoint);
  payload.deployment = String(payload.deployment || '').trim();
  payload.apiVersion = String(payload.apiVersion || DEFAULT_AZURE_CFG.apiVersion).trim();
  payload.apiKey = String(payload.apiKey || '');
  payload.systemPrompt = String(payload.systemPrompt || DEFAULT_AZURE_CFG.systemPrompt).trim() || DEFAULT_AZURE_CFG.systemPrompt;
  payload.temperature = Number.isFinite(Number(payload.temperature))
    ? Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, Number(payload.temperature)))
    : DEFAULT_AZURE_CFG.temperature;
  payload.maxTokens = Number.isFinite(Number(payload.maxTokens))
    ? Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(Number(payload.maxTokens))))
    : DEFAULT_AZURE_CFG.maxTokens;
  storage?.setItem?.(AZURE_OPENAI_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

function assertAzureConfig(config) {
  if (!config.endpoint) throw new Error('Endpoint Azure manquant.');
  if (!config.deployment) throw new Error('Deployment Azure manquant.');
  if (!config.apiVersion) throw new Error('Version API Azure manquante.');
  if (!config.apiKey) throw new Error('API key Azure manquante.');
}



function normalizeMessageContent(content = '') {
  return String(content ?? '').trim();
}

function buildChatUrl(config) {
  return `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;
}

async function callAzureChatCompletions(config, payload) {
  const response = await fetch(buildChatUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Azure OpenAI HTTP ${response.status}: ${details.slice(0, 220)}`);
  }

  return response.json();
}

export async function testAzureOpenAiConnection(config = loadAzureOpenAiConfig()) {
  const resolved = {
    endpoint: normalizeEndpoint(config.endpoint),
    deployment: String(config.deployment || '').trim(),
    apiVersion: String(config.apiVersion || DEFAULT_AZURE_CFG.apiVersion).trim(),
    apiKey: String(config.apiKey || ''),
  };

  assertAzureConfig(resolved);

  const json = await callAzureChatCompletions(resolved, {
    messages: [
      { role: 'system', content: 'You are a connectivity checker.' },
      { role: 'user', content: 'Reply with: OK' },
    ],
    max_tokens: 8,
    temperature: 0,
  });
  return {
    ok: true,
    id: json.id || null,
    model: json.model || resolved.deployment,
    usage: json.usage || null,
    message: json.choices?.[0]?.message?.content || 'Réponse reçue.',
  };
}


export async function sendAzureOpenAiChat({
  messages = [],
  systemPrompt = DEFAULT_AZURE_CFG.systemPrompt,
  temperature = DEFAULT_AZURE_CFG.temperature,
  maxTokens = DEFAULT_AZURE_CFG.maxTokens,
  config = loadAzureOpenAiConfig(),
} = {}) {
  const resolved = {
    endpoint: normalizeEndpoint(config.endpoint),
    deployment: String(config.deployment || '').trim(),
    apiVersion: String(config.apiVersion || DEFAULT_AZURE_CFG.apiVersion).trim(),
    apiKey: String(config.apiKey || ''),
  };

  assertAzureConfig(resolved);

  const normalizedMessages = Array.isArray(messages)
    ? messages
      .map((item) => ({ role: item?.role === 'assistant' ? 'assistant' : 'user', content: normalizeMessageContent(item?.content) }))
      .filter((item) => item.content)
    : [];

  if (!normalizedMessages.length) throw new Error('Message utilisateur manquant.');

  const json = await callAzureChatCompletions(resolved, {
    messages: [{ role: 'system', content: normalizeMessageContent(systemPrompt) || 'Tu es un assistant utile.' }, ...normalizedMessages],
    temperature: Number.isFinite(Number(temperature))
      ? Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, Number(temperature)))
      : DEFAULT_AZURE_CFG.temperature,
    max_tokens: Number.isFinite(Number(maxTokens))
      ? Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(Number(maxTokens))))
      : DEFAULT_AZURE_CFG.maxTokens,
  });

  return {
    id: json.id || null,
    model: json.model || resolved.deployment,
    usage: json.usage || null,
    reply: normalizeMessageContent(json.choices?.[0]?.message?.content) || 'Réponse vide.',
  };
}
