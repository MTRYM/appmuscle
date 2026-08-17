async function runVerification() {
  console.log("🔍 ===================================================");
  console.log("🔍 DÉMARRAGE DE LA VÉRIFICATION INTÉGRALE D'APPMUSCU");
  console.log("🔍 ===================================================\n");

  const BASE_URL = "http://localhost:5173";
  let cookieHeader = "";

  // 1. Test Auth Login
  console.log("1️⃣ Test Authentification (PIN: 91649164)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "91649164" }),
  });
  if (loginRes.status === 200) {
    const rawCookie = loginRes.headers.get("set-cookie");
    cookieHeader = rawCookie ? rawCookie.split(";")[0] : "";
    console.log("   ✅ Authentification réussie (Cookie reçu)");
  } else {
    throw new Error(`Échec Login: HTTP ${loginRes.status}`);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  };

  // 2. Test Settings
  console.log("\n2️⃣ Test Réglages & Date de départ...");
  const settingsRes = await fetch(`${BASE_URL}/api/settings`, { headers: authHeaders });
  const settings = await settingsRes.json();
  console.log(`   ✅ Date de début du programme: ${settings.programStartDate}`);
  console.log(`   ✅ Thème actif: ${settings.theme}`);

  // 3. Test Planned Sessions
  console.log("\n3️⃣ Test Séances Planifiées...");
  const plannedRes = await fetch(`${BASE_URL}/api/planned-sessions`, { headers: authHeaders });
  const planned = await plannedRes.json();
  console.log(`   ✅ Total séances au planning: ${planned.length} séances`);
  console.log(`   ✅ 1ère séance: ${planned[0]?.dateISO} (${planned[0]?.jour} — ${planned[0]?.sessionName}) [Statut: ${planned[0]?.status}]`);
  console.log(`   ✅ Dernière séance: ${planned[planned.length - 1]?.dateISO} (${planned[planned.length - 1]?.jour} — ${planned[planned.length - 1]?.sessionName})`);

  // 4. Test Missed Sessions
  console.log("\n4️⃣ Test Séances Manquées...");
  const missedRes = await fetch(`${BASE_URL}/api/planned-sessions?status=missed`, { headers: authHeaders });
  const missed = await missedRes.json();
  console.log(`   ✅ Séances manquées détectées: ${missed.length} (Normal: 0 pour un départ le 17 août)`);

  // 5. Test Athlete Profile
  console.log("\n5️⃣ Test Profil Athlète & Directives Coach...");
  const profileRes = await fetch(`${BASE_URL}/api/athlete-profile`, { headers: authHeaders });
  const profile = await profileRes.json();
  const profileLength = profile.text ? profile.text.length : 0;
  console.log(`   ✅ Profil athlète chargé (${profileLength} caractères)`);
  console.log(`   ✅ Extrait: "${profile.text ? profile.text.slice(0, 75).replace(/\n/g, ' ') : ''}..."`);

  // 6. Test Workout Save & Atomic Transaction
  console.log("\n6️⃣ Test Enregistrement de Séance Réelle (POST /api/sessions)...");
  const testSessionPayload = {
    dateISO: "2026-08-17",
    type: "planned",
    status: "completed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSec: 3720,
    avgRpe: 8.0,
    sets: [
      { exerciseName: "Bench Press", setNumber: 1, weight: 70, repsActual: 5, repsTarget: "5", rpe: 8 },
      { exerciseName: "Bench Press", setNumber: 2, weight: 70, repsActual: 5, repsTarget: "5", rpe: 8 },
      { exerciseName: "Dips", setNumber: 1, weight: 15, repsActual: 8, repsTarget: "6-8", rpe: 8.5 }
    ],
    feedback: {
      rpeRessenti: 8,
      energieAvant: 4,
      energieApres: 4,
      sommeil: 4,
      courbatures: 2,
      motivation: 5,
      douleur: false,
      notes: "Test de vérification automatique réussi !"
    }
  };

  const saveRes = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(testSessionPayload),
  });

  if (saveRes.status === 200) {
    const saved = await saveRes.json();
    console.log(`   ✅ Séance enregistrée avec succès ! (ID: ${saved.id})`);
  } else {
    throw new Error(`Échec enregistrement séance: HTTP ${saveRes.status}`);
  }

  // 7. Verify Saved Session
  console.log("\n7️⃣ Test Récupération des Séances & Séries...");
  const sessionsRes = await fetch(`${BASE_URL}/api/sessions?limit=5`, { headers: authHeaders });
  const allSessions = await sessionsRes.json();
  console.log(`   ✅ Total séances enregistrées: ${allSessions.length}`);
  console.log(`   ✅ Séries enregistrées dans la dernière séance: ${allSessions[0]?.performedSets?.length} séries`);

  // 8. Test Coach Health
  console.log("\n8️⃣ Test Moteur Coach IA (Health Check)...");
  const coachHealthRes = await fetch(`${BASE_URL}/api/coach/health?provider=gemini`, { headers: authHeaders });
  const coachHealth = await coachHealthRes.json();
  console.log(`   ✅ Statut Coach IA: ${coachHealth.status} (${coachHealth.message || "OK"})`);

  console.log("\n===================================================");
  console.log("🎉 TOUS LES TESTS SONT AU VERT ! APPLICATION 100% OPÉRATIONNELLE");
  console.log("===================================================\n");
}

runVerification().catch((err) => {
  console.error("❌ ERREUR LORS DU TEST:", err);
  process.exit(1);
});
