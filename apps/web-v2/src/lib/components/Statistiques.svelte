<script>
  import { onMount, tick } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { getPlannedSessions, getAllSessionsWithSets } from '$lib/api';
  import {
    getGlobalStats,
    getWeightProgression,
    getRpeProgression,
    getVolumeByPeriod,
    getPersonalRecords,
    getSessionTypeFrequency,
    getUniqueExercises,
    calcAdherence,
  } from '$lib/stats';
  Chart.register(...registerables);

  let { refreshKey = 0 } = $props();

  let plannedSessions = $state([]);
  let sessionsWithSets = $state([]);
  let globalStats = $state(null);
  let records = $state([]);
  let frequency = $state([]);
  let exercises = $state([]);
  let selectedExercise = $state('');
  let weightCanvas = $state(null);
  let rpeCanvas = $state(null);
  let volumeCanvas = $state(null);
  let weightChart = null;
  let rpeChart = null;
  let volumeChart = null;

  onMount(loadData);

  $effect(() => {
    refreshKey;
    loadData();
  });

  async function loadData() {
    plannedSessions = await getPlannedSessions();
    sessionsWithSets = await getAllSessionsWithSets();
    globalStats = getGlobalStats(plannedSessions, sessionsWithSets);
    records = getPersonalRecords(sessionsWithSets);
    frequency = getSessionTypeFrequency(sessionsWithSets, plannedSessions);
    exercises = getUniqueExercises(sessionsWithSets);
    if (!selectedExercise && exercises.length) {
      selectedExercise = exercises[0];
    }
    await tick();
    renderCharts();
    renderExerciseCharts();
  }

  $effect(() => {
    if (selectedExercise && sessionsWithSets.length) {
      renderExerciseCharts();
    }
  });

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function renderCharts() {
    if (!volumeCanvas) return;

    const volumeData = getVolumeByPeriod(sessionsWithSets, 'week').slice(-12);
    const pink = cssVar('--pink', '#e6a6b2');
    const deepblue = cssVar('--deepblue', '#06375a');

    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(volumeCanvas, {
      type: 'bar',
      data: {
        labels: volumeData.map((d) => d.key.slice(5)),
        datasets: [
          {
            label: 'Volume (kg)',
            data: volumeData.map((d) => d.volume),
            backgroundColor: pink,
            borderRadius: 6,
          },
        ],
      },
      options: chartOptions('Volume hebdomadaire (kg)'),
    });
  }

  function renderExerciseCharts() {
    if (!weightCanvas || !rpeCanvas || !selectedExercise) return;

    const weightData = getWeightProgression(sessionsWithSets, selectedExercise);
    const rpeData = getRpeProgression(sessionsWithSets, selectedExercise);
    const pink = cssVar('--pink', '#e6a6b2');
    const deepblue = cssVar('--deepblue', '#06375a');

    if (weightChart) weightChart.destroy();
    weightChart = new Chart(weightCanvas, {
      type: 'line',
      data: {
        labels: weightData.map((d) => d.dateISO.slice(5)),
        datasets: [
          {
            label: 'Charge max (kg)',
            data: weightData.map((d) => d.weight),
            borderColor: deepblue,
            backgroundColor: `${deepblue}22`,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: chartOptions('Progression charge'),
    });

    if (rpeChart) rpeChart.destroy();
    rpeChart = new Chart(rpeCanvas, {
      type: 'line',
      data: {
        labels: rpeData.map((d) => d.dateISO.slice(5)),
        datasets: [
          {
            label: 'RPE moyen',
            data: rpeData.map((d) => d.rpe),
            borderColor: pink,
            backgroundColor: `${pink}33`,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: chartOptions('Évolution RPE'),
    });
  }

  function chartOptions(title) {
    const textColor = cssVar('--muted-foreground', 'rgba(247, 245, 242, 0.56)');
    const titleFont = "'Montserrat', sans-serif";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: textColor,
          font: { family: titleFont, size: 13, weight: '600' },
        },
        legend: { labels: { color: textColor, font: { family: "'Open Sans', sans-serif" } } },
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: 'rgba(128,128,128,0.15)' } },
        y: { ticks: { color: textColor }, grid: { color: 'rgba(128,128,128,0.15)' } },
      },
    };
  }

  const years = $derived([...new Set(plannedSessions.map((p) => p.dateISO.slice(0, 4)))].sort());
</script>

<div class="stats">
  <h1>Statistiques & Recommandations</h1>

  {#if globalStats}
    <div class="kpi-grid">
      <div class="card">
        <p class="card-title">Assiduité globale</p>
        <p class="card-value">{globalStats.adherence.rate}%</p>
        <p class="sub">{globalStats.adherence.done}/{globalStats.adherence.total} séances</p>
      </div>
      <div class="card">
        <p class="card-title">Ce mois</p>
        <p class="card-value">{globalStats.monthAdherence.rate}%</p>
        <p class="sub">{globalStats.monthAdherence.done}/{globalStats.monthAdherence.total}</p>
      </div>
      <div class="card">
        <p class="card-title">Cette année</p>
        <p class="card-value">{globalStats.yearAdherence.rate}%</p>
        <p class="sub">{globalStats.yearAdherence.done}/{globalStats.yearAdherence.total}</p>
      </div>
      <div class="card">
        <p class="card-title">Volume semaine</p>
        <p class="card-value">{globalStats.thisWeekVolume}</p>
        <p class="sub">kg total</p>
      </div>
    </div>
  {/if}

  {#if sessionsWithSets.length === 0}
    <div class="empty-state">
      <p>Aucune séance enregistrée. Complétez une séance pour voir vos stats.</p>
    </div>
  {:else}
    <div class="card chart-card">
      <canvas bind:this={volumeCanvas}></canvas>
    </div>

    {#if exercises.length > 0}
      <div class="card">
        <label>
          <span class="card-title">Exercice</span>
          <select bind:value={selectedExercise}>
            {#each exercises as ex}
              <option value={ex}>{ex}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="card chart-card">
        <canvas bind:this={weightCanvas}></canvas>
      </div>

      <div class="card chart-card">
        <canvas bind:this={rpeCanvas}></canvas>
      </div>
    {/if}

    {#if records.length > 0}
      <h2>Records personnels</h2>
      <div class="records">
        {#each records as rec}
          <div class="card record-card">
            <h3>{rec.exerciseName}</h3>
            <div class="rec-grid">
              <div>
                <span class="card-title">Charge max</span>
                <strong>{rec.maxWeight} kg</strong>
              </div>
              <div>
                <span class="card-title">1RM estimé</span>
                <strong>{rec.max1RM} kg</strong>
              </div>
              <div>
                <span class="card-title">Volume max/série</span>
                <strong>{rec.maxVolume} kg</strong>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if frequency.length > 0}
      <h2>Fréquence par type</h2>
      <div class="card">
        {#each frequency as f}
          <div class="freq-row">
            <span>{f.name}</span>
            <strong>{f.count} séances</strong>
          </div>
        {/each}
      </div>
    {/if}

    {#if years.length > 0}
      <h2>Assiduité par année</h2>
      {#each years as year}
        {@const adh = calcAdherence(plannedSessions, { year: parseInt(year, 10) })}
        <div class="card freq-row">
          <span>{year}</span>
          <strong>{adh.rate}% ({adh.done}/{adh.total})</strong>
        </div>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .stats {
    width: 100%;
  }

  .sub {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
  }

  .chart-card {
    height: 260px;
    position: relative;
  }

  .chart-card canvas {
    max-height: 220px;
  }

  .records {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .record-card h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .recommendations {
    margin-bottom: 1.5rem;
  }

  .rec-card {
    padding: 1rem;
    background: var(--bg-elevated);
    margin-bottom: 0.5rem;
  }

  .ai-coach-msg {
    margin-bottom: 1rem;
  }

  .rec-reason {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .rec-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    text-align: center;
  }

  .rec-grid strong {
    display: block;
    font-size: 1.1rem;
    color: var(--text-heading);
  }

  .freq-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .freq-row:last-child {
    border-bottom: none;
  }

  label span.card-title {
    display: block;
    margin-bottom: 0.5rem;
  }
</style>
