import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getAthleteProfileText } from '$lib/server/athlete-profile';

const OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.1:8b';
// 5 minutes timeout — the user prefers quality over speed
const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Build a rich context for the LLM from the Prisma database and the master Athlete Profile.
 */
async function buildAthleteContext() {
  // 1. Recent workout sessions with their performed sets (last 10)
  const recentSessions = await prisma.workoutSession.findMany({
    where: { status: 'completed' },
    include: {
      performedSets: {
        orderBy: { setNumber: 'asc' }
      },
      plannedSession: true
    },
    orderBy: { dateISO: 'desc' },
    take: 10
  });

  // 2. Master Athlete Profile
  const profileData = await getAthleteProfileText();

  // 3. Confirmed coach memories
  const memories = await prisma.coachMemory.findMany({
    where: { status: 'confirmed' }
  });

  // 4. Recent conversation history (last 10 messages for continuity)
  const conversationHistory = await prisma.coachConversation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // 5. Personal records
  const personalRecords = await prisma.personalRecord.findMany({
    include: { exercise: true },
    orderBy: { weight: 'desc' },
    take: 20
  });

  // 6. App settings
  const settings = await prisma.appSettings.findFirst();

  // Compute fatigue summary from recent sessions
  const fatigueSummary = computeFatigueSummary(recentSessions);

  // Format sessions for the prompt (reduce noise)
  const formattedSessions = recentSessions.map(s => ({
    date: s.dateISO,
    sessionName: s.plannedSession?.sessionName || 'Séance libre',
    cycleName: s.plannedSession?.cycleName || '',
    durationMin: s.durationSec ? Math.round(s.durationSec / 60) : null,
    avgRpe: s.avgRpe,
    feedback: s.feedback,
    exercises: s.performedSets.reduce((acc: any[], set) => {
      const existing = acc.find(e => e.name === set.exerciseName);
      if (existing) {
        existing.sets.push({
          setNum: set.setNumber,
          weight: set.weight,
          reps: set.repsActual,
          targetReps: set.repsTarget,
          rpe: set.rpe
        });
      } else {
        acc.push({
          name: set.exerciseName,
          type: set.exerciseType,
          sets: [{
            setNum: set.setNumber,
            weight: set.weight,
            reps: set.repsActual,
            targetReps: set.repsTarget,
            rpe: set.rpe
          }]
        });
      }
      return acc;
    }, [])
  }));

  const formattedRecords = personalRecords.map(pr => ({
    exercise: pr.exercise?.name || 'Inconnu',
    weight: pr.weight,
    reps: pr.reps,
    date: pr.dateISO
  }));

  const formattedMemories = memories.map(m => ({
    category: m.category,
    content: m.content,
    confidence: m.confidence
  }));

  return {
    athleteProfileText: profileData.text,
    recentSessions: formattedSessions,
    personalRecords: formattedRecords,
    coachMemories: formattedMemories,
    fatigueSummary,
    conversationHistory: conversationHistory.reverse().map(c => ({
      role: c.role,
      content: c.content
    })),
    programStartDate: settings?.programStartDate || null,
    dataFreshness: new Date().toISOString()
  };
}

function computeFatigueSummary(sessions: any[]) {
  if (!sessions || sessions.length === 0) return { trend: 'unknown', details: 'Pas assez de données' };

  let totalRpe = 0;
  let count = 0;
  let totalDuration = 0;
  let durationCount = 0;
  const douleurs: string[] = [];

  for (const s of sessions) {
    if (s.avgRpe != null) { totalRpe += s.avgRpe; count++; }
    if (s.durationSec) { totalDuration += s.durationSec; durationCount++; }
    if (s.feedback && typeof s.feedback === 'object') {
      const fb = s.feedback as any;
      if (fb.douleur) douleurs.push(fb.douleurDetail || 'Non précisé');
    }
  }

  const avgRpe = count > 0 ? Math.round((totalRpe / count) * 10) / 10 : null;
  const avgDurationMin = durationCount > 0 ? Math.round(totalDuration / durationCount / 60) : null;

  let trend = 'optimal';
  if (avgRpe && avgRpe > 8.5) trend = 'high_fatigue';
  else if (avgRpe && avgRpe > 7.5) trend = 'elevated';
  else if (avgRpe && avgRpe < 5.5) trend = 'low_intensity';

  return {
    trend,
    averageRpe: avgRpe,
    averageDurationMin: avgDurationMin,
    sessionsAnalyzed: sessions.length,
    recentPains: douleurs.length > 0 ? douleurs : null
  };
}

function buildSystemPrompt(context: any): string {
  return `Tu es le Coach IA personnel officiel de cet athlète. Tu incarnes un coach d'élite de niveau mondial combinant préparation physique hybride, gymnastique / street workout avancé, science de la force, périodisation evidence-based et prévention des blessures.

## SPÉCIFICATION & PROFIL MAÎTRE DE L'ATHLÈTE (SOURCE DE VÉRITÉ ABSOLUE) :

\`\`\`
${context.athleteProfileText || 'Profil en cours de chargement.'}
\`\`\`

## DONNÉES ACTUELLES DE L'APPLICATION (EN DIRECT DE LA BASE DE DONNÉES)

### Dernières séances enregistrées (${context.recentSessions.length} séances)
${context.recentSessions.length > 0 ? JSON.stringify(context.recentSessions, null, 2) : 'Aucune séance validée dans l\'application pour le moment.'}

### Records personnels récents
${context.personalRecords.length > 0 ? JSON.stringify(context.personalRecords, null, 2) : 'Aucun record enregistré.'}

### Bilan de fatigue & RPE
${JSON.stringify(context.fatigueSummary, null, 2)}

### Mémoires et retours confirmés
${context.coachMemories.length > 0 ? context.coachMemories.map((m: any) => `- [${m.category}] ${m.content} (confiance: ${m.confidence})`).join('\n') : 'Aucune mémoire supplémentaire.'}

### Date de début du programme
Début: ${context.programStartDate || 'Non défini'}
Date actuelle: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

---

## Directives d'Analyse et de Décision
1. Respecte SCRUPULEUSEMENT les principes du profil athlète (priorité Front Lever & force relative, gestion rigoureuse de la fatigue, deload préventif, technique avant intensité, 6 séances/semaine avec lundi repos).
2. Prends en compte son anthropométrie spécifique (193 cm, longs segments, ~83 kg).
3. Si l'athlète te donne de nouvelles informations (nouveau poids de corps, nouvelle perf/PR, douleur, changement de matériel ou d'objectif), tu DOIS proposer une mise à jour de son profil dans \`proposedActions\`.

## Format de réponse OBLIGATOIRE (JSON strict)
Tu DOIS répondre UNIQUEMENT avec du JSON valide sans aucun texte avant ou après :

{
  "answer": "Ta réponse détaillée, claire, bienveillante et percutante en français. Utilise des paragraphes, des listes avec tirets (-), et mets en valeur les charges/exercices clés.",
  "confidence": "high | medium | low",
  "reasoning": "Ton analyse approfondie basée sur le profil athlète et l'historique des séances.",
  "proposedActions": []
}

## Types d'actions autorisées dans proposedActions :
1. **Mise à jour du profil athlète :**
   \`{ "type": "updateAthleteProfile", "targetName": "Nom de la section (ex: Poids de corps, Développé couché, Douleurs)", "proposedValue": "Nouvelle valeur ou texte mis à jour", "reason": "Pourquoi cette mise à jour est enregistrée" }\`
2. **Ajustement de charge / répétitions :**
   \`{ "type": "updateWeight" | "updateReps" | "updateRestTime", "targetName": "Nom de l'exercice", "proposedValue": "Valeur (ex: 72.5 ou 10)", "reason": "Explication de la surcharge/délestage" }\`
3. **Mémorisation d'une préférence :**
   \`{ "type": "addMemory", "targetName": "Préférence", "proposedValue": "Information à retenir", "reason": "Contexte" }\`

Si aucune modification n'est nécessaire, laisse proposedActions: [].`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, model: requestedModel, ollamaUrl: customUrl } = body;

    if (!message || !message.trim()) {
      return json({ error: 'Message requis' }, { status: 400 });
    }

    const targetOllamaUrl = (customUrl || request.headers.get('x-ollama-url') || process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');

    // 1. Build context from database
    const context = await buildAthleteContext();

    // 2. Build prompt
    const systemPrompt = buildSystemPrompt(context);

    // 3. Include conversation history in the prompt
    let conversationContext = '';
    if (context.conversationHistory.length > 0) {
      conversationContext = '\n\n## Historique de conversation récent\n';
      for (const msg of context.conversationHistory) {
        const role = msg.role === 'user' ? 'Athlète' : 'Coach';
        conversationContext += `${role}: ${msg.content}\n`;
      }
    }

    const fullPrompt = `${systemPrompt}${conversationContext}\n\nNouvelle question/remarque de l'athlète :\n"${message.trim()}"`;

    // 4. Determine which model to use
    let modelName = requestedModel || DEFAULT_MODEL;
    if (!requestedModel) {
      try {
        const tagsRes = await fetch(`${targetOllamaUrl}/api/tags`);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const availableModels = (tagsData.models || []).map((m: any) => m.name);
          if (availableModels.length > 0 && !availableModels.some((m: string) => m.startsWith(DEFAULT_MODEL.split(':')[0]))) {
            modelName = availableModels[0];
          }
        }
      } catch { /* Use default */ }
    }

    // 5. Call Ollama with high timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    let ollamaResponse;
    try {
      ollamaResponse = await fetch(`${targetOllamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: fullPrompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.7,
            num_predict: 4096,
            top_p: 0.9,
          }
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return json({
          error: 'Timeout',
          message: 'Le modèle a mis trop de temps à répondre (> 5 min). Essaie avec une question plus ciblée ou un modèle plus léger (ex: llama3.2:3b).'
        }, { status: 504 });
      }
      return json({
        error: 'Ollama inaccessible',
        message: `Impossible de contacter Ollama sur ${targetOllamaUrl}. Vérifie qu'il tourne sur ton PC avec 'ollama serve'.`
      }, { status: 503 });
    }

    clearTimeout(timeout);

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text();
      console.error('Ollama error:', errText);
      return json({
        error: 'Erreur Ollama',
        message: `Le modèle a retourné une erreur : ${ollamaResponse.status}. Vérifie que le modèle ${modelName} est bien installé (ollama pull ${modelName})`
      }, { status: 502 });
    }

    const result = await ollamaResponse.json();

    // 6. Parse LLM response
    let parsedData;
    try {
      parsedData = JSON.parse(result.response);
    } catch (parseErr) {
      console.error('Failed to parse LLM JSON:', result.response);
      // If JSON parsing fails, try to extract answer from raw text
      parsedData = {
        answer: result.response || "Désolé, je n'ai pas pu formuler une réponse structurée. Réessaie en reformulant ta question.",
        confidence: 'low',
        reasoning: 'La réponse du modèle n\'était pas en JSON valide.',
        proposedActions: []
      };
    }

    // 7. Save conversation to database
    const now = new Date();
    try {
      // Save user message
      await prisma.coachConversation.create({
        data: {
          deviceId: 'web',
          role: 'user',
          content: message.trim(),
          createdAt: now
        }
      });
      // Save assistant response
      await prisma.coachConversation.create({
        data: {
          deviceId: 'web',
          role: 'assistant',
          content: parsedData.answer || '',
          metadata: {
            proposedActions: parsedData.proposedActions || [],
            confidence: parsedData.confidence || 'low',
            reasoning: parsedData.reasoning || '',
            model: modelName
          },
          createdAt: new Date(now.getTime() + 1) // +1ms to ensure ordering
        }
      });
    } catch (dbErr) {
      // Don't fail the request if DB save fails
      console.error('Failed to save conversation:', dbErr);
    }

    // 8. Return response
    return json({
      success: true,
      answer: parsedData.answer || "Désolé, je n'ai pas bien formulé ma réponse.",
      proposedActions: parsedData.proposedActions || [],
      confidence: parsedData.confidence || 'low',
      reasoning: parsedData.reasoning || '',
      model: modelName,
      totalDuration: result.total_duration
        ? Math.round(result.total_duration / 1_000_000_000 * 10) / 10 // nanoseconds to seconds
        : null,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Coach chat error:', err);
    return json({
      error: 'Erreur serveur',
      message: err.message || 'Une erreur inattendue est survenue.'
    }, { status: 500 });
  }
};
