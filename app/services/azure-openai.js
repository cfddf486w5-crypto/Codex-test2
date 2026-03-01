const AZURE_OPENAI_STORAGE_KEY = 'DLWMS_AZURE_OPENAI_V1';

const DEFAULT_AZURE_CFG = {
  endpoint: 'https://alexdam28-2806-resource.services.ai.azure.com',
  deployment: '',
  apiVersion: '2024-10-21',
  apiKey: '',
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

function normalizeEndpoint(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function loadAzureOpenAiConfig(storage = localStorage) {
  const persisted = safeParseJson(storage?.getItem?.(AZURE_OPENAI_STORAGE_KEY), {});
  return {
    endpoint: normalizeEndpoint(persisted.endpoint ?? DEFAULT_AZURE_CFG.endpoint),
    deployment: String(persisted.deployment ?? DEFAULT_AZURE_CFG.deployment).trim(),
    apiVersion: String(persisted.apiVersion ?? DEFAULT_AZURE_CFG.apiVersion).trim() || DEFAULT_AZURE_CFG.apiVersion,
    apiKey: String(persisted.apiKey ?? DEFAULT_AZURE_CFG.apiKey),
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
  systemPrompt = 'Tu es un assistant IA pour les opérations logistiques.',
  temperature = 0.3,
  maxTokens = 600,
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
    temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : 0.3,
    max_tokens: Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : 600,
  });

  return {
    id: json.id || null,
    model: json.model || resolved.deployment,
    usage: json.usage || null,
    reply: normalizeMessageContent(json.choices?.[0]?.message?.content) || 'Réponse vide.',
  };
}
