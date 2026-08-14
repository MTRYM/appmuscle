# AppMuscu

PWA mono-utilisateur de suivi musculation — 100 % offline après le premier chargement.

## Stack

- Svelte + Vite
- vite-plugin-pwa (service worker + manifest)
- Dexie.js (IndexedDB)
- Chart.js
- programme.yaml (source de vérité, bundlé au build)

## Développement local

```bash
npm install
npm run dev
```

## Déploiement (3 commandes)

```bash
npm install
npm run build
npx vercel --prod
```

Alternatives :

```bash
netlify deploy --prod --dir=dist
```

GitHub Pages : publiez le contenu du dossier `dist/` sur la branche `gh-pages`.

## Installation sur iPhone (écran d'accueil)

1. Déployez l'app et ouvrez l'URL dans **Safari** (obligatoire).
2. Visitez l'app **une première fois en ligne** pour installer le service worker et mettre en cache les assets.
3. Appuyez sur **Partager** (icône carré + flèche) → **« Sur l'écran d'accueil »**.
4. Lancez AppMuscu depuis l'icône : mode **standalone**, sans barre Safari.
5. L'app fonctionne ensuite **100 % hors ligne**.

## Personnaliser le programme

1. Éditez [`programme.yaml`](programme.yaml) à la racine du projet.
2. Rebuild : `npm run build`
3. Redéployez sur Vercel/Netlify.

La date de début du programme se configure dans l'app (onboarding ou Réglages).

## Sauvegarde des données

Dans **Réglages** :

- **Exporter (JSON)** : télécharge une sauvegarde complète (séances, séries, RPE, charges).
- **Importer (JSON)** : restaure une sauvegarde (remplace les données locales).

Aucune donnée n'est envoyée à un serveur externe.

## Fonctionnalités

- **Séance du jour** : détection automatique, chrono de repos, saisie RPE et charges
- **Rattrapage** : séances manquées du calendrier
- **Calendrier** : code couleur sur plusieurs années
- **Statistiques** : assiduité, progression, volume, records, RPE
- **Thème** sombre / clair
