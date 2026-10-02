<script>
  import { onMount } from 'svelte';
  import Chrono from './Chrono.svelte';
  import PostSessionDebrief from './PostSessionDebrief.svelte';
  import {
    getTodayPlannedSession,
    getMissedSessions,
    saveWorkoutSession,
    getAllSessionsWithSets,
  } from '../lib/db.js';
import {
    parseProgramme,
    getSessionTemplate,
    getAllSessionTemplates,
    todayISO,
    formatDateFR,
    isIsometricExercise,
    isWarmupExercise,
    formatExerciseCible,
  } from '../lib/programme.js';
  import { calcAvgRpe, calcSessionVolume } from '../lib/stats.js';
  import { suggestWeightForExercise } from '../lib/weights.js';
  import { Check } from 'lucide-svelte';
  import ExerciseGif from './ExerciseGif.svelte';

  let { onSessionSaved = () => {} } = $props();

  const programme = parseProgramme();

  let phase = $state('idle');
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

  let weight = $state('');
  let repsActual = $state('');
  let rpeActual = $state('');
  let completedSets = $state([]);
  let setFlash = $state(false);
  let editingSet = $state(null);
  let showAllCompletedSets = $state(false);

  let showRest = $state(false);
  let restKey = $state(0);
  let restDuration = $state(90);
  let pendingAfterRest = $state(null);

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
    todaySession = await getTodayPlannedSession(todayISO());
    missedSessions = await getMissedSessions();
    freeTemplates = getAllSessionTemplates(programme);
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
    await loadSessionHistory();
    await initExerciseInputs(exercices[0]);
    phase = 'active';
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
  }

  function deleteSpecificSet(globalIndex) {
    if (!confirm('Supprimer définitivement cette série enregistrée ?')) return;
    completedSets = completedSets.filter((_, i) => i !== globalIndex);
    editingSet = null;
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
        dateISO: todayISO(),
        plannedSessionId: sessionMeta.plannedSessionId,
        type: sessionMeta.type,
        startedAt,
        completedAt: summary.completedAt,
        durationSec: summary.durationSec,
        avgRpe: summary.avgRpe,
        sets: $state.snapshot(completedSets),
        feedback: $state.snapshot(sessionFeedback),
      });

      phase = 'done';
      onSessionSaved();
    } finally {
      saving = false;
    }
  }

  function backToHome() {
    phase = 'idle';
    summary = null;
    sessionMeta = null;
    sessionFeedback = {};
    refreshIdle();
  }

  function cancelSession() {
    if (confirm('Annuler la séance en cours ? Les données seront perdues.')) {
      phase = 'idle';
      sessionMeta = null;
      summary = null;
      showRest = false;
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
    <h1>Séance du jour</h1>
    <p class="date accent-text">{formatDateFR(todayISO())}</p>

    {#if todaySession}
      {@const split = getSessionExercisesSplit(todaySession.cycleIndex, todaySession.sessionIndex)}
      <div class="card preview">
        <span class="badge badge-success">Prévue aujourd'hui</span>
        <h2>{todaySession.sessionName}</h2>
        <p class="muted">{todaySession.cycleName}</p>
        <ul class="exercise-list">
          {#if split.warmups.length > 0}
            <li class="section-label">Échauffement</li>
            {#each split.warmups as ex}
              <li class="warmup">
                <span>{ex.nom}</span>
                <span class="ex-meta">{ex.series}×{formatExerciseCible(ex)} · RPE {ex.rpe_cible}</span>
                {#if ex.description}
                  <span class="ex-desc">{ex.description}</span>
                {/if}
              </li>
            {/each}
          {/if}
          {#if split.main.length > 0}
            <li class="section-label">Séance principale</li>
            {#each split.main as ex}
              <li>
                <span>{ex.nom}</span>
                <span class="ex-meta">{ex.series}×{formatExerciseCible(ex)} · RPE {ex.rpe_cible}</span>
                {#if ex.description}
                  <span class="ex-desc">{ex.description}</span>
                {/if}
              </li>
            {/each}
          {/if}
        </ul>
      </div>

      <button type="button" class="btn-primary start-btn" onclick={startToday}>
        Démarrer la séance du jour
      </button>
    {:else}
      <div class="card">
        <p class="empty-msg">
          {#if missedSessions.length > 0}
            Pas de séance prévue aujourd'hui. Rattrapez une séance manquée ou faites une séance libre.
          {:else}
            Jour de repos ou séance déjà effectuée. Lancez une séance libre si besoin.
          {/if}
        </p>
      </div>
    {/if}

    <div class="secondary-actions">
      {#if missedSessions.length > 0}
        <button type="button" class="btn-secondary" onclick={() => (showCatchup = !showCatchup)}>
          Rattraper une séance manquée ({missedSessions.length})
        </button>
      {/if}
      <button type="button" class="btn-secondary" onclick={() => (showFreePicker = !showFreePicker)}>
        Séance libre
      </button>
    </div>

    {#if showCatchup}
      <div class="card picker">
        <h3>Séances manquées</h3>
        {#each missedSessions as m}
          <button type="button" class="pick-item" onclick={() => startCatchup(m)}>
            <strong>{m.sessionName}</strong>
            <span>{formatDateFR(m.dateISO)} — {m.cycleName}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if showFreePicker}
      <div class="card picker">
        <h3>Choisir un modèle</h3>
        {#each freeTemplates as t}
          <button type="button" class="pick-item" onclick={() => startFree(t)}>
            <strong>{t.label}</strong>
            <span>{t.exercices.length} exercices</span>
          </button>
        {/each}
      </div>
    {/if}
  {:else if phase === 'active'}
    <div class="workout-top">
      <div class="workout-header">
        <button type="button" class="btn-ghost cancel-btn" onclick={cancelSession}>Annuler</button>
        <span class="session-tag">{sessionMeta.sessionName}</span>
      </div>

      <div class="session-progress">
        <div class="progress-meta">
          <span>{completedSets.length}/{totalSetsPlanned} séries</span>
          <span>{formatDuration(sessionElapsed)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: {progressPct}%"></div>
        </div>
      </div>
    </div>

    {#if currentExercise}
      <div class="exercise-card" class:flash={setFlash}>
        <p class="progress-label">
          {#if isWarmupExercise(currentExercise)}
            <span class="warmup-tag">Échauffement</span>
          {/if}
          Exercice {exerciseIndex + 1}/{exercices.length} · Série {setIndex + 1}/{totalSetsForExercise}
        </p>
        <h1 class="exercise-name">{currentExercise.nom}</h1>

        <ExerciseGif name={currentExercise.nom} />

        {#if currentExercise.description}
          <p class="exercise-desc">{currentExercise.description}</p>
        {/if}

        <div class="targets">
          <span class="target-chip">{formatExerciseCible(currentExercise)}</span>
          <span class="target-chip rpe">RPE {currentExercise.rpe_cible}</span>
          <span class="target-chip">{currentExercise.repos_sec}s repos</span>
          {#if isIso}
            <span class="target-chip iso">Isométrique</span>
          {/if}
        </div>

        {#if !showRest}
          {#if weightHint && setIndex === 0 && !isIso}
            <div
              class="weight-hint"
              class:hint-increase={weightHint.type === 'increase'}
              class:hint-repeat={weightHint.type === 'repeat'}
            >
              {weightHint.message}
            </div>
          {/if}

          <div class="input-stack" class:iso-stack={isIso}>
            {#if !isIso}
              <label class="input-block">
                <span>Charge (kg)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="0"
                  bind:value={weight}
                  placeholder="0"
                />
              </label>
            {/if}
            <label class="input-block" class:full-width={isIso}>
              <span>{isIso ? 'Secondes tenues' : 'Reps effectuées'}</span>
              <input type="number" inputmode="numeric" min="1" bind:value={repsActual} />
            </label>
            {#if isIso}
              <label class="input-block optional-weight">
                <span>Lestage (kg) — optionnel</span>
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="0"
                  bind:value={weight}
                  placeholder="0"
                />
              </label>
            {/if}

            <div class="input-block rpe-block">
              <div class="rpe-label-row">
                <span>RPE Ressenti</span>
                <span class="rpe-target-hint">Cible : RPE {currentExercise.rpe_cible}</span>
              </div>
              <div class="rpe-input-wrapper">
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="1"
                  max="10"
                  bind:value={rpeActual}
                  placeholder={String(currentExercise.rpe_cible)}
                />
              </div>
              <div class="rpe-quick-chips">
                {#each [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as val}
                  <button
                    type="button"
                    class="rpe-chip"
                    class:active={parseFloat(rpeActual) === val}
                    class:is-target={currentExercise.rpe_cible === val}
                    onclick={() => (rpeActual = String(val))}
                  >
                    {val}
                    {#if currentExercise.rpe_cible === val}
                      <span class="chip-star">★</span>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <button
            type="button"
            class="btn-primary validate-btn"
            disabled={!validateSetInput()}
            onclick={confirmSet}
          >
            Valider la série {setIndex + 1}
          </button>

          {#if currentExerciseSets.length > 0}
            <div class="completed-sets-box">
              <div class="completed-sets-head">
                <span class="head-title">Séries validées ({currentExerciseSets.length}/{totalSetsForExercise})</span>
                <button
                  type="button"
                  class="btn-undo-link"
                  onclick={undoLastSet}
                  title="Annuler la dernière série et la recharger dans les champs"
                >
                  ↩ Corriger la dernière série
                </button>
              </div>
              <div class="completed-sets-list">
                {#each currentExerciseSets as s}
                  {@const isHigher = (s.rpe ?? s.rpeTarget) > s.rpeTarget}
                  {@const isLower = (s.rpe ?? s.rpeTarget) < s.rpeTarget}
                  <div class="set-row-item">
                    <div class="set-badge-col">
                      <span class="set-num-tag">S{s.setNumber}</span>
                    </div>
                    <div class="set-perf-col">
                      {#if s.exerciseType === 'isometrique'}
                        <span class="perf-val">{s.weight > 0 ? `${s.weight} kg · ` : ''}{s.repsActual} s</span>
                      {:else}
                        <span class="perf-val">{s.weight} kg × {s.repsActual}</span>
                      {/if}
                    </div>
                    <div class="set-rpe-col">
                      <span
                        class="rpe-compare-chip"
                        class:rpe-match={!isHigher && !isLower}
                        class:rpe-higher={isHigher}
                        class:rpe-lower={isLower}
                      >
                        RPE {s.rpe ?? s.rpeTarget}
                        <span class="rpe-target-sub">/ cible {s.rpeTarget}</span>
                      </span>
                    </div>
                    <div class="set-actions-col">
                      <button
                        type="button"
                        class="btn-edit-icon"
                        onclick={() => startEditSet(s)}
                        title="Modifier cette série"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="skip-row">
            {#if completedSets.length > 0 && currentExerciseSets.length === 0}
              <button type="button" class="btn-ghost undo-link" onclick={undoLastSet}>
                ↩ Revenir à l'exercice précédent
              </button>
            {/if}
            {#if !isLastSet}
              <button type="button" class="btn-ghost" onclick={skipToNextSet}>Passer la série →</button>
            {/if}
            {#if !isLastExercise}
              <button type="button" class="btn-ghost" onclick={skipToNextExercise}>Passer l'exercice →</button>
            {/if}
            {#if completedSets.length > 0}
              <button
                type="button"
                class="btn-ghost view-all-link"
                onclick={() => (showAllCompletedSets = !showAllCompletedSets)}
              >
                {showAllCompletedSets ? 'Masquer toutes les séries' : `Toutes les séries de la séance (${completedSets.length})`}
              </button>
            {/if}
            <button type="button" class="btn-ghost finish-link" onclick={finishSession}>Terminer la séance</button>
          </div>

          {#if showAllCompletedSets && completedSets.length > 0}
            <div class="all-sets-drawer">
              <p class="all-sets-title">Historique de la séance en cours</p>
              <div class="completed-sets-list">
                {#each completedSets as s}
                  {@const isHigher = (s.rpe ?? s.rpeTarget) > s.rpeTarget}
                  {@const isLower = (s.rpe ?? s.rpeTarget) < s.rpeTarget}
                  <div class="set-row-item">
                    <div class="set-badge-col">
                      <span class="set-num-tag">{s.exerciseName.slice(0, 14)}.. S{s.setNumber}</span>
                    </div>
                    <div class="set-perf-col">
                      {#if s.exerciseType === 'isometrique'}
                        <span class="perf-val">{s.weight > 0 ? `${s.weight} kg · ` : ''}{s.repsActual} s</span>
                      {:else}
                        <span class="perf-val">{s.weight} kg × {s.repsActual}</span>
                      {/if}
                    </div>
                    <div class="set-rpe-col">
                      <span
                        class="rpe-compare-chip"
                        class:rpe-match={!isHigher && !isLower}
                        class:rpe-higher={isHigher}
                        class:rpe-lower={isLower}
                      >
                        RPE {s.rpe ?? s.rpeTarget}
                        <span class="rpe-target-sub">/ {s.rpeTarget}</span>
                      </span>
                    </div>
                    <div class="set-actions-col">
                      <button
                        type="button"
                        class="btn-edit-icon"
                        onclick={() => startEditSet(s)}
                        title="Modifier cette série"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else}
          {#key restKey}
            <Chrono
              duration={restDuration}
              onComplete={onRestComplete}
              onSkip={onRestSkip}
            />
          {/key}
          <div class="rest-undo-wrapper">
            <button type="button" class="btn-ghost rest-undo-btn" onclick={undoLastSet}>
              ↩ Erreur ? Corriger la série précédente
              {#if completedSets.length > 0}
                ({completedSets[completedSets.length - 1]?.weight} kg × {completedSets[completedSets.length - 1]?.repsActual})
              {/if}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if editingSet}
      <div class="modal-backdrop" onclick={cancelEditSet} onkeydown={(e) => e.key === 'Escape' && cancelEditSet()} role="presentation">
        <div class="modal-card" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
          <div class="modal-header">
            <h3>Corriger la Série {editingSet.setNumber}</h3>
            <p class="modal-subtitle">{editingSet.exerciseName}</p>
          </div>

          <div class="modal-fields">
            {#if editingSet.exerciseType !== 'isometrique'}
              <label class="modal-field">
                <span>Charge (kg)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="0"
                  bind:value={editingSet.weight}
                />
              </label>
            {:else}
              <label class="modal-field">
                <span>Lestage (kg)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  min="0"
                  bind:value={editingSet.weight}
                />
              </label>
            {/if}

            <label class="modal-field">
              <span>{editingSet.exerciseType === 'isometrique' ? 'Durée (secondes)' : 'Répétitions'}</span>
              <input
                type="number"
                inputmode="numeric"
                min="1"
                bind:value={editingSet.repsActual}
              />
            </label>

            <label class="modal-field">
              <span>RPE Réalisé (cible {editingSet.rpeTarget})</span>
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="1"
                max="10"
                bind:value={editingSet.rpe}
              />
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-primary" onclick={saveEditedSet}>
              Enregistrer la correction
            </button>
            <button
              type="button"
              class="btn-danger-ghost"
              onclick={() => deleteSpecificSet(editingSet.globalIndex)}
            >
              Supprimer cette série
            </button>
            <button type="button" class="btn-ghost" onclick={cancelEditSet}>
              Annuler
            </button>
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

  .warmup-tag {
    display: inline-block;
    margin-right: 0.35rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--warning) 25%, var(--bg-card));
    color: var(--warning);
  }

  .exercise-desc {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 0.95rem;
    line-height: 1.45;
    color: var(--text-muted);
    margin: 0 0 1rem;
    padding: 0.75rem 0.85rem;
    background: color-mix(in srgb, var(--beige) 12%, var(--bg-card));
    border-left: 3px solid var(--pink);
    border-radius: 0 calc(var(--radius) * 2) calc(var(--radius) * 2) 0;
  }

  .target-chip.iso {
    background: color-mix(in srgb, var(--deepblue) 18%, var(--bg-elevated));
    border-color: color-mix(in srgb, var(--deepblue) 35%, transparent);
    color: color-mix(in srgb, var(--deepblue) 80%, var(--offwhite));
  }

  .input-stack.iso-stack {
    gap: 0.85rem;
  }

  .input-block.full-width {
    grid-column: 1 / -1;
  }

  .optional-weight input {
    font-size: 1.25rem;
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

  .workout-top {
    margin-bottom: 1rem;
  }

  .workout-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .cancel-btn {
    padding: 0;
    min-height: auto;
  }

  .session-tag {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: var(--accent);
  }

  .session-progress {
    margin-bottom: 0.25rem;
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--pink);
    border-radius: 999px;
    transition: width 0.35s ease;
  }

  .exercise-card {
    background: var(--bg-card);
    border-radius: calc(var(--radius) * 4);
    padding: 1.35rem;
    border: 1px solid var(--border);
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  .exercise-card.flash {
    border-color: var(--pink);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--pink) 40%, transparent);
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .exercise-name {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.85rem;
    margin-bottom: 0.75rem;
    line-height: 1.15;
  }

  .targets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
  }

  .target-chip {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }

  .target-chip.rpe {
    background: color-mix(in srgb, var(--pink) 20%, var(--bg-elevated));
    border-color: color-mix(in srgb, var(--pink) 40%, transparent);
    color: var(--pink);
  }

  .input-stack {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .input-block {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .input-block span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .input-block input {
    font-size: 1.75rem;
    font-weight: 700;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
  }

  .validate-btn {
    min-height: 68px;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .weight-hint {
    font-size: 0.82rem;
    line-height: 1.35;
    padding: 0.65rem 0.85rem;
    border-radius: calc(var(--radius) * 2);
    margin-bottom: 0.85rem;
    border: 1px solid var(--border);
  }

  .weight-hint.hint-increase {
    background: color-mix(in srgb, var(--deepblue) 18%, var(--bg-card));
    border-color: color-mix(in srgb, var(--deepblue) 35%, transparent);
    color: var(--text);
  }

  .weight-hint.hint-repeat {
    background: color-mix(in srgb, var(--beige) 22%, var(--bg-card));
    border-color: color-mix(in srgb, var(--beige) 45%, transparent);
    color: var(--text-muted);
  }

  .skip-row {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin-top: 0.5rem;
  }

  .finish-link {
    color: var(--danger);
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

  /* ─── RPE Input & Chips ─────────────────────────────────────── */
  .rpe-block {
    margin-top: 0.25rem;
  }

  .rpe-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.35rem;
  }

  .rpe-target-hint {
    font-size: 0.72rem;
    font-weight: 700;
    font-family: 'Montserrat', sans-serif;
    color: var(--accent);
    letter-spacing: 0.04em;
    background: color-mix(in srgb, var(--accent) 15%, var(--bg-elevated));
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .rpe-input-wrapper input {
    font-size: 1.6rem;
    font-weight: 800;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
    color: var(--accent);
  }

  .rpe-quick-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
    justify-content: center;
  }

  .rpe-chip {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    min-height: 38px;
    min-width: 44px;
    padding: 0.35rem 0.55rem;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
  }

  .rpe-chip:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .rpe-chip.is-target {
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
    color: var(--accent);
  }

  .rpe-chip.active {
    background: var(--accent);
    color: var(--accent-foreground, #070706);
    border-color: var(--accent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 40%, transparent);
    font-weight: 800;
    transform: scale(1.05);
  }

  .chip-star {
    font-size: 0.65rem;
    color: currentColor;
    margin-left: 1px;
  }

  /* ─── Completed Sets List & Comparison ───────────────────────── */
  .completed-sets-box {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .completed-sets-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .head-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .btn-undo-link {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fb923c;
    background: color-mix(in srgb, #fb923c 14%, transparent);
    border: 1px solid color-mix(in srgb, #fb923c 35%, transparent);
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-undo-link:hover {
    background: color-mix(in srgb, #fb923c 25%, transparent);
  }

  .completed-sets-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .set-row-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.75rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: background 0.15s ease;
  }

  .set-num-tag {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text-muted);
    background: color-mix(in srgb, var(--border) 40%, transparent);
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
  }

  .perf-val {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .rpe-compare-chip {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .rpe-target-sub {
    font-size: 0.65rem;
    opacity: 0.8;
  }

  .rpe-compare-chip.rpe-match {
    background: color-mix(in srgb, #22c55e 18%, var(--bg-card));
    color: #4ade80;
    border: 1px solid color-mix(in srgb, #22c55e 40%, transparent);
  }

  .rpe-compare-chip.rpe-higher {
    background: color-mix(in srgb, #f97316 20%, var(--bg-card));
    color: #fb923c;
    border: 1px solid color-mix(in srgb, #f97316 45%, transparent);
  }

  .rpe-compare-chip.rpe-lower {
    background: color-mix(in srgb, #38bdf8 18%, var(--bg-card));
    color: #38bdf8;
    border: 1px solid color-mix(in srgb, #38bdf8 40%, transparent);
  }

  .btn-edit-icon {
    background: transparent;
    border: none;
    font-size: 0.95rem;
    padding: 0.25rem 0.35rem;
    cursor: pointer;
    border-radius: 6px;
    opacity: 0.8;
    transition: opacity 0.15s, transform 0.15s;
  }

  .btn-edit-icon:hover {
    opacity: 1;
    transform: scale(1.15);
  }

  /* ─── Rest Screen Undo ───────────────────────────────────────── */
  .rest-undo-wrapper {
    margin-top: 1.25rem;
    display: flex;
    justify-content: center;
  }

  .rest-undo-btn {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fb923c;
    background: color-mix(in srgb, #fb923c 14%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, #fb923c 35%, transparent);
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rest-undo-btn:hover {
    background: color-mix(in srgb, #fb923c 25%, var(--bg-elevated));
    transform: translateY(-1px);
  }

  /* ─── All Sets Drawer ────────────────────────────────────────── */
  .all-sets-drawer {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border-radius: calc(var(--radius) * 2);
    border: 1px solid var(--border);
  }

  .all-sets-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
    color: var(--accent);
  }

  .undo-link {
    color: #fb923c;
    font-weight: 700;
  }

  .view-all-link {
    color: var(--accent);
    font-size: 0.85rem;
  }

  /* ─── Modal Dialog ───────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 3);
    padding: 1.5rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .modal-header h3 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
    font-family: 'Montserrat', sans-serif;
  }

  .modal-subtitle {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .modal-fields {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-bottom: 1.25rem;
  }

  .modal-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .modal-field span {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .modal-field input {
    font-size: 1.4rem;
    font-weight: 700;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .btn-danger-ghost {
    background: color-mix(in srgb, #ef4444 14%, transparent);
    color: #f87171;
    border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    padding: 0.65rem 1rem;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    min-height: 48px;
  }

  .btn-danger-ghost:hover {
    background: color-mix(in srgb, #ef4444 25%, transparent);
  }
</style>
