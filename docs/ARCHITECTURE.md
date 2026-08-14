# ARCHITECTURE.md

## AppMuscu — Système Distribué

```
PWA iPhone / Safari
├── IndexedDB (Dexie v5)
│   ├── Programme actif
│   ├── Séances récentes
│   ├── Séries effectuées
│   ├── Recommandations
│   └── SyncEvents (file locale hors-ligne)
└── SyncClient
      ↕ HTTPS privé via Tailscale Serve
Coach Server (PC, localhost:3000)
├── Fastify API
│   ├── GET  /health
│   ├── POST /auth/generate-pairing-code
│   ├── POST /auth/pair
│   ├── POST /sync/push
│   ├── GET  /sync/pull
│   ├── GET  /coach/memories
│   ├── POST /coach/memories
│   ├── PATCH /coach/memories/:id/confirm
│   ├── PATCH /coach/memories/:id/reject
│   ├── DELETE /coach/memories/:id
│   └── POST /coach/analyze
│         ↓
│   TrainingContextBuilder (agrégats déterministes)
│         ↓
│   OllamaCoachService (http://127.0.0.1:11434)
│         ↓
│   RecommendationPolicyEngine (vérification sécurité)
└── SQLite (data/coach.db — Drizzle ORM)
      ├── sync_events
      ├── auth_devices
      ├── pairing_codes
      └── coach_memories
```

## Démarrage rapide

```bash
# 1. Démarrer la PWA en développement
npm run dev

# 2. Démarrer le serveur coach (dans un autre terminal)
npm run server:start

# 3. Appliquer les migrations SQLite
npm run db:push
```

## Réseau & Sécurité

- Le serveur écoute uniquement sur `127.0.0.1:3000`
- Tailscale Serve expose le serveur en HTTPS privé sur le réseau Tailscale
- Ollama écoute sur `127.0.0.1:11434`, inaccessible directement depuis le téléphone
- Le serveur est le **seul** composant autorisé à contacter Ollama

## Tailscale Serve — Configuration

```bash
tailscale serve https / http://127.0.0.1:3000
```

Cela expose `https://<machine>.tailnet-xxxx.ts.net` sur le réseau privé Tailscale uniquement.
Aucun port ouvert vers Internet.

## Association iPhone (Pairing)

1. Sur le PC : appeler `POST /auth/generate-pairing-code` → récupérer le code à 6 chiffres
2. Sur l'iPhone : saisir le code + envoyer sa clé publique via `POST /auth/pair`
3. Le code expire après 5 minutes
4. Les futurs appels sync sont identifiés par `deviceId`

## Synchronisation hors-ligne

- L'iPhone enregistre chaque modification dans `db.syncEvents` (IndexedDB)
- À la reconnexion : `SyncClient.pushPendingEvents()` envoie au serveur
- `SyncClient.pullNewEvents()` récupère les modifications du serveur
- **Résolution de conflits LWW** : si la donnée locale est plus récente, elle prime
- Idempotence : `idempotencyKey` unique par événement — pas de doublons

## Coach LLM — Pipeline

```
1. TrainingContextBuilder crée un contexte minimal
   (sessions récentes, profil athlète, fatigue agrégée)
2. Mémoires coach confirmées injectées dans le contexte
3. Ollama génère une réponse JSON structurée
4. RecommendationSchema (Zod) valide la réponse
5. RecommendationPolicyEngine filtre les changements dangereux
6. Résultat propre envoyé au téléphone
```

Le LLM ne peut **jamais** écrire directement en base, appeler du SQL libre, ou accéder à des données non filtrées.

## Modèle Ollama recommandé

| Usage | Modèle | RAM |
|-------|--------|-----|
| Rapide | `phi3:mini` | 4 GB |
| Équilibré | `llama3.1:8b` | 8 GB |
| Qualité | `llama3.1:70b` | 40+ GB |

```bash
ollama pull llama3.1:8b
```
