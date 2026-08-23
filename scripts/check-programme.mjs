import { load } from 'js-yaml';
import fs from 'fs';

const raw = fs.readFileSync('apps/web-v2/programme.yaml', 'utf8');
const parsed = load(raw);

console.log(`Cycles count: ${parsed.cycles.length}`);

let errors = [];

parsed.cycles.forEach((cycle, cIdx) => {
  console.log(`\n--- Cycle ${cIdx + 1}: ${cycle.nom} ---`);
  cycle.seances.forEach((seance) => {
    const names = seance.exercices.map(e => e.nom);
    console.log(`[${seance.jour}] ${seance.nom} (${seance.exercices.length} exercices)`);
    
    // Check duplicates
    const nameCounts = {};
    names.forEach(n => { nameCounts[n] = (nameCounts[n] || 0) + 1; });
    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 1) {
        errors.push(`Doublon dans ${cycle.nom} / ${seance.jour} / ${seance.nom}: "${name}" apparaît ${count} fois`);
      }
    }

    // Check Weighted Pull-Up not at home
    if (seance.jour !== 'Mardi' && names.includes('Weighted Pull-Up')) {
      errors.push(`Weighted Pull-Up trouvé hors séance salle Mardi: ${cycle.nom} / ${seance.jour}`);
    }

    // Check no gym exercises on home days
    if (seance.jour !== 'Mardi' && seance.jour !== 'Jeudi') {
      if (names.includes('Bench Press') || names.includes('Larsen Press') || names.includes('Front Squat') || names.includes('Cable External Rotation')) {
        errors.push(`Exercice de salle trouvé dans séance maison: ${cycle.nom} / ${seance.jour}`);
      }
    }
  });
});

if (errors.length > 0) {
  console.error('\n❌ ERREURS DÉTECTÉES:');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
} else {
  console.log('\n✅ AUCUNE ERREUR ! Programme 100% propre et conforme.');
}
