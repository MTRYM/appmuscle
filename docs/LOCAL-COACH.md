# LOCAL-COACH.md

## Installation et démarrage d'Ollama

### 1. Installer Ollama sur le PC

```bash
# Windows : télécharger depuis https://ollama.com/download
# Puis vérifier l'installation :
ollama --version
```

### 2. Télécharger un modèle

Choisissez selon les ressources de votre PC :

| Profil | Modèle | RAM min | Qualité |
|--------|--------|---------|---------|
| Rapide | `phi3:mini` | 4 GB | ⭐⭐ |
| Équilibré | `llama3.1:8b` | 8 GB | ⭐⭐⭐ |
| Qualité | `llama3.1:70b` | 40 GB | ⭐⭐⭐⭐⭐ |

```bash
ollama pull llama3.1:8b
```

### 3. Vérifier qu'Ollama écoute en local

Ollama doit écouter uniquement sur `127.0.0.1:11434`.

```bash
ollama serve
# Puis tester : curl http://127.0.0.1:11434/api/tags
```

> ⚠️ Ne jamais exposer le port 11434 sur le réseau ou Internet.

### 4. Configurer le modèle dans le serveur

Dans `apps/coach-server/src/ollama.ts`, modifiez `modelName` :

```ts
private modelName = 'llama3.1:8b'; // ou 'phi3:mini' pour le PC léger
```

## Pipeline du Coach

```
1. POST /coach/analyze (depuis le téléphone)
2. TrainingContextBuilder
   → Charge les 5 dernières séances depuis SQLite
   → Calcule la fatigue moyenne (RPE agrégé)
   → Injecte le profil athlète
   → Injecte les mémoires confirmées
3. OllamaCoachService
   → Construit un prompt avec le contexte minimal
   → Appelle http://127.0.0.1:11434/api/generate
   → Force la réponse en JSON (format: 'json')
4. Validation Zod (RecommendationSchema)
   → Rejette toute réponse invalide
5. RecommendationPolicyEngine
   → Bloque les changements dangereux (charge +5%, etc.)
   → Bloque si douleur signalée
   → Bloque si confiance trop faible
6. Résultat filtré envoyé au téléphone
```

## Mémoire du Coach

Le coach dispose d'une mémoire structurée indépendante du LLM.

**Voir/gérer les mémoires :** `GET /coach/memories`

Les états possibles :
- `candidate` — proposé par le LLM, pas encore validé
- `confirmed` — validé par l'utilisateur, injecté dans les prochains contextes
- `rejected` — refusé par l'utilisateur
- `expired` — supprimé manuellement

**Le LLM ne peut PAS :**
- Modifier directement la base de données
- Écrire du SQL
- Accéder à des fichiers arbitraires
- Appliquer une recommandation sans validation utilisateur

## Si Ollama est indisponible

Le serveur retourne HTTP 503 avec le message :
```json
{ "error": "Coach indisponible", "message": "Ollama est hors-ligne..." }
```

L'application continue de fonctionner normalement : séances, statistiques, sync.
