import pg from "pg";

const DATABASE_URL = 'postgres://d3339c053a51d317cab3801f4f0326c7a4320fbaf0c7bf88604d211a0f2a686e:sk_Bepyg18Y4P-vrX8qYSHpz@db.prisma.io:5432/postgres?sslmode=require';
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // Exercise progression summary
    const progressionResult = await client.query(`
      SELECT 
        ps.exercise_name, 
        ps.exercise_type,
        ws.date_iso,
        ps.set_number,
        ps.weight, 
        ps.reps_actual, 
        ps.reps_target,
        ps.rpe
      FROM performed_sets ps
      JOIN workout_sessions ws ON ps.session_id = ws.id
      WHERE ws.status = 'completed'
      ORDER BY ps.exercise_name ASC, ws.date_iso ASC, ps.set_number ASC
    `);
    
    // Group by exercise
    const byExercise = {};
    for (const row of progressionResult.rows) {
      if (!byExercise[row.exercise_name]) {
        byExercise[row.exercise_name] = { type: row.exercise_type, sessions: {} };
      }
      if (!byExercise[row.exercise_name].sessions[row.date_iso]) {
        byExercise[row.exercise_name].sessions[row.date_iso] = [];
      }
      byExercise[row.exercise_name].sessions[row.date_iso].push({
        set: row.set_number,
        weight: row.weight,
        reps: row.reps_actual,
        target: row.reps_target,
        rpe: row.rpe
      });
    }

    console.log("=== EXERCISE PROGRESSION SUMMARY ===\n");
    for (const [exName, data] of Object.entries(byExercise)) {
      console.log(`\n### ${exName} (${data.type}) ###`);
      for (const [date, sets] of Object.entries(data.sessions)) {
        const setsStr = sets.map(s => {
          if (data.type === 'isometrique') {
            return `${s.weight > 0 ? s.weight + 'kg · ' : ''}${s.reps}s`;
          }
          return `${s.weight}kg × ${s.reps}`;
        }).join(' | ');
        console.log(`  ${date}: ${setsStr}  (target: ${sets[0].target})`);
      }
    }

    // Missed sessions
    const missedResult = await client.query(`
      SELECT date_iso, cycle_name, session_name, jour, status
      FROM planned_sessions
      WHERE status = 'missed'
      ORDER BY date_iso ASC
    `);
    
    console.log("\n\n=== MISSED SESSIONS ===");
    console.log(`Total missed: ${missedResult.rows.length}`);
    for (const row of missedResult.rows) {
      console.log(`  ${row.date_iso} (${row.jour}) - ${row.session_name} [${row.cycle_name}]`);
    }

    // Sessions completed per week
    const weeklyResult = await client.query(`
      SELECT 
        date_trunc('week', to_date(date_iso, 'YYYY-MM-DD'))::date as week_start,
        COUNT(*) as sessions_done
      FROM workout_sessions
      WHERE status = 'completed'
      GROUP BY week_start
      ORDER BY week_start ASC
    `);
    
    console.log("\n\n=== SESSIONS COMPLETED PER WEEK ===");
    for (const row of weeklyResult.rows) {
      const weekStr = row.week_start.toISOString().split('T')[0];
      console.log(`  Week of ${weekStr}: ${row.sessions_done}/6 sessions`);
    }

    // Feedback & motivation trends
    const feedbackResult = await client.query(`
      SELECT date_iso, feedback, session_name, duration_sec, avg_rpe
      FROM workout_sessions
      WHERE status = 'completed' AND feedback IS NOT NULL
      ORDER BY date_iso ASC
    `);
    
    console.log("\n\n=== MOTIVATION & ENERGY TRENDS ===");
    for (const row of feedbackResult.rows) {
      const fb = row.feedback || {};
      const durationMin = Math.round((row.duration_sec || 0) / 60);
      console.log(`  ${row.date_iso} | ${row.session_name || 'N/A'} | ${durationMin}min | motiv=${fb.motivation ?? '?'} | sommeil=${fb.sommeil ?? '?'} | RPE ressenti=${fb.rpeRessenti ?? '?'} | energie=${fb.energieAvant ?? '?'}→${fb.energieApres ?? '?'} | notes: ${fb.notes || '-'}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
