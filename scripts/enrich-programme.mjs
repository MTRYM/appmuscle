import { load as loadYaml, dump as dumpYaml } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const yamlPath = join(__dirname, '..', 'programme.yaml');

const ISOMETRIC_PATTERNS = [
  /handstand/i,
  /front lever/i,
  /planche/i,
  /gainage/i,
  /hollow body/i,
  /\bhold\b/i,
  /maintien/i,
];

function isIsometricName(nom) {
  if (/mobilité/i.test(nom)) return false;
  if (/pallof/i.test(nom)) return false;
  if (/saut vertical/i.test(nom)) return false;
  return ISOMETRIC_PATTERNS.some((re) => re.test(nom));
}

function descriptionFor(nom, type) {
  const n = nom.toLowerCase();

  if (/handstand.*préparation|handstand au mur/i.test(nom)) {
    return 'Face au mur, corps aligné tête-pieds, épaules poussées vers le haut. Objectif : sentir la ligne et la stabilité sans chercher l\'équilibre libre.';
  }
  if (/handstand.*face au mur/i.test(nom)) {
    return 'Dos au mur ou face au mur selon consigne. Priorité : alignement (mains-épaules-hanches), respiration calme, regard fixe.';
  }
  if (/handstand.*libre|équilibre libre/i.test(nom)) {
    return 'Essais courts en équilibre libre. Règle : partir stable, sortir proprement avant la rupture de forme.';
  }
  if (/front lever tuck avancé/i.test(nom)) {
    return 'Tuck plus ouvert qu\'en S1. Objectif : allonger progressivement le corps tout en gardant le bassin haut.';
  }
  if (/front lever tuck/i.test(nom)) {
    return 'Scapulas en dépression, coudes verrouillés, genoux au sternum. Tenir la position sans cambrure lombaire.';
  }
  if (/planche tuck/i.test(nom)) {
    return 'Penché avant au-dessus des poignets, épaules devant les mains. Objectif : sentir la charge sur les épaules.';
  }
  if (/hollow body/i.test(nom)) {
    return 'Bas du dos plaqué au sol, côtes rentrées, bras/jambes tendus. Tenir sans perdre la position.';
  }
  if (/pallof/i.test(nom)) {
    return 'Résister à la rotation du buste. Hanches et épaules face à l\'avant, gainage actif.';
  }
  if (/développé couché/i.test(nom)) {
    return 'Descente contrôlée 2-3 s, pause légère poitrine, poussée explosive. Pieds ancrés, omoplates serrées.';
  }
  if (/développé militaire/i.test(nom)) {
    return 'Core serré, fessiers actifs. Barre/haltères au menton, poussée verticale sans cambrure.';
  }
  if (/dips/i.test(nom)) {
    return 'Descente jusqu\'à l\'étirement pectoral, coudes ~45°. Remonter sans balancer.';
  }
  if (/extension triceps/i.test(nom)) {
    return 'Coudes fixes le long du corps, extension complète sans verrouillage agressif.';
  }
  if (/squat/i.test(nom)) {
    return 'Descente contrôlée, genoux dans l\'axe des pieds, profondeur cohérente. Remonter en poussant le sol.';
  }
  if (/soulevé de terre/i.test(nom)) {
    return 'Dos neutre, hanches en arrière, barre proche des tibias. Pousser le sol avec les jambes.';
  }
  if (/saut vertical/i.test(nom)) {
    return 'Contre-mouvement rapide, bras actifs, réception amortie. Qualité > hauteur brute.';
  }
  if (/rowing|row buste/i.test(nom)) {
    return 'Buste ~45°, tirer coudes vers les hanches, serrer omoplates en fin de mouvement.';
  }
  if (/tirage horizontal|tirage scapulaire/i.test(nom)) {
    return 'Initier par les omoplates, coudes vers l\'arrière. Éviter de hausser les épaules.';
  }
  if (/tractions/i.test(nom)) {
    return 'Prise complète, menton au-dessus de la barre, descente contrôlée. Pas de kipping sauf si précisé.';
  }
  if (/muscle-up/i.test(nom)) {
    return 'Transition propre poitrine au-dessus de la barre. Règle : chaque rep doit être strict et contrôlé.';
  }
  if (/élévations latérales/i.test(nom)) {
    return 'Léger fléchissement coudes, monter jusqu\'à l\'épaule sans triche du buste.';
  }
  if (/curl/i.test(nom)) {
    return 'Coudes stables, amplitude complète, pas d\'élan du dos.';
  }
  if (/pont de nuque/i.test(nom)) {
    return 'Nuque au sol, pousser hanches vers le haut. Mouvement contrôlé, pas de douleur cervicale.';
  }
  if (/mobilité/i.test(nom)) {
    return 'Routine complète épaules + hanches. Objectif : amplitude active, pas de douleur en fin d\'amplitude.';
  }
  if (/presse/i.test(nom)) {
    return 'Pieds stables, descente contrôlée, poussée sans décoller le bas du dos.';
  }
  if (/leg curl|leg extension|mollet|fente/i.test(nom)) {
    return 'Amplitude complète, tempo contrôlé, contraction en fin de mouvement.';
  }

  if (type === 'isometrique') {
    return 'Tenue isométrique : maintenir la position propre sans compenser. Sortir avant la perte de forme.';
  }
  return 'Exécution contrôlée, respecter le RPE cible. Priorité à la technique sur la charge.';
}

const raw = loadYaml(readFileSync(yamlPath, 'utf8'));

for (const cycle of raw.cycles) {
  for (const seance of cycle.seances) {
    for (const ex of seance.exercices) {
      const isometric = ex.type === 'isometrique' || (!ex.type && isIsometricName(ex.nom));

      if (isometric) {
        ex.type = 'isometrique';
        ex.duree_sec = ex.duree_sec ?? ex.reps;
        delete ex.reps;
      } else {
        ex.type = 'reps';
        if (ex.duree_sec) delete ex.duree_sec;
      }

      if (!ex.description) {
        ex.description = descriptionFor(ex.nom, ex.type);
      }
    }
  }
}

// Update header comment
const header = `# Programme Athlète Hybride — BLOC 1 : Fondations & Contrôle
# ─────────────────────────────────────────────────────────
# Schéma exercice :
#   type: reps | isometrique
#   reps: "6-8"          → exercices dynamiques (répétitions)
#   duree_sec: "12-15"   → exercices isométriques (secondes de maintien)
#   description: "..."   → objectif, règle technique ou indication
#
# Exemple isométrique :
#   - nom: "Handstand contre mur"
#     type: isometrique
#     series: 4
#     duree_sec: "15"
#     description: "Corps aligné, épaules actives."
#     repos_sec: 60
#     rpe_cible: 6
#
`;

const body = dumpYaml(raw, { lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: false });
writeFileSync(yamlPath, header + body, 'utf8');
console.log('programme.yaml enrichi avec type + description');
