/**
 * Multi-Provider LLM Integration Module for AppMuscu Coach IA
 * Supports: Google Gemini (Free tier 0€), Groq (Free tier 0€), OpenAI, Claude, OpenRouter, and Ollama.
 */

export interface LLMRequestOptions {
  provider?: 'gemini' | 'groq' | 'openai' | 'anthropic' | 'ollama' | 'auto';
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
  systemPrompt: string;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  temperature?: number;
}

export interface LLMResponse {
  answer: string;
  reasoning?: string;
  confidence?: 'high' | 'medium' | 'low';
  proposedActions?: any[];
  provider: string;
  model: string;
  durationSec: number;
}

// Default models
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Determine the active provider and API key
 */
export function resolveProvider(opts: LLMRequestOptions): {
  provider: 'gemini' | 'groq' | 'openai' | 'anthropic' | 'ollama';
  apiKey: string;
  model: string;
} {
  const reqApiKey = (opts.apiKey || '').trim();
  const reqProvider = opts.provider || 'auto';

  // 1. If explicit provider is passed
  if (reqProvider !== 'auto') {
    const key = reqApiKey || getEnvKeyForProvider(reqProvider);
    return {
      provider: reqProvider,
      apiKey: key,
      model: opts.model || getDefaultModelForProvider(reqProvider)
    };
  }

  // 2. Auto-detect from provided apiKey pattern
  if (reqApiKey) {
    if (reqApiKey.startsWith('AIza')) {
      return { provider: 'gemini', apiKey: reqApiKey, model: opts.model || DEFAULT_GEMINI_MODEL };
    }
    if (reqApiKey.startsWith('gsk_')) {
      return { provider: 'groq', apiKey: reqApiKey, model: opts.model || DEFAULT_GROQ_MODEL };
    }
    if (reqApiKey.startsWith('sk-ant-')) {
      return { provider: 'anthropic', apiKey: reqApiKey, model: opts.model || DEFAULT_CLAUDE_MODEL };
    }
    if (reqApiKey.startsWith('sk-')) {
      return { provider: 'openai', apiKey: reqApiKey, model: opts.model || DEFAULT_OPENAI_MODEL };
    }
  }

  // 3. Auto-detect from environment variables
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: opts.model || DEFAULT_GEMINI_MODEL };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY, model: opts.model || DEFAULT_GROQ_MODEL };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: opts.model || DEFAULT_OPENAI_MODEL };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: opts.model || DEFAULT_CLAUDE_MODEL };
  }

  // 4. Default fallback: Ollama local
  return {
    provider: 'ollama',
    apiKey: '',
    model: opts.model || 'llama3.1:8b'
  };
}

function getEnvKeyForProvider(provider: string): string {
  switch (provider) {
    case 'gemini': return process.env.GEMINI_API_KEY || '';
    case 'groq': return process.env.GROQ_API_KEY || '';
    case 'openai': return process.env.OPENAI_API_KEY || '';
    case 'anthropic': return process.env.ANTHROPIC_API_KEY || '';
    default: return '';
  }
}

function getDefaultModelForProvider(provider: string): string {
  switch (provider) {
    case 'gemini': return DEFAULT_GEMINI_MODEL;
    case 'groq': return DEFAULT_GROQ_MODEL;
    case 'openai': return DEFAULT_OPENAI_MODEL;
    case 'anthropic': return DEFAULT_CLAUDE_MODEL;
    case 'ollama': return 'llama3.1:8b';
    default: return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Main execute function routing to the chosen provider
 */
export async function executeCoachPrompt(opts: LLMRequestOptions): Promise<LLMResponse> {
  const { provider, apiKey, model } = resolveProvider(opts);
  const startTime = Date.now();

  let rawJsonText = '';

  switch (provider) {
    case 'gemini':
      rawJsonText = await callGeminiAPI(apiKey, model, opts);
      break;
    case 'groq':
      rawJsonText = await callGroqAPI(apiKey, model, opts);
      break;
    case 'openai':
      rawJsonText = await callOpenAIAPI(apiKey, model, opts);
      break;
    case 'anthropic':
      rawJsonText = await callAnthropicAPI(apiKey, model, opts);
      break;
    case 'ollama':
      rawJsonText = await callOllamaAPI(opts.ollamaUrl || 'http://127.0.0.1:11434', model, opts);
      break;
    default:
      throw new Error(`Provider inconnu: ${provider}`);
  }

  const durationSec = Math.round((Date.now() - startTime) / 100) / 10;
  const parsed = parseLLMJsonResponse(rawJsonText);

  return {
    answer: parsed.answer || 'Analyse terminée.',
    reasoning: parsed.reasoning || '',
    confidence: parsed.confidence || 'high',
    proposedActions: parsed.proposedActions || [],
    provider,
    model,
    durationSec
  };
}

// ─── 1. Google Gemini API (100% Free Tier, 0€) ──────────────────────────────
async function callGeminiAPI(apiKey: string, model: string, opts: LLMRequestOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API Google Gemini manquante. Configurez GEMINI_API_KEY ou entrez votre clé dans les réglages du Coach IA.');
  }

  // Normalize model identifier to reliable, official GA models
  let cleanModel = (model || DEFAULT_GEMINI_MODEL).replace(/^models\//, '').trim();
  if (cleanModel.includes('thinking')) {
    // If a thinking experimental name was used, map to gemini-2.0-flash or gemini-1.5-pro
    cleanModel = 'gemini-2.0-flash';
  } else if (!cleanModel.startsWith('gemini-')) {
    cleanModel = 'gemini-2.0-flash';
  }

  // Format messages
  const contents: any[] = [];

  if (opts.conversationHistory && opts.conversationHistory.length > 0) {
    for (const item of opts.conversationHistory) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: opts.userMessage }]
  });

  const payload: any = {
    system_instruction: {
      parts: [{ text: opts.systemPrompt }]
    },
    contents,
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: 8192
    }
  };

  // Helper to send request
  async function sendToModel(targetModel: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  let res = await sendToModel(cleanModel);

  // If the requested model is not found, fallback to gemini-2.0-flash or gemini-1.5-pro
  if (!res.ok && res.status === 404 && cleanModel !== 'gemini-2.0-flash') {
    cleanModel = 'gemini-2.0-flash';
    res = await sendToModel('gemini-2.0-flash');
  }
  if (!res.ok && res.status === 404 && cleanModel !== 'gemini-1.5-pro') {
    cleanModel = 'gemini-1.5-pro';
    res = await sendToModel('gemini-1.5-pro');
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const errMsg = errBody.error?.message || `Erreur Gemini (${res.status})`;
    throw new Error(errMsg);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Aucune réponse générée par Gemini.');
  }

  return rawText;
}

// ─── 2. Groq Cloud API (Free Tier 0€ - Llama 3.3 70B) ────────────────────────
async function callGroqAPI(apiKey: string, model: string, opts: LLMRequestOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API Groq manquante. Configurez GROQ_API_KEY ou entrez votre clé dans les réglages du Coach IA.');
  }

  const messages = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.conversationHistory || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: opts.userMessage }
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_GROQ_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: opts.temperature ?? 0.3
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur Groq (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// ─── 3. OpenAI API (GPT-4o, GPT-4o-mini) ─────────────────────────────────────
async function callOpenAIAPI(apiKey: string, model: string, opts: LLMRequestOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante.');
  }

  const messages = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.conversationHistory || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: opts.userMessage }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: opts.temperature ?? 0.3
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur OpenAI (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// ─── 4. Anthropic Claude API (Claude 3.7 Sonnet) ─────────────────────────────
async function callAnthropicAPI(apiKey: string, model: string, opts: LLMRequestOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API Anthropic manquante.');
  }

  const messages = [
    ...(opts.conversationHistory || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: opts.userMessage }
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || DEFAULT_CLAUDE_MODEL,
      system: opts.systemPrompt + '\n\nIMPORTANT: Tu DOIS impérativement répondre UNIQUEMENT en JSON valide respectant le schéma demandé.',
      messages,
      max_tokens: 4096,
      temperature: opts.temperature ?? 0.3
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur Claude (${res.status})`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '{}';
}

// ─── 5. Ollama Local Fallback ────────────────────────────────────────────────
async function callOllamaAPI(ollamaUrl: string, model: string, opts: LLMRequestOptions): Promise<string> {
  const url = `${ollamaUrl.replace(/\/+$/, '')}/api/chat`;

  const messages = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.conversationHistory || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: opts.userMessage }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.1:8b',
        messages,
        format: 'json',
        stream: false,
        options: { temperature: opts.temperature ?? 0.3 }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur Ollama (${res.status})`);
    }

    const data = await res.json();
    return data.message?.content || '{}';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Robust JSON parser handling potential markdown fencing or thinking artifacts
 */
function parseLLMJsonResponse(rawText: string): any {
  let cleaned = rawText.trim();

  // Strip <think>...</think> tags if deepseek/r1 output
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown code block fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt extracting the first JSON object {}
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } catch {
        // Return text directly in answer
      }
    }

    return {
      answer: rawText,
      confidence: 'medium',
      reasoning: 'Réponse textuelle brute reçue.',
      proposedActions: []
    };
  }
}
