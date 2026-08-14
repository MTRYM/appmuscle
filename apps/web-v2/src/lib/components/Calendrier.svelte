<script>
  import { onMount } from 'svelte';
  import {
    addVacationAndShiftPlan,
    
    getDayData,
    getVacations,
  } from '$lib/api';
  import { formatDateFR, formatSetPerformance, todayISO } from '$lib/programme';

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
    [plannedSessions, sessions, vacations] = await Promise.all([
      getPlannedSessions(),
      getAllSessionsWithSets(),
      getVacations(),
    ]);
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
    const extra = done.filter((s) => s.type === 'extra');
    const isVacation = vacations.some((v) => dateISO >= v.startDateISO && dateISO <= v.endDateISO);

    if (planned.some((p) => p.status === 'done')) return 'done';
    if (planned.some((p) => p.status === 'missed')) return 'missed';
    if (planned.some((p) => p.status === 'pending')) return 'pending';
    if (extra.length > 0) return 'extra';
    if (done.length > 0) return 'extra';
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
    dayDetail = await getDayData(dateISO);
  }

  function stopModalEvent(event) {
    event.stopPropagation();
  }

  function closeDetail() {
    selectedDate = null;
    dayDetail = null;
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
</script>

<div class="calendrier">
  <div class="cal-header">
    <button type="button" class="nav-btn" onclick={prevMonth} aria-label="Mois précédent">‹</button>
    <h2>{MONTHS[viewMonth]} {viewYear}</h2>
    <button type="button" class="nav-btn" onclick={nextMonth} aria-label="Mois suivant">›</button>
  </div>

  <div class="legend">
    <span class="dot done"></span> Faite
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
          onclick={() => selectDay(dateISO)}
        >
          {dayNum}
        </button>
      {:else}
        <div class="day empty"></div>
      {/if}
    {/each}
  </div>

  <div class="card vacation-card">
    <div>
      <h3>Mode vacances</h3>
      <p>
        Ajoutez une période sans entraînement : les séances non réalisées seront repoussées, sans toucher aux séances déjà faites.
      </p>
    </div>

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
  </div>

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
        {/if}

        {#each dayDetail.planned as p}
          <div class="detail-block">
            <p>
              <span class="badge badge-{p.status === 'done' ? 'success' : p.status === 'missed' ? 'danger' : 'muted'}">
                {p.status === 'done' ? 'Réalisée' : p.status === 'missed' ? 'Loupée' : 'Prévue'}
              </span>
              {p.sessionName} — {p.cycleName}
            </p>
          </div>
        {/each}

        {#each dayDetail.sessions as session}
          <div class="detail-block">
            <p>
              <span class="badge badge-info">
                {session.type === 'extra' ? 'Hors planning' : session.type === 'catchup' ? 'Rattrapage' : 'Séance'}
              </span>
              Durée : {formatDuration(session.durationSec)} — RPE moy. {session.avgRpe?.toFixed(1) ?? '—'}
            </p>
            {#if session.sets.length > 0}
              {#each [...new Set(session.sets.map((s) => s.exerciseName))] as exName}
                <div class="ex-block">
                  <strong>{exName}</strong>
                  {#each session.sets.filter((s) => s.exerciseName === exName) as set}
                    <div class="set-row">
                      <span class="set-label">S{set.setNumber}</span>
                      <span>{formatSetPerformance(set)} — RPE {set.rpe}</span>
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

  .vacation-card {
    margin-top: 1.25rem;
  }

  .vacation-card h3 {
    margin-bottom: 0.35rem;
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
    background: var(--deepblue);
  }
  .dot.missed {
    background: var(--destructive);
  }
  .dot.extra {
    background: var(--pink);
  }
  .dot.vacation {
    background: var(--warning);
  }
  .dot.rest {
    background: var(--faint);
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
    font-size: 0.9rem;
    padding: 0;
    background: var(--bg-card);
    color: var(--text);
    border: 2px solid transparent;
  }

  .day.empty {
    background: transparent;
    pointer-events: none;
  }

  .day.done {
    background: color-mix(in srgb, var(--deepblue) 35%, var(--bg-card));
    border-color: var(--deepblue);
  }

  .day.missed {
    background: color-mix(in srgb, var(--destructive) 28%, var(--bg-card));
    border-color: var(--destructive);
  }

  .day.pending {
    background: color-mix(in srgb, var(--beige) 35%, var(--bg-card));
    border-color: color-mix(in srgb, var(--beige) 70%, var(--ink));
    color: var(--text-heading);
  }

  .day.extra {
    background: color-mix(in srgb, var(--pink) 30%, var(--bg-card));
    border-color: var(--pink);
  }

  .day.vacation {
    background: color-mix(in srgb, var(--warning) 28%, var(--bg-card));
    border-color: var(--warning);
    color: var(--text-heading);
  }

  .day.rest {
    background: var(--bg-card);
    color: var(--text-muted);
  }

  .day.selected {
    box-shadow: 0 0 0 2px var(--pink);
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
</style>
