const pg = require('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const c = await pool.connect();
  try {
    const t = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('TABLES:', t.rows.map(r => r.table_name));

    const p = await c.query('SELECT MIN(date_iso), MAX(date_iso), COUNT(*), status FROM planned_sessions GROUP BY status');
    console.log('PLANNED SUMMARY:', p.rows);

    const latest = await c.query('SELECT id, date_iso, session_name, status, cycle_name FROM planned_sessions ORDER BY date_iso DESC LIMIT 10');
    console.log('LATEST 10 PLANNED SESSIONS:');
    latest.rows.forEach(r => console.log(r.date_iso, r.session_name, r.status, r.cycle_name));

    const oldest = await c.query('SELECT id, date_iso, session_name, status, cycle_name FROM planned_sessions ORDER BY date_iso ASC LIMIT 5');
    console.log('\nOLDEST 5 PLANNED SESSIONS:');
    oldest.rows.forEach(r => console.log(r.date_iso, r.session_name, r.status, r.cycle_name));
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(console.error);
