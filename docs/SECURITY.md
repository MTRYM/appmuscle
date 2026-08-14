# SECURITY.md

## Modèle de sécurité

Ce projet utilise un modèle **privacy-first** : aucune donnée personnelle ne quitte votre réseau privé.

## Périmètre réseau

```
Internet ──✗──► Coach Server   (non exposé)
iPhone ────────► Tailscale réseau privé ──► Coach Server (127.0.0.1:3000)
Coach Server ──► Ollama (127.0.0.1:11434, local uniquement)
```

**Règles absolues :**
- Le serveur écoute uniquement sur `127.0.0.1`
- Tailscale Serve proxy le HTTPS — aucun port ouvert vers Internet
- Ollama n'est jamais accessible directement depuis le téléphone
- Aucune clé API externe n'est utilisée

## Association d'appareil (Pairing)

1. Le PC génère un code PIN à 6 chiffres via `POST /auth/generate-pairing-code`
2. Le code expire après **5 minutes**
3. Le téléphone envoie le code + son `deviceId` + une clé publique via `POST /auth/pair`
4. Le serveur enregistre l'appareil dans `auth_devices` (SQLite)
5. Les futures requêtes s'identifient par `deviceId`

**Protections :**
- Code à usage unique (supprimé après succès)
- Expiration stricte côté serveur (timestamp Unix)
- Révocation possible depuis le PC

## Chiffrement des exports

- AES-GCM 256 bits
- Sel aléatoire 16 octets
- IV aléatoire 12 octets  
- Dérivation PBKDF2 (100 000 itérations, SHA-256)
- Aucune clé codée en dur dans le projet

## Content Security Policy (PWA)

La CSP est configurée dans `vite.config.js` pour bloquer :
- Scripts distants
- `eval()` et `unsafe-inline`
- Connexions vers des domaines non autorisés

## Ce qui ne doit JAMAIS être fait

- `Access-Control-Allow-Origin: *` sur les routes privées
- Stocker des données sportives dans les URL ou query params
- Activer Tailscale Funnel (exposition Internet publique)
- Appeler un LLM cloud avec des données d'entraînement
- Logger des tokens ou headers d'authentification
