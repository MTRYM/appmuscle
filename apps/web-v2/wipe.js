import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config(); // Load .env

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query('TRUNCATE TABLE performed_sets CASCADE');
  await pool.query('TRUNCATE TABLE workout_sessions CASCADE');
  await pool.query('TRUNCATE TABLE planned_sessions CASCADE');
  await pool.query('TRUNCATE TABLE vacations CASCADE');
  console.log('Database wiped successfully.');
}

main().finally(() => pool.end());
