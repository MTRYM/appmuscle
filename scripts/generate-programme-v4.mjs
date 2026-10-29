/**
 * Génère programme.yaml v4.0 — TRANSITION FIN MOIS 2 + MACROCYCLE 3 MOIS (Nov 2026 → Fév 2027)
 * Préparation Physique Olympique & Biomécanique Appliquée (Athlète 16 ans, 193 cm, 83 kg, envergure 195 cm, jambes 95 cm).
 *
 * Architecture des Cycles dans programme.yaml :
 * - Cycles 0 à 2 (Semaines 1-3 Mois 2 : 6 oct → 25 oct 2026) : Historique réalisé conservé à l'identique.
 * - Cycles 3 à 5 (Semaines 4-6 Mois 2 : 27 oct → 15 nov 2026) : Mis à jour immédiatement avec les corrections biomécaniques (suppression Tuck FL Negative douloureux, séparation FL/Planche, suppression flows 600s, ajout Cou maison).
 * - Cycles 6 à 18 (Semaines 1-13 Macrocycle 3 Mois : 16 nov 2026 → 14 fév 2027 — 78 séances) :
 *     • Bloc 1 (Cycles 6-10 | S1-S5) : Adaptation Tendineuse, Dépression Scapulaire & Ouverture Angulaire (Open-Hip Tuck FL & Tuck Planche Float)
 *     • Bloc 2 (Cycles 11-15 | S6-S10) : Intensification Levier (Single-Leg Half-Tuck → Adv Tuck FL & Tuck Planche) & Force Relative (Top-Set/Back-Off)
 *     • Bloc 3 (Cycles 16-18 | S11-S13) : Transmutation, Enchaînement L-Sit → Tuck Planche → Tuck HS & Réalisation / Validation
 *
 * Run: node scripts/generate-programme-v4.mjs
 */
import fs from 'fs';
import { load } from 'js-yaml';

const DAY_LABELS = {
  Mardi: 'TUESDAY — Salle (Force Upper Body & Rétraction Scapulaire)',
  Mercredi: 'WEDNESDAY — Maison (Front Lever #1 + Handstand/HSPU + Cou)',
  Jeudi: 'THURSDAY — Maison (Planche #1 + Transition L-Sit → Tuck HS + Core)',
  Vendredi: 'FRIDAY — Maison (Front Lever #2 + Force Planche + Tirage Horizontal + Cou)',
  Samedi: 'SATURDAY — Salle (Bas du corps + Explosivité PAP & Détente)',
  Dimanche: 'SUNDAY — Salle (Pliométrie Réactive + Muscle-Up + Préhab FL + Mobilité Structurée)',
};

function ex(nom, type, series, opts = {}) {
  const base = {
    nom,
    type,
    series,
    repos_sec: opts.repos_sec ?? 90,
    rpe_cible: opts.rpe_cible ?? 7,
  };
  if (type === 'isometrique') base.duree_sec = String(opts.duree_sec ?? '10');
  else base.reps = String(opts.reps ?? '8');
  base.description = opts.description ?? '';
  if (opts.groupe) base.groupe = opts.groupe;
  return base;
}

const WU = 'Échauffement';

function warmupPush(dn = '') {
  return [
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement push.${dn} Activation rétracteurs scapulaires et coiffe postérieure avant développé couché.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '10', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement push.${dn} Mobilisation protraction/rétraction du dentelé antérieur, coudes verrouillés.`,
    }),
    ex('Push-Up', 'reps', 2, {
      reps: '8', repos_sec: 45, rpe_cible: 4, groupe: WU,
      description: `Échauffement push.${dn} Montée en température pectoraux/triceps avec contrôle excentrique.`,
    }),
  ];
}

function warmupCalisthenicsPull(dn = '', focus = 'Front Lever & Handstand') {
  return [
    ex('Dead Hang', 'isometrique', 2, {
      duree_sec: '25', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement calisthenics.${dn} Décompression gléno-humérale et pré-tension fasciale pour ${focus}.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8-10', repos_sec: 45, rpe_cible: 3.5, groupe: WU,
      description: `Échauffement calisthenics.${dn} Dépression scapulaire stricte bras 100 % tendus, pause 1 s en haut.`,
    }),
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement calisthenics.${dn} Activation trapèze moyen/inférieur et stabilité d'épaule.`,
    }),
  ];
}

function warmupPlancheCore(dn = '') {
  return [
    ex('Wrist Warm-Up (Flexion & Extension Sol)', 'isometrique', 2, {
      duree_sec: '30', repos_sec: 20, rpe_cible: 3, groupe: WU,
      description: `Échauffement poignets.${dn} Bascules progressives avant/arrière et paumes retournées au sol avant Planche et L-Sit.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '12', repos_sec: 30, rpe_cible: 3.5, groupe: WU,
      description: `Échauffement spécifique Planche.${dn} Pousser le sol au maximum en haut (protraction + dépression scapulaire).`,
    }),
  ];
}

function warmupLegs(dn = '') {
  return [
    ex('Glute Bridge', 'reps', 2, {
      reps: '12', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement jambes.${dn} Activation grands fessiers et rétroversion pelvienne avant squat.`,
    }),
    ex('Bodyweight Squat', 'reps', 2, {
      reps: '10', repos_sec: 45, rpe_cible: 3, groupe: WU,
      description: `Échauffement jambes.${dn} Ouverture chevilles/hanches, buste vertical.`,
    }),
    ex('Jump Squat', 'reps', 2, {
      reps: '5', repos_sec: 60, rpe_cible: 4, groupe: WU,
      description: `Échauffement jambes.${dn} Potentiation neuromusculaire légère avant Front Squat et CMJ.`,
    }),
  ];
}

function warmupSunday(dn = '') {
  return [
    ex('Dead Hang', 'isometrique', 1, {
      duree_sec: '25', repos_sec: 30, rpe_cible: 2.5, groupe: WU,
      description: `Échauffement dimanche.${dn} Décompression axiale de la colonne et des épaules.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8', repos_sec: 30, rpe_cible: 3, groupe: WU,
      description: `Échauffement dimanche.${dn} Réveil scapulaire avant Muscle-Up.`,
    }),
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE A : CYCLES 0 À 2 — HISTORIQUE MOIS 2 (Semaines 1 à 3 : 6 oct → 25 oct)
// Conservés à l'identique pour l'intégrité des séances déjà validées en BDD.
// ═════════════════════════════════════════════════════════════════════════════

const LEGACY_WEEKS_1_TO_3 = [
  {
    nom: 'Semaine 1 — Reset & Fondations Volume',
    bench: { series: 4, reps: '4', rpe: 7 },
    larsen: { series: 2, reps: '5', rpe: 7 },
    wpu: { series: 4, reps: '5', rpe: 6.5, desc_override: 'Redescente à +10kg pour construire du volume propre. Suspension complète, tirage explosif, JAMAIS à l\'échec.' },
    ringDip: { series: 3, reps: '5', rpe: 6.5 },
    ohp: { series: 3, reps: '8', rpe: 7 },
    tuckFL: { series: 4, time: '15', rpe: 7 },
    flRaises: { series: 3, reps: '4-5', rpe: 7 },
    flNeg: { series: 3, reps: '3', rpe: 6.5 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '8-10', rpe: 7 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '15-20', rpe: 6.5 },
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
    note: 'Semaine 1 Mois 2 (Historique).',
  },
  {
    nom: 'Semaine 2 — Consolidation & Régularité',
    bench: { series: 4, reps: '4', rpe: 7.5 },
    larsen: { series: 2, reps: '5', rpe: 7.5 },
    wpu: { series: 4, reps: '5', rpe: 7, desc_override: '+10kg, focus qualité. Chaque rep doit être propre, menton au-dessus, descente complète.' },
    ringDip: { series: 3, reps: '5', rpe: 7 },
    ohp: { series: 3, reps: '8', rpe: 7.5 },
    tuckFL: { series: 4, time: '15', rpe: 7 },
    flRaises: { series: 3, reps: '5', rpe: 7 },
    flNeg: { series: 3, reps: '3', rpe: 7 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '10', rpe: 7.5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '18-22', rpe: 7 },
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
    note: 'Semaine 2 Mois 2 (Historique).',
  },
  {
    nom: 'Semaine 3 — Surcharge Progressive Pull',
    bench: { series: 4, reps: '3', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '5', rpe: 7, desc_override: 'Montée à +12.5kg. Volume de 5 reps propre.' },
    ringDip: { series: 3, reps: '5', rpe: 7 },
    ohp: { series: 2, reps: '8', rpe: 7.5 },
    tuckFL: { series: 4, time: '15', rpe: 7.5 },
    flRaises: { series: 3, reps: '5', rpe: 7.5 },
    flNeg: { series: 3, reps: '4', rpe: 7 },
    hspuPrep: { name: 'Wall Handstand Push-Up (Négatives)', series: 3, reps: '3-4', rpe: 7.5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '20-25', rpe: 7 },
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
    note: 'Semaine 3 Mois 2 (Historique).',
  },
];

function buildLegacyWeek(w) {
  const dn = w.deload ? ' (deload)' : '';
  return {
    nom: w.nom,
    note: w.note,
    seances: [
      {
        jour: 'Mardi',
        nom: 'Salle — Force Upper Body',
        exercices: [
          ...warmupPush(dn),
          ex('Bench Press', 'reps', w.bench.series, { reps: w.bench.reps, repos_sec: 180, rpe_cible: w.bench.rpe, description: `Lift push principal.${dn}` }),
          ex('Larsen Press', 'reps', w.larsen.series, { reps: w.larsen.reps, repos_sec: 150, rpe_cible: w.larsen.rpe, description: `Volume push sans pontage.${dn}` }),
          ex('Weighted Pull-Up', 'reps', w.wpu.series, { reps: w.wpu.reps, repos_sec: 180, rpe_cible: w.wpu.rpe, description: w.wpu.desc_override }),
          ex('Ring Dip', 'reps', w.ringDip.series, { reps: w.ringDip.reps, repos_sec: 120, rpe_cible: w.ringDip.rpe, description: `Dips aux barres parallèles.${dn}` }),
          ex('Standing Dumbbell Overhead Press', 'reps', w.ohp.series, { reps: w.ohp.reps, repos_sec: 120, rpe_cible: w.ohp.rpe, description: `Force verticale push.${dn}` }),
          ex('Cable External Rotation', 'reps', 3, { reps: '15', repos_sec: 45, rpe_cible: 6, description: `Prehab coiffe des rotateurs.${dn}` }),
        ],
      },
      {
        jour: 'Mercredi',
        nom: 'Maison — Front Lever + Handstand & HSPU',
        exercices: [
          ...warmupCalisthenicsPull(dn),
          ex('Handstand Freestanding Practice', 'isometrique', 3, { duree_sec: '10-15', repos_sec: 75, rpe_cible: 6, description: `Travail d'équilibre libre.${dn}` }),
          ex('Handstand Chest-to-Wall', 'isometrique', 2, { duree_sec: '20-30', repos_sec: 60, rpe_cible: 6, description: `Alignement et endurance posturale.${dn}` }),
          ex(w.hspuPrep.name, 'reps', w.hspuPrep.series, { reps: w.hspuPrep.reps, repos_sec: 90, rpe_cible: w.hspuPrep.rpe, description: `Progression HSPU.${dn}` }),
          ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL.series, { duree_sec: w.tuckFL.time, repos_sec: 90, rpe_cible: w.tuckFL.rpe, description: `Skill #1 profil.${dn}` }),
          ex('Front Lever Raises (Tuck)', 'reps', w.flRaises.series, { reps: w.flRaises.reps, repos_sec: 90, rpe_cible: w.flRaises.rpe, description: `Dynamique Front Lever.${dn}` }),
          ex('Hollow Body Hold', 'isometrique', w.coreHollow.series, { duree_sec: w.coreHollow.time, repos_sec: 60, rpe_cible: w.coreHollow.rpe, description: `Gainage fondamental.${dn}` }),
          ex('Reverse Wrist Curl', 'reps', 3, { reps: '15', repos_sec: 45, rpe_cible: 6, description: `Résilience poignets/coudes.${dn}` }),
        ],
      },
      {
        jour: 'Jeudi',
        nom: 'Maison — Handstand & L-Sit Core',
        exercices: [
          ...warmupCalisthenicsPull(dn),
          ex('Handstand Freestanding Practice', 'isometrique', 3, { duree_sec: '10-15', repos_sec: 75, rpe_cible: 6, description: `Équilibre libre.${dn}` }),
          ex('Wall Handstand Toe Pulls', 'reps', 2, { reps: '4-6', repos_sec: 60, rpe_cible: 6, description: `Contrôle de l'équilibre.${dn}` }),
          ex(w.lSit.name, w.lSit.type, w.lSit.series, { duree_sec: w.lSit.time, repos_sec: 75, rpe_cible: w.lSit.rpe, description: `Progression L-Sit.${dn}` }),
          ex('Wall Handstand Shoulder Taps', 'reps', 3, { reps: '6-8', repos_sec: 75, rpe_cible: 6.5, description: `Stabilité unilatérale.${dn}` }),
          ex('Dragon Flag (Négatives / Holds)', 'reps', w.dragonFlag.series, { reps: w.dragonFlag.reps, repos_sec: 90, rpe_cible: w.dragonFlag.rpe, description: `Anti-extension lourde.${dn}` }),
          ex('Hanging Knee-to-Chest Lift', 'reps', 3, { reps: '10', repos_sec: 60, rpe_cible: 6, description: `Compression abdominale.${dn}` }),
          ex('Copenhagen Side Plank', 'isometrique', 2, { duree_sec: '15-20', repos_sec: 45, rpe_cible: 5, description: `Stabilité pelvienne.${dn}` }),
        ],
      },
      {
        jour: 'Vendredi',
        nom: 'Maison — Front Lever & Planche Skills',
        exercices: [
          ...warmupCalisthenicsPull(dn),
          ex('Handstand Freestanding Practice', 'isometrique', 3, { duree_sec: '10-15', repos_sec: 75, rpe_cible: 6, description: `Équilibre libre.${dn}` }),
          ex('Scapular Handstand Shrugs', 'reps', 2, { reps: '8-10', repos_sec: 60, rpe_cible: 6, description: `Endurance scapulaire.${dn}` }),
          ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL.series, { duree_sec: w.tuckFL.time, repos_sec: 90, rpe_cible: w.tuckFL.rpe, description: `2e exposition FL.${dn}` }),
          ex('Tuck Front Lever Negative', 'reps', w.flNeg.series, { reps: w.flNeg.reps, repos_sec: 90, rpe_cible: w.flNeg.rpe, description: `Descente contrôlée.${dn}` }),
          ex(w.planche.name, w.planche.type, w.planche.series, { duree_sec: w.planche.time, repos_sec: 75, rpe_cible: w.planche.rpe, description: `Planche Lean.${dn}` }),
          ex(w.archerPull.name, 'reps', w.archerPull.series, { reps: w.archerPull.reps, repos_sec: 90, rpe_cible: w.archerPull.rpe, description: `Tirage unilatéral.${dn}` }),
          ex('Band Biceps Curl', 'reps', w.bandCurl.series, { reps: w.bandCurl.reps, repos_sec: 60, rpe_cible: w.bandCurl.rpe, description: `Protection coude.${dn}` }),
          ex('Seated Pike Compression Leg Lift', 'reps', w.pikeCompress.series, { reps: w.pikeCompress.reps, repos_sec: 60, rpe_cible: w.pikeCompress.rpe, description: `Compression active.${dn}` }),
        ],
      },
      {
        jour: 'Samedi',
        nom: 'Salle — Bas du corps + Explosivité',
        exercices: [
          ...warmupLegs(dn),
          ex('Front Squat', 'reps', w.fsquat.series, { reps: w.fsquat.reps, repos_sec: 150, rpe_cible: w.fsquat.rpe, description: `Force bas du corps.${dn}` }),
          ex('Countermovement Jump', 'reps', w.cmj.series, { reps: w.cmj.reps, repos_sec: 150, rpe_cible: w.cmj.rpe, description: `Explosivité verticale.${dn}` }),
          ex('Hang Power Clean', 'reps', w.clean.series, { reps: w.clean.reps, repos_sec: 150, rpe_cible: w.clean.rpe, description: `Puissance triple extension.${dn}` }),
          ex('Bulgarian Split Squat', 'reps', w.bss.series, { reps: w.bss.reps, repos_sec: 120, rpe_cible: w.bss.rpe, description: `Force unilatérale.${dn}` }),
          ex('Romanian Deadlift', 'reps', w.rdl.series, { reps: w.rdl.reps, repos_sec: 120, rpe_cible: w.rdl.rpe, description: `Chaîne postérieure.${dn}` }),
          ex('Pallof Press', 'reps', 3, { reps: '12', repos_sec: 45, rpe_cible: 6, description: `Anti-rotation.${dn}` }),
        ],
      },
      {
        jour: 'Dimanche',
        nom: 'Salle — Récup active + Muscle-Up + Mobilité',
        exercices: [
          ...warmupSunday(dn),
          ex('Strict Muscle-Up (Qualité)', 'reps', w.muQuality.series, { reps: w.muQuality.reps, repos_sec: 120, rpe_cible: w.muQuality.rpe, description: `Maintenance Muscle-Up.${dn}` }),
          ex('Handstand Balance Flow', 'isometrique', 3, { duree_sec: '10-15', repos_sec: 60, rpe_cible: 5, description: `Session handstand légère.${dn}` }),
          ex('Shoulder Mobility Flow', 'isometrique', 1, { duree_sec: '600', repos_sec: 0, rpe_cible: 2, description: `Mobilité épaules.${dn}` }),
          ex('Hip Mobility Flow', 'isometrique', 1, { duree_sec: '600', repos_sec: 0, rpe_cible: 2, description: `Mobilité hanches.${dn}` }),
          ex('Dead Bug', 'reps', 3, { reps: '10', repos_sec: 45, rpe_cible: 4, description: `Activation transverse.${dn}` }),
          ex('Copenhagen Side Plank', 'isometrique', 2, { duree_sec: '15-20', repos_sec: 45, rpe_cible: 5, description: `Stabilité pelvienne.${dn}` }),
        ],
      },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PARTIE B : ARCHITECTURE HAUTE PERFORMANCE (Cycles 3-5 Fin Mois 2 + Cycles 6-18 Macrocycle 3 Mois)
// 16 semaines :
//   - Cycles 3, 4, 5 : Semaines 4, 5, 6 du Mois 2 (27 oct → 15 nov 2026) corrigées immédiatement
//   - Cycles 6 à 18  : Semaines 1 à 13 du Macrocycle 3 Mois (16 nov 2026 → 14 fév 2027)
// ═════════════════════════════════════════════════════════════════════════════

const PRO_WEEKS = [
  // ───────────────────────────────────────────────────────────────────────────
  // TRANSITION IMMÉDIATE : FIN DU MOIS 2 (Cycles 3, 4, 5 : 27 oct → 15 nov 2026)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nom: 'Semaine 4 — Transition Biomécanique & Protection Coude',
    note: 'Correction immédiate : suppression du Tuck FL Negative douloureux, séparation FL (Mercredi) / Planche (Jeudi), TRX Row à la place de Archer Pull-Up, Cou à la maison, mobilité structurée le dimanche.',
    bench: { series: 4, reps: '4', rpe: 8, loadHint: '80 kg' },
    wpu: { series: 4, reps: '3-4', rpe: 7.5, loadHint: '+15 kg (vitesse concentrique max, zéro échec)' },
    dip: { series: 3, reps: '5', rpe: 7.5, loadHint: '+10 kg (barres parallèles)' },
    ohp: { series: 3, reps: '8', rpe: 7.5, loadHint: '22.5 kg/main (45 kg total)' },
    csRow: { series: 3, reps: '8-10', rpe: 7.5 },
    hsWed: { series: 3, time: '30-40', rpe: 6, desc: '3 à 4 entrées contrôlées par série : chercher la régularité du kick-up puis stabiliser 30-40 s.' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '10-12', rpe: 7.5, desc: 'Genoux reculés exactement à l\'aplomb des hanches (angle 90°). Dépression scapulaire active, bras verrouillés, bassin haut.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 2, time: '15', rpe: 7, desc: 'Consolidation technique en Tuck strict : dos plat, omoplates basses.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 3, reps: '4', rpe: 7.5, desc: 'Montée bras tendus jusqu\'à l\'horizontale, PAUSE STATIQUE 2 s pile à l\'horizontale, redescente contrôlée sans choc.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 3, reps: '2-3', rpe: 7.5, desc: '2 à 3 reps concentriques avec intention de vitesse maximale à la poussée + 1 descente freinée 3 s sur la dernière rep.' },
    plancheMainThu: { name: 'Tuck Planche Float (Décollement depuis Lean)', type: 'reps', series: 4, reps: '4', rpe: 7.5, desc: 'Sur coudes 100 % frais : partir en Planche Lean, grouper les genoux poitrine et décoller les orteils du sol pendant 1 à 2 s en protraction maximale.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '20-22', rpe: 7, desc: 'Pieds contre le mur pour fixer l\'angle exact. Mesurer la distance mains-mur au cm. Coudes verrouillés, omoplates protractées.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 4, time: '10-12', rpe: 7, desc: 'Jambes 100 % verrouillées (quadriceps contractés). Arrêter la série dès que les genoux commencent à fléchir.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '15', rpe: 6.5, desc: 'Équilibre en Handstand genoux groupés contre la poitrine (avec ou sans départ mur). Prépare la cible finale du L-Sit → Tuck HS.' },
    dragonThu: { series: 3, reps: '5', rpe: 7 },
    pikeThu: { series: 3, reps: '10', rpe: 7 },
    scapFlFri: { series: 3, reps: '5', rpe: 7, desc: 'Depuis le Dead Hang bras tendus, tirer les omoplates en dépression et monter le bassin groupé à 45° (pause 2 s).' },
    flMainFri: { name: 'Tuck Front Lever Hold', series: 4, time: '15', rpe: 7, desc: '2e exposition FL de la semaine : focus endurance scapulaire et zéro douleur au coude.' },
    pppuFri: { series: 3, reps: '6-8', rpe: 7.5, desc: 'Pieds contre le mur, mains à 45°, pause 2 s en haut en poussant le sol au maximum (protraction dentelé antérieur).' },
    rowFri: { series: 3, reps: '8-10', rpe: 7.5 },
    curlFri: { series: 3, reps: '12-15', rpe: 7 },
    fsquat: { series: 3, reps: '4', rpe: 7.5, loadHint: '60 kg (talons surélevés sur cales/disques 2.5 kg)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5, loadHint: '62.5 kg' },
    rdl: { series: 3, reps: '6', rpe: 7.5, loadHint: '90 kg' },
    bss: { series: 3, reps: '6', rpe: 7.5, loadHint: '45-50 kg' },
    calf: { series: 3, reps: '10', rpe: 7 },
    plyoSun: { series: 3, reps: '3', rpe: 6 },
    muSun: { series: 3, reps: '1-2', rpe: 7 },
    latPullSun: { series: 3, reps: '10', rpe: 7 },
  },
  {
    nom: 'Semaine 5 — Intensification Fin Mois 2',
    note: 'Bench à 82.5 kg × 3, Tractions lestées +15 kg × 4×4 propres, Open-Hip Tuck FL 12s, Tuck Planche Float 2-3s.',
    bench: { series: 4, reps: '3', rpe: 8, loadHint: '82.5 kg' },
    wpu: { series: 4, reps: '4', rpe: 7.5, loadHint: '+15 kg (4 séries de 4 reps explosives)' },
    dip: { series: 3, reps: '5', rpe: 7.5, loadHint: '+12.5 kg' },
    ohp: { series: 3, reps: '8', rpe: 8, loadHint: '22.5 kg/main (45 kg total)' },
    csRow: { series: 3, reps: '8-10', rpe: 7.5 },
    hsWed: { series: 3, time: '35-45', rpe: 6.5, desc: '3 à 4 entrées contrôlées par série : focus régularité d\'impulsion.' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '12', rpe: 7.5, desc: 'Genoux à 90-95° des hanches. Maintenir la dépression scapulaire sans laisser le bassin descendre.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 2, time: '15', rpe: 7, desc: 'Volume propre en Tuck strict.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 3, reps: '4-5', rpe: 7.5, desc: 'Pause isométrique de 2 s à l\'horizontale sur chaque rep.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '2-3', rpe: 8, desc: 'Poussée concentrique maximale + 1 négative de 3 s en fin de série.' },
    plancheMainThu: { name: 'Tuck Planche Float (Décollement depuis Lean)', type: 'reps', series: 4, reps: '4-5', rpe: 7.5, desc: 'Décoller les pieds 2 s complètes depuis le Planche Lean en gardant les bras verrouillés.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '22-25', rpe: 7.5, desc: 'Angle maximal mesuré au mur, protraction continue.' },
    lSitThu: { name: 'L-Sit to Tuck Press Transition Prep', type: 'reps', series: 4, reps: '3-4', rpe: 7.5, desc: 'Partir en L-Sit 2 s, grouper les genoux et basculer les épaules en avant en poussant le sol pour lever le bassin.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '15-20', rpe: 6.5, desc: 'Maintien groupé en Handstand libre ou départ mur.' },
    dragonThu: { series: 3, reps: '5-6', rpe: 7.5 },
    pikeThu: { series: 3, reps: '10-12', rpe: 7 },
    scapFlFri: { series: 3, reps: '5', rpe: 7, desc: 'Activation scapulaire FL : pause 2 s en dépression haute.' },
    flMainFri: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '10-12', rpe: 7.5, desc: 'Consolidation de l\'angle 90° hanches.' },
    pppuFri: { series: 4, reps: '6-8', rpe: 8, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en protraction haute.' },
    rowFri: { series: 3, reps: '8-10', rpe: 7.5 },
    curlFri: { series: 3, reps: '12-15', rpe: 7.5 },
    fsquat: { series: 3, reps: '4', rpe: 8, loadHint: '62.5 kg (talons surélevés sur cales)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '65 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '92.5 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '50 kg' },
    calf: { series: 3, reps: '10-12', rpe: 7.5 },
    plyoSun: { series: 3, reps: '3', rpe: 6 },
    muSun: { series: 3, reps: '2', rpe: 7.5 },
    latPullSun: { series: 3, reps: '10-12', rpe: 7.5 },
  },
  {
    nom: 'Semaine 6 — Deload & Régénération Pré-Macrocycle',
    deload: true,
    note: 'Semaine de régénération tendineuse et nerveuse (-40 % volume) avant d\'attaquer le Macrocycle de 3 mois le 16 novembre.',
    bench: { series: 3, reps: '5', rpe: 6, loadHint: '70 kg (deload fluide)' },
    wpu: { series: 3, reps: '4', rpe: 5.5, loadHint: '+10 kg (vitesse pure)' },
    dip: { series: 2, reps: '5', rpe: 5.5, loadHint: 'Poids du corps ou +5 kg' },
    ohp: { series: 2, reps: '8', rpe: 6, loadHint: '18-20 kg/main' },
    csRow: { series: 2, reps: '8', rpe: 6 },
    hsWed: { series: 2, time: '30', rpe: 5, desc: 'Entrées fluides sans fatigue.' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 3, time: '8-10', rpe: 5.5, desc: 'Deload tendineux : exécution parfaite et facile à 90°.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 1, time: '12', rpe: 5, desc: '1 série technique légère.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 2, reps: '3', rpe: 5.5, desc: '2 séries légères avec pause 1 s.' },
    hspuWed: { name: 'Elevated Pike Push-Up', series: 2, reps: '6', rpe: 5, desc: 'Deload poussée verticale.' },
    plancheMainThu: { name: 'Planche Lean (Pieds au mur)', type: 'isometrique', series: 3, time: '15', rpe: 5.5, desc: 'Deload poignets/coudes : protraction active modérée.' },
    plancheSubThu: { name: 'Scapular Planche Lean Hold', series: 2, time: '15', rpe: 5, desc: 'Focus dentelé antérieur sans angle extrême.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 2, time: '10', rpe: 5.5, desc: '2 séries propres jambes tendues.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 2, time: '12', rpe: 5, desc: 'Placement léger.' },
    dragonThu: { series: 2, reps: '4', rpe: 5 },
    pikeThu: { series: 2, reps: '8', rpe: 5 },
    scapFlFri: { series: 2, reps: '4', rpe: 5, desc: 'Activation scapulaire douce.' },
    flMainFri: { name: 'Tuck Front Lever Hold', series: 3, time: '10', rpe: 5, desc: 'Récupération active du coude.' },
    pppuFri: { series: 2, reps: '6', rpe: 5.5, desc: '2 séries techniques.' },
    rowFri: { series: 2, reps: '8', rpe: 5.5 },
    curlFri: { series: 2, reps: '12', rpe: 5.5 },
    fsquat: { series: 2, reps: '4', rpe: 6, loadHint: '50 kg (talons surélevés)' },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6, loadHint: '55 kg' },
    rdl: { series: 2, reps: '6', rpe: 6, loadHint: '75 kg' },
    bss: { series: 2, reps: '6', rpe: 6, loadHint: '40 kg' },
    calf: { series: 2, reps: '10', rpe: 5.5 },
    plyoSun: { series: 2, reps: '2', rpe: 5 },
    muSun: { series: 2, reps: '1', rpe: 5.5 },
    latPullSun: { series: 2, reps: '10', rpe: 5.5 },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BLOC 1 (Cycles 6 à 10 | S1 à S5 : 16 nov → 20 déc 2026)
  // FONDATIONS TENDINEUSES, DÉPRESSION SCAPULAIRE & OUVERTURE ANGULAIRE
  // ───────────────────────────────────────────────────────────────────────────
  {
    nom: 'Macrocycle Hiver · S1 (Bloc 1) — Fondations Scapula & Levier 90°',
    note: 'Début du Bloc 1 (16 nov). Bench 80 kg × 4×4, Weighted Pull-Up +15 kg × 4×3 explosifs, Open-Hip Tuck FL 4×10s (hanches 90°), Tuck Planche Float 4×4 décollements de 2s.',
    bench: { series: 4, reps: '4', rpe: 7.5, loadHint: '80 kg (pause 1s poitrine)' },
    wpu: { series: 4, reps: '3', rpe: 7, loadHint: '+15 kg (triplets ultra-explosifs, RPE 7)' },
    dip: { series: 3, reps: '5', rpe: 7, loadHint: '+10 kg (barres parallèles)' },
    ohp: { series: 3, reps: '8', rpe: 7.5, loadHint: '22.5 kg/main (45 kg total)' },
    csRow: { series: 3, reps: '10', rpe: 7.5 },
    hsWed: { series: 4, time: '30', rpe: 6, desc: 'Calibration d\'entrée : 4 entrées propres par série tenues 10 s fixes (total ~30-40 s sous tension).' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '10', rpe: 7.5, desc: 'Angle cuisses-buste à 90° exacts (genoux au-dessus des hanches). Verrouiller la dépression scapulaire avant d\'ouvrir.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 2, time: '15', rpe: 7, desc: '2 séries de volume postural en Tuck strict, bassin à hauteur d\'épaules.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 3, reps: '4', rpe: 7.5, desc: 'Montée concentrique jusqu\'à l\'horizontale + PAUSE 2 s à l\'horizontale + redescente contrôlée.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '2', rpe: 7.5, desc: '2 reps concentriques explosives au mur + 1 descente freinée 3 s.' },
    plancheMainThu: { name: 'Tuck Planche Float (Décollement depuis Lean)', type: 'reps', series: 4, reps: '4', rpe: 7.5, desc: 'Depuis Planche Lean, grouper les genoux contre la poitrine et décoller les orteils du sol pendant 2 s (4 reps par série).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '20', rpe: 7, desc: 'Pieds contre le mur à distance mesurée (noter les cm). Coudes 100 % tendus, protraction maximale.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 4, time: '10-12', rpe: 7, desc: 'Mains au sol, jambes 100 % tendues et verrouillées. Zéro flexion de genou tolérée.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '15', rpe: 6.5, desc: 'Handstand groupé (genoux poitrine) libre ou départ mur : prépare la réception du L-Sit → Tuck HS.' },
    dragonThu: { series: 3, reps: '5', rpe: 7 },
    pikeThu: { series: 3, reps: '10', rpe: 7 },
    scapFlFri: { series: 3, reps: '5', rpe: 7, desc: 'Scapular FL Pull-to-Hold : tirer les omoplates en dépression et monter le bassin groupé à 45° pendant 2 s.' },
    flMainFri: { name: 'Tuck Front Lever Hold', series: 4, time: '15', rpe: 7, desc: 'Consolidation isométrique sans fatigue coude.' },
    pppuFri: { series: 4, reps: '6', rpe: 7.5, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en haut en protraction scapulaire maximale.' },
    rowFri: { series: 3, reps: '8-10', rpe: 7.5 },
    curlFri: { series: 3, reps: '12-15', rpe: 7 },
    fsquat: { series: 4, reps: '4', rpe: 7, loadHint: '57.5 kg (talons surélevés sur cales, pause 1s en bas)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5, loadHint: '62.5 kg' },
    rdl: { series: 3, reps: '6', rpe: 7.5, loadHint: '90 kg' },
    bss: { series: 3, reps: '6', rpe: 7.5, loadHint: '45-50 kg' },
    calf: { series: 3, reps: '10-12', rpe: 7 },
    plyoSun: { series: 3, reps: '3', rpe: 6 },
    muSun: { series: 4, reps: '1-2', rpe: 7 },
    latPullSun: { series: 3, reps: '10-12', rpe: 7 },
  },
  {
    nom: 'Macrocycle Hiver · S2 (Bloc 1) — Progression Volume & Angle',
    note: 'Bench 80 kg × 4×4 (RPE en baisse), Weighted Pull-Up +15 kg × 4×4, Open-Hip Tuck FL 4×12s, Tuck Planche Float 4×5 décollements.',
    bench: { series: 4, reps: '4', rpe: 7.5, loadHint: '80-81 kg (explosif)' },
    wpu: { series: 4, reps: '4', rpe: 7.5, loadHint: '+15 kg (4×4 propres sans ralentir sur la 4e)' },
    dip: { series: 3, reps: '6', rpe: 7.5, loadHint: '+10 kg' },
    ohp: { series: 3, reps: '8', rpe: 7.5, loadHint: '22.5 kg/main' },
    csRow: { series: 3, reps: '10', rpe: 7.5 },
    hsWed: { series: 4, time: '35', rpe: 6, desc: '4 entrées consécutives tenues 10 s propres par série : 0 chute tolérée à l\'impulsion.' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '12', rpe: 7.5, desc: 'Angle cuisses-buste à 95-100°. Garder les côtes basses et les dorsaux engagés.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 2, time: '15', rpe: 7, desc: '2 séries techniques propres.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 3, reps: '5', rpe: 7.5, desc: '5 reps avec pause stricte de 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '2-3', rpe: 7.5, desc: '2 à 3 reps concentriques rapides au mur.' },
    plancheMainThu: { name: 'Tuck Planche Float (Décollement depuis Lean)', type: 'reps', series: 4, reps: '5', rpe: 7.5, desc: '5 décollements de 2 s par série depuis Planche Lean : sentir le transfert de poids dans les deltoïdes antérieurs.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '22', rpe: 7.5, desc: 'Avancer les mains d\'1 cm par rapport à S1. Coudes verrouillés.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 4, time: '12', rpe: 7.5, desc: '12 s jambes 100 % tendues, dépression scapulaire maximale.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '15-20', rpe: 6.5, desc: 'Stabiliser le Tuck Handstand librement 15-20 s.' },
    dragonThu: { series: 3, reps: '5-6', rpe: 7.5 },
    pikeThu: { series: 3, reps: '12', rpe: 7 },
    scapFlFri: { series: 3, reps: '5', rpe: 7, desc: 'Pause 2 s en dépression haute bras tendus.' },
    flMainFri: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '10', rpe: 7.5, desc: 'Passage du vendredi en Open-Hip Tuck 90° (4×10s).' },
    pppuFri: { series: 4, reps: '7', rpe: 7.5, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en haut.' },
    rowFri: { series: 3, reps: '10', rpe: 7.5 },
    curlFri: { series: 3, reps: '12-15', rpe: 7 },
    fsquat: { series: 4, reps: '4', rpe: 7.5, loadHint: '60 kg (talons surélevés sur cales, pause 1s)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5, loadHint: '62.5-65 kg' },
    rdl: { series: 3, reps: '6', rpe: 7.5, loadHint: '92.5 kg' },
    bss: { series: 3, reps: '6', rpe: 7.5, loadHint: '50 kg' },
    calf: { series: 3, reps: '12', rpe: 7.5 },
    plyoSun: { series: 3, reps: '3', rpe: 6 },
    muSun: { series: 4, reps: '1-2', rpe: 7 },
    latPullSun: { series: 3, reps: '12', rpe: 7.5 },
  },
  {
    nom: 'Macrocycle Hiver · S3 (Bloc 1) — Surcharge Mécanique & Levier 105°',
    note: 'Bench 82.5 kg × 4×3, Weighted Pull-Up +16.25 kg × 4×3, Introduction Single-Leg Half-Tuck FL (1 jambe à 45°) et décollements Tuck Planche de 3s.',
    bench: { series: 4, reps: '3', rpe: 8, loadHint: '82.5 kg' },
    wpu: { series: 4, reps: '3', rpe: 7.5, loadHint: '+16.25 kg (4 triplets explosifs)' },
    dip: { series: 3, reps: '5', rpe: 7.5, loadHint: '+12.5 kg' },
    ohp: { series: 3, reps: '6-8', rpe: 8, loadHint: '24 kg/main (48 kg total)' },
    csRow: { series: 3, reps: '8-10', rpe: 8 },
    hsWed: { series: 4, time: '40', rpe: 6.5, desc: '5 entrées consécutives tenues 8-10 s par série.' },
    flMainWed: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 4, time: '6-8', rpe: 8, desc: '1 jambe groupée, 1 jambe semi-tendue à 45° (alterner jambe G/D à chaque série). Augmente le bras de levier de 15 % sans casser le bassin.' },
    flSubWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 2, time: '12', rpe: 7.5, desc: '2 séries de consolidation à 90-100°.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 3, reps: '5', rpe: 8, desc: 'Pause 2 s à l\'horizontale, bras verrouillés.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '3', rpe: 8, desc: '3 reps concentriques propres au mur.' },
    plancheMainThu: { name: 'Tuck Planche Float (Maintien 2-3s)', type: 'isometrique', series: 5, time: '3-4', rpe: 8, desc: 'Décoller les pieds en Tuck Planche depuis le Lean et tenir 2 à 3 s stables (ou avec élastique léger 15 kg aux hanches).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '22-25', rpe: 7.5, desc: 'Distance maximale maîtrisée, omoplates rondes et basses.' },
    lSitThu: { name: 'L-Sit to Tuck Press Transition Prep', type: 'reps', series: 4, reps: '4', rpe: 7.5, desc: 'L-Sit 2 s → grouper les jambes sous le buste et monter le bassin au-dessus des mains.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20', rpe: 7, desc: '20 s en Tuck Handstand libre.' },
    dragonThu: { series: 3, reps: '6', rpe: 7.5 },
    pikeThu: { series: 3, reps: '12', rpe: 7.5 },
    scapFlFri: { series: 3, reps: '6', rpe: 7.5, desc: '6 reps avec pause 2 s en dépression haute.' },
    flMainFri: { name: 'Open-Hip Tuck Front Lever Hold', series: 4, time: '12', rpe: 7.5, desc: '4×12s à 95-100° d\'ouverture de hanche.' },
    pppuFri: { series: 4, reps: '7-8', rpe: 8, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en haut.' },
    rowFri: { series: 3, reps: '10', rpe: 8 },
    curlFri: { series: 3, reps: '12-15', rpe: 7.5 },
    fsquat: { series: 4, reps: '4', rpe: 7.5, loadHint: '60-62.5 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '65 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '95 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '50 kg' },
    calf: { series: 3, reps: '12', rpe: 7.5 },
    plyoSun: { series: 4, reps: '3', rpe: 6.5 },
    muSun: { series: 4, reps: '2', rpe: 7.5 },
    latPullSun: { series: 3, reps: '12', rpe: 7.5 },
  },
  {
    nom: 'Macrocycle Hiver · S4 (Bloc 1) — Pic d\'Accumulation Bloc 1',
    note: 'Pic de charge du Bloc 1 avant Deload : Bench 82.5 kg × 4×4, Weighted Pull-Up +17.5 kg × 4×3, Single-Leg Half-Tuck FL 5×8s, Tuck Planche Float 5×4s.',
    bench: { series: 4, reps: '4', rpe: 8.5, loadHint: '82.5 kg (objectif 4×4 validé)' },
    wpu: { series: 4, reps: '3', rpe: 8, loadHint: '+17.5 kg (4×3 propres et rapides)' },
    dip: { series: 3, reps: '5', rpe: 8, loadHint: '+12.5-15 kg' },
    ohp: { series: 3, reps: '8', rpe: 8, loadHint: '24 kg/main (48 kg total)' },
    csRow: { series: 3, reps: '10', rpe: 8 },
    hsWed: { series: 4, time: '45', rpe: 6.5, desc: '5 entrées consécutives tenues 10 s sans échec.' },
    flMainWed: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 5, time: '7-8', rpe: 8, desc: '5 séries de 7-8 s en Single-Leg Half-Tuck. Bassin strictement aligné aux épaules.' },
    flSubWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 2, time: '12', rpe: 7.5, desc: 'Back-off technique à 90-100°.' },
    flDynWed: { name: 'Paused Front Lever Raises (Open-Tuck)', series: 3, reps: '4-5', rpe: 8, desc: 'Pause 2 s à l\'horizontale avec angle de hanche ouvert à 90°.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '3', rpe: 8, desc: '3 reps concentriques rapides + 1 négative 3 s.' },
    plancheMainThu: { name: 'Tuck Planche Float (Maintien 3-4s)', type: 'isometrique', series: 5, time: '4', rpe: 8, desc: '5 séries de maintien 3-4 s en Tuck Planche (décollement libre court ou assistance minimale).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '25', rpe: 8, desc: '3×25s à distance maximale.' },
    lSitThu: { name: 'L-Sit to Tuck Press Transition Prep', type: 'reps', series: 4, reps: '4-5', rpe: 8, desc: 'L-Sit 2 s → passage groupé vers l\'avant en décollant les pieds.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20', rpe: 7, desc: 'Contrôle complet du Tuck Handstand.' },
    dragonThu: { series: 3, reps: '6', rpe: 8 },
    pikeThu: { series: 3, reps: '12', rpe: 8 },
    scapFlFri: { series: 3, reps: '6', rpe: 7.5, desc: '6 reps avec pause 2 s.' },
    flMainFri: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 4, time: '6-7', rpe: 8, desc: '2e exposition Single-Leg Half-Tuck de la semaine.' },
    pppuFri: { series: 4, reps: '8', rpe: 8, desc: '4×8 avec pause 2 s en protraction haute.' },
    rowFri: { series: 3, reps: '10', rpe: 8 },
    curlFri: { series: 3, reps: '15', rpe: 7.5 },
    fsquat: { series: 4, reps: '4', rpe: 8, loadHint: '62.5 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '65-67.5 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '95 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '50-52.5 kg' },
    calf: { series: 3, reps: '12', rpe: 8 },
    plyoSun: { series: 4, reps: '3', rpe: 6.5 },
    muSun: { series: 4, reps: '2', rpe: 8 },
    latPullSun: { series: 3, reps: '12', rpe: 8 },
  },
  {
    nom: 'Macrocycle Hiver · S5 (Bloc 1) — Deload & Surcompensation Tendineuse #1',
    deload: true,
    note: 'Semaine de Deload #1 (15-20 déc) : réduction du volume de 40 % pour permettre le remodelage du collagène tendineux (coude/épaules) avant le Bloc 2.',
    bench: { series: 3, reps: '4', rpe: 6, loadHint: '72.5 kg (vitesse max)' },
    wpu: { series: 3, reps: '3', rpe: 5.5, loadHint: '+12.5 kg (explosif)' },
    dip: { series: 2, reps: '5', rpe: 5.5, loadHint: '+5-10 kg' },
    ohp: { series: 2, reps: '8', rpe: 6, loadHint: '20 kg/main' },
    csRow: { series: 2, reps: '8', rpe: 6 },
    hsWed: { series: 2, time: '30', rpe: 5, desc: 'Entrées techniques sans fatigue.' },
    flMainWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 3, time: '8-10', rpe: 5.5, desc: 'Deload actif : 3 séries propres à 90°.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 1, time: '12', rpe: 5, desc: '1 série technique.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 2, reps: '3', rpe: 5.5, desc: '2 séries fluides.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 2, reps: '2', rpe: 6, desc: '2×2 rapides sans négative.' },
    plancheMainThu: { name: 'Tuck Planche Float (Décollement depuis Lean)', type: 'reps', series: 2, reps: '3', rpe: 5.5, desc: 'Réveil neuromusculaire léger sans fatigue.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 2, time: '15', rpe: 5.5, desc: '2×15s techniques.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 2, time: '10', rpe: 5.5, desc: '2×10s jambes verrouillées.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 2, time: '12', rpe: 5, desc: 'Placement léger.' },
    dragonThu: { series: 2, reps: '4', rpe: 5 },
    pikeThu: { series: 2, reps: '8', rpe: 5 },
    scapFlFri: { series: 2, reps: '4', rpe: 5, desc: 'Activation douce.' },
    flMainFri: { name: 'Tuck Front Lever Hold', series: 3, time: '10', rpe: 5, desc: '3×10s très faciles.' },
    pppuFri: { series: 2, reps: '6', rpe: 5.5, desc: '2×6 techniques.' },
    rowFri: { series: 2, reps: '8', rpe: 5.5 },
    curlFri: { series: 2, reps: '12', rpe: 5.5 },
    fsquat: { series: 2, reps: '4', rpe: 6, loadHint: '52.5 kg (talons surélevés)' },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6, loadHint: '55 kg' },
    rdl: { series: 2, reps: '6', rpe: 6, loadHint: '80 kg' },
    bss: { series: 2, reps: '6', rpe: 6, loadHint: '40 kg' },
    calf: { series: 2, reps: '10', rpe: 5.5 },
    plyoSun: { series: 2, reps: '2', rpe: 5 },
    muSun: { series: 2, reps: '1', rpe: 5.5 },
    latPullSun: { series: 2, reps: '10', rpe: 5.5 },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BLOC 2 (Cycles 11 à 15 | S6 à S10 : 21 déc 2026 → 24 jan 2027)
  // INTENSIFICATION ISOMÉTRIQUE (ADV TUCK FL & TUCK PLANCHE) & FORCE RELATIVE
  // ───────────────────────────────────────────────────────────────────────────
  {
    nom: 'Macrocycle Hiver · S6 (Bloc 2) — Entrée en Advanced Tuck FL & Tuck Planche',
    note: 'Début du Bloc 2 (21 déc). Introduction de l\'Advanced Tuck FL (dos plat, hanches ouvertes à 110°) en séries courtes de haute qualité (5×4-5s) et essais directs de Tuck Planche.',
    bench: { series: 4, reps: '3', rpe: 8, loadHint: '85 kg' },
    wpu: { series: 4, reps: '3-4', rpe: 7.5, loadHint: '1 Top-Set à +17.5 kg × 4 + 3 Back-Off à +15 kg × 4 (vitesse maximale)' },
    dip: { series: 3, reps: '5', rpe: 7.5, loadHint: '+15 kg' },
    ohp: { series: 3, reps: '6', rpe: 7.5, loadHint: '25 kg/main (50 kg total)' },
    csRow: { series: 3, reps: '8-10', rpe: 8 },
    hsWed: { series: 3, time: '45', rpe: 6.5, desc: '3 séries : entrée directe → 15 s droit → passage en Tuck Handstand 10 s → remonter droit.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 5, time: '4-5', rpe: 8, desc: '5 séries courtes de 4-5 s IRRÉPROCHABLES : cuisses ouvertes à 110°, dos 100 % plat, dépression scapulaire verrouillée. Couper avant que le bassin ne baisse.' },
    flSubWed: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 2, time: '8', rpe: 7.5, desc: '2 séries de volume spécifique après l\'Adv Tuck.' },
    flDynWed: { name: 'Paused Front Lever Raises (Open-Tuck)', series: 3, reps: '5', rpe: 8, desc: 'Pause 2 s à l\'horizontale en Open-Tuck.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '3', rpe: 8, desc: '3 reps concentriques explosives au mur.' },
    plancheMainThu: { name: 'Tuck Planche Hold (Essais Courts / Float)', type: 'isometrique', series: 5, time: '3-4', rpe: 8, desc: '5 séries de 3-4 s en Tuck Planche au sol (décollement libre de 2-3 s ou élastique fin 15 kg).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '22-25', rpe: 7.5, desc: 'Maintien angulaire fort bras verrouillés.' },
    lSitThu: { name: 'L-Sit to Tuck Planche Rock', type: 'reps', series: 4, reps: '4', rpe: 8, desc: 'Partir en L-Sit 2 s → grouper les jambes et basculer en Tuck Planche Float 1-2 s sans poser les pieds !' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20', rpe: 7, desc: 'Maîtrise de l\'équilibre en Tuck Handstand.' },
    dragonThu: { series: 3, reps: '6', rpe: 8 },
    pikeThu: { series: 3, reps: '12', rpe: 7.5 },
    scapFlFri: { series: 3, reps: '6', rpe: 7.5, desc: 'Pause 2 s en dépression haute.' },
    flMainFri: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 4, time: '8', rpe: 7.5, desc: 'Volume spécifique en Single-Leg Half-Tuck.' },
    pppuFri: { series: 4, reps: '8', rpe: 8, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en protraction haute.' },
    rowFri: { series: 3, reps: '10', rpe: 8 },
    curlFri: { series: 3, reps: '12-15', rpe: 7.5 },
    fsquat: { series: 4, reps: '4', rpe: 7.5, loadHint: '62.5 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '65 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '95 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '52.5 kg' },
    calf: { series: 3, reps: '12', rpe: 7.5 },
    plyoSun: { series: 4, reps: '3', rpe: 6.5 },
    muSun: { series: 4, reps: '2', rpe: 7.5 },
    latPullSun: { series: 3, reps: '12', rpe: 7.5 },
  },
  {
    nom: 'Macrocycle Hiver · S7 (Bloc 2) — Consolidation Adv Tuck FL & Force Push/Pull',
    note: 'Bench 85 kg × 4×4, Weighted Pull-Up Top-Set +18.75 kg × 3 + Back-Off +16.25 kg, Adv Tuck FL 5×5-6s, Tuck Planche Hold 5×4s.',
    bench: { series: 4, reps: '4', rpe: 8, loadHint: '85 kg' },
    wpu: { series: 4, reps: '3', rpe: 8, loadHint: '1 Top-Set à +18.75 kg × 3 + 3 Back-Off à +16.25 kg × 3' },
    dip: { series: 3, reps: '5', rpe: 8, loadHint: '+15 kg' },
    ohp: { series: 3, reps: '6-7', rpe: 8, loadHint: '25 kg/main (50 kg total)' },
    csRow: { series: 3, reps: '10', rpe: 8 },
    hsWed: { series: 3, time: '45', rpe: 6.5, desc: 'Transitions Handstand droit ↔ Tuck Handstand en contrôle.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 5, time: '5-6', rpe: 8, desc: '5 séries de 5-6 s propres en Advanced Tuck FL.' },
    flSubWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 2, time: '12', rpe: 7.5, desc: '2 séries de consolidation à 100°.' },
    flDynWed: { name: 'Paused Front Lever Raises (Open-Tuck)', series: 3, reps: '5', rpe: 8, desc: 'Pause 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '3-4', rpe: 8, desc: '3 à 4 reps concentriques explosives au mur + 1 essai libre en début de séance si frais.' },
    plancheMainThu: { name: 'Tuck Planche Hold (Essais Courts / Float)', type: 'isometrique', series: 5, time: '4', rpe: 8, desc: 'Chercher 3 à 4 s de décollement libre en Tuck Planche sur les 2 premières séries, puis float contrôlé.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '25', rpe: 8, desc: '3×25s protraction maximale.' },
    lSitThu: { name: 'L-Sit to Tuck Planche Rock', type: 'reps', series: 4, reps: '4-5', rpe: 8, desc: 'Enchaîner L-Sit 2 s → Tuck Planche Float 2 s sans poser les talons.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20', rpe: 7, desc: 'Stabilisation basse du Tuck HS.' },
    dragonThu: { series: 3, reps: '6', rpe: 8 },
    pikeThu: { series: 3, reps: '12', rpe: 8 },
    scapFlFri: { series: 3, reps: '6', rpe: 7.5, desc: 'Pause 2 s en dépression haute.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '4-5', rpe: 8, desc: 'Passage du vendredi en Advanced Tuck FL (4×4-5s propres).' },
    pppuFri: { series: 4, reps: '8', rpe: 8, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en haut.' },
    rowFri: { series: 3, reps: '10', rpe: 8 },
    curlFri: { series: 3, reps: '15', rpe: 7.5 },
    fsquat: { series: 4, reps: '4', rpe: 8, loadHint: '62.5-65 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '67.5 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '97.5 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '52.5 kg' },
    calf: { series: 3, reps: '12', rpe: 8 },
    plyoSun: { series: 4, reps: '3', rpe: 6.5 },
    muSun: { series: 4, reps: '2', rpe: 7.5 },
    latPullSun: { series: 3, reps: '12', rpe: 8 },
  },
  {
    nom: 'Macrocycle Hiver · S8 (Bloc 2) — Surcharge Spécifique & Transitions',
    note: 'Bench 86-87.5 kg × 4×3, Weighted Pull-Up Top-Set +18.75 kg × 4, Adv Tuck FL 5×6s, Tuck Planche Hold 5×4-5s.',
    bench: { series: 4, reps: '3', rpe: 8.5, loadHint: '86-87.5 kg' },
    wpu: { series: 4, reps: '3-4', rpe: 8, loadHint: '1 Top-Set à +18.75 kg × 4 + 3 Back-Off à +16.25 kg × 4' },
    dip: { series: 3, reps: '5', rpe: 8, loadHint: '+16.25-17.5 kg' },
    ohp: { series: 3, reps: '7-8', rpe: 8, loadHint: '25 kg/main (50 kg total)' },
    csRow: { series: 3, reps: '10', rpe: 8 },
    hsWed: { series: 3, time: '45', rpe: 6.5, desc: 'Contrôle complet Handstand libre + descente en Tuck HS.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 5, time: '6', rpe: 8, desc: '5 séries de 6 s en Advanced Tuck FL : bassin verrouillé, omoplates basses.' },
    flSubWed: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 2, time: '8-10', rpe: 7.5, desc: '2 séries de volume en Single-Leg.' },
    flDynWed: { name: 'Paused Front Lever Raises (Adv Tuck)', series: 3, reps: '4', rpe: 8, desc: 'Montée en Adv Tuck + pause 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '3-4', rpe: 8, desc: '1 essai de HSPU libre en poussant vite sur la 1re série, puis 3 séries de 3-4 reps explosives au mur.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 5, time: '4-5', rpe: 8, desc: 'Maintien Tuck Planche libre 3-5 s sur les premières séries (genoux serrés poitrine, bras verrouillés).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '25', rpe: 8, desc: 'Consolidation de l\'angle maximal.' },
    lSitThu: { name: 'L-Sit to Tuck Planche Rock', type: 'reps', series: 4, reps: '5', rpe: 8, desc: '5 transitions fluides L-Sit → Tuck Planche Float par série.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20-25', rpe: 7, desc: '20-25 s en Tuck Handstand libre.' },
    dragonThu: { series: 3, reps: '6', rpe: 8 },
    pikeThu: { series: 3, reps: '12', rpe: 8 },
    scapFlFri: { series: 3, reps: '6', rpe: 8, desc: 'Pause 2 s en dépression haute.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '5', rpe: 8, desc: '4×5s propres en Advanced Tuck FL.' },
    pppuFri: { series: 4, reps: '8', rpe: 8.5, desc: 'Pseudo Planche Push-Up pieds au mur, pause 2 s en haut.' },
    rowFri: { series: 3, reps: '10', rpe: 8 },
    curlFri: { series: 3, reps: '15', rpe: 7.5 },
    fsquat: { series: 4, reps: '4', rpe: 8, loadHint: '65 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8, loadHint: '67.5 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '100 kg' },
    bss: { series: 3, reps: '6', rpe: 8, loadHint: '55 kg' },
    calf: { series: 3, reps: '12', rpe: 8 },
    plyoSun: { series: 4, reps: '3', rpe: 6.5 },
    muSun: { series: 4, reps: '2', rpe: 8 },
    latPullSun: { series: 3, reps: '12', rpe: 8 },
  },
  {
    nom: 'Macrocycle Hiver · S9 (Bloc 2) — Pic d\'Intensité Pré-Deload',
    note: 'Pic du Bloc 2 : Bench 87.5 kg × 4×3, Weighted Pull-Up Top-Set +20 kg × 3, Adv Tuck FL 5×6-7s, Tuck Planche Hold 5×5s.',
    bench: { series: 4, reps: '3', rpe: 8.5, loadHint: '87.5 kg' },
    wpu: { series: 4, reps: '3', rpe: 8.5, loadHint: '1 Top-Set à +20 kg × 3 + 3 Back-Off à +17.5 kg × 3' },
    dip: { series: 3, reps: '5', rpe: 8.5, loadHint: '+17.5 kg' },
    ohp: { series: 3, reps: '6', rpe: 8.5, loadHint: '26 kg/main (52 kg total)' },
    csRow: { series: 3, reps: '10', rpe: 8.5 },
    hsWed: { series: 3, time: '45', rpe: 7, desc: 'Contrôle total Handstand libre + transitions Tuck.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 5, time: '6-7', rpe: 8.5, desc: '5 séries de 6-7 s en Advanced Tuck FL.' },
    flSubWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 2, time: '12-15', rpe: 8, desc: '2 séries back-off.' },
    flDynWed: { name: 'Paused Front Lever Raises (Adv Tuck)', series: 3, reps: '4-5', rpe: 8.5, desc: 'Pause 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 4, reps: '4', rpe: 8.5, desc: '1 essai libre + 3×4 reps explosives au mur.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 5, time: '5', rpe: 8.5, desc: '5 séries de 4-5 s en Tuck Planche au sol.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 3, time: '25-30', rpe: 8, desc: 'Angle maximal.' },
    lSitThu: { name: 'L-Sit to Tuck Planche Rock', type: 'reps', series: 4, reps: '5', rpe: 8.5, desc: 'L-Sit 2 s → maintien Tuck Planche 2 s en fin de transition.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '25', rpe: 7.5, desc: 'Maintien groupé bas.' },
    dragonThu: { series: 3, reps: '6', rpe: 8.5 },
    pikeThu: { series: 3, reps: '12-15', rpe: 8 },
    scapFlFri: { series: 3, reps: '6', rpe: 8, desc: 'Pause 2 s en dépression haute.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '5-6', rpe: 8, desc: '4×5-6s en Advanced Tuck FL.' },
    pppuFri: { series: 4, reps: '8', rpe: 8.5, desc: '4×8 avec pause 2 s en haut.' },
    rowFri: { series: 3, reps: '10', rpe: 8.5 },
    curlFri: { series: 3, reps: '15', rpe: 8 },
    fsquat: { series: 4, reps: '4', rpe: 8.5, loadHint: '65-67.5 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8.5, loadHint: '67.5-70 kg' },
    rdl: { series: 3, reps: '6', rpe: 8.5, loadHint: '100 kg' },
    bss: { series: 3, reps: '6', rpe: 8.5, loadHint: '55 kg' },
    calf: { series: 3, reps: '12', rpe: 8 },
    plyoSun: { series: 4, reps: '3', rpe: 7 },
    muSun: { series: 4, reps: '2', rpe: 8 },
    latPullSun: { series: 3, reps: '12', rpe: 8 },
  },
  {
    nom: 'Macrocycle Hiver · S10 (Bloc 2) — Deload Nerveux & Surcompensation #2',
    deload: true,
    note: 'Semaine de Deload #2 (19-24 jan 2027) : dissipation complète de la fatigue centrale et tendineuse avant le Bloc 3 de Réalisation.',
    bench: { series: 3, reps: '4', rpe: 6, loadHint: '75 kg (vitesse pure)' },
    wpu: { series: 3, reps: '3', rpe: 5.5, loadHint: '+12.5 kg' },
    dip: { series: 2, reps: '5', rpe: 5.5, loadHint: '+10 kg' },
    ohp: { series: 2, reps: '6', rpe: 6, loadHint: '20-22.5 kg/main' },
    csRow: { series: 2, reps: '8', rpe: 6 },
    hsWed: { series: 2, time: '30', rpe: 5, desc: 'Entrées fluides.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 3, time: '4', rpe: 6, desc: '3×4s très faciles pour garder le recrutement nerveux sans fatigue.' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 1, time: '12', rpe: 5, desc: '1 série technique.' },
    flDynWed: { name: 'Paused Front Lever Raises (Tuck)', series: 2, reps: '3', rpe: 5.5, desc: '2×3 fluides.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 2, reps: '2', rpe: 6, desc: '2×2 rapides.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 3, time: '3', rpe: 6, desc: '3 activations courtes de 3 s.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 2, time: '15', rpe: 5.5, desc: '2×15s techniques.' },
    lSitThu: { name: 'L-Sit Hold (Mains au sol)', type: 'isometrique', series: 2, time: '10', rpe: 5.5, desc: '2×10s propres.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 2, time: '15', rpe: 5, desc: 'Placement léger.' },
    dragonThu: { series: 2, reps: '4', rpe: 5 },
    pikeThu: { series: 2, reps: '8', rpe: 5 },
    scapFlFri: { series: 2, reps: '4', rpe: 5, desc: 'Activation douce.' },
    flMainFri: { name: 'Open-Hip Tuck Front Lever Hold', series: 3, time: '8', rpe: 5.5, desc: '3×8s faciles.' },
    pppuFri: { series: 2, reps: '6', rpe: 5.5, desc: '2×6 techniques.' },
    rowFri: { series: 2, reps: '8', rpe: 5.5 },
    curlFri: { series: 2, reps: '12', rpe: 5.5 },
    fsquat: { series: 2, reps: '4', rpe: 6, loadHint: '55 kg (talons surélevés)' },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6, loadHint: '57.5 kg' },
    rdl: { series: 2, reps: '6', rpe: 6, loadHint: '80 kg' },
    bss: { series: 2, reps: '6', rpe: 6, loadHint: '45 kg' },
    calf: { series: 2, reps: '10', rpe: 5.5 },
    plyoSun: { series: 2, reps: '2', rpe: 5 },
    muSun: { series: 2, reps: '1', rpe: 5.5 },
    latPullSun: { series: 2, reps: '10', rpe: 5.5 },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BLOC 3 (Cycles 16 à 18 | S11 à S13 : 25 jan → 14 fév 2027)
  // TRANSMUTATION, COMBO L-SIT → TUCK → HS & VALIDATION DES SKILLS
  // ───────────────────────────────────────────────────────────────────────────
  {
    nom: 'Macrocycle Hiver · S11 (Bloc 3) — Spécificité Adv Tuck FL & Tuck Planche Libre',
    note: 'Début du Bloc 3 (25 jan 2027) : volume accessoire réduit pour maximiser la fraîcheur nerveuse sur l\'Advanced Tuck FL (6-8s), la Tuck Planche libre (4-6s) et le combo L-Sit → Tuck.',
    bench: { series: 4, reps: '3', rpe: 8, loadHint: '87.5 kg (consolidation en vitesse)' },
    wpu: { series: 4, reps: '3', rpe: 8, loadHint: '+20 kg × 3×3 + 1 Back-Off à +17.5 kg × 4' },
    dip: { series: 3, reps: '5', rpe: 8, loadHint: '+17.5 kg' },
    ohp: { series: 3, reps: '6', rpe: 8, loadHint: '26 kg/main (52 kg total)' },
    csRow: { series: 3, reps: '8', rpe: 7.5 },
    hsWed: { series: 3, time: '45', rpe: 6.5, desc: '100 % de réussite à l\'entrée + contrôle Tuck HS.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '6-8', rpe: 8, desc: '4 séries de 6-8 s en Advanced Tuck FL sur fraîcheur nerveuse maximale (repos 120 s).' },
    flSubWed: { name: 'Single-Leg Half-Tuck Front Lever Hold', series: 2, time: '8-10', rpe: 7.5, desc: '2 séries de consolidation.' },
    flDynWed: { name: 'Paused Front Lever Raises (Adv Tuck)', series: 3, reps: '4', rpe: 8, desc: 'Pause 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 3, reps: '3-4', rpe: 8, desc: '1 à 2 essais de HSPU libre en poussée rapide + 2 séries explosives au mur.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 5, time: '4-6', rpe: 8, desc: '5 séries de maintien libre en Tuck Planche au sol (repos complet 120 s entre les séries).' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 2, time: '25', rpe: 7.5, desc: '2 séries d\'activation angulaire.' },
    lSitThu: { name: 'Combo L-Sit → Tuck Planche → Bent-Arm Press Prep', type: 'reps', series: 4, reps: '3', rpe: 8, desc: 'Tenir L-Sit 2 s → passer en Tuck Planche 2 s → pousser les hanches vers le haut en début de Tuck Handstand.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 3, time: '20', rpe: 7, desc: 'Réception et maintien stable en Tuck Handstand.' },
    dragonThu: { series: 3, reps: '6', rpe: 8 },
    pikeThu: { series: 2, reps: '12', rpe: 7.5 },
    scapFlFri: { series: 3, reps: '5', rpe: 7.5, desc: 'Activation scapulaire.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '6', rpe: 8, desc: '4×6s propres en Advanced Tuck FL.' },
    pppuFri: { series: 3, reps: '8', rpe: 8, desc: '3×8 avec pause 2 s en protraction haute.' },
    rowFri: { series: 3, reps: '8-10', rpe: 7.5 },
    curlFri: { series: 2, reps: '15', rpe: 7 },
    fsquat: { series: 3, reps: '4', rpe: 8, loadHint: '65 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 3, reps: '2', rpe: 8, loadHint: '67.5-70 kg' },
    rdl: { series: 3, reps: '6', rpe: 8, loadHint: '100 kg' },
    bss: { series: 2, reps: '6', rpe: 7.5, loadHint: '55 kg' },
    calf: { series: 3, reps: '12', rpe: 7.5 },
    plyoSun: { series: 3, reps: '3', rpe: 6.5 },
    muSun: { series: 3, reps: '2', rpe: 7.5 },
    latPullSun: { series: 3, reps: '10', rpe: 7.5 },
  },
  {
    nom: 'Macrocycle Hiver · S12 (Bloc 3) — Affûtage & Pic de Force/Skills',
    note: 'Semaine d\'affûtage (Tapering) : intensité maximale, volume réduit de 25 % pour créer un rebond de surcompensation en S13.',
    bench: { series: 3, reps: '3', rpe: 8.5, loadHint: '87.5-88.5 kg' },
    wpu: { series: 3, reps: '3', rpe: 8.5, loadHint: '+20 kg × 3×3 propres' },
    dip: { series: 3, reps: '4-5', rpe: 8, loadHint: '+18.75-20 kg' },
    ohp: { series: 2, reps: '6', rpe: 8, loadHint: '26 kg/main (52 kg total)' },
    csRow: { series: 2, reps: '8', rpe: 7.5 },
    hsWed: { series: 2, time: '45', rpe: 6, desc: '2 séries propres d\'affûtage.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '7-8', rpe: 8.5, desc: '4×7-8s en Advanced Tuck FL (dos plat chirurgical).' },
    flSubWed: { name: 'Open-Hip Tuck Front Lever Hold', series: 1, time: '12', rpe: 7, desc: '1 série de rappel.' },
    flDynWed: { name: 'Paused Front Lever Raises (Adv Tuck)', series: 2, reps: '4', rpe: 8, desc: '2×4 avec pause 2 s à l\'horizontale.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 3, reps: '3', rpe: 8, desc: '1 essai libre + 2×3 explosifs au mur.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 4, time: '5-6', rpe: 8.5, desc: '4 séries de 5-6 s en Tuck Planche libre.' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 2, time: '20', rpe: 7, desc: '2 séries d\'activation.' },
    lSitThu: { name: 'Combo L-Sit → Tuck Planche → Bent-Arm Press Prep', type: 'reps', series: 3, reps: '3', rpe: 8, desc: 'Transition complète contrôlée.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 2, time: '20', rpe: 7, desc: '2×20s stables.' },
    dragonThu: { series: 2, reps: '5', rpe: 7.5 },
    pikeThu: { series: 2, reps: '10', rpe: 7 },
    scapFlFri: { series: 2, reps: '5', rpe: 7, desc: 'Activation scapulaire.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 3, time: '6', rpe: 8, desc: '3×6s d\'affûtage.' },
    pppuFri: { series: 3, reps: '6', rpe: 7.5, desc: '3×6 explosifs.' },
    rowFri: { series: 2, reps: '8', rpe: 7 },
    curlFri: { series: 2, reps: '12', rpe: 7 },
    fsquat: { series: 3, reps: '3', rpe: 8, loadHint: '67.5 kg (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 3, reps: '2', rpe: 8, loadHint: '70 kg' },
    rdl: { series: 2, reps: '6', rpe: 7.5, loadHint: '100 kg' },
    bss: { series: 2, reps: '6', rpe: 7.5, loadHint: '55 kg' },
    calf: { series: 2, reps: '12', rpe: 7 },
    plyoSun: { series: 3, reps: '3', rpe: 6 },
    muSun: { series: 3, reps: '2', rpe: 7.5 },
    latPullSun: { series: 2, reps: '10', rpe: 7 },
  },
  {
    nom: 'Macrocycle Hiver · S13 (Bloc 3) — Semaine de Réalisation & Validation des Skills',
    note: 'Semaine Finale de Validation (9-14 fév 2027) : validation des records propres (Adv Tuck FL 8s+, Tuck Planche libre 5-8s, Combo L-Sit → Tuck, Bench 87.5-90 kg, Pull-Up +20 kg × 4).',
    bench: { series: 3, reps: '2-3', rpe: 8.5, loadHint: 'Validation : 87.5 kg × 3 ou 90 kg × 2 propres' },
    wpu: { series: 3, reps: '3-4', rpe: 8.5, loadHint: 'Validation : +20 kg × 4 propres (ou Top-Set +22.5 kg × 2-3)' },
    dip: { series: 3, reps: '5', rpe: 8, loadHint: 'Validation : +20 kg × 5' },
    ohp: { series: 2, reps: '6', rpe: 8, loadHint: '26 kg/main × 6' },
    csRow: { series: 2, reps: '8', rpe: 7 },
    hsWed: { series: 3, time: '60', rpe: 7, desc: 'Validation Handstand libre : 3 entrées = 3 tenues de 45-60 s.' },
    flMainWed: { name: 'Advanced Tuck Front Lever Hold', series: 4, time: '8', rpe: 8.5, desc: 'VALIDATION SKILL #1 : 4 séries de 7 à 10 s propres en Advanced Tuck Front Lever (bassin haut, dos plat).' },
    flSubWed: { name: 'Tuck Front Lever Hold', series: 1, time: '20', rpe: 7.5, desc: '1 série test d\'endurance en Tuck strict (20 s propres).' },
    flDynWed: { name: 'Paused Front Lever Raises (Adv Tuck)', series: 2, reps: '5', rpe: 8, desc: '2×5 propres avec pause 2 s.' },
    hspuWed: { name: 'Wall Handstand Push-Up (Concentrique Explosif)', series: 3, reps: '4', rpe: 8.5, desc: 'Validation : 1-2 HSPU libres + 4-5 Wall HSPU concentriques propres.' },
    plancheMainThu: { name: 'Tuck Planche Hold', type: 'isometrique', series: 4, time: '5-8', rpe: 8.5, desc: 'VALIDATION SKILL #2 : maintenir une Tuck Planche libre propre de 5 à 8 secondes au sol !' },
    plancheSubThu: { name: 'Planche Lean (Pieds au mur)', series: 2, time: '25', rpe: 7.5, desc: 'Mesure finale de la distance poignet-mur.' },
    lSitThu: { name: 'Combo L-Sit → Tuck Planche → Bent-Arm Press Prep', type: 'reps', series: 3, reps: '3', rpe: 8.5, desc: 'VALIDATION TRANSITION : L-Sit 3 s → Tuck Planche 3 s → montée vers Tuck Handstand.' },
    tuckHsThu: { name: 'Tuck Handstand Hold', series: 2, time: '25', rpe: 7, desc: 'Validation du maintien Tuck Handstand libre.' },
    dragonThu: { series: 2, reps: '6', rpe: 8 },
    pikeThu: { series: 2, reps: '12', rpe: 7.5 },
    scapFlFri: { series: 2, reps: '5', rpe: 7, desc: 'Activation scapulaire.' },
    flMainFri: { name: 'Advanced Tuck Front Lever Hold', series: 3, time: '6-8', rpe: 8, desc: 'Confirmation de l\'Advanced Tuck FL sur une 2e séance dans la semaine.' },
    pppuFri: { series: 3, reps: '8', rpe: 8, desc: '3×8 propres.' },
    rowFri: { series: 2, reps: '10', rpe: 7.5 },
    curlFri: { series: 2, reps: '12', rpe: 7 },
    fsquat: { series: 3, reps: '4', rpe: 8, loadHint: 'Validation : 67.5-70 kg × 4 propres (talons surélevés)' },
    cmj: { series: 4, reps: '3', rpe: 6.5 },
    clean: { series: 3, reps: '2', rpe: 8.5, loadHint: '70 kg × 2' },
    rdl: { series: 2, reps: '6', rpe: 8, loadHint: '102.5 kg × 6' },
    bss: { series: 2, reps: '6', rpe: 7.5, loadHint: '55 kg' },
    calf: { series: 2, reps: '12', rpe: 7.5 },
    plyoSun: { series: 3, reps: '3', rpe: 6.5 },
    muSun: { series: 3, reps: '2-3', rpe: 8 },
    latPullSun: { series: 2, reps: '10', rpe: 7 },
  },
];

function buildProWeek(w) {
  const dn = w.deload ? ' (deload)' : '';
  const seances = [];

  // ═══════════════════════════════════════════════════════════════
  // 1. MARDI — Salle : Force Upper Body (~60 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Mardi',
    nom: 'Salle — Force Upper Body',
    exercices: [
      ...warmupPush(dn),
      ex('Bench Press', 'reps', w.bench.series, {
        reps: w.bench.reps, repos_sec: 180, rpe_cible: w.bench.rpe,
        description: `Lift push #1.${dn} Cible : ${w.bench.loadHint}. Pause 1 s poitrine, poussée explosive, omoplates serrées et basses sur le banc.`,
      }),
      ex('Weighted Pull-Up', 'reps', w.wpu.series, {
        reps: w.wpu.reps, repos_sec: 180, rpe_cible: w.wpu.rpe,
        description: `Lift pull #1 (protocole basse fatigue spécial segments longs 64 cm).${dn} Cible : ${w.wpu.loadHint}. Suspension complète en bas, vitesse concentrique maximale, s'arrêter à 3-4 reps avant toute dégradation technique.`,
      }),
      ex('Weighted Dip', 'reps', w.dip.series, {
        reps: w.dip.reps, repos_sec: 150, rpe_cible: w.dip.rpe,
        description: `Poussée lourde barres parallèles.${dn} Cible : ${w.dip.loadHint}. Descente contrôlée sous la parallèle, épaules en dépression stricte.`,
      }),
      ex('Standing Dumbbell Overhead Press', 'reps', w.ohp.series, {
        reps: w.ohp.reps, repos_sec: 120, rpe_cible: w.ohp.rpe,
        description: `Force verticale haltères.${dn} Cible : ${w.ohp.loadHint}. Gainage fessiers/abdos verrouillé, transfert direct sur la poussée concentrique du HSPU.`,
      }),
      ex('Chest-Supported Row', 'reps', w.csRow.series, {
        reps: w.csRow.reps, repos_sec: 120, rpe_cible: w.csRow.rpe,
        description: `Tirage horizontal supporté sur banc incliné.${dn} Cible directement les rétracteurs scapulaires (rhomboïdes, trapèze moyen/inférieur) avec 1 s de contraction en haut — empêche l'enroulement des épaules en Advanced Tuck FL.`,
      }),
      ex('Cable External Rotation', 'reps', w.deload ? 2 : 3, {
        reps: '15', repos_sec: 45, rpe_cible: 6,
        description: `Préhab coiffe des rotateurs.${dn} Coude collé au corps, rotation externe contrôlée pour équilibrer le volume de poussée.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. MERCREDI — Maison : Front Lever #1 + Handstand/HSPU + Cou (≤ 50 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Mercredi',
    nom: 'Maison — Front Lever + Handstand & HSPU',
    exercices: [
      ...warmupCalisthenicsPull(dn, 'Front Lever et Handstand'),
      ex('Handstand Freestanding Practice', 'isometrique', w.hsWed.series, {
        duree_sec: w.hsWed.time, repos_sec: 75, rpe_cible: w.hsWed.rpe,
        description: `Calibration d'entrée & équilibre.${dn} ${w.hsWed.desc}`,
      }),
      ex(w.flMainWed.name, 'isometrique', w.flMainWed.series, {
        duree_sec: w.flMainWed.time, repos_sec: 120, rpe_cible: w.flMainWed.rpe,
        description: `Skill #1 Front Lever (Pic nerveux extension bras tendus).${dn} ${w.flMainWed.desc}`,
      }),
      ex(w.flSubWed.name, 'isometrique', w.flSubWed.series, {
        duree_sec: w.flSubWed.time, repos_sec: 90, rpe_cible: w.flSubWed.rpe,
        description: `Volume isométrique spécifique Front Lever.${dn} ${w.flSubWed.desc}`,
      }),
      ex(w.flDynWed.name, 'reps', w.flDynWed.series, {
        reps: w.flDynWed.reps, repos_sec: 90, rpe_cible: w.flDynWed.rpe,
        description: `Force dynamique spécifique FL (zéro négative brutale).${dn} ${w.flDynWed.desc}`,
      }),
      ex(w.hspuWed.name, 'reps', w.hspuWed.series, {
        reps: w.hspuWed.reps, repos_sec: 120, rpe_cible: w.hspuWed.rpe,
        description: `Force-vitesse poussée inversée.${dn} ${w.hspuWed.desc}`,
      }),
      ex('Neck Flexion & Extension (Isométrique)', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '15-20', repos_sec: 45, rpe_cible: 6.5,
        description: `Renforcement cervical à la maison #1.${dn} Résistance manuelle ou élastique/serviette sur le front (15-20 s) puis derrière le crâne (15-20 s), menton rentré.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. JEUDI — Maison : Planche #1 + L-Sit → Tuck HS + Core (≤ 45 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Jeudi',
    nom: 'Maison — Planche, L-Sit & Tuck Handstand',
    exercices: [
      ...warmupPlancheCore(dn),
      ex(w.plancheMainThu.name, w.plancheMainThu.type, w.plancheMainThu.series, {
        ...(w.plancheMainThu.type === 'isometrique' ? { duree_sec: w.plancheMainThu.time } : { reps: w.plancheMainThu.reps }),
        repos_sec: 105, rpe_cible: w.plancheMainThu.rpe,
        description: `Skill #2 Planche (placé en n°1 sur coudes et épaules 100 % frais).${dn} ${w.plancheMainThu.desc}`,
      }),
      ex(w.plancheSubThu.name, 'isometrique', w.plancheSubThu.series, {
        duree_sec: w.plancheSubThu.time, repos_sec: 90, rpe_cible: w.plancheSubThu.rpe,
        description: `Conditionnement angulaire deltoïde antérieur & poignets.${dn} ${w.plancheSubThu.desc}`,
      }),
      ex(w.lSitThu.name, w.lSitThu.type, w.lSitThu.series, {
        ...(w.lSitThu.type === 'isometrique' ? { duree_sec: w.lSitThu.time } : { reps: w.lSitThu.reps }),
        repos_sec: 90, rpe_cible: w.lSitThu.rpe,
        description: `Chaînon L-Sit → Tuck Planche.${dn} ${w.lSitThu.desc}`,
      }),
      ex(w.tuckHsThu.name, 'isometrique', w.tuckHsThu.series, {
        duree_sec: w.tuckHsThu.time, repos_sec: 75, rpe_cible: w.tuckHsThu.rpe,
        description: `Position cible finale de la transition L-Sit → Tuck HS.${dn} ${w.tuckHsThu.desc}`,
      }),
      ex('Dragon Flag (Négatives / Holds)', 'reps', w.dragonThu.series, {
        reps: w.dragonThu.reps, repos_sec: 90, rpe_cible: w.dragonThu.rpe,
        description: `Gainage anti-extension lourd (transfert direct au maintien du bassin en Front Lever).${dn} Corps aligné épaules-bassin-genoux, descente contrôlée 3-4 s.`,
      }),
      ex('Seated Pike Compression Leg Lift', 'reps', w.pikeThu.series, {
        reps: w.pikeThu.reps, repos_sec: 60, rpe_cible: w.pikeThu.rpe,
        description: `Force de compression active psoas/droit fémoral.${dn} Assis jambes tendues, mains devant les hanches, lever les talons pendant 2 s sans reculer le buste.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. VENDREDI — Maison : Front Lever #2 + Force Planche + TRX Row + Cou (~55 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Vendredi',
    nom: 'Maison — Front Lever #2, Force Planche & Préhab',
    exercices: [
      ...warmupCalisthenicsPull(dn, 'Front Lever et Poussée Planche'),
      ex('Scapular Front Lever Pull-to-Hold', 'reps', w.scapFlFri.series, {
        reps: w.scapFlFri.reps, repos_sec: 75, rpe_cible: w.scapFlFri.rpe,
        description: `Pré-activation spécifique du point faible scapulaire avant le FL.${dn} ${w.scapFlFri.desc}`,
      }),
      ex(w.flMainFri.name, 'isometrique', w.flMainFri.series, {
        duree_sec: w.flMainFri.time, repos_sec: 105, rpe_cible: w.flMainFri.rpe,
        description: `2e exposition Front Lever de la semaine.${dn} ${w.flMainFri.desc}`,
      }),
      ex('Pseudo Planche Push-Up', 'reps', w.pppuFri.series, {
        reps: w.pppuFri.reps, repos_sec: 105, rpe_cible: w.pppuFri.rpe,
        description: `Force de poussée spécifique Tuck Planche.${dn} ${w.pppuFri.desc}`,
      }),
      ex('TRX Inverted Row', 'reps', w.rowFri.series, {
        reps: w.rowFri.reps, repos_sec: 90, rpe_cible: w.rowFri.rpe,
        description: `Tirage horizontal strict au TRX (remplace l'Archer Pull-Up sur barre étroite).${dn} Corps gainé, tirer les coudes en arrière et marquer 1 s de pause poitrine aux poignées.`,
      }),
      ex('Band Biceps Curl', 'reps', w.curlFri.series, {
        reps: w.curlFri.reps, repos_sec: 60, rpe_cible: w.curlFri.rpe,
        description: `Préhab et trophisme du tendon distal du biceps (coude gauche).${dn} Supination complète, descente excentrique lente sur 3 s.`,
      }),
      ex('Reverse Wrist Curl', 'reps', 2, {
        reps: '15', repos_sec: 45, rpe_cible: 6,
        description: `Équilibre extenseurs du carpe et protection épicondylienne.${dn}`,
      }),
      ex('Neck Lateral Flexion (Isométrique)', 'isometrique', 2, {
        duree_sec: '15-20', repos_sec: 45, rpe_cible: 6.5,
        description: `Renforcement cervical à la maison #2.${dn} Résistance manuelle au-dessus de l'oreille gauche (15-20 s) puis droite (15-20 s), épaules basses.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. SAMEDI — Salle : Bas du corps + Explosivité PAP (~55 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Samedi',
    nom: 'Salle — Bas du corps + Explosivité',
    exercices: [
      ...warmupLegs(dn),
      ex('Front Squat', 'reps', w.fsquat.series, {
        reps: w.fsquat.reps, repos_sec: 150, rpe_cible: w.fsquat.rpe,
        description: `Force axiale adaptée fémurs longs (jambes 95 cm).${dn} Cible : ${w.fsquat.loadHint}. Placer des petits disques de 2.5 kg ou cales sous les talons pour garder le buste 100 % vertical sans douleur lombaire.`,
      }),
      ex('Countermovement Jump', 'reps', w.cmj.series, {
        reps: w.cmj.reps, repos_sec: 150, rpe_cible: w.cmj.rpe,
        description: `Détente verticale maximale (effet PAP post-squat).${dn} Intention 100 % explosive sur chaque saut, réinitialiser la posture entre chaque répétition.`,
      }),
      ex('Hang Power Clean', 'reps', w.clean.series, {
        reps: w.clean.reps, repos_sec: 150, rpe_cible: w.clean.rpe,
        description: `Puissance balistique triple extension.${dn} Cible : ${w.clean.loadHint}. Extension violente hanches-genoux-chevilles, réception haute stable.`,
      }),
      ex('Romanian Deadlift', 'reps', w.rdl.series, {
        reps: w.rdl.reps, repos_sec: 120, rpe_cible: w.rdl.rpe,
        description: `Force chaîne postérieure (ischios/fessiers).${dn} Cible : ${w.rdl.loadHint}. Charnière de hanche pure, barre collée aux tibias/cuisses, dos neutre.`,
      }),
      ex('Bulgarian Split Squat', 'reps', w.bss.series, {
        reps: w.bss.reps, repos_sec: 120, rpe_cible: w.bss.rpe,
        description: `Force unilatérale et stabilité pelvienne.${dn} Cible : ${w.bss.loadHint}. Descente contrôlée, poussée verticale dans le talon avant.`,
      }),
      ex('Standing Calf Raise', 'reps', w.calf.series, {
        reps: w.calf.reps, repos_sec: 60, rpe_cible: w.calf.rpe,
        description: `Raideur élastique du tendon d'Achille (transfert détente & sprint).${dn} Montée explosive sur la pointe, pause 2 s en étirement complet en bas.`,
      }),
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. DIMANCHE — Salle : Pliométrie Réactive, Muscle-Up, Préhab FL & Mobilité Structurée (≤ 45 min)
  // ═══════════════════════════════════════════════════════════════
  seances.push({
    jour: 'Dimanche',
    nom: 'Salle — Explosivité, Muscle-Up & Mobilité Structurée',
    exercices: [
      ...warmupSunday(dn),
      ex('Depth Drop to Max Jump', 'reps', w.plyoSun.series, {
        reps: w.plyoSun.reps, repos_sec: 120, rpe_cible: w.plyoSun.rpe,
        description: `Pliométrie réactive (remplace le stimulus volley).${dn} Descendre d'un box/banc de 30-40 cm et rebondir instantanément le plus haut possible (temps de contact au sol ultra-court).`,
      }),
      ex('Strict Muscle-Up (Qualité)', 'reps', w.muSun.series, {
        reps: w.muSun.reps, repos_sec: 120, rpe_cible: w.muSun.rpe,
        description: `Skill dynamique sur barre haute.${dn} Focus trajectoire en C et jambes le plus tendues possible (1 à 2 reps chirurgicales par série).`,
      }),
      ex('Straight-Arm Lat Pulldown', 'reps', w.latPullSun.series, {
        reps: w.latPullSun.reps, repos_sec: 75, rpe_cible: w.latPullSun.rpe,
        description: `Isolation biomécanique du Front Lever à la poulie haute.${dn} Bras 100 % verrouillés, abaisser la barre jusqu'aux cuisses et tenir 2 s en dépression scapulaire maximale.`,
      }),
      ex('Thoracic Butcher\'s Block Stretch', 'reps', 3, {
        reps: '8', repos_sec: 45, rpe_cible: 4,
        description: `Mobilité structurée #1 (zéro flow de 10 min).${dn} Coudes sur un banc avec bâton/haltère léger : 8 répétitions avec pause de 3 s en extension thoracique maximale en bas.`,
      }),
      ex('90/90 Hip Switch Structuré', 'reps', 3, {
        reps: '6', repos_sec: 45, rpe_cible: 4,
        description: `Mobilité structurée #2 (hanches).${dn} Assis au sol, 6 bascules contrôlées gauche/droite sans les mains avec pause de 3 s en poussant la hanche avant.`,
      }),
      ex('Loaded Pike Compression Stretch', 'reps', 3, {
        reps: '6', repos_sec: 45, rpe_cible: 4,
        description: `Mobilité structurée #3 (ischios & compression L-Sit → Tuck HS).${dn} Jambes tendues avec haltère léger (8-12 kg), descendre en contrôle et marquer 3 s de pause active en bas sur chaque rep.`,
      }),
    ],
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

let out = `# Programme Athlète Hybride — v4.0 (Transition Mois 2 + Macrocycle 3 Mois : Nov 2026 → Fév 2027)
# ─────────────────────────────────────────────────────────────────────────────
# PROFIL BIOMÉCANIQUE : 16 ans · 193 cm · 83 kg · Envergure 195 cm · Jambes 95 cm · Bras 64 cm
# LUNDI = REPOS COMPLET | 6 séances / semaine : Mardi → Dimanche
# - Mardi (Salle)    : Force Upper Body (Bench, Weighted Pull-Up 4×3-4 explosifs, Weighted Dip, OHP, Chest-Supported Row)
# - Mercredi (Maison): Front Lever #1 (Progression angulaire sans triche élastique) + Handstand/HSPU Concentrique + Cou
# - Jeudi (Maison)   : Planche #1 (sur coudes 100 % frais : Tuck Planche Float/Hold) + Transition L-Sit → Tuck HS + Core
# - Vendredi (Maison): Front Lever #2 + Pseudo Planche Push-Up + TRX Inverted Row + Préhab Coude & Cou
# - Samedi (Salle)   : Bas du corps + Explosivité PAP (Front Squat talons surélevés + CMJ + Power Clean + RDL)
# - Dimanche (Salle) : Pliométrie Réactive (Depth Jump) + Muscle-Up + Straight-Arm Lat Pulldown + Mobilité Structurée
#
cycles:

`;

const allBuiltWeeks = [
  ...LEGACY_WEEKS_1_TO_3.map(buildLegacyWeek),
  ...PRO_WEEKS.map(buildProWeek),
];

for (const week of allBuiltWeeks) {
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

const targets = [
  'apps/web-v2/programme.yaml',
  'apps/web/programme.yaml',
];

for (const target of targets) {
  fs.writeFileSync(target, out, 'utf8');
  console.log(`✓ Écrit dans ${target}`);
}

const parsed = load(out);
console.log('\n--- VÉRIFICATION PROGRAMME V4.0 ---');
console.log('Cycles totaux générés :', parsed.cycles.length, '(Cycles 0-5 Mois 2 + Cycles 6-18 Macrocycle 3 Mois)');
parsed.cycles.forEach((c, i) => {
  const days = c.seances.map((s) => s.jour);
  const hasMon = days.includes('Lundi');
  const exCount = c.seances.reduce((a, s) => a + s.exercices.length, 0);
  console.log(`Cycle ${i} (${c.nom}): ${c.seances.length} séances [${days.join(', ')}] · ${exCount} exos ${hasMon ? '⚠ LUNDI !' : '✓'}`);
});
