/**
 * Génère programme.yaml v2 — aligné profil athlète + audit.
 * Run: node scripts/generate-programme-v2.mjs
 */
import fs from 'fs';

const DAY_LABELS = {
  Mardi: 'TUESDAY — Gym',
  Mercredi: 'WEDNESDAY — Maison (skills + tirage)',
  Jeudi: 'THURSDAY — Gym',
  Vendredi: 'FRIDAY — Maison (muscle-up)',
  Samedi: 'SATURDAY — Maison (tirage + skills)',
  Dimanche: 'SUNDAY — Récupération active',
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

/** Échauffement tirage + skills maison — Mercredi, Samedi */
function warmupPullSkills(dn = '') {
  return [
    ex('Dead Hang', 'isometrique', 2, {
      duree_sec: '20-30',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement tirage.${dn} Décompression épaules, grip léger — prépare FL et pull-ups.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8-10',
      repos_sec: 45,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement tirage.${dn} Dépression/rétraction scapulaire, coudes tendus.`,
    }),
    ex('Band Pull-Apart', 'reps', 2, {
      reps: '15',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement tirage.${dn} Posture épaule avant volume de tirage.`,
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

/** Échauffement muscle-up — Vendredi */
function warmupMU(dn = '') {
  return [
    ex('Dead Hang', 'isometrique', 2, {
      duree_sec: '20',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement MU.${dn} Ouverture épaules et préparation grip.`,
    }),
    ex('Scapular Pull-Up', 'reps', 2, {
      reps: '8',
      repos_sec: 45,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement MU.${dn} Pattern tirage scapulaire avant transitions.`,
    }),
    ex('Face Pull', 'reps', 2, {
      reps: '12',
      repos_sec: 30,
      rpe_cible: 3,
      groupe: WU,
      description: `Échauffement MU.${dn} Coiffe et rotateurs — charge légère, contrôle.`,
    }),
  ];
}

/** Échauffement récup active — Dimanche (2 exos) */
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

/** Bloc handstand court (~10 min) — 4×/semaine (Mer, Ven, Sam, Dim) */
function handstandBlock(sessionNum, weekNote = '') {
  const note = weekNote ? ` ${weekNote}` : '';
  return [
    ex('Handstand Chest-to-Wall', 'isometrique', 3, {
      duree_sec: '20-30',
      repos_sec: 60,
      rpe_cible: 6,
      description: `Session handstand ${sessionNum}/4 de la semaine.${note} Priorité alignement : épaules actives, bassin postérieur, côtes rentrées. Garde 2-3 s en réserve. Fréquence distribuée > une longue séance (apprentissage moteur).`,
    }),
    ex('Wall Handstand Toe Pulls', 'reps', 2, {
      reps: '4-6',
      repos_sec: 60,
      rpe_cible: 6,
      description: `Micro-volume équilibre.${note} Un pied à la fois, sans perdre la ligne.`,
    }),
    ex('Scapular Handstand Shrugs', 'reps', 2, {
      reps: '8-10',
      repos_sec: 60,
      rpe_cible: 6,
      description: `Endurance scapulaire pour handstand.${note} Coudes tendus.`,
    }),
  ];
}

function plancheLean(weekNote = '') {
  return ex('Planche Lean', 'isometrique', 3, {
    duree_sec: '15-20',
    repos_sec: 60,
    rpe_cible: 6,
    description: `Préparation planche long terme (objectif profil).${weekNote} Épaules devant poignets, protraction, jambes tendues. Investissement minimal sans fatigue majeure.`,
  });
}

const WEEKS = [
  {
    nom: 'Semaine 1 — Fondations',
    tuck: '12-15',
    tuckSeries: 5,
    bench: { series: 4, reps: '5', rpe: 7 },
    larsen: { series: 2, reps: '6', rpe: 7 },
    ringDip: { series: 3, reps: '5', rpe: 6 },
    ohp: { series: 3, reps: '8', rpe: 7 },
    wpu: { series: 4, reps: '5', rpe: 7 },
    row: { series: 3, reps: '8', rpe: 7 },
    fsquat: { series: 3, reps: '5', rpe: 7 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7 },
    bss: { series: 3, reps: '6', rpe: 7 },
    rdl: { series: 3, reps: '6', rpe: 7 },
    muNeg: { series: 2, reps: '2', rpe: 6 },
    muTrans: { series: 3, reps: '3', rpe: 6 },
    pullVol: { series: 3, reps: '8', rpe: 7 },
    sundayPlyo: true,
    note: 'Base technique. Tuck front lever uniquement — ton AT actuel (1-2 s) ne justifie pas le volume AT.',
  },
  {
    nom: 'Semaine 2 — Consolidation',
    tuck: '15-20',
    tuckSeries: 5,
    bench: { series: 4, reps: '5', rpe: 7.5 },
    larsen: { series: 2, reps: '6', rpe: 7.5 },
    ringDip: { series: 3, reps: '5', rpe: 6.5 },
    ohp: { series: 3, reps: '8', rpe: 7.5 },
    wpu: { series: 4, reps: '5', rpe: 7.5 },
    row: { series: 3, reps: '8', rpe: 7.5 },
    fsquat: { series: 3, reps: '5', rpe: 7.5 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '3', rpe: 7.5 },
    bss: { series: 3, reps: '6', rpe: 7.5 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muNeg: { series: 2, reps: '2', rpe: 6 },
    muTrans: { series: 3, reps: '3', rpe: 6 },
    pullVol: { series: 3, reps: '8', rpe: 7 },
    sundayPlyo: true,
    note: 'Consolide S1. +2,5 kg bench seulement si S1 ≤ RPE 7.',
  },
  {
    nom: 'Semaine 3 — Surcharge progressive',
    tuck: '15-20',
    tuckSeries: 5,
    bench: { series: 4, reps: '4', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    ringDip: { series: 3, reps: '4', rpe: 7 },
    ohp: { series: 2, reps: '8', rpe: 7.5 },
    wpu: { series: 4, reps: '4', rpe: 8 },
    row: { series: 3, reps: '8', rpe: 7.5 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 7.5 },
    muNeg: { series: 2, reps: '2', rpe: 7 },
    muTrans: { series: 3, reps: '3', rpe: 6 },
    pullVol: { series: 3, reps: '8', rpe: 7.5 },
    sundayPlyo: false,
    note: 'Dimanche = mobilité seule (plyo retiré pour récupérer le SNC après S1-S2).',
  },
  {
    nom: 'Semaine 4 — Volume productif',
    tuck: '18-22',
    tuckSeries: 5,
    bench: { series: 4, reps: '4', rpe: 8 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    ringDip: { series: 3, reps: '4', rpe: 7.5 },
    ohp: { series: 2, reps: '8', rpe: 8 },
    wpu: { series: 4, reps: '4', rpe: 8 },
    row: { series: 3, reps: '8', rpe: 8 },
    fsquat: { series: 3, reps: '5', rpe: 8 },
    cmj: { series: 4, reps: '3', rpe: 6 },
    clean: { series: 4, reps: '2', rpe: 8 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 3, reps: '6', rpe: 8 },
    muNeg: { series: 2, reps: '2', rpe: 7 },
    muTrans: { series: 3, reps: '3', rpe: 6 },
    pullVol: { series: 3, reps: '8', rpe: 7.5 },
    sundayPlyo: false,
    note: 'Pic modéré du bloc — volume tirage plafonné vs ancien programme.',
  },
  {
    nom: 'Semaine 5 — Intensification',
    tuck: '15-20',
    tuckSeries: 4,
    bench: { series: 4, reps: '3', rpe: 8.5 },
    larsen: { series: 2, reps: '5', rpe: 8 },
    ringDip: { series: 3, reps: '4', rpe: 8 },
    ohp: { series: 2, reps: '6', rpe: 8 },
    wpu: { series: 4, reps: '3', rpe: 8.5 },
    row: { series: 2, reps: '8', rpe: 8 },
    fsquat: { series: 3, reps: '4', rpe: 8.5 },
    cmj: { series: 3, reps: '2', rpe: 6 },
    clean: { series: 3, reps: '2', rpe: 8.5 },
    bss: { series: 3, reps: '6', rpe: 8 },
    rdl: { series: 2, reps: '6', rpe: 8 },
    muNeg: { series: 2, reps: '2', rpe: 7 },
    muTrans: { series: 2, reps: '3', rpe: 6 },
    pullVol: { series: 2, reps: '8', rpe: 7.5 },
    sundayPlyo: 'light',
    note: 'Charges max du bloc. Accessoires réduits pour protéger épaules/coudes.',
  },
  {
    nom: 'Semaine 6 — Deload',
    tuck: '10-12',
    tuckSeries: 3,
    bench: { series: 3, reps: '5', rpe: 6 },
    larsen: { series: 2, reps: '6', rpe: 6 },
    ringDip: { series: 2, reps: '5', rpe: 5 },
    ohp: { series: 2, reps: '8', rpe: 6 },
    wpu: { series: 3, reps: '5', rpe: 6 },
    row: { series: 2, reps: '8', rpe: 6 },
    fsquat: { series: 2, reps: '5', rpe: 6 },
    cmj: { series: 3, reps: '2', rpe: 5 },
    clean: { series: 2, reps: '2', rpe: 6 },
    bss: { series: 2, reps: '6', rpe: 6 },
    rdl: { series: 2, reps: '6', rpe: 6 },
    muNeg: { series: 2, reps: '2', rpe: 5 },
    muTrans: { series: 2, reps: '3', rpe: 5 },
    pullVol: { series: 2, reps: '8', rpe: 6 },
    sundayPlyo: false,
    deload: true,
    note: 'Deload ~40-50 %. Termine chaque séance en te sentant frais.',
  },
];

const RING_DIP_RULE =
  'Règle profil : dips BW 5 reps propres × 2 semaines avant d\'ajouter du lest. Si fatigue ou épaules irritées → remplace par dips BW ou pompes pieds surélevés.';

const TUCK_PROGRESSION =
  'Progression : passe au advanced tuck seulement quand tu tiens 5×20 s en tuck strict avec bassin postérieur et coudes tendus. Ton AT actuel (~1-2 s) ne justifie pas le programmer maintenant.';

function buildWeek(w) {
  const dn = w.deload ? ' (deload)' : '';
  const seances = [];

  // MARDI — Gym push (~60 min)
  seances.push({
    jour: 'Mardi',
    nom: 'Gym — Force Push',
    exercices: [
      ...warmupPush(dn),
      ex('Bench Press', 'reps', w.bench.series, {
        reps: w.bench.reps,
        repos_sec: 180,
        rpe_cible: w.bench.rpe,
        description: `Lift push principal.${dn} Pause 1 s poitrine, poussée explosive. Progression conservative (193 cm = ROM long). +2,5 kg max si RPE cible respecté. Évite l'ego lifting (profil).`,
      }),
      ex('Larsen Press', 'reps', w.larsen.series, {
        reps: w.larsen.reps,
        repos_sec: 150,
        rpe_cible: w.larsen.rpe,
        description: `Volume push réduit (2 séries vs 3 avant) pour limiter fatigue bench.${dn} Pieds surélevés, transfert force horizontale.`,
      }),
      ex('Ring Dip', 'reps', w.ringDip.series, {
        reps: w.ringDip.reps,
        repos_sec: 120,
        rpe_cible: w.ringDip.rpe,
        description: `${RING_DIP_RULE}${dn} Descente contrôlée, épaules en dépression.`,
      }),
      ex('Standing Dumbbell Overhead Press', 'reps', w.ohp.series, {
        reps: w.ohp.reps,
        repos_sec: 120,
        rpe_cible: w.ohp.rpe,
        description: `Transfert handstand / force verticale.${dn}`,
      }),
      ex('Cable External Rotation', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Prehab coiffe — priorité longévité épaule avec volume push + MU.${dn}`,
      }),
    ],
  });

  // MERCREDI — Maison FL + tirage
  seances.push({
    jour: 'Mercredi',
    nom: 'Maison — Front Lever + Tirage',
    exercices: [
      ...warmupPullSkills(dn),
      ...handstandBlock(1, dn),
      ex('Tuck Front Lever Hold', 'isometrique', w.tuckSeries, {
        duree_sec: w.tuck,
        repos_sec: 90,
        rpe_cible: w.deload ? 5 : 7,
        description: `Skill #1 profil.${dn} ${TUCK_PROGRESSION} Scapulas en dépression, bassin postérieur, coudes tendus.`,
      }),
      ex('Front Lever Raises (Tuck)', 'reps', w.deload ? 2 : 3, {
        reps: '4',
        repos_sec: 90,
        rpe_cible: w.deload ? 5 : 7,
        description: `Renforce pattern FL sans passer prématurément à l'AT.${dn} Contrôlé, sans balancement.`,
      }),
      plancheLean(dn),
      ex('Weighted Pull-Up', 'reps', w.wpu.series, {
        reps: w.wpu.reps,
        repos_sec: 180,
        rpe_cible: w.wpu.rpe,
        description: `Force relative #2 profil.${dn} Suspension complète, pas de kip. +2 à 2,5 kg si toutes reps explosives.`,
      }),
      ex('Chest Supported Row', 'reps', w.row.series, {
        reps: w.row.reps,
        repos_sec: 90,
        rpe_cible: w.row.rpe,
        description: `Rowing scapulaire pour FL — une seule séance lourde de row/semaine.${dn} Rétraction + dépression.`,
      }),
      ex('Reverse Wrist Curl', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Résilience coudes/poignets (membres longs = levier élevé).${dn}`,
      }),
    ],
  });

  // JEUDI — Gym bas du corps + explosif
  seances.push({
    jour: 'Jeudi',
    nom: 'Gym — Bas du corps + Explosivité',
    exercices: [
      ...warmupLegs(dn),
      ex('Front Squat', 'reps', w.fsquat.series, {
        reps: w.fsquat.reps,
        repos_sec: 150,
        rpe_cible: w.fsquat.rpe,
        description: `Ajout audit : pattern squat axial absent avant.${dn} Force absolue bas du corps pour masse athlétique 85-90 kg. Torso vertical, coudes hauts.`,
      }),
      ex('Countermovement Jump', 'reps', w.cmj.series, {
        reps: w.cmj.reps,
        repos_sec: 150,
        rpe_cible: w.cmj.rpe,
        description: `Explosivité VJ (priorité #5).${dn} Intent max, arrête si hauteur baisse. Plyo principal de la semaine (jeudi).`,
      }),
      ex('Hang Power Clean', 'reps', w.clean.series, {
        reps: w.clean.reps,
        repos_sec: 150,
        rpe_cible: w.clean.rpe,
        description: `Production force rapide.${dn} Vitesse barre > charge.`,
      }),
      ex('Bulgarian Split Squat', 'reps', w.bss.series, {
        reps: w.bss.reps,
        repos_sec: 120,
        rpe_cible: w.bss.rpe,
        description: `Force unilatérale, stabilité hanche.${dn} Tibia vertical, excentrique contrôlé.`,
      }),
      ex('Romanian Deadlift', 'reps', w.rdl.series, {
        reps: w.rdl.reps,
        repos_sec: 120,
        rpe_cible: w.rdl.rpe,
        description: `Chaîne postérieure — remplace Jefferson curl (audit : flexion lombaire chargée + inconfort dos).${dn}`,
      }),
      ex('Pallof Press', 'reps', w.deload ? 2 : 3, {
        reps: '12',
        repos_sec: 45,
        rpe_cible: 6,
        description: `Anti-rotation tronc.${dn}`,
      }),
    ],
  });

  // VENDREDI — MU maintenance (pas hypertrophie push)
  seances.push({
    jour: 'Vendredi',
    nom: 'Maison — Muscle-Up (maintenance)',
    exercices: [
      ...warmupMU(dn),
      ...handstandBlock(2, dn),
      ex('False Grip Hang', 'isometrique', w.deload ? 2 : 3, {
        duree_sec: '15-20',
        repos_sec: 60,
        rpe_cible: 5,
        description: `Endurance false grip — volume minimal (MU = maintenance #8 profil).${dn} Sans aller à l'échec.`,
      }),
      ex('Low Bar Muscle-Up Transition', 'reps', w.muTrans.series, {
        reps: w.muTrans.reps,
        repos_sec: 90,
        rpe_cible: w.muTrans.rpe,
        description: `Travail technique transition.${dn} Coudes près du corps, lent et propre.`,
      }),
      ex('Negative Muscle-Up', 'reps', w.muNeg.series, {
        reps: w.muNeg.reps,
        repos_sec: 120,
        rpe_cible: w.muNeg.rpe,
        description: `Excentrique contrôlé 5-6 s — volume réduit vs ancien prog (audit : stress coude).${dn} Max 2 séries en semaine lourde.`,
      }),
      ex('Face Pull', 'reps', w.deload ? 2 : 3, {
        reps: '15',
        repos_sec: 60,
        rpe_cible: 6,
        description: `Prehab épaule post-MU.${dn}`,
      }),
    ],
  });

  // SAMEDI — Tirage volume modéré + FL #2
  seances.push({
    jour: 'Samedi',
    nom: 'Maison — Tirage + Skills',
    exercices: [
      ...warmupPullSkills(dn),
      ...handstandBlock(3, dn),
      ex('Tuck Front Lever Hold', 'isometrique', w.deload ? 2 : 4, {
        duree_sec: w.tuck,
        repos_sec: 90,
        rpe_cible: w.deload ? 5 : 6,
        description: `2e exposition FL/semaine (profil : 2-3×).${dn} Qualité technique, RPE plus bas qu'en mercredi.`,
      }),
      ex('Front Lever Scapular Pull', 'reps', w.deload ? 2 : 3, {
        reps: '8',
        repos_sec: 75,
        rpe_cible: 6,
        description: `Endurance dépression scapulaire (faiblesse profil).${dn}`,
      }),
      plancheLean(dn),
      ex('Pronated Pull-Up', 'reps', w.pullVol.series, {
        reps: w.pullVol.reps,
        repos_sec: 90,
        rpe_cible: w.pullVol.rpe,
        description: `Volume tirage modéré — C2B et rows redondants retirés (audit : ~50 sets pull/sem).${dn} Excentrique contrôlé.`,
      }),
      ex('Bayesian Cable Curl', 'reps', w.deload ? 2 : 2, {
        reps: '10-12',
        repos_sec: 60,
        rpe_cible: 7,
        description: `Seul curl direct/semaine.${dn}`,
      }),
    ],
  });

  // DIMANCHE — Récup active
  const sundayEx = [
    ...warmupSunday(dn),
    ...handstandBlock(4, dn),
    ex('Shoulder Mobility Flow', 'isometrique', 1, {
      duree_sec: '600',
      repos_sec: 0,
      rpe_cible: 2,
      description: `Mobilité épaule — extension thoracique, flexion, rotation externe.${dn} RPE 2 = récupération, jamais effort.`,
    }),
    ex('Hip Mobility Flow', 'isometrique', 1, {
      duree_sec: '600',
      repos_sec: 0,
      rpe_cible: 2,
      description: `Mobilité hanche — RI, adducteurs, fléchisseurs, chevilles.${dn}`,
    }),
    ex('Dead Bug', 'reps', w.deload ? 2 : 3, {
      reps: '10',
      repos_sec: 45,
      rpe_cible: 4,
      description: `Core léger — déplacé du lundi (repos).${dn}`,
    }),
    ex('Copenhagen Side Plank', 'isometrique', w.deload ? 2 : 2, {
      duree_sec: '15-20',
      repos_sec: 45,
      rpe_cible: 5,
      description: `Adducteurs / stabilité pelvienne — volume minimal.${dn}`,
    }),
  ];

  if (w.sundayPlyo === true) {
    sundayEx.push(
      ex('Pogos', 'reps', 2, {
        reps: '15',
        repos_sec: 60,
        rpe_cible: 5,
        description: `Plyo légère uniquement S1-S2.${dn} Pas de sprints/VJ le dimanche — plyo max jeudi (audit overlap SNC).`,
      }),
    );
  } else if (w.sundayPlyo === 'light') {
    sundayEx.push(
      ex('Max Vertical Jump', 'reps', 3, {
        reps: '2',
        repos_sec: 150,
        rpe_cible: 5,
        description: `S5 : rappel explosivité qualité, volume minimal.${dn}`,
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

let out = `# Programme Athlète Hybride — v2 (aligné profil + audit)
# ─────────────────────────────────────────────────────────
# LUNDI = REPOS COMPLET (contrainte profil)
# 6 séances : Mardi → Dimanche
# Handstand : 4 micro-sessions/sem (Mer, Ven, Sam, Dim)
# Front lever : TUCK strict jusqu'à 5×20 s propres
# Planche lean : 2×/sem (Mer, Sam) — préparation long terme
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

fs.writeFileSync('programme.yaml', out, 'utf8');

import { load } from 'js-yaml';
const parsed = load(out);
console.log('Semaines:', parsed.cycles.length);
parsed.cycles.forEach((c, i) => {
  const days = c.seances.map((s) => s.jour);
  const hasMon = days.includes('Lundi');
  const exCount = c.seances.reduce((a, s) => a + s.exercices.length, 0);
  console.log(`S${i + 1}: ${c.seances.length} séances [${days.join(', ')}] ${exCount} exos ${hasMon ? '⚠ LUNDI!' : '✓'}`);
});
