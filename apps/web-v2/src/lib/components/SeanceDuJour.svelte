<script>
  import { onMount } from 'svelte';
  import Chrono from './Chrono.svelte';
  import HoldTimer from './HoldTimer.svelte';
  import PostSessionDebrief from './PostSessionDebrief.svelte';
  import {
    getTodayPlannedSession,
    getMissedSessions,
    saveWorkoutSession,
    getAllSessionsWithSets,
    getInProgressSession,
    deleteWorkoutSession,
  } from '$lib/api';
import {
    parseProgramme,
    getSessionTemplate,
    getAllSessionTemplates,
    todayISO,
    formatDateFR,
    isIsometricExercise,
    isWarmupExercise,
    formatExerciseCible,
    RECOVERY_ROUTINE,
  } from '$lib/programme';
  import { calcAvgRpe, calcSessionVolume } from '$lib/stats';
  import { suggestWeightForExercise } from '$lib/weights';
  import { Check } from 'lucide-svelte';
  import ExerciseGif from './ExerciseGif.svelte';
  import { getExerciseGif } from '$lib/exerciseGifs.js';

  const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  let { onSessionSaved = () => {} } = $props();

  const programme = parseProgramme();

  let phase = $state('idle');
  let loading = $state(true);
  let todaySession = $state(null);
  let missedSessions = $state([]);
  let showCatchup = $state(false);
  let showFreePicker = $state(false);
  let freeTemplates = $state([]);

  let sessionMeta = $state(null);
  let exercices = $state([]);
  let exerciseIndex = $state(0);
  let setIndex = $state(0);
  let startedAt = $state(null);
  let currentSessionId = $state(null);
  let inProgressSession = $state(null);

  let weight = $state('');
  let repsActual = $state('');
  let rpeActual = $state('');
  let completedSets = $state([]);
  let setFlash = $state(false);
  let editingSet = $state(null);
  let showAllCompletedSets = $state(false);
  let showMenu = $state(false);

  let showRest = $state(false);
  let restKey = $state(0);
  let restDuration = $state(90);
  let pendingAfterRest = $state(null);
  let holdTimerKey = $state(0);

  let summary = $state(null);
  let sessionFeedback = $state({});
  let saving = $state(false);
  let now = $state(Date.now());
  let sessionHistory = $state([]);
  let weightHint = $state(null);

  onMount(async () => {
    await refreshIdle();
  });

  $effect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(id);
  });

  async function refreshIdle() {
    loading = true;
    try {
      const [today, missed, inProg] = await Promise.all([
        getTodayPlannedSession(todayISO()),
        getMissedSessions(),
        getInProgressSession().catch(() => null),
      ]);
      todaySession = today;
      missedSessions = missed;
      inProgressSession = inProg;
      freeTemplates = getAllSessionTemplates(programme);
    } catch (e) {
      console.warn('Erreur chargement séances:', e);
    } finally {
      loading = false;
    }
  }

  function suggestWeightFromSession(exerciseName) {
    const prev = [...completedSets].reverse().find((s) => s.exerciseName === exerciseName);
    return prev ? String(prev.weight) : '';
  }

  async function loadSessionHistory() {
    sessionHistory = await getAllSessionsWithSets();
  }

  async function initExerciseInputs(exercise) {
    if (!exercise) return;

    repsActual = String(exercise.cibleParsed?.mid ?? exercise.repsParsed?.mid ?? '');
    rpeActual = exercise.rpe_cible ? String(exercise.rpe_cible) : '7';

    if (isIsometricExercise(exercise)) {
      weight = '';
      weightHint = null;
      return;
    }

    const inSessionWeight = suggestWeightFromSession(exercise.nom);
    if (inSessionWeight) {
      weight = inSessionWeight;
      weightHint = null;
      return;
    }

    const suggestion = await suggestWeightForExercise(
      exercise.nom,
      exercise.cible,
      exercise.type,
      sessionHistory,
    );
    if (suggestion) {
      weight = String(suggestion.weight);
      weightHint = suggestion;
    } else {
      weight = '';
      weightHint = null;
    }
  }

  async function startSession(meta, template, type) {
    sessionMeta = {
      ...meta,
      type,
      plannedSessionId: meta.plannedSessionId ?? null,
    };
    exercices = template.exercices.map((e) => ({ ...e }));
    exerciseIndex = 0;
    setIndex = 0;
    completedSets = [];
    startedAt = new Date().toISOString();
    weight = '';
    repsActual = '';
    rpeActual = template.exercices[0]?.rpe_cible ? String(template.exercices[0].rpe_cible) : '7';
    weightHint = null;
    editingSet = null;
    showAllCompletedSets = false;
    showRest = false;
    showCatchup = false;
    showFreePicker = false;
    sessionFeedback = {};
    currentSessionId = null;
    await loadSessionHistory();
    await initExerciseInputs(exercices[0]);

    // Immediately save to DB with in_progress status
    try {
      const saved = await saveWorkoutSession({
        dateISO: todayISO(),
        plannedSessionId: sessionMeta?.plannedSessionId || null,
        type: sessionMeta?.type || 'planned',
        status: 'in_progress',
        startedAt,
        sets: [],
      });
      currentSessionId = saved.id;
    } catch (err) {
      console.error('Erreur lors de la création initiale de la séance:', err);
    }

    phase = 'active';
  }

  async function autoSaveProgress() {
    if (!currentSessionId) return;
    try {
      await saveWorkoutSession({
        id: currentSessionId,
        dateISO: todayISO(),
        plannedSessionId: sessionMeta?.plannedSessionId || null,
        type: sessionMeta?.type || 'planned',
        status: 'in_progress',
        startedAt,
        sets: $state.snapshot(completedSets),
      });
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
  }

  async function resumeSession(session) {
    // Reconstruct session state from saved in-progress data
    const template = getSessionTemplate(
      programme,
      session.plannedSession?.cycleIndex ?? 0,
      session.plannedSession?.sessionIndex ?? 0,
    );

    if (!template) {
      alert('Impossible de retrouver le modèle de séance.');
      return;
    }

    sessionMeta = {
      plannedSessionId: session.plannedSessionId || null,
      cycleIndex: session.plannedSession?.cycleIndex ?? 0,
      sessionIndex: session.plannedSession?.sessionIndex ?? 0,
      sessionName: session.plannedSession?.sessionName || 'Séance reprise',
      cycleName: session.plannedSession?.cycleName || '',
      type: session.type || 'planned',
    };
    exercices = template.exercices.map((e) => ({ ...e }));
    completedSets = (session.sets || []).map((s) => {
      const exTemplate = template.exercices.find((e) => e.nom === s.exerciseName);
      return {
        exerciseName: s.exerciseName,
        exerciseType: s.exerciseType,
        setNumber: s.setNumber,
        weight: s.weight,
        repsActual: s.repsActual,
        repsTarget: s.repsTarget,
        rpe: s.rpe,
        rpeTarget: exTemplate?.rpe_cible ?? s.rpe ?? 7,
        restSecActual: s.restSecActual,
      };
    });
    startedAt = session.startedAt;
    currentSessionId = session.id;
    inProgressSession = null;
    editingSet = null;
    showAllCompletedSets = false;

    // Figure out where the user left off
    let totalSetsSoFar = 0;
    let foundIndex = 0;
    let foundSet = 0;
    for (let i = 0; i < exercices.length; i++) {
      const setsForEx = completedSets.filter((s) => s.exerciseName === exercices[i].nom).length;
      if (setsForEx < exercices[i].series) {
        foundIndex = i;
        foundSet = setsForEx;
        break;
      }
      totalSetsSoFar += exercices[i].series;
      if (i === exercices.length - 1) {
        foundIndex = i;
        foundSet = exercices[i].series;
      }
    }

    exerciseIndex = foundIndex;
    setIndex = foundSet;
    weight = '';
    repsActual = '';
    weightHint = null;
    showRest = false;
    showCatchup = false;
    showFreePicker = false;
    sessionFeedback = {};

    await loadSessionHistory();
    await initExerciseInputs(exercices[exerciseIndex]);
    phase = 'active';
  }

  async function discardInProgress() {
    if (!inProgressSession) return;
    if (!confirm('Supprimer définitivement la séance en cours ? Les données seront perdues.')) return;
    try {
      await deleteWorkoutSession(inProgressSession.id);
    } catch (err) {
      console.error('Erreur suppression séance en cours:', err);
    }
    inProgressSession = null;
    await refreshIdle();
  }

  function startToday() {
    if (!todaySession) return;
    const template = getSessionTemplate(
      programme,
      todaySession.cycleIndex,
      todaySession.sessionIndex,
    );
    startSession(
      {
        plannedSessionId: todaySession.id,
        cycleIndex: todaySession.cycleIndex,
        sessionIndex: todaySession.sessionIndex,
        sessionName: todaySession.sessionName,
        cycleName: todaySession.cycleName,
      },
      template,
      'planned',
    );
  }

  function startCatchup(planned) {
    const template = getSessionTemplate(programme, planned.cycleIndex, planned.sessionIndex);
    startSession(
      {
        plannedSessionId: planned.id,
        cycleIndex: planned.cycleIndex,
        sessionIndex: planned.sessionIndex,
        sessionName: planned.sessionName,
        cycleName: planned.cycleName,
      },
      template,
      'catchup',
    );
  }

  function startFree(template) {
    startSession(
      {
        plannedSessionId: null,
        cycleIndex: template.cycleIndex,
        sessionIndex: template.sessionIndex,
        sessionName: template.sessionName,
        cycleName: template.cycleName,
      },
      template,
      'extra',
    );
  }

  function startRecoveryFlow() {
    startSession(
      {
        plannedSessionId: null,
        cycleIndex: 0,
        sessionIndex: 0,
        sessionName: RECOVERY_ROUTINE.nom,
        cycleName: 'Récupération & Mobilité',
      },
      RECOVERY_ROUTINE,
      'extra',
    );
  }

  let currentExercise = $derived(exercices[exerciseIndex]);
  let currentExerciseSets = $derived(
    currentExercise ? completedSets.filter((s) => s.exerciseName === currentExercise.nom) : [],
  );
  let totalSetsForExercise = $derived(currentExercise?.series ?? 0);
  let isLastSet = $derived(setIndex >= totalSetsForExercise - 1);
  let isLastExercise = $derived(exerciseIndex >= exercices.length - 1);
  let totalSetsPlanned = $derived(exercices.reduce((sum, e) => sum + (e.series ?? 0), 0));
  let progressPct = $derived(
    totalSetsPlanned > 0 ? Math.round((completedSets.length / totalSetsPlanned) * 100) : 0,
  );
  let sessionElapsed = $derived(
    startedAt ? Math.floor((now - Date.parse(startedAt)) / 1000) : 0,
  );

  let isIso = $derived(isIsometricExercise(currentExercise));
  let hasGuide = $derived(
    !!currentExercise && (!!getExerciseGif(currentExercise.nom) || !!currentExercise.description),
  );
  let nextUp = $derived.by(() => {
    if (!showRest || !currentExercise) return null;
    if (pendingAfterRest === 'nextExercise') {
      const nx = exercices[exerciseIndex + 1];
      return nx ? nx.nom : null;
    }
    return `Série ${setIndex + 2} · ${currentExercise.nom}`;
  });

  function menuAction(fn) {
    showMenu = false;
    fn();
  }

  function formatClock(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const sec = String(secs % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  function formatSetPerf(set) {
    if (set.exerciseType === 'isometrique') {
      return `${set.weight > 0 ? `${set.weight} kg · ` : ''}${set.repsActual} s`;
    }
    return `${set.weight} kg × ${set.repsActual}`;
  }

  function validateSetInput() {
    const r = parseInt(repsActual, 10);
    if (Number.isNaN(r) || r < 1) return false;

    if (!isIso) {
      const w = parseFloat(weight);
      if (Number.isNaN(w) || w < 0) return false;
    }

    if (rpeActual) {
      const parsedRpe = parseFloat(rpeActual);
      if (Number.isNaN(parsedRpe) || parsedRpe < 1 || parsedRpe > 10) return false;
    }

    return true;
  }

  function flashSetValidated() {
    setFlash = true;
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => {
      setFlash = false;
    }, 500);
  }

  function confirmSet() {
    if (!validateSetInput()) return;

    const actualRpe = rpeActual && !Number.isNaN(parseFloat(rpeActual))
      ? parseFloat(rpeActual)
      : currentExercise.rpe_cible;

    const set = {
      exerciseName: currentExercise.nom,
      exerciseType: currentExercise.type,
      setNumber: setIndex + 1,
      weight: isIso ? (parseFloat(weight) || 0) : parseFloat(weight),
      repsActual: parseInt(repsActual, 10),
      repsTarget: currentExercise.cible,
      rpe: actualRpe,
      rpeTarget: currentExercise.rpe_cible,
      restSecActual: null,
    };

    completedSets = [...completedSets, set];
    flashSetValidated();

    // Auto-save progress after each set
    autoSaveProgress();

    if (isLastSet && isLastExercise) {
      showRest = false;
      finishSession();
      return;
    }

    restDuration = currentExercise.repos_sec;
    restKey += 1;
    showRest = true;
    pendingAfterRest = isLastSet ? 'nextExercise' : 'nextSet';
  }

  function undoLastSet() {
    if (completedSets.length === 0) return;

    const last = completedSets[completedSets.length - 1];
    completedSets = completedSets.slice(0, -1);

    showRest = false;
    pendingAfterRest = null;

    const exIdx = exercices.findIndex((e) => e.nom === last.exerciseName);
    if (exIdx !== -1) {
      exerciseIndex = exIdx;
      setIndex = Math.max(0, last.setNumber - 1);
    }

    const currentEx = exercices[exerciseIndex];
    const isCurrentIso = isIsometricExercise(currentEx);
    weight = isCurrentIso ? (last.weight > 0 ? String(last.weight) : '') : String(last.weight);
    repsActual = String(last.repsActual);
    rpeActual = last.rpe !== null && last.rpe !== undefined ? String(last.rpe) : String(last.rpeTarget ?? currentEx?.rpe_cible ?? '7');

    autoSaveProgress();
  }

  function startEditSet(setObj) {
    const globalIdx = completedSets.indexOf(setObj);
    if (globalIdx === -1) return;
    editingSet = {
      globalIndex: globalIdx,
      exerciseName: setObj.exerciseName,
      exerciseType: setObj.exerciseType,
      setNumber: setObj.setNumber,
      weight: String(setObj.weight),
      repsActual: String(setObj.repsActual),
      rpe: String(setObj.rpe ?? setObj.rpeTarget ?? ''),
      rpeTarget: setObj.rpeTarget,
    };
  }

  function saveEditedSet() {
    if (!editingSet) return;
    const idx = editingSet.globalIndex;
    if (idx < 0 || idx >= completedSets.length) return;

    const w = parseFloat(editingSet.weight);
    const r = parseInt(editingSet.repsActual, 10);
    const rpeVal = editingSet.rpe ? parseFloat(editingSet.rpe) : completedSets[idx].rpeTarget;

    if (Number.isNaN(r) || r < 1) {
      alert('Valeur de répétitions ou durée invalide.');
      return;
    }

    completedSets = completedSets.map((s, i) => {
      if (i !== idx) return s;
      return {
        ...s,
        weight: Number.isNaN(w) ? 0 : w,
        repsActual: r,
        rpe: Number.isNaN(rpeVal) ? s.rpeTarget : rpeVal,
      };
    });

    editingSet = null;
    autoSaveProgress();
  }

  function deleteSpecificSet(globalIndex) {
    if (!confirm('Supprimer définitivement cette série enregistrée ?')) return;
    completedSets = completedSets.filter((_, i) => i !== globalIndex);
    editingSet = null;
    autoSaveProgress();
  }

  function cancelEditSet() {
    editingSet = null;
  }

  function updateLastSetRest(actualRestSec) {
    if (completedSets.length === 0) return;
    const idx = completedSets.length - 1;
    completedSets = completedSets.map((s, i) =>
      i === idx ? { ...s, restSecActual: actualRestSec } : s,
    );
  }

  function onRestComplete({ actualRestSec }) {
    updateLastSetRest(actualRestSec);
    advanceAfterSet();
  }

  function onRestSkip({ actualRestSec }) {
    updateLastSetRest(actualRestSec);
    advanceAfterSet();
  }

  async function advanceAfterSet() {
    showRest = false;

    if (pendingAfterRest === 'nextSet') {
      setIndex += 1;
      repsActual = String(currentExercise.cibleParsed?.mid ?? '');
      if (!rpeActual) rpeActual = String(currentExercise.rpe_cible ?? '7');
    } else if (pendingAfterRest === 'nextExercise') {
      exerciseIndex += 1;
      setIndex = 0;
      await initExerciseInputs(exercices[exerciseIndex]);
    }

    pendingAfterRest = null;
  }

  async function skipToNextSet() {
    showRest = false;
    if (isLastSet) {
      if (isLastExercise) {
        finishSession();
      } else {
        exerciseIndex += 1;
        setIndex = 0;
        await initExerciseInputs(exercices[exerciseIndex]);
      }
    } else {
      setIndex += 1;
      repsActual = String(currentExercise.cibleParsed?.mid ?? '');
      if (!rpeActual) rpeActual = String(currentExercise.rpe_cible ?? '7');
    }
  }

  async function skipToNextExercise() {
    showRest = false;
    if (isLastExercise) {
      finishSession();
    } else {
      exerciseIndex += 1;
      setIndex = 0;
      await initExerciseInputs(exercices[exerciseIndex]);
    }
  }

  function finishSession() {
    const completedAt = new Date().toISOString();
    const durationSec = Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000);
    const avgRpe = Math.round(calcAvgRpe(completedSets) * 10) / 10;
    const avgRpeTarget = completedSets.length > 0
      ? Math.round((completedSets.reduce((sum, s) => sum + (s.rpeTarget ?? 7), 0) / completedSets.length) * 10) / 10
      : 7;
    const volume = Math.round(calcSessionVolume(completedSets));

    summary = {
      sessionName: sessionMeta.sessionName,
      durationSec,
      avgRpe,
      avgRpeTarget,
      setCount: completedSets.length,
      volume,
      completedAt,
    };

    phase = 'debrief';
  }

  async function onDebriefComplete(feedback) {
    sessionFeedback = feedback;
    await saveAndClose();
  }

  async function saveAndClose() {
    if (saving || !summary) return;
    saving = true;

    try {
      await saveWorkoutSession({
        id: currentSessionId || undefined,
        dateISO: todayISO(),
        plannedSessionId: sessionMeta?.plannedSessionId || null,
        type: sessionMeta?.type || 'planned',
        status: 'completed',
        startedAt,
        completedAt: summary.completedAt,
        durationSec: summary.durationSec,
        avgRpe: summary.avgRpe,
        sets: $state.snapshot(completedSets),
        feedback: $state.snapshot(sessionFeedback),
      });

      phase = 'done';
      currentSessionId = null;
      onSessionSaved();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la séance:', err);
      alert('Erreur lors de l\'enregistrement de la séance : ' + (err?.message || err));
    } finally {
      saving = false;
    }
  }

  function backToHome() {
    phase = 'idle';
    summary = null;
    sessionMeta = null;
    sessionFeedback = {};
    currentSessionId = null;
    refreshIdle();
  }

  async function cancelSession() {
    if (confirm('Annuler la séance en cours ? Les données seront perdues.')) {
      // Delete the in-progress session from DB
      if (currentSessionId) {
        try {
          await deleteWorkoutSession(currentSessionId);
        } catch (err) {
          console.error('Erreur suppression séance annulée:', err);
        }
      }
      phase = 'idle';
      sessionMeta = null;
      summary = null;
      showRest = false;
      currentSessionId = null;
      await refreshIdle();
    }
  }

  function formatDuration(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} min ${s} s`;
  }

  function getSessionExercisesSplit(cycleIndex, sessionIndex) {
    const exercises = getSessionTemplate(programme, cycleIndex, sessionIndex)?.exercices ?? [];
    return {
      warmups: exercises.filter(isWarmupExercise),
      main: exercises.filter((e) => !isWarmupExercise(e)),
    };
  }

  $effect(() => {
    if (phase === 'active' && currentExercise && !repsActual && !showRest) {
      repsActual = String(currentExercise.cibleParsed?.mid ?? '');
    }
  });
</script>

<div class="seance">
  {#if phase === 'idle'}
    {#if loading}
      <div class="loading-screen">
        <span class="spinner" aria-hidden="true"></span>
        <p>Chargement de ta séance…</p>
      </div>
    {:else}
      {#if inProgressSession}
        <header class="home-head">
          <p class="home-date accent-text">En cours</p>
          <h1>{inProgressSession.plannedSession?.sessionName || 'Séance'}</h1>
          <p class="muted">
            {inProgressSession.sets?.length || 0} série(s) · commencée le {formatDateFR(inProgressSession.dateISO)}
          </p>
        </header>

        <button type="button" class="btn-primary start-btn" onclick={() => resumeSession(inProgressSession)}>
          Reprendre la séance
        </button>
        <button type="button" class="btn-ghost cancel-resume" onclick={discardInProgress}>
          Abandonner
        </button>
      {:else if todaySession}
        {@const split = getSessionExercisesSplit(todaySession.cycleIndex, todaySession.sessionIndex)}
        <header class="home-head">
          <p class="home-date accent-text">{formatDateFR(todayISO())}</p>
          <h1>{todaySession.sessionName}</h1>
          <p class="muted">{todaySession.cycleName}</p>
        </header>

        <button type="button" class="btn-primary start-btn" onclick={startToday}>
          Démarrer la séance
        </button>

        <section class="plan" aria-label="Programme du jour">
          {#if split.warmups.length > 0}
            <p class="plan-warmup">
              Échauffement · {split.warmups.map((w) => w.nom).join(', ')}
            </p>
          {/if}
          <ul class="plan-list">
            {#each split.main as ex}
              <li>
                <span class="plan-name">{ex.nom}</span>
                <span class="plan-meta">{ex.series}×{formatExerciseCible(ex)}</span>
              </li>
            {/each}
          </ul>
        </section>
      {:else}
        <header class="home-head">
          <p class="home-date accent-text">{formatDateFR(todayISO())}</p>
          <h1>Pas de séance prévue</h1>
          <p class="muted">
            {#if missedSessions.length > 0}
              Rattrapez une séance manquée ou lancez une séance libre.
            {:else}
              Jour de repos, ou séance déjà effectuée.
            {/if}
          </p>
        </header>
      {/if}

      <nav class="quick-links" aria-label="Autres options">
        {#if missedSessions.length > 0}
          <button type="button" class="quick-row" onclick={() => (showCatchup = !showCatchup)}>
            <span>Rattraper une séance</span>
            <span class="quick-meta">{missedSessions.length}</span>
          </button>
          {#if showCatchup}
            <div class="picker">
              {#each missedSessions as m}
                <button type="button" class="pick-item" onclick={() => startCatchup(m)}>
                  <strong>{m.sessionName}</strong>
                  <span>{formatDateFR(m.dateISO)} — {m.cycleName}</span>
                </button>
              {/each}
            </div>
          {/if}
        {/if}

        <button type="button" class="quick-row" onclick={() => (showFreePicker = !showFreePicker)}>
          <span>Séance libre</span>
        </button>
        {#if showFreePicker}
          <div class="picker">
            {#each freeTemplates as t}
              <button type="button" class="pick-item" onclick={() => startFree(t)}>
                <strong>{t.label}</strong>
                <span>{t.exercices.length} exercices</span>
              </button>
            {/each}
          </div>
        {/if}

        <button type="button" class="quick-row" onclick={startRecoveryFlow}>
          <span>Routine récupération</span>
          <span class="quick-meta">12 min</span>
        </button>
      </nav>
    {/if}
  {:else if phase === 'active'}
    {#if currentExercise}
      <div class="workout" class:flash={setFlash}>
        <header class="w-top">
          <span class="w-session">{sessionMeta.sessionName}</span>
          <span class="w-clock">{formatClock(sessionElapsed)}</span>
          <button
            type="button"
            class="w-more"
            aria-label="Options de la séance"
            onclick={() => (showMenu = true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        </header>
        <div class="w-progress" aria-hidden="true"><span style="width: {progressPct}%"></span></div>

        {#if !showRest}
          <section class="w-exercise">
            <p class="w-step">
              {#if isWarmupExercise(currentExercise)}<span class="w-warmup-pill">Échauffement</span> · {/if}Exercice {exerciseIndex + 1}/{exercices.length}
            </p>
            <h1 class="w-name">{currentExercise.nom}</h1>
            <p class="w-target">
              <span class="w-target-cible">{formatExerciseCible(currentExercise)}</span>
              <span class="w-sep">·</span>
              <span class="w-target-rpe">RPE {currentExercise.rpe_cible}</span>
              <span class="w-sep">·</span>
              <span>{currentExercise.repos_sec} s repos</span>
            </p>

            {#if hasGuide}
              <details class="w-guide">
                <summary>Voir l'exécution</summary>
                <ExerciseGif name={currentExercise.nom} compact />
                {#if currentExercise.description}
                  <p class="w-desc">{currentExercise.description}</p>
                {/if}
              </details>
            {/if}
          </section>

          <section class="w-log">
            <div class="w-set-head">
              <span class="w-set-label">Série {setIndex + 1}<span class="w-set-total">/{totalSetsForExercise}</span></span>
              <span class="w-dots" aria-hidden="true">
                {#each Array(totalSetsForExercise) as _, i}
                  <i class:done={i < setIndex} class:current={i === setIndex}></i>
                {/each}
              </span>
            </div>

            {#if isIso}
              {#key `${exerciseIndex}-${setIndex}-${holdTimerKey}`}
                <HoldTimer
                  targetSeconds={parseInt(currentExercise.cibleParsed?.mid ?? currentExercise.cible ?? '20', 10) || 20}
                  exerciseName={currentExercise.nom}
                  onTimeRecorded={(secs) => {
                    repsActual = String(secs);
                  }}
                />
              {/key}
            {/if}

            {#if weightHint && setIndex === 0 && !isIso}
              <p class="w-hint" class:up={weightHint.type === 'increase'}>{weightHint.message}</p>
            {/if}

            <div class="w-inputs">
              <label class="w-field">
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="0"
                  bind:value={weight}
                  placeholder="0"
                />
                <span>{isIso ? 'kg de lest · option' : 'kg'}</span>
              </label>
              <label class="w-field">
                <input
                  type="number"
                  inputmode="numeric"
                  min="1"
                  bind:value={repsActual}
                  placeholder="0"
                />
                <span>{isIso ? 'secondes' : 'reps'}</span>
              </label>
            </div>

            <div class="w-rpe">
              <div class="w-rpe-head">
                <span>Effort ressenti</span>
                <span class="w-rpe-target-hint">cible RPE {currentExercise.rpe_cible}</span>
              </div>
              <div class="w-rpe-scale" role="radiogroup" aria-label="RPE ressenti">
                {#each RPE_VALUES as val}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={parseFloat(rpeActual) === val}
                    aria-label="RPE {val}"
                    class:half={val % 1 !== 0}
                    class:active={parseFloat(rpeActual) === val}
                    class:target={currentExercise.rpe_cible === val}
                    onclick={() => (rpeActual = String(val))}
                  >
                    {val % 1 !== 0 ? '½' : val}
                  </button>
                {/each}
              </div>
            </div>

            <button
              type="button"
              class="btn-primary w-validate"
              disabled={!validateSetInput()}
              onclick={confirmSet}
            >
              Valider la série
            </button>
          </section>

          {#if currentExerciseSets.length > 0}
            <section class="w-done">
              <p class="w-done-title">Séries faites <span>Toucher pour corriger</span></p>
              <ul class="w-sets">
                {#each currentExerciseSets as s}
                  {@const r = s.rpe ?? s.rpeTarget}
                  <li>
                    <button
                      type="button"
                      class="w-set-row"
                      onclick={() => startEditSet(s)}
                      aria-label="Corriger la série {s.setNumber}"
                    >
                      <span class="w-set-n">{s.setNumber}</span>
                      <span class="w-set-perf">{formatSetPerf(s)}</span>
                      <span class="w-set-rpe" class:higher={r > s.rpeTarget} class:lower={r < s.rpeTarget}>RPE {r}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {:else}
          <section class="w-rest">
            {#key restKey}
              <Chrono
                duration={restDuration}
                onComplete={onRestComplete}
                onSkip={onRestSkip}
              />
            {/key}

            {#if nextUp}
              <div class="w-next">
                <span class="w-next-label">À suivre</span>
                <span class="w-next-name">{nextUp}</span>
              </div>
            {/if}

            <button type="button" class="w-link" onclick={undoLastSet}>Corriger la série précédente</button>
          </section>
        {/if}
      </div>
    {/if}

    {#if showMenu}
      <div
        class="sheet-backdrop"
        role="presentation"
        onclick={() => (showMenu = false)}
        onkeydown={(e) => e.key === 'Escape' && (showMenu = false)}
      >
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Options de la séance"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          {#if !showRest && !isLastSet}
            <button type="button" class="sheet-item" onclick={() => menuAction(skipToNextSet)}>Passer la série</button>
          {/if}
          {#if !showRest && !isLastExercise}
            <button type="button" class="sheet-item" onclick={() => menuAction(skipToNextExercise)}>Passer l'exercice</button>
          {/if}
          {#if completedSets.length > 0}
            <button type="button" class="sheet-item" onclick={() => menuAction(undoLastSet)}>Annuler la dernière série</button>
            <button type="button" class="sheet-item" onclick={() => menuAction(() => (showAllCompletedSets = true))}>
              Historique de la séance <span class="sheet-meta">{completedSets.length}</span>
            </button>
          {/if}
          <button type="button" class="sheet-item" onclick={() => menuAction(finishSession)}>Terminer la séance</button>
          <button type="button" class="sheet-item danger" onclick={() => menuAction(cancelSession)}>Abandonner la séance</button>
          <button type="button" class="sheet-close" onclick={() => (showMenu = false)}>Fermer</button>
        </div>
      </div>
    {/if}

    {#if showAllCompletedSets && completedSets.length > 0}
      <div
        class="sheet-backdrop"
        role="presentation"
        onclick={() => (showAllCompletedSets = false)}
        onkeydown={(e) => e.key === 'Escape' && (showAllCompletedSets = false)}
      >
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Historique de la séance"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <p class="sheet-title">Historique de la séance</p>
          <ul class="w-sets">
            {#each completedSets as s}
              {@const r = s.rpe ?? s.rpeTarget}
              <li>
                <button
                  type="button"
                  class="w-set-row"
                  onclick={() => startEditSet(s)}
                  aria-label="Corriger {s.exerciseName} série {s.setNumber}"
                >
                  <span class="w-set-n">{s.setNumber}</span>
                  <span class="w-set-perf">
                    <small>{s.exerciseName}</small>
                    {formatSetPerf(s)}
                  </span>
                  <span class="w-set-rpe" class:higher={r > s.rpeTarget} class:lower={r < s.rpeTarget}>RPE {r}</span>
                </button>
              </li>
            {/each}
          </ul>
          <button type="button" class="sheet-close" onclick={() => (showAllCompletedSets = false)}>Fermer</button>
        </div>
      </div>
    {/if}

    {#if editingSet}
      <div
        class="sheet-backdrop top"
        role="presentation"
        onclick={cancelEditSet}
        onkeydown={(e) => e.key === 'Escape' && cancelEditSet()}
      >
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Corriger la série"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <p class="sheet-title">Série {editingSet.setNumber}</p>
          <p class="sheet-sub">{editingSet.exerciseName}</p>

          <div class="w-inputs">
            <label class="w-field">
              <input type="number" inputmode="decimal" step="0.5" min="0" bind:value={editingSet.weight} />
              <span>{editingSet.exerciseType === 'isometrique' ? 'kg de lest' : 'kg'}</span>
            </label>
            <label class="w-field">
              <input type="number" inputmode="numeric" min="1" bind:value={editingSet.repsActual} />
              <span>{editingSet.exerciseType === 'isometrique' ? 'secondes' : 'reps'}</span>
            </label>
          </div>

          <div class="w-rpe">
            <div class="w-rpe-head">
              <span>Effort ressenti</span>
              <span class="w-rpe-target-hint">cible RPE {editingSet.rpeTarget}</span>
            </div>
            <div class="w-rpe-scale" role="radiogroup" aria-label="RPE réalisé">
              {#each RPE_VALUES as val}
                <button
                  type="button"
                  role="radio"
                  aria-checked={parseFloat(editingSet.rpe) === val}
                  aria-label="RPE {val}"
                  class:half={val % 1 !== 0}
                  class:active={parseFloat(editingSet.rpe) === val}
                  class:target={editingSet.rpeTarget === val}
                  onclick={() => (editingSet.rpe = String(val))}
                >
                  {val % 1 !== 0 ? '½' : val}
                </button>
              {/each}
            </div>
          </div>

          <button type="button" class="btn-primary w-validate" onclick={saveEditedSet}>Enregistrer</button>
          <div class="sheet-row">
            <button type="button" class="sheet-text danger" onclick={() => deleteSpecificSet(editingSet.globalIndex)}>
              Supprimer
            </button>
            <button type="button" class="sheet-text" onclick={cancelEditSet}>Annuler</button>
          </div>
        </div>
      </div>
    {/if}
  {:else if phase === 'debrief' && summary}
    <h1>Séance terminée</h1>
    <p class="debrief-intro accent-text">Quelques questions pour suivre votre progression.</p>

    <div class="card mini-summary">
      <div class="mini-grid">
        <div><span class="card-title">Durée</span><strong>{formatDuration(summary.durationSec)}</strong></div>
        <div><span class="card-title">Séries</span><strong>{summary.setCount}</strong></div>
        <div><span class="card-title">Volume</span><strong>{summary.volume} kg</strong></div>
        <div><span class="card-title">RPE Réalisé / Cible</span><strong>{summary.avgRpe} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(cible {summary.avgRpeTarget})</span></strong></div>
      </div>
    </div>

    <PostSessionDebrief bind:feedback={sessionFeedback} onComplete={onDebriefComplete} />
  {:else if phase === 'done' && summary}
    <div class="done-screen">
      <div class="done-icon"><Check size={48} strokeWidth={2.5} /></div>
      <h1>Enregistré</h1>
      <p class="accent-text">Belle séance — {summary.sessionName}</p>

      <div class="card">
        <div class="summary-grid">
          <div>
            <p class="card-title">Durée</p>
            <p class="card-value sm">{formatDuration(summary.durationSec)}</p>
          </div>
          <div>
            <p class="card-title">Volume</p>
            <p class="card-value sm">{summary.volume} kg</p>
          </div>
          <div>
            <p class="card-title">Séries</p>
            <p class="card-value sm">{summary.setCount}</p>
          </div>
          <div>
            <p class="card-title">RPE Réalisé / Cible</p>
            <p class="card-value sm">{summary.avgRpe} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">/ {summary.avgRpeTarget}</span></p>
          </div>
        </div>
      </div>

      <button type="button" class="btn-primary" onclick={backToHome}>Retour à l'accueil</button>
    </div>
  {/if}
</div>

<style>
  /* ─── Accueil : hiérarchie unique, 1 action principale ─── */
  .home-head {
    padding: 0.75rem 0.15rem 1rem;
  }

  .home-head .home-date {
    margin: 0 0 0.35rem;
    font-size: 1rem;
    text-transform: capitalize;
  }

  .home-head h1 {
    font-size: 2rem;
    line-height: 1.1;
    margin: 0 0 0.4rem;
  }

  .home-head .muted {
    margin: 0;
  }

  .start-btn {
    width: 100%;
    margin: 0.25rem 0 0;
  }

  .plan {
    margin-top: 1.5rem;
  }

  .plan-warmup {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .plan-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .plan-list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }

  .plan-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .plan-meta {
    flex-shrink: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .quick-links {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
  }

  .quick-row {
    width: 100%;
    justify-content: space-between;
    min-height: 52px;
    padding: 0.75rem 0.15rem;
    border-radius: 0;
    background: transparent;
    color: var(--text);
    font-weight: 600;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--border);
  }

  .quick-meta {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 0.85rem;
  }

  .cancel-resume {
    width: 100%;
    margin-top: 0.25rem;
  }

  .seance {
    width: 100%;
  }

  .date {
    margin-bottom: 1.25rem;
    text-transform: capitalize;
    font-size: 1.1rem;
  }

  .preview h2 {
    margin-top: 0.5rem;
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .exercise-list li {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .ex-meta {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .ex-desc {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.35;
    margin-top: 0.15rem;
  }

  .section-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .section-label:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .exercise-list li.warmup {
    opacity: 0.92;
  }

  .start-btn {
    font-size: 1.2rem;
    min-height: 72px;
    margin: 1rem 0;
  }

  .secondary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .empty-msg {
    color: var(--text-muted);
    text-align: center;
  }

  .picker {
    margin-top: 1rem;
  }

  .pick-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    background: var(--bg-elevated);
    color: var(--text);
    min-height: 56px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    text-align: left;
  }

  .pick-item span {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 400;
  }

  .debrief-intro {
    margin-bottom: 1rem;
  }

  .mini-summary {
    margin-bottom: 1.25rem;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .mini-grid strong {
    display: block;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.1rem;
    color: var(--text-heading);
    margin-top: 0.15rem;
  }

  .done-screen {
    text-align: center;
    padding-top: 1rem;
  }

  .done-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--deepblue) 25%, var(--bg-card));
    color: var(--offwhite);
    margin-bottom: 1rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .card-value.sm {
    font-size: 1.5rem;
  }

  .resume-card {
    border: 2px solid var(--warning);
    background: color-mix(in srgb, var(--warning) 8%, var(--bg-card));
    margin-bottom: 1rem;
  }

  .resume-card h2 {
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .resume-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .cancel-resume {
    color: var(--destructive);
    font-size: 0.88rem;
  }

  .recovery-card {
    margin-top: 1rem;
    background: linear-gradient(135deg, color-mix(in srgb, var(--success) 12%, var(--bg-card)), var(--bg-card));
    border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .recovery-header h3 {
    margin: 0.35rem 0 0.2rem 0;
    font-size: 1.1rem;
    color: var(--text-heading);
  }

  .btn-recovery {
    background: color-mix(in srgb, #3b7a57 25%, var(--bg-elevated));
    color: #a3e6b5;
    border: 1px solid color-mix(in srgb, #3b7a57 40%, transparent);
    font-weight: 700;
    font-size: 0.95rem;
    border-radius: 12px;
    padding: 0.85rem 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
  }

  .btn-recovery:hover {
    background: #3b7a57;
    color: #f7f5f2;
    border-color: #3b7a57;
    box-shadow: none;
  }

  /* ─── Séance active : une seule colonne, typographie, aucune carte ─── */
  .workout {
    padding-top: 0.25rem;
  }

  .w-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 44px;
  }

  .w-session,
  .w-clock {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .w-session {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .w-clock {
    font-variant-numeric: tabular-nums;
    color: var(--beige);
  }

  .w-more {
    width: 44px;
    min-height: 44px;
    padding: 0;
    margin-right: -0.6rem;
    justify-content: center;
    background: transparent;
    color: var(--text);
    border-radius: 50%;
  }

  .w-more svg {
    fill: currentColor;
  }

  .w-progress {
    height: 2px;
    margin: 0.35rem 0 1.75rem;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .w-progress span {
    display: block;
    height: 100%;
    background: #06375a;
    transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .w-step {
    margin: 0 0 0.4rem;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .w-warmup-pill {
    color: var(--beige);
    font-weight: 700;
  }

  .w-name {
    font-size: 1.9rem;
    line-height: 1.1;
    margin: 0 0 0.5rem;
  }

  .w-target {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .w-target-cible {
    color: var(--beige);
    font-weight: 600;
  }

  .w-target-rpe {
    color: #f7f5f2;
    background: #06375a;
    padding: 0.12rem 0.45rem;
    border-radius: 6px;
    font-weight: 700;
  }

  .w-sep {
    color: var(--faint);
    margin: 0 0.15rem;
  }

  .w-guide {
    margin-top: 0.5rem;
  }

  .w-guide summary {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    list-style: none;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--beige);
    cursor: pointer;
  }

  .w-guide summary::-webkit-details-marker {
    display: none;
  }

  .w-guide summary::after {
    content: '+';
    margin-left: 0.4rem;
    font-weight: 400;
  }

  .w-guide[open] summary::after {
    content: '−';
  }

  .w-desc {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .w-log {
    margin-top: 1.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }

  .w-set-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .w-set-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    font-weight: 700;
  }

  .w-set-total {
    color: var(--text-muted);
    font-weight: 500;
  }

  .w-dots {
    display: flex;
    gap: 6px;
  }

  .w-dots i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border);
    transition: background 0.2s;
  }

  .w-dots i.done {
    background: #06375a;
  }

  .w-dots i.current {
    background: var(--pink);
  }

  .w-hint {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--text-muted);
  }

  .w-hint.up {
    color: var(--beige);
  }

  .w-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  .w-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .w-field input {
    min-height: 64px;
    padding: 0.25rem 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 2.75rem !important;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--text-heading);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    box-shadow: none;
    -moz-appearance: textfield;
    transition: border-color 0.2s;
  }

  .w-field input:focus {
    border-bottom-color: #06375a;
    box-shadow: none;
  }

  .w-field input::-webkit-outer-spin-button,
  .w-field input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .w-field span {
    font-size: 0.8rem;
    color: var(--beige);
    font-weight: 600;
  }

  .w-rpe {
    margin-top: 1.5rem;
  }

  .w-rpe-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .w-rpe-target-hint {
    color: var(--beige);
    font-weight: 600;
  }

  .w-rpe-scale {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
  }

  .w-rpe-scale button {
    position: relative;
    min-height: 44px;
    padding: 0;
    justify-content: center;
    background: transparent;
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 10px;
    box-shadow: none;
  }

  .w-rpe-scale button.half {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .w-rpe-scale button.target {
    color: var(--beige);
    border: 1px solid color-mix(in srgb, var(--beige) 35%, transparent);
  }

  .w-rpe-scale button.target::after {
    content: '';
    position: absolute;
    bottom: 5px;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--beige);
  }

  .w-rpe-scale button.active {
    background: #06375a;
    color: #f7f5f2;
    border-color: transparent;
    box-shadow: none;
  }

  .w-rpe-scale button.active::after {
    background: #f7f5f2;
  }

  .w-validate {
    margin-top: 1.75rem;
    min-height: 56px;
    font-size: 1.02rem;
    background: #06375a;
    color: #f7f5f2;
    font-weight: 700;
    border-radius: 14px;
    border: none;
    box-shadow: none;
  }

  .w-validate:active {
    transform: scale(0.98);
    box-shadow: none;
  }

  .workout.flash .w-progress span {
    background: #06375a;
    box-shadow: none;
  }

  .w-done {
    margin-top: 2rem;
  }

  .w-done-title {
    display: flex;
    justify-content: space-between;
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .w-done-title span {
    font-family: 'Open Sans', sans-serif;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--faint);
  }

  .w-sets {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0;
  }

  .w-set-row {
    display: grid;
    grid-template-columns: 1.25rem 1fr auto;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 52px;
    padding: 0.5rem 0;
    text-align: left;
    background: transparent;
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 0;
    border-bottom: 1px solid var(--border);
  }

  .w-set-row:active {
    transform: none;
    opacity: 0.6;
  }

  .w-set-n {
    font-size: 0.8rem;
    color: var(--beige);
    font-weight: 700;
  }

  .w-set-perf {
    display: flex;
    flex-direction: column;
    font-variant-numeric: tabular-nums;
  }

  .w-set-perf small {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .w-set-rpe {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .w-set-rpe.higher {
    color: var(--warning);
  }

  .w-set-rpe.lower {
    color: color-mix(in srgb, #06375a 50%, var(--beige));
  }

  /* ─── Repos ─── */
  .w-rest {
    text-align: center;
  }

  .w-next {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-top: 1.5rem;
  }

  .w-next-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--beige);
  }

  .w-next-name {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .w-link {
    margin: 1.5rem auto 0;
    min-height: 44px;
    padding: 0.5rem;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 500;
  }

  /* ─── Feuilles (options, historique, correction) ─── */
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    animation: sheet-fade 0.2s ease;
  }

  .sheet-backdrop.top {
    z-index: 1001;
  }

  .sheet {
    width: 100%;
    max-width: 480px;
    max-height: 85dvh;
    overflow-y: auto;
    padding: 0.5rem 1.25rem calc(1rem + env(safe-area-inset-bottom));
    background: var(--bg-card);
    border-radius: 20px 20px 0 0;
    animation: sheet-rise 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sheet::before {
    content: '';
    display: block;
    width: 36px;
    height: 5px;
    margin: 0.25rem auto 0.75rem;
    border-radius: 3px;
    background: var(--border);
  }

  .sheet-title {
    margin: 0 0 0.15rem;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .sheet-sub {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    color: var(--beige);
    font-weight: 600;
  }

  .sheet-item {
    width: 100%;
    min-height: 54px;
    padding: 0 0.15rem;
    justify-content: space-between;
    background: transparent;
    color: var(--text);
    font-weight: 600;
    border-radius: 0;
    border-bottom: 1px solid var(--border);
  }

  .sheet-item.danger {
    color: var(--destructive);
    border-bottom: none;
  }

  .sheet-meta {
    font-weight: 600;
    color: var(--beige);
  }

  .sheet-close {
    width: 100%;
    margin-top: 0.75rem;
    justify-content: center;
    background: var(--bg-elevated);
    color: var(--text);
  }

  .sheet-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 0.25rem;
  }

  .sheet-text {
    justify-content: center;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
  }

  .sheet-text.danger {
    color: var(--destructive);
  }

  @keyframes sheet-rise {
    from {
      transform: translateY(100%);
    }
  }

  @keyframes sheet-fade {
    from {
      opacity: 0;
    }
  }
</style>
