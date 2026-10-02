const { Pool } = require('pg');
const fs = require('fs');
const yaml = require('js-yaml');
const crypto = require('crypto');

const DATABASE_URL = 'postgres://d3339c053a51d317cab3801f4f0326c7a4320fbaf0c7bf88604d211a0f2a686e:sk_Bepyg18Y4P-vrX8qYSHpz@db.prisma.io:5432/postgres?sslmode=require';

const JOUR_OFFSET = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
};

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function seedMonth2() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  const raw = yaml.load(fs.readFileSync('apps/web-v2/programme.yaml', 'utf8'));
  const weekStart = getMonday('2026-10-05');
  const now = new Date().toISOString();
  
  const plannedSessions = [];
  for (const [cycleIndex, cycle] of raw.cycles.entries()) {
    for (const [sessionIndex, seance] of cycle.seances.entries()) {
      const jour = seance.jour?.trim();
      const jourOffset = JOUR_OFFSET[jour] ?? 0;
      const offset = cycleIndex * 7 + jourOffset;
      const sessionDate = addDays(weekStart, offset);
      const dateISO = toISODate(sessionDate);

      plannedSessions.push({
        id: crypto.randomUUID(),
        date_iso: dateISO,
        cycle_index: cycleIndex,
        session_index: sessionIndex,
        cycle_name: cycle.nom,
        session_name: seance.nom,
        jour,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
    }
  }

  console.log('Generated ' + plannedSessions.length + ' Month 2 planned sessions');
  console.log('Date range: ' + plannedSessions[0].date_iso + ' to ' + plannedSessions[plannedSessions.length - 1].date_iso);

  // Check if Month 2 sessions already exist
  const existingM2 = await pool.query("SELECT count(id) FROM planned_sessions WHERE date_iso >= '2026-10-01'");
  console.log('Existing sessions in Oct/Nov:', existingM2.rows[0].count);

  if (parseInt(existingM2.rows[0].count, 10) === 0) {
    for (const s of plannedSessions) {
      await pool.query(
        `INSERT INTO planned_sessions (id, date_iso, cycle_index, session_index, cycle_name, session_name, jour, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [s.id, s.date_iso, s.cycle_index, s.session_index, s.cycle_name, s.session_name, s.jour, s.status, s.created_at, s.updated_at]
      );
    }
    console.log('✅ Successfully inserted 36 Month 2 sessions into Postgres!');
  } else {
    console.log('ℹ️ Month 2 sessions already exist in Postgres.');
  }

  const total = await pool.query('SELECT count(id), min(date_iso), max(date_iso) FROM planned_sessions');
  console.log('Total planned_sessions in Postgres:', total.rows[0]);

  await pool.end();
}

seedMonth2().catch(err => {
  console.error(err);
  process.exit(1);
});
