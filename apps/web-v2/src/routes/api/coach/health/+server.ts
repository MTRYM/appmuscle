import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAvailableGeminiModels } from '$lib/server/llm';

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

export const GET: RequestHandler = async ({ url, request }) => {
  const provider = url.searchParams.get('provider') || request.headers.get('x-llm-provider') || 'auto';
  const apiKey = (url.searchParams.get('apiKey') || request.headers.get('x-api-key') || '').trim();
  const customUrl = url.searchParams.get('url') || request.headers.get('x-ollama-url') || DEFAULT_OLLAMA_URL;
  const targetUrl = customUrl.replace(/\/+$/, '');

  // 1. If Google Gemini key is provided or present in env
  const effectiveGeminiKey = (provider === 'gemini' ? apiKey : (apiKey.startsWith('AIza') ? apiKey : '')) || process.env.GEMINI_API_KEY || '';
  if (provider === 'gemini' || (provider === 'auto' && effectiveGeminiKey)) {
    if (!effectiveGeminiKey) {
      return json({
        status: 'no_key',
        provider: 'gemini',
        message: 'Clé API Gemini requise. Obtiens-en une gratuitement (0€) sur https://aistudio.google.com/app/apikey',
        models: [{ name: 'gemini-2.0-flash' }]
      });
    }

    try {
      const availableModels = await getAvailableGeminiModels(effectiveGeminiKey);
      if (availableModels.length > 0) {
        return json({
          status: 'ok',
          provider: 'gemini',
          message: `Google Gemini connecté (${availableModels.length} modèles disponibles · Gratuit 0€)`,
          preferredModel: availableModels.includes('gemini-2.0-flash') ? 'gemini-2.0-flash' : availableModels[0],
          models: availableModels.map(name => ({
            name,
            description: name.includes('2.0')
              ? `⚡ ${name} (Recommandé · Rapide & Intelligent)`
              : name.includes('pro')
                ? `🧠 ${name} (Raisonnement approfondi)`
                : name
          }))
        });
      } else {
        return json({
          status: 'error',
          provider: 'gemini',
          message: 'Clé Gemini invalide ou refusée par Google AI Studio.',
          models: []
        });
      }
    } catch (e: any) {
      return json({
        status: 'error',
        provider: 'gemini',
        message: `Erreur de connexion avec Google Gemini : ${e.message}`,
        models: []
      });
    }
  }

  // 2. If Groq key is provided or present in env
  const effectiveGroqKey = (provider === 'groq' ? apiKey : (apiKey.startsWith('gsk_') ? apiKey : '')) || process.env.GROQ_API_KEY || '';
  if (provider === 'groq' || (provider === 'auto' && effectiveGroqKey)) {
    return json({
      status: 'ok',
      provider: 'groq',
      message: 'Groq Cloud connecté (Llama 3.3 70B · Gratuit 0€)',
      preferredModel: 'llama-3.3-70b-versatile',
      models: [
        { name: 'llama-3.3-70b-versatile', description: 'Llama 3.3 70B ultra-rapide' },
        { name: 'deepseek-r1-distill-llama-70b', description: 'DeepSeek R1 70B Reasoning' }
      ]
    });
  }

  // 3. If OpenAI key is provided or present in env
  const effectiveOpenAIKey = (provider === 'openai' ? apiKey : (apiKey.startsWith('sk-') ? apiKey : '')) || process.env.OPENAI_API_KEY || '';
  if (provider === 'openai' || (provider === 'auto' && effectiveOpenAIKey)) {
    return json({
      status: 'ok',
      provider: 'openai',
      message: 'OpenAI connecté',
      preferredModel: 'gpt-4o-mini',
      models: [
        { name: 'gpt-4o-mini', description: 'GPT-4o mini' },
        { name: 'gpt-4o', description: 'GPT-4o standard' }
      ]
    });
  }

  // 4. Default / Fallback: Ollama Local
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${targetUrl}/api/tags`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const models = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
        modifiedAt: m.modified_at
      }));

      return json({
        status: models.length > 0 ? 'ok' : 'no_model',
        provider: 'ollama',
        url: targetUrl,
        message: models.length > 0
          ? `Ollama local actif (${models.length} modèle${models.length > 1 ? 's' : ''})`
          : 'Ollama actif mais aucun modèle installé.',
        models,
        preferredModel: models[0]?.name || 'llama3.1:8b'
      });
    }
  } catch {
    // Offline Ollama
  }

  // 5. No provider configured
  return json({
    status: 'no_key',
    provider: 'gemini',
    message: 'Configure ta clé API gratuite Google Gemini (0€) pour activer le Coach IA partout !',
    models: []
  });
};
