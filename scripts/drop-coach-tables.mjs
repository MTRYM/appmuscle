import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL manquante. Lance avec : node --env-file=apps/web-v2/.env scripts/drop-coach-tables.mjs');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log('Suppression des tables Coach inutilisées dans PostgreSQL...');
  await pool.query('DROP TABLE IF EXISTS coach_memories, coach_conversations, program_changes CASCADE;');
  console.log('Tables coach_memories, coach_conversations, program_changes supprimées avec succès.');
  await pool.end();
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
