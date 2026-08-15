import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

export const GET: RequestHandler = async ({ url, request }) => {
  const customUrl = url.searchParams.get('url') || request.headers.get('x-ollama-url') || DEFAULT_OLLAMA_URL;
  const targetUrl = customUrl.replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${targetUrl}/api/tags`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return json({
        status: 'error',
        url: targetUrl,
        message: `Ollama répond avec le statut HTTP ${response.status}`,
        models: []
      });
    }

    const data = await response.json();
    const models = (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
      modifiedAt: m.modified_at
    }));

    // Recommandations de modèles populaires
    const preferredModels = [
      'llama3.1:8b', 'llama3.1', 'llama3.2:3b', 'llama3.2', 'llama3:8b', 'llama3',
      'mistral', 'mistral-nemo', 'deepseek-r1:8b', 'deepseek-r1:14b', 'deepseek-r1',
      'gemma2', 'qwen2.5:7b', 'qwen2.5'
    ];
    const available = models.map((m: any) => m.name);
    const preferred = preferredModels.find(p => available.some((a: string) => a.startsWith(p)));

    return json({
      status: models.length > 0 ? 'ok' : 'no_model',
      url: targetUrl,
      message: models.length > 0
        ? `Ollama actif (${models.length} modèle${models.length > 1 ? 's' : ''})`
        : 'Ollama actif mais aucun modèle installé. Lance : ollama pull llama3.1:8b',
      models,
      preferredModel: preferred || (available.length > 0 ? available[0] : null)
    });

  } catch (err: any) {
    if (err.name === 'AbortError') {
      return json({
        status: 'offline',
        url: targetUrl,
        message: `Délai d'attente dépassé (timeout) vers ${targetUrl}. Vérifie qu'Ollama est bien lancé sur ton PC.`,
        models: []
      });
    }

    return json({
      status: 'offline',
      url: targetUrl,
      message: `Impossible de contacter Ollama (${targetUrl}). Lance 'ollama serve' sur ton PC ou vérifie l'URL.`,
      models: []
    });
  }
};
