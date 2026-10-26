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
    getUniqueExercises,
  } from '$lib/stats';
  import { getExerciseCategory, groupByCategory } from '$lib/exerciseCategories';
  Chart.register(...registerables);

  let { refreshKey = 0 } = $props();

  let plannedSessions = $state([]);
  let sessionsWithSets = $state([]);
  let globalStats = $state(null);
  let records = $state([]);
  let exercises = $state([]);
  let selectedExercise = $state('');
  let selectedCategory = $state('');
  let metric = $state('weight');
  let exerciseCanvas = $state(null);
  let volumeCanvas = $state(null);
  let exerciseChart = null;
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
    exercises = getUniqueExercises(sessionsWithSets);
    if ((!selectedExercise || !exercises.includes(selectedExercise)) && exercises.length) {
      selectedExercise = exercises[0];
    }
    if (selectedExercise) selectedCategory = getExerciseCategory(selectedExercise);
    await tick();
    renderVolumeChart();
    renderExerciseChart();
  }

  $effect(() => {
    selectedExercise;
    metric;
    if (selectedExercise && sessionsWithSets.length) {
      renderExerciseChart();
    }
  });

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function renderVolumeChart() {
    if (!volumeCanvas) return;
    const volumeData = getVolumeByPeriod(sessionsWithSets, 'week').slice(-12);
    const pink = cssVar('--pink', '#e6a6b2');

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
      options: chartOptions(),
    });
  }

  function renderExerciseChart() {
    if (!exerciseCanvas || !selectedExercise) return;
    const pink = cssVar('--pink', '#e6a6b2');
    const isWeight = metric === 'weight';
    const data = isWeight
      ? getWeightProgression(sessionsWithSets, selectedExercise).map((d) => ({ x: d.dateISO, y: d.weight }))
      : getRpeProgression(sessionsWithSets, selectedExercise).map((d) => ({ x: d.dateISO, y: d.rpe }));

    if (exerciseChart) exerciseChart.destroy();
    exerciseChart = new Chart(exerciseCanvas, {
      type: 'line',
      data: {
        labels: data.map((d) => d.x.slice(5)),
        datasets: [
          {
            label: isWeight ? 'Charge max (kg)' : 'RPE moyen',
            data: data.map((d) => d.y),
            borderColor: pink,
            backgroundColor: `${pink}22`,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: chartOptions(),
    });
  }

  function chartOptions() {
    const textColor = cssVar('--muted-foreground', 'rgba(247, 245, 242, 0.56)');
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: 'rgba(128,128,128,0.15)' } },
      },
    };
  }

  const exerciseGroups = $derived(groupByCategory(exercises));
  const exercisesInCategory = $derived(
    exerciseGroups.find((g) => g.category === selectedCategory)?.items ?? [],
  );
  const recordGroups = $derived(groupByCategory(records, (r) => r.exerciseName));

  function onCategoryChange() {
    const first = exercisesInCategory[0];
    if (first) selectedExercise = first;
  }
</script>

<div class="stats">
  <h1>Statistiques</h1>

  {#if sessionsWithSets.length === 0}
    <div class="empty-state">
      <p>Aucune séance enregistrée. Complétez une séance pour voir vos stats.</p>
    </div>
  {:else}
    {#if globalStats}
      <section class="summary" aria-label="Résumé">
        <div>
          <p class="summary-value">{globalStats.monthAdherence.rate}%</p>
          <p class="summary-label">Assiduité du mois</p>
          <p class="sub">{globalStats.monthAdherence.done}/{globalStats.monthAdherence.total} séances</p>
        </div>
        <div>
          <p class="summary-value">{globalStats.thisWeekVolume}</p>
          <p class="summary-label">Volume semaine</p>
          <p class="sub">kg</p>
        </div>
        <div>
          <p class="summary-value">{globalStats.adherence.rate}%</p>
          <p class="summary-label">Assiduité globale</p>
          <p class="sub">{globalStats.adherence.done}/{globalStats.adherence.total} séances</p>
        </div>
      </section>
    {/if}

    <section>
      <h2>Volume</h2>
      <p class="sub section-sub">Par semaine, 12 dernières semaines (kg)</p>
      <div class="chart-wrap"><canvas bind:this={volumeCanvas}></canvas></div>
    </section>

    {#if exercises.length > 0}
      <section>
        <h2>Progression</h2>
        <div class="pickers">
          <select bind:value={selectedCategory} onchange={onCategoryChange} aria-label="Catégorie">
            {#each exerciseGroups as g}
              <option value={g.category}>{g.category} ({g.items.length})</option>
            {/each}
          </select>
          <select bind:value={selectedExercise} aria-label="Exercice">
            {#each exercisesInCategory as ex}
              <option value={ex}>{ex}</option>
            {/each}
          </select>
        </div>
        <div class="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={metric === 'weight'} class:on={metric === 'weight'} onclick={() => (metric = 'weight')}>Charge</button>
          <button type="button" role="tab" aria-selected={metric === 'rpe'} class:on={metric === 'rpe'} onclick={() => (metric = 'rpe')}>RPE</button>
        </div>
        <div class="chart-wrap"><canvas bind:this={exerciseCanvas}></canvas></div>
      </section>
    {/if}

    {#if records.length > 0}
      <section>
        <h2>Records</h2>
        {#each recordGroups as group}
          <details class="rec-group">
            <summary>
              <span>{group.category}</span>
              <span class="sub">{group.items.length}</span>
            </summary>
            <ul class="records">
              {#each group.items as rec}
                <li>
                  <span class="rec-name">{rec.exerciseName}</span>
                  <span class="rec-val">{rec.maxWeight} kg <span class="sub">· 1RM {rec.max1RM}</span></span>
                </li>
              {/each}
            </ul>
          </details>
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .stats h1 {
    margin: 0.75rem 0 0;
  }

  .stats h2 {
    font-size: 1.05rem;
    margin: 0 0 0.75rem;
  }

  .sub {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
  }

  .section-sub {
    margin: -0.5rem 0 0.75rem;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 1rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .summary p {
    margin: 0;
  }

  .summary-value {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-heading);
  }

  .summary-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin: 0.2rem 0 0.15rem !important;
  }

  .chart-wrap {
    position: relative;
    height: 210px;
    margin-top: 0.75rem;
  }

  .segmented {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 3px;
    background: var(--bg-elevated);
    border-radius: 12px;
  }

  .segmented button {
    flex: 1;
    min-height: 36px;
    padding: 0.35rem;
    border-radius: 9px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .segmented button.on {
    background: var(--bg-card);
    color: var(--text-heading);
  }

  .records {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .records li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }

  .rec-name {
    font-weight: 600;
    font-size: 0.92rem;
  }

  .rec-val {
    flex-shrink: 0;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .pickers {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .rec-group summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 52px;
    padding: 0 0.15rem;
    font-weight: 700;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    list-style: none;
  }

  .rec-group summary::-webkit-details-marker {
    display: none;
  }

  .rec-group[open] summary {
    color: var(--accent);
  }
</style>
