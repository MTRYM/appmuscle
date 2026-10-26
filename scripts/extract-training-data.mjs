import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // 1. All workout sessions (completed)
    const sessionsResult = await client.query(`
      SELECT ws.id, ws.date_iso, ws.planned_session_id, ws.type, ws.status, 
             ws.started_at, ws.completed_at, ws.duration_sec, ws.avg_rpe, ws.feedback,
             ws.created_at,
             ps.session_name, ps.cycle_name, ps.jour, ps.cycle_index, ps.session_index, ps.status as planned_status
      FROM workout_sessions ws
      LEFT JOIN planned_sessions ps ON ws.planned_session_id = ps.id
      ORDER BY ws.date_iso ASC
    `);
    
    console.log("=== WORKOUT SESSIONS ===");
    console.log(`Total completed sessions: ${sessionsResult.rows.length}`);
    console.log(JSON.stringify(sessionsResult.rows, null, 2));

    // 2. All performed sets
    const setsResult = await client.query(`
      SELECT ps.id, ps.session_id, ps.exercise_name, ps.exercise_type, 
             ps.set_number, ps.weight, ps.reps_actual, ps.reps_target, ps.rpe, ps.rest_sec_actual,
             ws.date_iso
      FROM performed_sets ps
      JOIN workout_sessions ws ON ps.session_id = ws.id
      ORDER BY ws.date_iso ASC, ps.exercise_name ASC, ps.set_number ASC
    `);
    
    console.log("\n=== PERFORMED SETS ===");
    console.log(`Total performed sets: ${setsResult.rows.length}`);
    console.log(JSON.stringify(setsResult.rows, null, 2));

    // 3. All planned sessions with their status
    const plannedResult = await client.query(`
      SELECT id, date_iso, cycle_index, session_index, cycle_name, session_name, jour, status
      FROM planned_sessions
      ORDER BY date_iso ASC
    `);
    
    console.log("\n=== PLANNED SESSIONS ===");
    console.log(`Total planned sessions: ${plannedResult.rows.length}`);
    console.log(JSON.stringify(plannedResult.rows, null, 2));

    // 4. Summary: missed vs done vs pending
    const summaryResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM planned_sessions
      GROUP BY status
    `);
    
    console.log("\n=== PLANNED SESSION STATUS SUMMARY ===");
    console.log(JSON.stringify(summaryResult.rows, null, 2));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
