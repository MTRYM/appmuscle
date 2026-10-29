<script>
  import { onMount } from 'svelte';
  import {
    addVacationAndShiftPlan,
    getDayData,
    getVacations,
    getPlannedSessions,
    getAllSessionsWithSets,
    deleteWorkoutSession,
    movePlannedSession
  } from '$lib/api';
  import { formatDateFR, formatSetPerformance, parseSessionTitle, todayISO } from '$lib/programme';
  import { Home, Dumbbell } from 'lucide-svelte';

  let { refreshKey = 0, onCalendarChanged = () => {} } = $props();

  let viewYear = $state(new Date().getFullYear());
  let viewMonth = $state(new Date().getMonth());
  let plannedSessions = $state([]);
  let sessions = $state([]);
  let vacations = $state([]);
  let selectedDate = $state(null);
  let dayDetail = $state(null);
  let vacationStart = $state(todayISO());
  let vacationEnd = $state(todayISO());
  let vacationMessage = $state('');
  let vacationSaving = $state(false);
  let movingPlannedId = $state(null);
  let moveTargetDate = $state(todayISO());
  let moveSaving = $state(false);
  let moveMessage = $state('');
  let showPullSession = $state(false);

  let loading = $state(true);

  const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  onMount(loadData);

  $effect(() => {
    refreshKey;
    loadData();
  });

  async function loadData() {
    loading = true;
    try {
      [plannedSessions, sessions, vacations] = await Promise.all([
        getPlannedSessions(),
        getAllSessionsWithSets(),
        getVacations(),
      ]);
    } catch (e) {
      console.warn('Erreur chargement calendrier:', e);
    } finally {
      loading = false;
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }

  function toISO(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function getDayStatus(dateISO) {
    const planned = plannedSessions.filter((p) => p.dateISO === dateISO);
    const done = sessions.filter((s) => s.dateISO === dateISO);
    const isVacation = vacations.some((v) => dateISO >= v.startDateISO && dateISO <= v.endDateISO);

    // Si séance planifiée faite -> vert
    if (planned.some((p) => p.status === 'done')) return 'done';
    // Si séance libre/récup/extra réalisée -> bleu #06375a
    if (done.length > 0) return 'extra';
    if (planned.some((p) => p.status === 'missed')) return 'missed';
    if (planned.some((p) => p.status === 'pending')) return 'pending';
    if (isVacation) return 'vacation';
    return 'rest';
  }

  function getCalendarDays() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(toISO(viewYear, viewMonth, d));
    }
    return days;
  }

  async function selectDay(dateISO) {
    selectedDate = dateISO;
    movingPlannedId = null;
    moveMessage = '';
    showPullSession = false;
    dayDetail = await getDayData(dateISO);
  }

  function stopModalEvent(event) {
    event.stopPropagation();
  }

  function closeDetail() {
    selectedDate = null;
    dayDetail = null;
    movingPlannedId = null;
    moveMessage = '';
    showPullSession = false;
  }

  function addDaysISO(baseISO, days) {
    const d = new Date(`${baseISO}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function getNextMondayISO(fromISO) {
    const d = new Date(`${fromISO}T12:00:00`);
    const day = d.getDay();
    const diff = day === 1 ? 7 : (8 - day) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function openMovePicker(planned) {
    if (movingPlannedId === planned.id) {
      movingPlannedId = null;
      moveMessage = '';
      return;
    }
    movingPlannedId = planned.id;
    moveMessage = '';
    moveTargetDate = planned.dateISO === today ? addDaysISO(today, 1) : today;
  }

  let plannedOnTargetDate = $derived.by(() => {
    if (!movingPlannedId || !moveTargetDate) return null;
    return plannedSessions.find(
      (p) => p.dateISO === moveTargetDate && p.id !== movingPlannedId && p.status !== 'done',
    ) || null;
  });

  let movableSessionsForRestDay = $derived.by(() => {
    if (!selectedDate) return [];
    const limitFuture = addDaysISO(today, 14);
    return plannedSessions.filter(
      (p) =>
        p.dateISO !== selectedDate &&
        (p.status === 'missed' || (p.status === 'pending' && p.dateISO <= limitFuture)),
    );
  });

  async function confirmMoveSession(plannedId, targetDate, swapWithId = undefined) {
    if (moveSaving || !targetDate) return;
    moveSaving = true;
    moveMessage = '';
    try {
      await movePlannedSession(plannedId, targetDate, swapWithId);
      await loadData();
      if (selectedDate) {
        dayDetail = await getDayData(selectedDate);
      }
      movingPlannedId = null;
      showPullSession = false;
      onCalendarChanged();
    } catch (err) {
      moveMessage = `Erreur : ${err?.message || err}`;
    } finally {
      moveSaving = false;
    }
  }

  function formatDuration(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} min ${s} s`;
  }

  async function saveVacation() {
    if (vacationSaving) return;
    vacationMessage = '';

    if (!vacationStart || !vacationEnd || vacationEnd < vacationStart) {
      vacationMessage = 'La date de retour doit être après le départ.';
      return;
    }

    if (!confirm('Ajouter ces vacances va décaler toutes les séances non réalisées à partir du départ. Continuer ?')) {
      return;
    }

    vacationSaving = true;
    try {
      const result = await addVacationAndShiftPlan(vacationStart, vacationEnd);
      vacationMessage = `${result.days} jour(s) de vacances ajoutés. ${result.shiftedSessions} séance(s) non réalisée(s) décalée(s).`;
      await loadData();
      if (selectedDate) dayDetail = await getDayData(selectedDate);
      onCalendarChanged();
    } catch (err) {
      vacationMessage = `Erreur : ${err.message}`;
    } finally {
      vacationSaving = false;
    }
  }

  let calendarDays = $derived(getCalendarDays());

  const today = todayISO();

  let monthRecap = $derived.by(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const planned = plannedSessions.filter((p) => p.dateISO.startsWith(prefix));
    const done = planned.filter((p) => p.status === 'done').length;
    const extra = sessions.filter(
      (s) => s.dateISO.startsWith(prefix) && s.type !== 'planned' && s.status === 'completed',
    ).length;
    return { done, total: planned.length, extra };
  });

  let isCurrentMonth = $derived(
    viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth(),
  );

  function goToday() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectDay(todayISO());
  }

  let deletingSessionId = $state(null);

  async function deleteSession(sessionId) {
    if (!confirm('Supprimer cette séance et toutes ses données ? Cette action est irréversible.')) return;
    deletingSessionId = sessionId;
    try {
      await deleteWorkoutSession(sessionId);
      await loadData();
      if (selectedDate) {
        dayDetail = await getDayData(selectedDate);
      }
      onCalendarChanged();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err?.message || err));
    } finally {
      deletingSessionId = null;
    }
  }
</script>

<div class="calendrier">
  <div class="cal-header">
    <button type="button" class="nav-btn" onclick={prevMonth} aria-label="Mois précédent">‹</button>
    <h2>{MONTHS[viewMonth]} {viewYear}</h2>
    <button type="button" class="nav-btn" onclick={nextMonth} aria-label="Mois suivant">›</button>
  </div>

  {#if loading}
    <div class="loading-screen">
      <span class="spinner" aria-hidden="true"></span>
      <p>Chargement du planning…</p>
    </div>
  {:else}
    <div class="cal-sub">
      <p class="recap">
        {#if monthRecap.total > 0 || monthRecap.extra > 0}
          {monthRecap.done}/{monthRecap.total} séances
          {#if monthRecap.extra > 0}· +{monthRecap.extra} hors planning{/if}
        {:else}
          Aucune séance ce mois-ci
        {/if}
      </p>
      {#if !isCurrentMonth}
        <button type="button" class="btn-ghost today-btn" onclick={goToday}>Aujourd'hui</button>
      {/if}
    </div>

    <div class="legend">
      <span class="dot done"></span> Faite
      <span class="dot pending"></span> Prévue
      <span class="dot missed"></span> Loupée
      <span class="dot extra"></span> Hors planning
      <span class="dot vacation"></span> Vacances
      <span class="dot rest"></span> Repos
    </div>

    <div class="weekdays">
      {#each WEEKDAYS as wd}
        <span>{wd}</span>
      {/each}
    </div>

    <div class="grid">
      {#each calendarDays as dateISO}
        {#if dateISO}
          {@const status = getDayStatus(dateISO)}
          {@const dayNum = parseInt(dateISO.slice(8, 10), 10)}
          <button
            type="button"
            class="day {status}"
            class:selected={selectedDate === dateISO}
            class:today={dateISO === today}
            aria-label={formatDateFR(dateISO)}
            aria-current={dateISO === today ? 'date' : undefined}
            onclick={() => selectDay(dateISO)}
          >
            {dayNum}
          </button>
        {:else}
          <div class="day empty"></div>
        {/if}
      {/each}
    </div>

    <details class="vacation-card">
      <summary>Mode vacances</summary>
      <p>
        Ajoutez une période sans entraînement : les séances non réalisées seront repoussées, sans toucher aux séances déjà faites.
      </p>

      <div class="vacation-fields">
        <label>
          <span>Départ</span>
          <input type="date" bind:value={vacationStart} />
        </label>
        <label>
          <span>Retour</span>
          <input type="date" bind:value={vacationEnd} />
        </label>
      </div>

      <button type="button" class="btn-primary" disabled={vacationSaving} onclick={saveVacation}>
        {vacationSaving ? 'Ajout…' : 'Ajouter les vacances'}
      </button>

      {#if vacationMessage}
        <p class="vacation-message">{vacationMessage}</p>
      {/if}

      {#if vacations.length > 0}
        <div class="vacation-list">
          <strong>Vacances enregistrées</strong>
          {#each vacations as vacation}
            <span>
              {formatDateFR(vacation.startDateISO)} → {formatDateFR(vacation.endDateISO)}
              ({vacation.days} j)
            </span>
          {/each}
        </div>
      {/if}
    </details>
  {/if}

  {#if selectedDate && dayDetail}
    <div class="modal-overlay" onclick={closeDetail} role="presentation">
      <div class="modal detail" onclick={stopModalEvent} onkeydown={stopModalEvent} role="dialog" tabindex="-1">
        <h3>{formatDateFR(selectedDate)}</h3>

        {#if dayDetail.vacations.length > 0}
          <div class="detail-block">
            <p>
              <span class="badge badge-info">Vacances</span>
              Période sans entraînement planifié.
            </p>
          </div>
        {/if}

        {#if dayDetail.planned.length === 0 && dayDetail.sessions.length === 0 && dayDetail.vacations.length === 0}
          <p class="empty">Jour de repos — aucune séance.</p>
          {#if movableSessionsForRestDay.length > 0}
            <div class="pull-session-wrap">
              <button
                type="button"
                class="btn-move-toggle"
                onclick={() => (showPullSession = !showPullSession)}
              >
                {showPullSession ? 'Masquer la liste' : 'Ramener une séance sur ce jour'}
              </button>
              {#if showPullSession}
                <div class="pull-list">
                  <span class="move-hint">Choisir la séance à programmer le {formatDateFR(selectedDate)} :</span>
                  {#each movableSessionsForRestDay as m}
                    {@const mTitle = parseSessionTitle(m.sessionName)}
                    <button
                      type="button"
                      class="pull-item"
                      disabled={moveSaving}
                      onclick={() => confirmMoveSession(m.id, selectedDate)}
                    >
                      <div class="pull-item-main">
                        <strong class="cal-title-loc">
                          {#if mTitle.location === 'home'}
                            <span class="cal-loc-icon" title="Maison"><Home size={13} strokeWidth={1.6} /></span>
                          {:else if mTitle.location === 'gym'}
                            <span class="cal-loc-icon" title="Salle"><Dumbbell size={13} strokeWidth={1.6} /></span>
                          {/if}
                          <span>{mTitle.cleanName}</span>
                        </strong>
                        <span class="badge badge-{m.status === 'missed' ? 'danger' : 'muted'}">
                          {m.status === 'missed' ? 'Loupée' : 'Prévue'}
                        </span>
                      </div>
                      <span class="pull-item-sub">Initialement le {formatDateFR(m.dateISO)}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/if}

        {#each dayDetail.planned as p}
          {@const pTitle = parseSessionTitle(p.sessionName)}
          <div class="detail-block">
            <div class="planned-header-row">
              <p class="cal-planned-line">
                <span class="badge badge-{p.status === 'done' ? 'success' : p.status === 'missed' ? 'danger' : 'muted'}">
                  {p.status === 'done' ? 'Réalisée' : p.status === 'missed' ? 'Loupée' : 'Prévue'}
                </span>
                {#if pTitle.location === 'home'}
                  <span class="cal-loc-icon" title="Maison"><Home size={14} strokeWidth={1.6} /></span>
                {:else if pTitle.location === 'gym'}
                  <span class="cal-loc-icon" title="Salle"><Dumbbell size={14} strokeWidth={1.6} /></span>
                {/if}
                <span>{pTitle.cleanName} — {p.cycleName}</span>
              </p>
              {#if p.status !== 'done'}
                <button
                  type="button"
                  class="btn-move-toggle"
                  onclick={() => openMovePicker(p)}
                >
                  {movingPlannedId === p.id ? 'Annuler' : 'Déplacer'}
                </button>
              {/if}
            </div>

            {#if movingPlannedId === p.id}
              <div class="move-box">
                <span class="move-hint">Nouvelle date (sans passer en rattrapage) :</span>
                <div class="move-shortcuts">
                  {#if p.dateISO !== today}
                    <button
                      type="button"
                      class="move-chip"
                      class:active={moveTargetDate === today}
                      onclick={() => (moveTargetDate = today)}
                    >
                      Aujourd'hui
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="move-chip"
                    class:active={moveTargetDate === addDaysISO(today, 1)}
                    onclick={() => (moveTargetDate = addDaysISO(today, 1))}
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    class="move-chip"
                    class:active={moveTargetDate === getNextMondayISO(p.dateISO)}
                    onclick={() => (moveTargetDate = getNextMondayISO(p.dateISO))}
                  >
                    Lundi prochain
                  </button>
                </div>

                <input type="date" class="move-date-input" bind:value={moveTargetDate} />

                {#if plannedOnTargetDate}
                  {@const conflictTitle = parseSessionTitle(plannedOnTargetDate.sessionName)}
                  <p class="move-conflict">
                    Ce jour contient déjà <strong>{conflictTitle.cleanName}</strong>.
                  </p>
                  <div class="move-actions-row">
                    <button
                      type="button"
                      class="btn-move-confirm"
                      disabled={moveSaving}
                      onclick={() => confirmMoveSession(p.id, moveTargetDate, plannedOnTargetDate.id)}
                    >
                      {moveSaving ? '…' : 'Échanger les 2 jours'}
                    </button>
                    <button
                      type="button"
                      class="btn-move-secondary"
                      disabled={moveSaving}
                      onclick={() => confirmMoveSession(p.id, moveTargetDate)}
                    >
                      Déplacer quand même
                    </button>
                  </div>
                {:else}
                  <button
                    type="button"
                    class="btn-move-confirm"
                    disabled={moveSaving || !moveTargetDate || moveTargetDate === p.dateISO}
                    onclick={() => confirmMoveSession(p.id, moveTargetDate)}
                  >
                    {moveSaving ? 'Déplacement…' : `Programmer au ${formatDateFR(moveTargetDate)}`}
                  </button>
                {/if}

                {#if moveMessage}
                  <p class="move-error">{moveMessage}</p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}

        {#each dayDetail.sessions as session}
          <div class="detail-block">
            <div class="detail-block-header">
              <p>
                <span class="badge badge-info">
                  {session.type === 'extra' ? 'Hors planning' : session.type === 'catchup' ? 'Rattrapage' : 'Séance'}
                </span>
                Durée : {formatDuration(session.durationSec)} — RPE moy. {session.avgRpe?.toFixed(1) ?? '—'}
              </p>
              <button
                type="button"
                class="btn-delete-session"
                disabled={deletingSessionId === session.id}
                onclick={() => deleteSession(session.id)}
                title="Supprimer cette séance"
              >
                {deletingSessionId === session.id ? '…' : '🗑️'}
              </button>
            </div>
            {#if session.sets.length > 0}
              {#each [...new Set(session.sets.map((s) => s.exerciseName))] as exName}
                <div class="ex-block">
                  <strong>{exName}</strong>
                  {#each session.sets.filter((s) => s.exerciseName === exName) as set}
                    <div class="set-row">
                      <span class="set-label">S{set.setNumber}</span>
                      <span>
                        {formatSetPerformance(set)} — RPE {set.rpe}{#if set.rpeTarget} <span style="font-size: 0.8em; color: var(--text-muted);">(cible {set.rpeTarget})</span>{/if}
                      </span>
                    </div>
                  {/each}
                </div>
              {/each}
            {/if}
            {#if session.feedback}
              <div class="feedback-block">
                <strong>Bilan séance</strong>
                <div class="feedback-grid">
                  {#if session.feedback.rpeRessenti}
                    <span>RPE ressenti : {session.feedback.rpeRessenti}/10</span>
                  {/if}
                  {#if session.feedback.energieAvant}
                    <span>Énergie avant : {session.feedback.energieAvant}/5</span>
                  {/if}
                  {#if session.feedback.energieApres}
                    <span>Énergie après : {session.feedback.energieApres}/5</span>
                  {/if}
                  {#if session.feedback.sommeil}
                    <span>Sommeil : {session.feedback.sommeil}/5</span>
                  {/if}
                  {#if session.feedback.courbatures}
                    <span>Courbatures : {session.feedback.courbatures}/5</span>
                  {/if}
                  {#if session.feedback.motivation}
                    <span>Motivation : {session.feedback.motivation}/5</span>
                  {/if}
                  {#if session.feedback.douleur === true}
                    <span class="warn">Douleur : {session.feedback.douleurDetail || 'signalée'}</span>
                  {/if}
                </div>
                {#if session.feedback.notes}
                  <p class="feedback-notes">{session.feedback.notes}</p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}

        <button type="button" class="btn-secondary" onclick={closeDetail}>Fermer</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .calendrier {
    width: 100%;
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .cal-header h2 {
    font-size: 1.2rem;
    margin: 0;
  }

  .cal-title-loc,
  .cal-planned-line {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .cal-loc-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--beige);
    flex-shrink: 0;
  }

  .nav-btn {
    min-height: 48px;
    min-width: 48px;
    background: var(--bg-elevated);
    color: var(--text-heading);
    font-size: 1.5rem;
    border-radius: 12px;
    padding: 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .cal-sub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    margin: -0.5rem 0 0.75rem;
  }

  .recap {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .today-btn {
    min-height: 36px;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
  }

  .day.today {
    border-color: var(--pink);
    color: var(--pink);
  }

  .vacation-card {
    margin-top: 1.5rem;
  }

  .vacation-card summary {
    display: flex;
    align-items: center;
    min-height: 52px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    list-style: none;
  }

  .vacation-card summary::-webkit-details-marker {
    display: none;
  }

  .vacation-card[open] summary {
    color: var(--accent);
  }

  .vacation-card > p {
    margin-top: 0.75rem;
  }

  .vacation-card p {
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .vacation-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .vacation-fields span {
    display: block;
    margin-bottom: 0.35rem;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .vacation-message {
    margin-top: 0.75rem;
  }

  .vacation-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  .vacation-list strong {
    color: var(--text-heading);
  }

  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 0.2rem;
    vertical-align: middle;
  }

  .dot.done {
    background: #259659;
  }
  .dot.pending {
    background: #c4a482;
  }
  .dot.missed {
    background: #942b37;
  }
  .dot.extra {
    background: #06375a;
  }
  .dot.vacation {
    background: #b45309;
  }
  .dot.rest {
    background: rgba(247, 245, 242, 0.25);
  }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .day {
    aspect-ratio: 1;
    min-height: 44px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.92rem;
    padding: 0;
    background: var(--bg-card);
    color: var(--text);
    border: none;
    transition: transform 0.1s ease;
  }

  .day:active {
    transform: scale(0.95);
  }

  .day.empty {
    background: transparent;
    pointer-events: none;
  }

  .day.done {
    background: #238656;
    color: #f7f5f2;
    font-weight: 700;
  }

  .day.missed {
    background: #541920;
    color: #fde8eb;
    font-weight: 700;
  }

  .day.pending {
    background: #c4a482;
    color: #17150f;
    font-weight: 700;
  }

  .day.extra {
    background: #06375a;
    color: #f7f5f2;
    font-weight: 700;
  }

  .day.vacation {
    background: #523414;
    color: #fef3c7;
    font-weight: 700;
  }

  .day.rest {
    background: var(--bg-card);
    color: rgba(247, 245, 242, 0.38);
    font-weight: 500;
  }

  .day.today {
    box-shadow: inset 0 0 0 2px var(--pink);
    color: var(--text-heading);
    font-weight: 800;
  }

  .day.selected {
    box-shadow: inset 0 0 0 2.5px #f7f5f2;
  }

  .day.today.selected {
    box-shadow: inset 0 0 0 2px var(--pink), inset 0 0 0 4.5px #f7f5f2;
  }

  .detail h3 {
    text-transform: capitalize;
    margin-bottom: 1rem;
  }

  .detail-block {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .ex-block {
    margin-top: 0.5rem;
    padding-left: 0.5rem;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
  }

  .feedback-block {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.85rem;
  }

  .feedback-grid {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.35rem;
    color: var(--text-muted);
  }

  .feedback-grid .warn {
    color: var(--destructive);
  }

  .feedback-notes {
    margin-top: 0.5rem;
    font-style: italic;
    color: var(--text-muted);
  }

  .detail-block-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .detail-block-header p {
    flex: 1;
  }

  .btn-delete-session {
    flex-shrink: 0;
    min-height: 40px;
    min-width: 40px;
    padding: 0;
    border-radius: 10px;
    background: color-mix(in srgb, var(--destructive) 15%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--destructive) 35%, transparent);
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
  }

  .btn-delete-session:hover {
    background: color-mix(in srgb, var(--destructive) 30%, var(--bg-elevated));
    transform: scale(1.05);
  }

  .btn-delete-session:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .detail .btn-secondary {
    width: 100%;
    min-height: 48px;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    border-radius: 12px;
    font-weight: 600;
  }

  .planned-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .planned-header-row p {
    margin: 0;
    flex: 1;
  }

  .btn-move-toggle {
    min-height: 36px;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--beige) 12%, transparent);
    color: var(--beige);
    border: 1px solid color-mix(in srgb, var(--beige) 30%, transparent);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .move-box {
    margin-top: 0.85rem;
    padding: 0.85rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .move-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .move-shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .move-chip {
    min-height: 34px;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: var(--bg-card);
    color: var(--text-muted);
    border: 1px solid var(--border);
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
  }

  .move-chip.active {
    background: color-mix(in srgb, var(--beige) 20%, transparent);
    color: var(--beige);
    border-color: var(--beige);
  }

  .move-date-input {
    width: 100%;
    min-height: 42px;
  }

  .move-conflict {
    margin: 0;
    font-size: 0.8rem;
    color: var(--beige);
  }

  .move-actions-row {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .btn-move-confirm {
    width: 100%;
    min-height: 44px;
    border-radius: 10px;
    background: #06375a;
    color: #f7f5f2;
    font-weight: 700;
    font-size: 0.86rem;
    border: none;
    cursor: pointer;
  }

  .btn-move-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-move-secondary {
    width: 100%;
    min-height: 40px;
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text);
    border: 1px solid var(--border);
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .move-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--destructive);
  }

  .pull-session-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .pull-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .pull-item {
    width: 100%;
    text-align: left;
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;
  }

  .pull-item:hover {
    border-color: var(--beige);
  }

  .pull-item-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-heading);
    font-size: 0.9rem;
  }

  .pull-item-sub {
    font-size: 0.78rem;
    color: var(--text-muted);
  }
</style>
