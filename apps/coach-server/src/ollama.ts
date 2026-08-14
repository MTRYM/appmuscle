import { z } from 'zod';

export class OllamaCoachService {
  private ollamaUrl = 'http://127.0.0.1:11434';
  private modelName = 'llama3.1:8b'; // Should be configurable
  
  /**
   * Free-form chat with local Ollama coach that can return actions
   */
  async chat(userMessage: string, contextPayload: any) {
    const prompt = `Tu es un coach sportif personnel expert en musculation. Tu es une IA locale soucieuse de la sécurité et de la progression de l'athlète.
    
Contexte actuel de l'athlète (Profil, dernières séances, historique) :
${JSON.stringify(contextPayload, null, 2)}

Question/Remarque de l'athlète :
"${userMessage}"

RÉPONDS OBLIGATOIREMENT ET UNIQUEMENT EN FORMAT JSON SELON CE SCHÉMA EXACT :
{
  "answer": "Ta réponse textuelle à l'athlète (bienveillante, claire, explicative)",
  "confidence": "low" | "medium" | "high",
  "reasoning": "Explication de ton raisonnement interne (ex: pourquoi tu proposes une action ou non)",
  "proposedActions": [
    {
      "type": "updateWeight" | "updateReps" | "updateRestTime" | "addMemory",
      "targetId": "ID de l'exercice ou de la donnée visée (optionnel)",
      "targetName": "Nom de l'exercice (optionnel)",
      "proposedValue": "Nouvelle valeur proposée (ex: 72.5 ou 'N'aime pas le squat')",
      "reason": "Explication spécifique de cette modification"
    }
  ]
}

Règles :
1. Si l'athlète demande juste un conseil ou pose une question, réponds simplement dans "answer" et laisse "proposedActions" vide [].
2. Si l'athlète signale un problème (stagnation, douleur) ou demande une modification, tu PEUX proposer une action.
3. Pour ajouter une information à ta mémoire, utilise l'action "addMemory".
4. La réponse doit être en français. Ne retourne rien d'autre que du JSON valide.
`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: prompt,
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      try {
        const parsedData = JSON.parse(result.response);
        return {
          answer: parsedData.answer || "Désolé, je n'ai pas bien formulé ma réponse.",
          proposedActions: parsedData.proposedActions || [],
          confidence: parsedData.confidence || "low",
          reasoning: parsedData.reasoning || "",
          model: this.modelName
        };
      } catch (e) {
        console.error('Failed to parse LLM JSON response:', e);
        return null;
      }

    } catch (err) {
      console.error('Ollama chat error:', err);
      return null;
    }
  }
}

export const ollamaCoach = new OllamaCoachService();
