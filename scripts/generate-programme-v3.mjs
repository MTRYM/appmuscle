/**
 * Génère programme.yaml v3.0 — MOIS 2 (Octobre 2026)
 * Basé sur l'analyse complète du Mois 1 et les retours de l'athlète.
 *
 * Changements clés vs v2.1:
 * ─────────────────────────────────────────────
 * SPLIT MODIFIÉ:
 * - Mardi : Salle — Force Upper (Bench + Tractions lestées LÉGÈRES + Dips + OHP)
 * - Mercredi : Maison — Front Lever + Handstand + HSPU prep
 * - Jeudi : Maison — Handstand + L-Sit + Core + Dragon Flag
 * - Vendredi : Maison — Front Lever #2 + Planche Lean + Tirage Skills
 * - Samedi : Salle — Bas du corps + Explosivité
 * - Dimanche : Salle — Récup active + Muscle-Up + Mobilité
 *
 * CORRECTIONS BASÉES SUR L'ANALYSE:
 * 1. Tractions lestées: redescend à +10kg (RPE 6-7), remonte +1.25kg/sem
 *    → Même stratégie que le Bench qui a fonctionné (descendre, construire, remonter)
 * 2. Tuck Planche Hold: REMPLACÉ par Planche Lean (maîtrisé, 15-20s propres)
 *    → L'athlète ne tient pas le tuck planche en réalité malgré les données
 * 3. Front Lever Scapula Pull: REMPLACÉ par Tuck FL Negatives (plus accessible)
 *    → L'athlète ne sent pas les bons muscles et ne maîtrise pas le mouvement
 * 4. Tuck FL Hold: plafonné à 4 séries × 15s (pas de 5ème série poubelle)
 * 5. Bench Press: continue la montée depuis 77kg baseline
 * 6. Séances max 1h, 8-10 exos échauffement inclus
 * 7. Séances maison plus courtes les jours de cours (Mer/Jeu/Ven)
 *
 * Run: node scripts/generate-programme-v3.mjs
 */
import fs from 'fs';
import { load } from 'js-yaml';

const DAY_LABELS = {
  Mardi: 'TUESDAY — Salle (Force Upper Body)',
  Mercredi: 'WEDNESDAY — Maison (Front Lever + HSPU + Handstand)',
  Jeudi: 'THURSDAY — Maison (Handstand + L-Sit & Core)',
  Vendredi: 'FRIDAY — Maison (Front Lever #2 + Planche Lean + Skills)',
  Samedi: 'SATURDAY — Salle (Bas du corps + Explosivité)',
  Dimanche: 'SUNDAY — Salle (Récup + Muscle-Up + Mobilité)',
};

function ex(nom, type, series, opts = {}) {
  const base = { nom, type, series, repos_sec: opts.repos_sec ?? 90, rpe_cible: opts.rpe_cible ?? 7 };
  if (type === 'isometrique') base.duree_sec = String(opts.duree_sec ?? '10');
  else base.reps = String(opts.reps ?? '8');
  base.description = opts.description ?? '';
  if (opts.groupe) base.groupe = opts.groupe;
  return base;
}

const WU = 'Échauffement';

/** Échauffement push salle — Mardi */
function warmupPush(dn = '') {
  return [
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement push.${dn} Protraction scapulaire, contrôle — prépare épaules avant bench et dips.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '10', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement push.${dn} Mobilité scapulaire, amplitude complète sans charge.`,
    }),
    ex('Push-Up', 'reps', 2, {
      reps: '8-10', repos_sec: 45, rpe_cible: 4, groupe: WU,
      description: `Échauffement push.${dn} Activation pectoraux/triceps, tempo contrôlé. Pas à l'échec.`,
    }),
  ];
}

/** Échauffement calisthenics maison — Mercredi, Jeudi, Vendredi */
function warmupCalisthenics(dn = '', focus = 'skills') {
  return [
    ex('Dead Hang', 'isometrique', 2, {
      duree_sec: '20-30', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement calisthenics.${dn} Décompression épaules, activation du grip pour ${focus}.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8-10', repos_sec: 45, rpe_cible: 3, groupe: WU,
      description: `Échauffement calisthenics.${dn} Dépression et rétraction scapulaire, coudes tendus.`,
    }),
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement calisthenics.${dn} Activation rétracteurs et coiffe des rotateurs avec élastique.`,
    }),
  ];
}

/** Échauffement jambes salle — Samedi */
function warmupLegs(dn = '') {
  return [
    ex('Glute Bridge', 'reps', 2, {
      reps: '12', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement jambes.${dn} Activation fessiers et chaîne postérieure avant squat.`,
    }),
    ex('Bodyweight Squat', 'reps', 2, {
      reps: '10', repos_sec: 45, rpe_cible: 3, groupe: WU,
      description: `Échauffement jambes.${dn} Amplitude hanche/genou, tempo lent, torse haut.`,
    }),
    ex('Jump Squat', 'reps', 2, {
      reps: '5', repos_sec: 60, rpe_cible: 4, groupe: WU,
      description: `Échauffement jambes.${dn} Réveil SNC léger avant CMJ et clean. Intent modéré.`,
    }),
  ];
}

/** Échauffement récup salle — Dimanche */
function warmupSunday(dn = '') {
  return [
    ex('Dead Hang', 'isometrique', 1, {
      duree_sec: '20', repos_sec: 0, rpe_cible: 2, groupe: WU,
      description: `Échauffement récup.${dn} Décompression légère avant mobilité.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '8', repos_sec: 30, rpe_cible: 2, groupe: WU,
      description: `Échauffement récup.${dn} Activation douce épaules avant flows mobilité.`,
    }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMMATION MOIS 2 — Semaines 1 à 6
// ─────────────────────────────────────────────────────────────────────────────
// 
// STRATÉGIE TRACTIONS LESTÉES (comme le bench qui a marché):
// S1-S2: +10kg × 5 reps (volume propre, RPE 6-7)
// S3-S4: +12.5kg × 5 reps (montée progressive)
// S5:    +15kg × 4-5 reps (test, devrait passer proprement)
// S6:    Deload +10kg × 5 reps
//
// BENCH PRESS (continue la lancée de 77kg):
// S1: 77kg × 4    S2: 77.5kg × 4    S3: 80kg × 3
// S4: 80kg × 4    S5: 82.5kg × 3    S6: Deload 70kg × 5
//
// FRONT LEVER: 4 séries max, 15s ciblé, pas de série poubelle
// PLANCHE: Planche Lean uniquement (maîtrisé), 15-20s
// FL SCAPULA: Remplacé par Tuck FL Negatives (plus accessible)
// ─────────────────────────────────────────────────────────────────────────────

const WEEKS = [
  {
    nom: 'Semaine 1 — Reset & Fondations Volume',
    bench: { series: 4, reps: '4', rpe: 7 },
    larsen: { series: 2, reps: '5', rpe: 7 },
    wpu: { series: 4, reps: '5', rpe: 6.5, desc_override: 'Redescente à +10kg pour construire du volume propre. Suspension complète, tirage explosif, JAMAIS à l\'échec. Même stratégie que le Bench mois 1 (+2.5kg/sem → +7kg en 6 semaines).' },
    ringDip: { series: 3, reps: '5', rpe: 6.5 },
    ohp: { series: 3, reps: '8', rpe: 7 },
    tuckFL: { series: 4, time: '15', rpe: 7 },
    flRaises: { series: 3, reps: '4-5', rpe: 7 },
    flNeg: { series: 3, reps: '3', rpe: 6.5 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '8-10', rpe: 7 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '15-20', rpe: 6.5 },
    pullBW: { series: 3, reps: '8', rpe: 7 },
    coreHollow: { series: 3, time: '25-30', rpe: 6 },
    fsquat: { series: 3, reps: '5', rpe: 7.5 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7 },
    bss: { series: 3, reps: '6', rpe: 7 },
    rdl: { series: 3, reps: '6', rpe: 7 },
    muQuality: { series: 3, reps: '2', rpe: 6 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 3, time: '12-15', rpe: 6 },
    dragonFlag: { series: 3, reps: '5', rpe: 6 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '5', rpe: 7 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7 },
    pikeCompress: { series: 3, reps: '10', rpe: 6 },
    wristCurl: { series: 3 },
    note: 'Reset des tractions lestées à +10kg (volume propre RPE 6-7). Bench continue depuis 77kg. FL Scapula Pull remplacé par Tuck FL Negatives. Tuck Planche Hold remplacé par Planche Lean.',
  },
  {
    nom: 'Semaine 2 — Consolidation & Régularité',
    bench: { series: 4, reps: '4', rpe: 7.5 },
    larsen: { series: 2, reps: '5', rpe: 7.5 },
    wpu: { series: 4, reps: '5', rpe: 7, desc_override: '+10kg, focus qualité. Chaque rep doit être propre, menton au-dessus, descente complète. Pas d\'échec.' },
    ringDip: { series: 3, reps: '5', rpe: 7 },
    ohp: { series: 3, reps: '8', rpe: 7.5 },
    tuckFL: { series: 4, time: '15', rpe: 7 },
    flRaises: { series: 3, reps: '5', rpe: 7 },
    flNeg: { series: 3, reps: '3', rpe: 7 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '10', rpe: 7.5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '18-22', rpe: 7 },
    pullBW: { series: 3, reps: '8', rpe: 7 },
    coreHollow: { series: 3, time: '30', rpe: 6.5 },
    fsquat: { series: 3, reps: '5', rpe: 7.5 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5 },
    bss: { series: 3, reps: '6', rpe: 7.5 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muQuality: { series: 3, reps: '2', rpe: 6.5 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 3, time: '15', rpe: 6.5 },
    dragonFlag: { series: 3, reps: '5', rpe: 6.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '5-6', rpe: 7 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7 },
    pikeCompress: { series: 3, reps: '10', rpe: 6.5 },
    wristCurl: { series: 3 },
    note: 'Tractions lestées toujours à +10kg mais RPE monte légèrement. Planche Lean augmente à 18-22s. FL Raises passe à 5 reps.',
  },
  {
    nom: 'Semaine 3 — Surcharge Progressive Pull',
    bench: { series: 4, reps: '3', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '5', rpe: 7, desc_override: 'Montée à +12.5kg. Volume de 5 reps doit rester propre. Si RPE dépasse 8 → rester à +10kg.' },
    ringDip: { series: 3, reps: '5', rpe: 7 },
    ohp: { series: 2, reps: '8', rpe: 7.5 },
    tuckFL: { series: 4, time: '15', rpe: 7.5 },
    flRaises: { series: 3, reps: '5', rpe: 7.5 },
    flNeg: { series: 3, reps: '4', rpe: 7 },
    hspuPrep: { name: 'Wall Handstand Push-Up (Négatives)', series: 3, reps: '3-4', rpe: 7.5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '20-25', rpe: 7 },
    pullBW: { series: 3, reps: '8', rpe: 7.5 },
    coreHollow: { series: 3, time: '30', rpe: 7 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muQuality: { series: 3, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit Hold (Parallettes ou Sol)', type: 'isometrique', series: 3, time: '10-15', rpe: 7 },
    dragonFlag: { series: 3, reps: '5-6', rpe: 7 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '6', rpe: 7.5 },
    bandCurl: { series: 3, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '12', rpe: 7 },
    wristCurl: { series: 3 },
    note: 'Tractions lestées montent à +12.5kg. Introduction HSPU négatives au mur. Bench à 80kg × 3. Planche Lean progresse à 20-25s.',
  },
  {
    nom: 'Semaine 4 — Volume Productif & Consolidation',
    bench: { series: 4, reps: '4', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '5', rpe: 7.5, desc_override: '+12.5kg, consolidation. Les 5 reps doivent être toutes propres et contrôlées avant de monter la semaine prochaine.' },
    ringDip: { series: 3, reps: '5', rpe: 7.5 },
    ohp: { series: 2, reps: '8', rpe: 8 },
    tuckFL: { series: 4, time: '15', rpe: 7.5 },
    flRaises: { series: 3, reps: '5', rpe: 7.5 },
    flNeg: { series: 3, reps: '4', rpe: 7.5 },
    hspuPrep: { name: 'Wall Handstand Push-Up (Négatives)', series: 3, reps: '4', rpe: 8 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '22-25', rpe: 7 },
    pullBW: { series: 3, reps: '8', rpe: 7.5 },
    coreHollow: { series: 3, time: '30-35', rpe: 7 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 8 },
    muQuality: { series: 3, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit Hold (Parallettes ou Sol)', type: 'isometrique', series: 3, time: '12-15', rpe: 7 },
    dragonFlag: { series: 3, reps: '6', rpe: 7.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '6', rpe: 7.5 },
    bandCurl: { series: 3, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '12', rpe: 7 },
    wristCurl: { series: 3 },
    note: 'Pic de volume. Bench à 80kg × 4 (progression). Tractions lestées consolidation à +12.5kg. Planche Lean 22-25s.',
  },
  {
    nom: 'Semaine 5 — Intensification & Test',
    bench: { series: 4, reps: '3', rpe: 8.5 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '4-5', rpe: 8, desc_override: 'RETOUR à +15kg. Le volume propre des 4 semaines précédentes doit payer ici. Si 5 reps propres passent → VICTOIRE. Si seulement 4 → c\'est déjà un progrès (même reps mais RPE plus bas qu\'avant).' },
    ringDip: { series: 3, reps: '5', rpe: 8 },
    ohp: { series: 2, reps: '6', rpe: 8 },
    tuckFL: { series: 4, time: '15', rpe: 7.5 },
    flRaises: { series: 3, reps: '5', rpe: 7.5 },
    flNeg: { series: 3, reps: '4', rpe: 7.5 },
    hspuPrep: { name: 'Wall Handstand Push-Up', series: 3, reps: '3-5', rpe: 8 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '25-30', rpe: 7.5 },
    pullBW: { series: 2, reps: '8', rpe: 7.5 },
    coreHollow: { series: 3, time: '30', rpe: 7 },
    fsquat: { series: 3, reps: '4', rpe: 8.5 },
    cmj: { series: 3, reps: '2', rpe: 6 },
    clean: { series: 3, reps: '2', rpe: 8.5 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 2, reps: '6', rpe: 8 },
    muQuality: { series: 2, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit to Tuck Press Transition Prep', type: 'reps', series: 3, reps: '3-4', rpe: 7.5 },
    dragonFlag: { series: 3, reps: '5', rpe: 7.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '6', rpe: 8 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '10', rpe: 7 },
    wristCurl: { series: 2 },
    sundayPlyo: 'light',
    note: 'Intensification. RETOUR à +15kg aux tractions lestées (test de la progression). Bench 82.5kg × 3. Planche Lean 25-30s.',
  },
  {
    nom: 'Semaine 6 — Deload & Régénération',
    bench: { series: 3, reps: '5', rpe: 6 },
    larsen: { series: 2, reps: '6', rpe: 6 },
    wpu: { series: 3, reps: '5', rpe: 5.5, desc_override: 'Deload à +10kg. Récupération complète nerveuse et tendineuse. Reps faciles et fluides.' },
    ringDip: { series: 2, reps: '5', rpe: 5 },
    ohp: { series: 2, reps: '8', rpe: 6 },
    tuckFL: { series: 3, time: '12', rpe: 5 },
    flRaises: { series: 2, reps: '4', rpe: 5 },
    flNeg: { series: 2, reps: '3', rpe: 5 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 2, reps: '6', rpe: 5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 2, time: '15', rpe: 5 },
    pullBW: { series: 2, reps: '6', rpe: 5 },
    coreHollow: { series: 2, time: '20', rpe: 4 },
    fsquat: { series: 2, reps: '5', rpe: 6 },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6 },
    bss: { series: 2, reps: '6', rpe: 6 },
    rdl: { series: 2, reps: '6', rpe: 6 },
    muQuality: { series: 2, reps: '1', rpe: 5 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 2, time: '10', rpe: 5 },
    dragonFlag: { series: 2, reps: '4', rpe: 5 },
    archerPull: { name: 'Pronated Pull-Up', series: 2, reps: '6', rpe: 5 },
    bandCurl: { series: 2, reps: '10', rpe: 5 },
    pikeCompress: { series: 2, reps: '8', rpe: 4 },
    wristCurl: { series: 2 },
    deload: true,
    note: 'Deload ~40-50 %. Récupération nerveuse et tendineuse complète avant le cycle suivant.',
  },
];

function buildWeek(w) {
  const dn = w.deload ? ' (deload)' : '';
  const seances = [];

  // ═══════════════════════════════════════════════════════════════
  // MARDI — Salle : Force Upper Body (~55 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Mardi',
    nom: 'Salle — Force Upper Body',
    exercices: [
      ...warmupPush(dn),
      ex('Bench Press', 'reps', w.bench.series, {
        reps: w.bench.reps, repos_sec: 180, rpe_cible: w.bench.rpe,
        description: `Lift push principal.${dn} Pause 1 s poitrine, poussée explosive. Baseline Mois 2: 77kg. Progression +2.5kg si RPE cible respecté.`,
      }),
      ex('Larsen Press', 'reps', w.larsen.series, {
        reps: w.larsen.reps, repos_sec: 150, rpe_cible: w.larsen.rpe,
        description: `Volume push sans pontage.${dn} Pieds surélevés, gainage strict, renforce le point de blocage au développé couché.`,
      }),
      ex('Weighted Pull-Up', 'reps', w.wpu.series, {
        reps: w.wpu.reps, repos_sec: 180, rpe_cible: w.wpu.rpe,
        description: w.wpu.desc_override || `Lift pull lourd principal.${dn} Suspension complète, tirage explosif sans élan. Progression: +10kg → +12.5kg → +15kg sur 6 semaines.`,
      }),
      ex('Ring Dip', 'reps', w.ringDip.series, {
        reps: w.ringDip.reps, repos_sec: 120, rpe_cible: w.ringDip.rpe,
        description: `Dips aux anneaux ou barres parallèles.${dn} Descente contrôlée, épaules en dépression, protège le sternum.`,
      }),
      ex('Standing Dumbbell Overhead Press', 'reps', w.ohp.series, {
        reps: w.ohp.reps, repos_sec: 120, rpe_cible: w.ohp.rpe,
        description: `Force verticale push.${dn} Transfert direct sur HSPU. Torse gainé, sans cambrer.`,
      }),
      ex('Cable External Rotation', 'reps', w.deload ? 2 : 3, {
        reps: '15', repos_sec: 45, rpe_cible: 6,
        description: `Prehab coiffe des rotateurs.${dn} Priorité longévité épaule face au volume de poussée et skills.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // MERCREDI — Maison : Front Lever + Handstand + HSPU (~50 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Mercredi',
    nom: 'Maison — Front Lever + Handstand & HSPU',
    exercices: [
      ...warmupCalisthenics(dn, 'Front Lever et Handstand'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15', repos_sec: 75, rpe_cible: 6,
        description: `Travail d'équilibre libre (1/3 sessions HS).${dn} Chercher 10-15 s d'équilibre, alignement actif épaules et bassin rétroversé.`,
      }),
      ex('Handstand Chest-to-Wall', 'isometrique', 2, {
        duree_sec: '20-30', repos_sec: 60, rpe_cible: 6,
        description: `Alignement et endurance posturale.${dn} Ventre face au mur, pousser fort dans les épaules, côtes rentrées.`,
      }),
      ex(w.hspuPrep.name, 'reps', w.hspuPrep.series, {
        reps: w.hspuPrep.reps, repos_sec: 90, rpe_cible: w.hspuPrep.rpe,
        description: `Progression HSPU.${dn} Trajectoire diagonale, coudes serrés à 45°.`,
      }),
      ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL.series, {
        duree_sec: w.tuckFL.time, repos_sec: 90, rpe_cible: w.tuckFL.rpe,
        description: `Skill #1 profil.${dn} 4 séries max de 15s propres. Dépression et rétraction scapulaire, bassin rétroversé, bras tendus. Pas de série poubelle.`,
      }),
      ex('Front Lever Raises (Tuck)', 'reps', w.flRaises.series, {
        reps: w.flRaises.reps, repos_sec: 90, rpe_cible: w.flRaises.rpe,
        description: `Dynamique Front Lever.${dn} Montée explosive, descente contrôlée 3 s. Bras verrouillés.`,
      }),
      ex('Hollow Body Hold', 'isometrique', w.coreHollow.series, {
        duree_sec: w.coreHollow.time, repos_sec: 60, rpe_cible: w.coreHollow.rpe,
        description: `Gainage fondamental gymnastique.${dn} Bas du dos collé au sol, côtes rentrées, rétroversion du bassin.`,
      }),
      ex('Reverse Wrist Curl', 'reps', w.wristCurl?.series ?? (w.deload ? 2 : 3), {
        reps: '15', repos_sec: 45, rpe_cible: 6,
        description: `Résilience poignets/coudes.${dn} Protection tendineuse pour Handstand et Planche.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // JEUDI — Maison : Handstand + L-Sit + Core (~45 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Jeudi',
    nom: 'Maison — Handstand & L-Sit Core',
    exercices: [
      ...warmupCalisthenics(dn, 'Handstand et L-Sit'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15', repos_sec: 75, rpe_cible: 6,
        description: `Travail d'équilibre libre (2/3 sessions HS).${dn} Focus micro-ajustements des doigts et ligne droite.`,
      }),
      ex('Wall Handstand Toe Pulls', 'reps', 2, {
        reps: '4-6', repos_sec: 60, rpe_cible: 6,
        description: `Contrôle de l'équilibre.${dn} Face au mur, décoller un pied puis l'autre avec pression des doigts.`,
      }),
      ex(w.lSit.name, w.lSit.type, w.lSit.series, {
        ...(w.lSit.type === 'isometrique' ? { duree_sec: w.lSit.time } : { reps: w.lSit.reps }),
        repos_sec: 75, rpe_cible: w.lSit.rpe,
        description: `Progression L-Sit → Press to HS.${dn} Dépression scapulaire active, compression abdominale, jambes tendues.`,
      }),
      ex('Wall Handstand Shoulder Taps', 'reps', w.deload ? 2 : 3, {
        reps: '6-8', repos_sec: 75, rpe_cible: 6.5,
        description: `Stabilité unilatérale Handstand.${dn} Face au mur, transférer le poids et toucher l'épaule opposée.`,
      }),
      ex('Dragon Flag (Négatives / Holds)', 'reps', w.dragonFlag.series, {
        reps: w.dragonFlag.reps, repos_sec: 90, rpe_cible: w.dragonFlag.rpe,
        description: `Anti-extension lourde.${dn} Corps aligné, descente lente 3-4 s sans casser les hanches.`,
      }),
      ex('Hanging Knee-to-Chest Lift', 'reps', w.deload ? 2 : 3, {
        reps: '10', repos_sec: 60, rpe_cible: 6,
        description: `Compression abdominale suspendu.${dn} Montée explosive des genoux sans balancer.`,
      }),
      ex('Copenhagen Side Plank', 'isometrique', 2, {
        duree_sec: '15-20', repos_sec: 45, rpe_cible: 5,
        description: `Stabilité pelvienne et adducteurs.${dn} Renforcement bassin pour maintiens gymniques.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // VENDREDI — Maison : Front Lever #2 + Planche Lean + Skills (~50 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Vendredi',
    nom: 'Maison — Front Lever & Planche Skills',
    exercices: [
      ...warmupCalisthenics(dn, 'Front Lever et Planche'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15', repos_sec: 75, rpe_cible: 6,
        description: `Travail d'équilibre libre (3/3 sessions HS).${dn} Répétition des montées propres et recherche du point d'équilibre.`,
      }),
      ex('Scapular Handstand Shrugs', 'reps', 2, {
        reps: '8-10', repos_sec: 60, rpe_cible: 6,
        description: `Endurance scapulaire en élévation.${dn} Coudes verrouillés, pousser le sol pour élever et abaisser les omoplates.`,
      }),
      ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL.series, {
        duree_sec: w.tuckFL.time, repos_sec: 90, rpe_cible: w.tuckFL.rpe,
        description: `2e exposition FL.${dn} Focus pureté posturale et tenue isométrique sans compensation lombaire. 4 séries de 15s max.`,
      }),
      ex('Tuck Front Lever Negative', 'reps', w.flNeg.series, {
        reps: w.flNeg.reps, repos_sec: 90, rpe_cible: w.flNeg.rpe,
        description: `Remplace le FL Scapula Pull.${dn} Depuis le Tuck FL, descente contrôlée 5-8 secondes vers le Dead Hang. Renforce la dépression scapulaire et le contrôle excentrique. Plus accessible et plus transférable que le scapula pull.`,
      }),
      ex(w.planche.name, w.planche.type, w.planche.series, {
        ...(w.planche.type === 'isometrique' ? { duree_sec: w.planche.time } : { reps: w.planche.reps }),
        repos_sec: 75, rpe_cible: w.planche.rpe,
        description: `Planche Lean (exo maîtrisé, 15-20s propres).${dn} Protraction scapulaire maximale, coudes verrouillés, poids projeté vers l'avant. Progresse en durée chaque semaine.`,
      }),
      ex(w.archerPull.name, 'reps', w.archerPull.series, {
        reps: w.archerPull.reps, repos_sec: 90, rpe_cible: w.archerPull.rpe,
        description: `Force unilatérale de tirage calisthenics.${dn} Tirer vers un bras pendant que l'autre assiste bras tendu.`,
      }),
      ex('Band Biceps Curl', 'reps', w.bandCurl.series, {
        reps: w.bandCurl.reps, repos_sec: 60, rpe_cible: w.bandCurl.rpe,
        description: `Hypertrophie et protection tendons du coude.${dn} Pic de contraction 1 s.`,
      }),
      ex('Seated Pike Compression Leg Lift', 'reps', w.pikeCompress.series, {
        reps: w.pikeCompress.reps, repos_sec: 60, rpe_cible: w.pikeCompress.rpe,
        description: `Compression active abdos/psoas.${dn} Assis jambes tendues, lever les pieds (transfert L-Sit & Press to HS).`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // SAMEDI — Salle : Bas du corps + Explosivité (~55 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Samedi',
    nom: 'Salle — Bas du corps + Explosivité',
    exercices: [
      ...warmupLegs(dn),
      ex('Front Squat', 'reps', w.fsquat.series, {
        reps: w.fsquat.reps, repos_sec: 150, rpe_cible: w.fsquat.rpe,
        description: `Force bas du corps axiale.${dn} Buste vertical, coudes hauts. Baseline Mois 2: 60kg × 5. Progression conservative.`,
      }),
      ex('Countermovement Jump', 'reps', w.cmj.series, {
        reps: w.cmj.reps, repos_sec: 150, rpe_cible: w.cmj.rpe,
        description: `Explosivité détente verticale (VJ).${dn} Intention maximale sur chaque saut. Arrêter si la hauteur diminue.`,
      }),
      ex('Hang Power Clean', 'reps', w.clean.series, {
        reps: w.clean.reps, repos_sec: 150, rpe_cible: w.clean.rpe,
        description: `Production de force rapide.${dn} Extension triple explosive hanches-genoux-chevilles.`,
      }),
      ex('Bulgarian Split Squat', 'reps', w.bss.series, {
        reps: w.bss.reps, repos_sec: 120, rpe_cible: w.bss.rpe,
        description: `Force unilatérale.${dn} Stabilité genou, contrôle excentrique.`,
      }),
      ex('Romanian Deadlift', 'reps', w.rdl.series, {
        reps: w.rdl.reps, repos_sec: 120, rpe_cible: w.rdl.rpe,
        description: `Chaîne postérieure (ischios/fessiers).${dn} Charnière de hanche propre, dos neutre.`,
      }),
      ex('Pallof Press', 'reps', w.deload ? 2 : 3, {
        reps: '12', repos_sec: 45, rpe_cible: 6,
        description: `Anti-rotation du tronc.${dn} Résister à la torsion, stabilité du bassin.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // DIMANCHE — Salle : Récup + Muscle-Up + Mobilité (~40 min)
  // ═══════════════════════════════════════════════════════════════
  const sundayEx = [
    ...warmupSunday(dn),
    ex('Strict Muscle-Up (Qualité)', 'reps', w.muQuality.series, {
      reps: w.muQuality.reps, repos_sec: 120, rpe_cible: w.muQuality.rpe,
      description: `Maintenance Muscle-Up sur barre haute.${dn} Mouvement fluide et propre, transition symétrique sans élan excessif.`,
    }),
    ex('Handstand Balance Flow', 'isometrique', w.deload ? 2 : 3, {
      duree_sec: '10-15', repos_sec: 60, rpe_cible: 5,
      description: `Session handstand légère de fin de semaine.${dn} Plaisir du mouvement, pas de fatigue.`,
    }),
    ex('Shoulder Mobility Flow', 'isometrique', 1, {
      duree_sec: '600', repos_sec: 0, rpe_cible: 2,
      description: `Mobilité active épaules (10 min).${dn} Ouverture thoracique, flexion complète, rotation externe.`,
    }),
    ex('Hip Mobility Flow', 'isometrique', 1, {
      duree_sec: '600', repos_sec: 0, rpe_cible: 2,
      description: `Mobilité hanches et chevilles (10 min).${dn} Rotation interne/externe, fléchisseurs.`,
    }),
    ex('Dead Bug', 'reps', w.deload ? 2 : 3, {
      reps: '10', repos_sec: 45, rpe_cible: 4,
      description: `Coordination motrice et activation transverse.${dn} Respiration lente diaphragmatique.`,
    }),
    ex('Copenhagen Side Plank', 'isometrique', 2, {
      duree_sec: '15-20', repos_sec: 45, rpe_cible: 5,
      description: `Stabilité pelvienne latérale.${dn}`,
    }),
  ];

  if (w.sundayPlyo === 'light') {
    sundayEx.push(
      ex('Max Vertical Jump', 'reps', 3, {
        reps: '2', repos_sec: 150, rpe_cible: 5,
        description: `Rappel d'explosivité neuromusculaire.${dn} 2 sauts max avec récupération complète.`,
      }),
    );
  }

  seances.push({
    jour: 'Dimanche',
    nom: 'Salle — Récup active + Muscle-Up + Mobilité',
    exercices: sundayEx,
  });

  return { nom: w.nom, seances, note: w.note };
}

function exToYaml(exercise, indent) {
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 2);
  let lines = [`${pad}- nom: "${exercise.nom}"`];
  lines.push(`${pad2}type: ${exercise.type}`);
  lines.push(`${pad2}series: ${exercise.series}`);
  if (exercise.type === 'isometrique') lines.push(`${pad2}duree_sec: "${exercise.duree_sec}"`);
  else lines.push(`${pad2}reps: "${exercise.reps}"`);
  const desc = exercise.description.trim();
  if (desc.length > 75) {
    lines.push(`${pad2}description: >-`);
    const words = desc.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 72) {
        lines.push(`${pad2}  ${line.trim()}`);
        line = word + ' ';
      } else line += word + ' ';
    }
    if (line.trim()) lines.push(`${pad2}  ${line.trim()}`);
  } else {
    const q = desc.includes(':') || desc.includes('"') ? `"${desc.replace(/"/g, '\\"')}"` : desc;
    lines.push(`${pad2}description: ${q}`);
  }
  lines.push(`${pad2}repos_sec: ${exercise.repos_sec}`);
  lines.push(`${pad2}rpe_cible: ${exercise.rpe_cible}`);
  if (exercise.groupe) lines.push(`${pad2}groupe: "${exercise.groupe}"`);
  return lines.join('\n');
}

let out = `# Programme Athlète Hybride — v3.0 (Mois 2 — Octobre 2026)
# ─────────────────────────────────────────────────────────────────────────────
# LUNDI = REPOS COMPLET
# 6 séances par semaine : Mardi → Dimanche
# - Mardi : Salle — Force Upper (Bench 77kg baseline, Tractions lestées RESET +10kg→+15kg, Dips, OHP)
# - Mercredi : Maison — Front Lever + Handstand + HSPU prep + Core
# - Jeudi : Maison — Handstand + L-Sit + Core + Dragon Flag
# - Vendredi : Maison — Front Lever #2 + Planche Lean + Tirage Skills
# - Samedi : Salle — Bas du corps + Explosivité (Front Squat 60kg baseline)
# - Dimanche : Salle — Récup active + Muscle-Up + Mobilité
#
# CORRECTIONS MOIS 2:
# - Tractions lestées: RESET +10kg (build volume) → +12.5kg → +15kg en S5
# - Tuck Planche Hold: remplacé par Planche Lean (maîtrisé, 15-20s)
# - FL Scapula Pull: remplacé par Tuck FL Negatives (plus accessible)
# - Tuck FL Hold: plafonné à 4 séries × 15s (pas de série poubelle)
# - Toutes les séances ≤ 1h
# - Salle: Mardi, Samedi, Dimanche (au lieu de Mardi, Jeudi, Dimanche)
#
cycles:

`;

for (const w of WEEKS) {
  const week = buildWeek(w);
  out += `  - nom: "${week.nom}"\n\n`;
  out += `    # ${week.note}\n\n`;
  out += `    seances:\n\n`;
  for (const seance of week.seances) {
    out += `      ############################################################\n`;
    out += `      # ${DAY_LABELS[seance.jour]}\n`;
    out += `      ############################################################\n\n`;
    out += `      - jour: ${seance.jour}\n        nom: "${seance.nom}"\n\n        exercices:\n\n`;
    for (const e of seance.exercices) {
      out += exToYaml(e, 10) + '\n\n';
    }
  }
  out += '\n';
}

// Write to both web-v2 and web programme.yaml
const targets = [
  'apps/web-v2/programme.yaml',
  'apps/web/programme.yaml',
];

for (const target of targets) {
  fs.writeFileSync(target, out, 'utf8');
  console.log(`✓ Écrit dans ${target}`);
}

const parsed = load(out);
console.log('\n--- VÉRIFICATION PROGRAMME ---');
console.log('Semaines générées :', parsed.cycles.length);
parsed.cycles.forEach((c, i) => {
  const days = c.seances.map((s) => s.jour);
  const hasMon = days.includes('Lundi');
  const exCount = c.seances.reduce((a, s) => a + s.exercices.length, 0);
  console.log(`S${i + 1}: ${c.seances.length} séances [${days.join(', ')}] ${exCount} exercices ${hasMon ? '⚠ LUNDI PRÉSENT !' : '✓ Lundi libre'}`);
});
