/**
 * Génère programme.yaml v2.1 — aligné profil athlète mis à jour + calisthenics maison.
 * - Mardi : Gym Force Upper (Bench 70kgx5 baseline, Weighted Pull-Ups déplacé ici, Dips, OHP)
 * - Mercredi : Maison (Front Lever + Handstand freestanding + Pike/HSPU + Tuck Planche + TRX Row + Core)
 * - Jeudi : Gym (Squat axial + Plyo VJ + Hang Clean + BSS + RDL)
 * - Vendredi : Maison (MU maintenance propre, Handstand balance, L-Sit holds & press prep, Dragon Flag / Hanging leg raises — SANS doublon Face Pull)
 * - Samedi : Maison (Front Lever #2 + Tuck Planche #2 + Archer/BW Pull-Ups + Band Curl + Compression Core)
 * - Dimanche : Récupération active (Mobilité + Handstand balance léger + Core)
 *
 * Run: node scripts/generate-programme-v2.mjs
 */
import fs from 'fs';
import { load } from 'js-yaml';

const DAY_LABELS = {
  Mardi: 'TUESDAY — Gym (Force Upper Body)',
  Mercredi: 'WEDNESDAY — Maison (Front Lever + HSPU + Tuck Planche)',
  Jeudi: 'THURSDAY — Gym (Bas du corps + Explosivité)',
  Vendredi: 'FRIDAY — Maison (Handstand + L-Sit & Core)',
  Samedi: 'SATURDAY — Maison (Front Lever #2 + Planche #2 + Tirage Skills)',
  Dimanche: 'SUNDAY — Gym (Récupération active + Muscle-Up + Mobilité)',
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

/** Échauffement push gym — Mardi */
function warmupPush(dn = '') {
  return [
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement push.${dn} Protraction scapulaire, contrôle — prépare épaules avant bench et dips.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '10',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement push.${dn} Mobilité scapulaire, amplitude complète sans charge.`,
    }),
    ex('Push-Up', 'reps', 2, {
      reps: '8-10',
      repos_sec: 45,
      rpe_cible: 4,
      groupe: WU,
      description: `Échauffement push.${dn} Activation pectoraux/triceps, tempo contrôlé. Pas à l'échec.`,
    }),
  ];
}

/** Échauffement calisthenics skills & tirage maison — Mercredi, Vendredi, Samedi */
function warmupCalisthenics(dn = '', focus = 'skills') {
  return [
    ex('Dead Hang', 'isometrique', 2, {
      duree_sec: '20-30',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement calisthenics.${dn} Décompression épaules, activation du grip pour ${focus}.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8-10',
      repos_sec: 45,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement calisthenics.${dn} Dépression et rétraction scapulaire, coudes tendus.`,
    }),
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement calisthenics.${dn} Activation rétracteurs et coiffe des rotateurs avec élastique.`,
    }),
  ];
}

/** Échauffement jambes + explosif — Jeudi */
function warmupLegs(dn = '') {
  return [
    ex('Glute Bridge', 'reps', 2, {
      reps: '12',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement jambes.${dn} Activation fessiers et chaîne postérieure avant squat.`,
    }),
    ex('Bodyweight Squat', 'reps', 2, {
      reps: '10',
      repos_sec: 45,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement jambes.${dn} Amplitude hanche/genou, tempo lent, torse haut.`,
    }),
    ex('Jump Squat', 'reps', 2, {
      reps: '5',
      repos_sec: 60,
      rpe_cible: 4,
      groupe: WU,
      description: `Échauffement jambes.${dn} Réveil SNC léger avant CMJ et clean. Intent modéré.`,
    }),
  ];
}

/** Échauffement récup active — Dimanche */
function warmupSunday(dn = '') {
  return [
    ex('Dead Hang', 'isometrique', 1, {
      duree_sec: '20',
      repos_sec: 0,
      rpe_cible: 2,
      groupe: WU,
      description: `Échauffement récup.${dn} Décompression légère avant mobilité.`,
    }),
    ex('Scapular Push-Up', 'reps', 2, {
      reps: '8',
      repos_sec: 30,
      rpe_cible: 2,
      groupe: WU,
      description: `Échauffement récup.${dn} Activation douce épaules avant flows mobilité.`,
    }),
  ];
}

const WEEKS = [
  {
    nom: 'Semaine 1 — Fondations & Calibrage Skills',
    bench: { series: 4, reps: '5', rpe: 7 },
    larsen: { series: 2, reps: '6', rpe: 7 },
    wpu: { series: 4, reps: '5', rpe: 7 },
    ringDip: { series: 3, reps: '5', rpe: 6 },
    ohp: { series: 3, reps: '8', rpe: 7 },
    tuckFL: { series: 5, time: '12-15', rpe: 7 },
    flRaises: { series: 3, reps: '4', rpe: 7 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '8', rpe: 7 },
    planche: { name: 'Planche Lean', type: 'isometrique', series: 3, time: '15-20', rpe: 6 },
    pullBW: { series: 3, reps: '8', rpe: 7 },
    trxRow: { series: 3, reps: '10', rpe: 7 },
    coreHollow: { series: 3, time: '20-30', rpe: 6 },
    fsquat: { series: 3, reps: '5', rpe: 7 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7 },
    bss: { series: 3, reps: '6', rpe: 7 },
    rdl: { series: 3, reps: '6', rpe: 7 },
    muQuality: { series: 3, reps: '1-2', rpe: 6 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 3, time: '10-15', rpe: 6 },
    dragonFlag: { series: 3, reps: '5', rpe: 6 },
    tuckFL2: { series: 4, time: '12-15', rpe: 6 },
    archerPull: { name: 'Pronated Pull-Up', series: 3, reps: '8', rpe: 7 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7 },
    pikeCompress: { series: 3, reps: '10', rpe: 6 },
    sundayPlyo: true,
    note: 'Reprise des fondations avec nouveau split : tractions lourdes à la salle (Mardi), séances maison 100% calisthenics/core.',
  },
  {
    nom: 'Semaine 2 — Consolidation & Montée en Charge',
    bench: { series: 4, reps: '5', rpe: 7.5 },
    larsen: { series: 2, reps: '6', rpe: 7.5 },
    wpu: { series: 4, reps: '5', rpe: 7.5 },
    ringDip: { series: 3, reps: '5', rpe: 6.5 },
    ohp: { series: 3, reps: '8', rpe: 7.5 },
    tuckFL: { series: 5, time: '15-20', rpe: 7 },
    flRaises: { series: 3, reps: '4', rpe: 7 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 3, reps: '8-10', rpe: 7.5 },
    planche: { name: 'Planche Lean (Protraction Active)', type: 'isometrique', series: 3, time: '15-20', rpe: 6.5 },
    pullBW: { series: 3, reps: '8', rpe: 7 },
    trxRow: { series: 3, reps: '10', rpe: 7 },
    coreHollow: { series: 3, time: '25-30', rpe: 6.5 },
    fsquat: { series: 3, reps: '5', rpe: 7.5 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5 },
    bss: { series: 3, reps: '6', rpe: 7.5 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muQuality: { series: 3, reps: '2', rpe: 6.5 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 3, time: '15', rpe: 6.5 },
    dragonFlag: { series: 3, reps: '5', rpe: 6.5 },
    tuckFL2: { series: 4, time: '15-20', rpe: 6 },
    archerPull: { name: 'Pronated Pull-Up', series: 3, reps: '8', rpe: 7 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7 },
    pikeCompress: { series: 3, reps: '10', rpe: 6.5 },
    sundayPlyo: true,
    note: 'Consolidation technique et régularité handstand (10-15s). Progression des maintiens FL tuck.',
  },
  {
    nom: 'Semaine 3 — Surcharge Progressive & Nouveaux Skills',
    bench: { series: 4, reps: '4', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '4', rpe: 8 },
    ringDip: { series: 3, reps: '4', rpe: 7 },
    ohp: { series: 2, reps: '8', rpe: 7.5 },
    tuckFL: { series: 5, time: '15-20', rpe: 7.5 },
    flRaises: { series: 3, reps: '4', rpe: 7.5 },
    hspuPrep: { name: 'Wall Handstand Push-Up (Négatives)', series: 3, reps: '3-4', rpe: 7.5 },
    planche: { name: 'Tuck Planche Hold', type: 'isometrique', series: 3, time: '8-12', rpe: 7 },
    pullBW: { series: 3, reps: '8', rpe: 7.5 },
    trxRow: { series: 3, reps: '10', rpe: 7.5 },
    coreHollow: { series: 3, time: '30', rpe: 7 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muQuality: { series: 3, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit Hold (Parallettes ou Sol)', type: 'isometrique', series: 3, time: '10-15', rpe: 7 },
    dragonFlag: { series: 3, reps: '5-6', rpe: 7 },
    tuckFL2: { series: 4, time: '15-20', rpe: 6.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '4-5', rpe: 7.5 },
    bandCurl: { series: 3, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '12', rpe: 7 },
    sundayPlyo: false,
    note: 'Introduction des négatives HSPU contre le mur et du Tuck Planche hold. Dimanche = mobilité seule.',
  },
  {
    nom: 'Semaine 4 — Volume Productif & Renforcement Spécifique',
    bench: { series: 4, reps: '4', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '4', rpe: 8 },
    ringDip: { series: 3, reps: '4', rpe: 7.5 },
    ohp: { series: 2, reps: '8', rpe: 8 },
    tuckFL: { series: 5, time: '18-22', rpe: 7.5 },
    flRaises: { series: 3, reps: '4', rpe: 7.5 },
    hspuPrep: { name: 'Wall Handstand Push-Up (Négatives)', series: 3, reps: '4', rpe: 8 },
    planche: { name: 'Tuck Planche Hold', type: 'isometrique', series: 3, time: '10-12', rpe: 7 },
    pullBW: { series: 3, reps: '8', rpe: 7.5 },
    trxRow: { series: 3, reps: '10', rpe: 8 },
    coreHollow: { series: 3, time: '30-35', rpe: 7 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 8 },
    muQuality: { series: 3, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit Hold (Parallettes ou Sol)', type: 'isometrique', series: 3, time: '12-15', rpe: 7 },
    dragonFlag: { series: 3, reps: '6', rpe: 7.5 },
    tuckFL2: { series: 4, time: '18-22', rpe: 6.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '5', rpe: 7.5 },
    bandCurl: { series: 3, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '12', rpe: 7 },
    sundayPlyo: false,
    note: 'Pic de volume du bloc. Répétition des schémas moteurs sous fatigue modérée.',
  },
  {
    nom: 'Semaine 5 — Intensification & Transfert Maximal',
    bench: { series: 4, reps: '3', rpe: 8.5 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    wpu: { series: 4, reps: '3', rpe: 8.5 },
    ringDip: { series: 3, reps: '4', rpe: 8 },
    ohp: { series: 2, reps: '6', rpe: 8 },
    tuckFL: { series: 4, time: '15-20', rpe: 7.5 },
    flRaises: { series: 3, reps: '4', rpe: 7.5 },
    hspuPrep: { name: 'Wall Handstand Push-Up', series: 3, reps: '3-5', rpe: 8 },
    planche: { name: 'Tuck Planche Hold', type: 'isometrique', series: 3, time: '10-15', rpe: 7.5 },
    pullBW: { series: 2, reps: '8', rpe: 7.5 },
    trxRow: { series: 2, reps: '10', rpe: 8 },
    coreHollow: { series: 3, time: '30', rpe: 7 },
    fsquat: { series: 3, reps: '4', rpe: 8.5 },
    cmj: { series: 3, reps: '2', rpe: 6 },
    clean: { series: 3, reps: '2', rpe: 8.5 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 2, reps: '6', rpe: 8 },
    muQuality: { series: 2, reps: '2', rpe: 7 },
    lSit: { name: 'L-Sit to Tuck Press Transition Prep', type: 'reps', series: 3, reps: '3-4', rpe: 7.5 },
    dragonFlag: { series: 3, reps: '5', rpe: 7.5 },
    tuckFL2: { series: 4, time: '15-20', rpe: 6.5 },
    archerPull: { name: 'Archer Pull-Up (Progression)', series: 3, reps: '5', rpe: 8 },
    bandCurl: { series: 2, reps: '12-15', rpe: 7.5 },
    pikeCompress: { series: 3, reps: '10', rpe: 7 },
    sundayPlyo: 'light',
    note: 'Charges max sur Bench et Tractions lestées. Initiation à la transition L-Sit to HS prep.',
  },
  {
    nom: 'Semaine 6 — Deload & Régénération',
    bench: { series: 3, reps: '5', rpe: 6 },
    larsen: { series: 2, reps: '6', rpe: 6 },
    wpu: { series: 3, reps: '5', rpe: 6 },
    ringDip: { series: 2, reps: '5', rpe: 5 },
    ohp: { series: 2, reps: '8', rpe: 6 },
    tuckFL: { series: 3, time: '10-12', rpe: 5 },
    flRaises: { series: 2, reps: '4', rpe: 5 },
    hspuPrep: { name: 'Elevated Pike Push-Up', series: 2, reps: '6', rpe: 5 },
    planche: { name: 'Planche Lean', type: 'isometrique', series: 2, time: '15', rpe: 5 },
    pullBW: { series: 2, reps: '6', rpe: 5 },
    trxRow: { series: 2, reps: '8', rpe: 5 },
    coreHollow: { series: 2, time: '20', rpe: 4 },
    fsquat: { series: 2, reps: '5', rpe: 6 },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6 },
    bss: { series: 2, reps: '6', rpe: 6 },
    rdl: { series: 2, reps: '6', rpe: 6 },
    muQuality: { series: 2, reps: '1', rpe: 5 },
    lSit: { name: 'Tuck L-Sit Hold', type: 'isometrique', series: 2, time: '10', rpe: 5 },
    dragonFlag: { series: 2, reps: '4', rpe: 5 },
    tuckFL2: { series: 2, time: '10-12', rpe: 5 },
    archerPull: { name: 'Pronated Pull-Up', series: 2, reps: '6', rpe: 5 },
    bandCurl: { series: 2, reps: '10', rpe: 5 },
    pikeCompress: { series: 2, reps: '8', rpe: 4 },
    sundayPlyo: false,
    deload: true,
    note: 'Deload ~40-50 %. Récupération nerveuse et tendineuse complète avant le cycle suivant.',
  },
];

function buildWeek(w) {
  const dn = w.deload ? ' (deload)' : '';
  const seances = [];

  // MARDI — Gym Force Upper (~60 min)
  seances.push({
    jour: 'Mardi',
    nom: 'Gym — Force Upper Body',
    exercices: [
      ...warmupPush(dn),
      ex('Bench Press', 'reps', w.bench.series, {
        reps: w.bench.reps,
        repos_sec: 180,
        rpe_cible: w.bench.rpe,
        description: `Lift push principal.${dn} Pause 1 s poitrine, poussée explosive. Niveau actuel 70kgx5 validé proprement. Progression conservative (+2,5 kg max si RPE cible respecté).`,
      }),
      ex('Larsen Press', 'reps', w.larsen.series, {
        reps: w.larsen.reps,
        repos_sec: 150,
        rpe_cible: w.larsen.rpe,
        description: `Volume push sans pontage.${dn} Pieds surélevés, gainage strict, renforce le point de blocage au développé couché.`,
      }),
      ex('Weighted Pull-Up', 'reps', w.wpu.series, {
        reps: w.wpu.reps,
        repos_sec: 180,
        rpe_cible: w.wpu.rpe,
        description: `Lift pull lourd principal (déplacé à la salle).${dn} Suspension complète, prise pronation/semi-pro, tirage explosif sans élan. +15kg de base.`,
      }),
      ex('Ring Dip', 'reps', w.ringDip.series, {
        reps: w.ringDip.reps,
        repos_sec: 120,
        rpe_cible: w.ringDip.rpe,
        description: `Dips aux anneaux ou barres parallèles.${dn} Descente contrôlée, épaules en dépression, protège le sternum et les épaules.`,
      }),
      ex('Standing Dumbbell Overhead Press', 'reps', w.ohp.series, {
        reps: w.ohp.reps,
        repos_sec: 120,
        rpe_cible: w.ohp.rpe,
        description: `Force verticale push.${dn} Transfert direct sur la poussée handstand et HSPU. Torse gainé, sans cambrer.`,
      }),
      ex('Cable External Rotation', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Prehab coiffe des rotateurs.${dn} Priorité longévité épaule face au volume de poussée et skills calisthenics.`,
      }),
    ],
  });

  // MERCREDI — Maison : Front Lever + Handstand & HSPU + Tuck Planche (~50 min)
  seances.push({
    jour: 'Mercredi',
    nom: 'Maison — Front Lever + Skills & HSPU',
    exercices: [
      ...warmupCalisthenics(dn, 'Front Lever et Handstand'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15',
        repos_sec: 75,
        rpe_cible: 6,
        description: `Travail d'équilibre libre (1/4 micro-sessions HS).${dn} Chercher l'équilibre 10-15 s, alignement actif des épaules et bassin rétroversé.`,
      }),
      ex('Handstand Chest-to-Wall', 'isometrique', w.deload ? 2 : 2, {
        duree_sec: '20-30',
        repos_sec: 60,
        rpe_cible: 6,
        description: `Alignement et endurance posturale.${dn} Ventre face au mur, pousser fort dans les épaules, côtes rentrées.`,
      }),
      ex(w.hspuPrep.name, 'reps', w.hspuPrep.series, {
        reps: w.hspuPrep.reps,
        repos_sec: 90,
        rpe_cible: w.hspuPrep.rpe,
        description: `Progression Handstand Push-Up (HSPU).${dn} Trajectoire diagonale (tête devant les mains en tripode), coudes serrés à 45°.`,
      }),
      ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL.series, {
        duree_sec: w.tuckFL.time,
        repos_sec: 90,
        rpe_cible: w.tuckFL.rpe,
        description: `Skill #1 profil.${dn} Dépression et rétraction scapulaire, bassin neutre/rétroversé, bras parfaitement tendus.`,
      }),
      ex('Front Lever Raises (Tuck)', 'reps', w.flRaises.series, {
        reps: w.flRaises.reps,
        repos_sec: 90,
        rpe_cible: w.flRaises.rpe,
        description: `Dynamique Front Lever.${dn} Montée explosive, descente contrôlée 3 s sans balancer. Bras verrouillés.`,
      }),
      ex(w.planche.name, w.planche.type, w.planche.series, {
        ...(w.planche.type === 'isometrique' ? { duree_sec: w.planche.time } : { reps: w.planche.reps }),
        repos_sec: 75,
        rpe_cible: w.planche.rpe,
        description: `Progression Planche (Planche Lean vers Tuck Planche).${dn} Protraction scapulaire maximale, coudes verrouillés, poids projeté vers l'avant.`,
      }),
      ex('Pronated Pull-Up', 'reps', w.pullBW.series, {
        reps: w.pullBW.reps,
        repos_sec: 90,
        rpe_cible: w.pullBW.rpe,
        description: `Volume tirage calisthenics au poids du corps.${dn} Amplitude complète menton au-dessus de la barre, tempo 2-0-1.`,
      }),
      ex('TRX Inverted Row', 'reps', w.trxRow.series, {
        reps: w.trxRow.reps,
        repos_sec: 75,
        rpe_cible: w.trxRow.rpe,
        description: `Tirage horizontal maison.${dn} Rétraction scapulaire complète, renforce le haut du dos pour le Front Lever.`,
      }),
      ex('Hollow Body Hold', 'isometrique', w.coreHollow.series, {
        duree_sec: w.coreHollow.time,
        repos_sec: 60,
        rpe_cible: w.coreHollow.rpe,
        description: `Gainage fondamental gymnastique.${dn} Bas du dos collé au sol, côtes rentrées, rétroversion du bassin.`,
      }),
      ex('Reverse Wrist Curl', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Résilience poignets/coudes.${dn} Protection tendineuse face aux contraintes du Handstand et de la Planche.`,
      }),
    ],
  });

  // JEUDI — Gym Bas du corps + Explosivité (~55 min)
  seances.push({
    jour: 'Jeudi',
    nom: 'Gym — Bas du corps + Explosivité',
    exercices: [
      ...warmupLegs(dn),
      ex('Front Squat', 'reps', w.fsquat.series, {
        reps: w.fsquat.reps,
        repos_sec: 150,
        rpe_cible: w.fsquat.rpe,
        description: `Force bas du corps axiale.${dn} Buste vertical, coudes hauts, renforce les quadriceps et le core sans comprimer les lombaires.`,
      }),
      ex('Countermovement Jump', 'reps', w.cmj.series, {
        reps: w.cmj.reps,
        repos_sec: 150,
        rpe_cible: w.cmj.rpe,
        description: `Explosivité détente verticale (VJ).${dn} Intention maximale sur chaque saut. Arrêter si la hauteur diminue.`,
      }),
      ex('Hang Power Clean', 'reps', w.clean.series, {
        reps: w.clean.reps,
        repos_sec: 150,
        rpe_cible: w.clean.rpe,
        description: `Production de force rapide.${dn} Extension triple explosive hanches-genoux-chevilles, vitesse de barre prioritaire.`,
      }),
      ex('Bulgarian Split Squat', 'reps', w.bss.series, {
        reps: w.bss.reps,
        repos_sec: 120,
        rpe_cible: w.bss.rpe,
        description: `Force unilatérale.${dn} Stabilité du genou, contrôle excentrique, élimine les asymétries.`,
      }),
      ex('Romanian Deadlift', 'reps', w.rdl.series, {
        reps: w.rdl.reps,
        repos_sec: 120,
        rpe_cible: w.rdl.rpe,
        description: `Chaîne postérieure (ischios/fessiers).${dn} Charnière de hanche propre, dos neutre, étirement contrôlé.`,
      }),
      ex('Pallof Press', 'reps', w.deload ? 2 : 3, {
        reps: '12',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Anti-rotation du tronc.${dn} Résister à la torsion, stabilité du bassin.`,
      }),
    ],
  });

  // VENDREDI — Maison : Handstand + L-Sit & Core (~45 min)
  seances.push({
    jour: 'Vendredi',
    nom: 'Maison — Handstand & L-Sit Core',
    exercices: [
      ...warmupCalisthenics(dn, 'Handstand et L-Sit'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15',
        repos_sec: 75,
        rpe_cible: 6,
        description: `Travail d'équilibre libre (2/4 micro-sessions HS).${dn} Focus sur les micro-ajustements des doigts et la ligne droite.`,
      }),
      ex('Wall Handstand Toe Pulls', 'reps', w.deload ? 2 : 2, {
        reps: '4-6',
        repos_sec: 60,
        rpe_cible: 6,
        description: `Contrôle de l'équilibre.${dn} Face au mur, décoller un pied puis l'autre avec la pression des doigts sans arquer.`,
      }),
      ex(w.lSit.name, w.lSit.type, w.lSit.series, {
        ...(w.lSit.type === 'isometrique' ? { duree_sec: w.lSit.time } : { reps: w.lSit.reps }),
        repos_sec: 75,
        rpe_cible: w.lSit.rpe,
        description: `Progression L-Sit et préparation à l'enchaînement L-Sit to Handstand.${dn} Dépression scapulaire active, compression abdominale, jambes tendues.`,
      }),
      ex('Wall Handstand Shoulder Taps', 'reps', w.deload ? 2 : 3, {
        reps: '6-8',
        repos_sec: 75,
        rpe_cible: 6.5,
        description: `Mouvement autour du Handstand & stabilité unilatérale.${dn} Face au mur, transférer le poids et toucher l'épaule opposée sans désaxer le bassin.`,
      }),
      ex('Dragon Flag (Négatives / Holds)', 'reps', w.dragonFlag.series, {
        reps: w.dragonFlag.reps,
        repos_sec: 90,
        rpe_cible: w.dragonFlag.rpe,
        description: `Force de compression et anti-extension lourde.${dn} Corps rigide aligné, descente lente contrôlée 3-4 s sans casser les hanches.`,
      }),
      ex('Hanging Knee-to-Chest Lift', 'reps', w.deload ? 2 : 3, {
        reps: '10',
        repos_sec: 60,
        rpe_cible: 6,
        description: `Compression abdominale et flexion de hanche suspendu à la barre.${dn} Montée explosive des genoux vers la poitrine sans balancer.`,
      }),
      ex('Copenhagen Side Plank', 'isometrique', w.deload ? 2 : 2, {
        duree_sec: '15-20',
        repos_sec: 45,
        rpe_cible: 5,
        description: `Stabilité pelvienne et adducteurs.${dn} Renforcement du bassin pour les maintiens gymniques.`,
      }),
    ],
  });

  // SAMEDI — Maison : Front Lever #2 + Planche #2 + Tirage Skills (~50 min)
  seances.push({
    jour: 'Samedi',
    nom: 'Maison — Front Lever & Planche Skills',
    exercices: [
      ...warmupCalisthenics(dn, 'Front Lever et Planche'),
      ex('Handstand Freestanding Practice', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '10-15',
        repos_sec: 75,
        rpe_cible: 6,
        description: `Travail d'équilibre libre (3/4 micro-sessions HS).${dn} Répétition des montées (kick-up) propres et recherche du point d'équilibre.`,
      }),
      ex('Scapular Handstand Shrugs', 'reps', w.deload ? 2 : 2, {
        reps: '8-10',
        repos_sec: 60,
        rpe_cible: 6,
        description: `Endurance scapulaire en élévation.${dn} Coudes verrouillés, pousser le sol pour élever et abaisser les omoplates.`,
      }),
      ex('Tuck Front Lever Hold', 'isometrique', w.tuckFL2.series, {
        duree_sec: w.tuckFL2.time,
        repos_sec: 90,
        rpe_cible: w.tuckFL2.rpe,
        description: `2e exposition FL de la semaine.${dn} Focus sur la pureté posturale et la tenue isométrique sans compensation lombaire.`,
      }),
      ex('Front Lever Scapular Pull', 'reps', w.deload ? 2 : 3, {
        reps: '8',
        repos_sec: 75,
        rpe_cible: 6,
        description: `Endurance dépression scapulaire.${dn} Initier la traction bras tendus uniquement avec les grands dorsaux et abaisseurs d'omoplates.`,
      }),
      ex(w.planche.name, w.planche.type, w.planche.series, {
        ...(w.planche.type === 'isometrique' ? { duree_sec: w.planche.time } : { reps: w.planche.reps }),
        repos_sec: 75,
        rpe_cible: w.planche.rpe,
        description: `2e exposition Planche de la semaine.${dn} Protraction scapulaire et avancée maximale des épaules.`,
      }),
      ex(w.archerPull.name, 'reps', w.archerPull.series, {
        reps: w.archerPull.reps,
        repos_sec: 90,
        rpe_cible: w.archerPull.rpe,
        description: `Force unilatérale de tirage calisthenics.${dn} Tirer vers un bras pendant que l'autre assiste bras tendu sur la barre.`,
      }),
      ex('Band Biceps Curl', 'reps', w.bandCurl.series, {
        reps: w.bandCurl.reps,
        repos_sec: 60,
        rpe_cible: w.bandCurl.rpe,
        description: `Hypertrophie et protection des tendons du coude avec bande élastique.${dn} Maintien du pic de contraction 1 s.`,
      }),
      ex('Seated Pike Compression Leg Lift', 'reps', w.pikeCompress.series, {
        reps: w.pikeCompress.reps,
        repos_sec: 60,
        rpe_cible: w.pikeCompress.rpe,
        description: `Force de compression active abdos/psoas.${dn} Assis jambes tendues au sol, lever les pieds sans reculer le buste (transfert L-Sit & Press to HS).`,
      }),
      ex('Reverse Wrist Curl', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Renforcement fléchisseurs/extenseurs poignets avec bande ou léger lest maison.${dn}`,
      }),
    ],
  });

  // DIMANCHE — Gym : Récupération active + Muscle-Up + Mobilité (~40 min)
  const sundayEx = [
    ...warmupSunday(dn),
    ex('Strict Muscle-Up (Qualité)', 'reps', w.muQuality.series, {
      reps: w.muQuality.reps,
      repos_sec: 120,
      rpe_cible: w.muQuality.rpe,
      description: `Maintenance Muscle-Up à la salle sur barre haute.${dn} Mouvement fluide et propre, transition symétrique sans élan excessif, descente contrôlée.`,
    }),
    ex('Handstand Balance Flow', 'isometrique', 3, {
      duree_sec: '10-15',
      repos_sec: 60,
      rpe_cible: 5,
      description: `Session handstand légère (4/4 de la semaine).${dn} Sensation de balance libre sans fatigue ni échec, plaisir du mouvement.`,
    }),
    ex('Shoulder Mobility Flow', 'isometrique', 1, {
      duree_sec: '600',
      repos_sec: 0,
      rpe_cible: 2,
      description: `Mobilité active des épaules (10 min).${dn} Ouverture thoracique, flexion complète, rotation externe. Récupération sans forcer.`,
    }),
    ex('Hip Mobility Flow', 'isometrique', 1, {
      duree_sec: '600',
      repos_sec: 0,
      rpe_cible: 2,
      description: `Mobilité hanches et chevilles (10 min).${dn} Rotation interne/externe, fléchisseurs, grand écart facial préparatoire.`,
    }),
    ex('Dead Bug', 'reps', w.deload ? 2 : 3, {
      reps: '10',
      repos_sec: 45,
      rpe_cible: 4,
      description: `Coordination motrice et activation transverse/obliques.${dn} Respiration lente diaphragmatique.`,
    }),
    ex('Copenhagen Side Plank', 'isometrique', w.deload ? 2 : 2, {
      duree_sec: '15-20',
      repos_sec: 45,
      rpe_cible: 5,
      description: `Stabilité pelvienne latérale.${dn}`,
    }),
  ];

  if (w.sundayPlyo === true) {
    sundayEx.push(
      ex('Pogos', 'reps', 2, {
        reps: '15',
        repos_sec: 60,
        rpe_cible: 5,
        description: `Plyo légère de réactivité de cheville.${dn} Contact sol minimal, genoux verrouillés.`,
      }),
    );
  } else if (w.sundayPlyo === 'light') {
    sundayEx.push(
      ex('Max Vertical Jump', 'reps', 3, {
        reps: '2',
        repos_sec: 150,
        rpe_cible: 5,
        description: `Rappel d'explosivité neuromusculaire en semaine 5.${dn} 2 sauts max avec récupération complète.`,
      }),
    );
  }

  seances.push({
    jour: 'Dimanche',
    nom: 'Récupération active — Mobilité + Skills',
    exercices: sundayEx,
  });

  return { nom: w.nom, seances, note: w.note };
}

function exToYaml(exercise, indent) {
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 2);
  const q = (s) => (s.includes(':') || s.includes('"') ? `"${s.replace(/"/g, '\\"')}"` : s);
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
    lines.push(`${pad2}description: ${q(desc)}`);
  }
  lines.push(`${pad2}repos_sec: ${exercise.repos_sec}`);
  lines.push(`${pad2}rpe_cible: ${exercise.rpe_cible}`);
  if (exercise.groupe) lines.push(`${pad2}groupe: "${exercise.groupe}"`);
  return lines.join('\n');
}

let out = `# Programme Athlète Hybride — v2.1 (Calisthenics Skills & Hybrid Strength)
# ─────────────────────────────────────────────────────────────────────────────
# LUNDI = REPOS COMPLET
# 6 séances par semaine : Mardi → Dimanche
# - Mardi : Gym Force Upper (Bench 70kg baseline, Tractions lestées déplacées ici, Dips, OHP)
# - Mercredi : Maison Front Lever + Handstand (10-15s) + Pike/HSPU + Tuck Planche + Core
# - Jeudi : Gym Bas du corps + Plyo VJ + Hang Clean
# - Vendredi : Maison Muscle-Up (qualité fluide) + Handstand + L-Sit & Core (sans doublon Face Pull)
# - Samedi : Maison Front Lever #2 + Tuck Planche #2 + Tirage Calisthenics & Compression Core
# - Dimanche : Récupération active + Mobilité + Handstand flow
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
