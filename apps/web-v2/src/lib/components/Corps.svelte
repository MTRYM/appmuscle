<script>
  import { onMount, tick } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import {
    getBodyData,
    saveBodyProfile,
    saveBodyWeight,
    saveBodyMeasurement,
    deleteBodyEntry,
  } from '$lib/api';
  import { todayISO, formatDateFR } from '$lib/programme';

  Chart.register(...registerables);

  const BODY_ZONES = [
    {
      id: 'cou',
      label: 'Cou',
      fullName: 'Tour de cou',
      unit: 'cm',
      side: 'left',
      cx: 130,
      cy: 64,
      rx: 13,
      ry: 5,
    },
    {
      id: 'epaules',
      label: 'Épaules',
      fullName: 'Tour d’épaules',
      unit: 'cm',
      side: 'right',
      cx: 130,
      cy: 84,
      rx: 44,
      ry: 8,
    },
    {
      id: 'poitrine',
      label: 'Poitrine',
      fullName: 'Tour de poitrine',
      unit: 'cm',
      side: 'left',
      cx: 130,
      cy: 108,
      rx: 31,
      ry: 9,
    },
    {
      id: 'bras',
      label: 'Bras',
      fullName: 'Tour de bras (biceps)',
      unit: 'cm',
      side: 'right',
      cx: 178,
      cy: 122,
      rx: 10,
      ry: 7,
      mirrorX: 82,
    },
    {
      id: 'taille',
      label: 'Taille',
      fullName: 'Tour de taille',
      unit: 'cm',
      side: 'left',
      cx: 130,
      cy: 152,
      rx: 24,
      ry: 7,
    },
    {
      id: 'avant_bras',
      label: 'Avant-bras',
      fullName: 'Tour d’avant-bras',
      unit: 'cm',
      side: 'right',
      cx: 189,
      cy: 162,
      rx: 8,
      ry: 6,
      mirrorX: 71,
    },
    {
      id: 'hanches',
      label: 'Hanches',
      fullName: 'Tour de bassin / hanches',
      unit: 'cm',
      side: 'left',
      cx: 130,
      cy: 186,
      rx: 29,
      ry: 8,
    },
    {
      id: 'cuisses',
      label: 'Cuisses',
      fullName: 'Tour de cuisse',
      unit: 'cm',
      side: 'right',
      cx: 148,
      cy: 232,
      rx: 14,
      ry: 8,
      mirrorX: 112,
    },
    {
      id: 'mollets',
      label: 'Mollets',
      fullName: 'Tour de mollet',
      unit: 'cm',
      side: 'right',
      cx: 149,
      cy: 298,
      rx: 10,
      ry: 6,
      mirrorX: 111,
    },
  ];

  let loading = $state(true);
  let saving = $state(false);
  let statusMsg = $state('');
  let statusType = $state('info');

  let profile = $state({ heightCm: null, targetWeightKg: null });
  let checkIns = $state([]);
  let measurements = $state([]);

  // Active selection: 'poids' | 'profil' | zone.id
  let selectedTarget = $state('poids');

  // Form inputs
  let inputValue = $state('');
  let inputDate = $state(todayISO());
  let heightInput = $state('');
  let targetWeightInput = $state('');

  let chartCanvas = $state(null);
  let evolutionChart = null;

  onMount(async () => {
    await loadAll();
  });

  function notify(msg, type = 'success') {
    statusMsg = msg;
    statusType = type;
    setTimeout(() => {
      if (statusMsg === msg) statusMsg = '';
    }, 3000);
  }

  async function loadAll() {
    loading = true;
    try {
      const data = await getBodyData();
      profile = data.profile || { heightCm: null, targetWeightKg: null };
      checkIns = data.checkIns || [];
      measurements = data.measurements || [];
      heightInput = profile.heightCm ? String(profile.heightCm) : '';
      targetWeightInput = profile.targetWeightKg ? String(profile.targetWeightKg) : '';
      syncInputForSelection(selectedTarget);
      await tick();
      renderChart();
    } catch (err) {
      console.warn('Erreur chargement données corps:', err);
    } finally {
      loading = false;
    }
  }

  // Derived latest weight & delta
  let latestWeightObj = $derived(
    checkIns.length > 0 ? checkIns[checkIns.length - 1] : null,
  );
  let previousWeightObj = $derived(
    checkIns.length > 1 ? checkIns[checkIns.length - 2] : null,
  );
  let weightDelta = $derived.by(() => {
    if (!latestWeightObj || !previousWeightObj) return null;
    const diff = Math.round((latestWeightObj.weight - previousWeightObj.weight) * 10) / 10;
    return diff;
  });

  // BMI calculation
  let bmi = $derived.by(() => {
    if (!latestWeightObj?.weight || !profile?.heightCm) return null;
    const hMeters = profile.heightCm / 100;
    if (hMeters <= 0) return null;
    return Math.round((latestWeightObj.weight / (hMeters * hMeters)) * 10) / 10;
  });

  function getZoneHistory(zoneId) {
    return measurements
      .filter((m) => m.type === zoneId)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }

  function getLatestZoneValue(zoneId) {
    const hist = getZoneHistory(zoneId);
    return hist.length > 0 ? hist[hist.length - 1].value : null;
  }

  function getZoneDelta(zoneId) {
    const hist = getZoneHistory(zoneId);
    if (hist.length < 2) return null;
    return Math.round((hist[hist.length - 1].value - hist[0].value) * 10) / 10;
  }

  let activeZoneMeta = $derived(
    BODY_ZONES.find((z) => z.id === selectedTarget) || null,
  );

  let activeHistory = $derived.by(() => {
    if (selectedTarget === 'poids') {
      return [...checkIns]
        .filter((c) => c.weight != null)
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
        .map((c) => ({ id: c.id, dateISO: c.dateISO, value: c.weight, unit: 'kg', kind: 'weight' }));
    }
    if (activeZoneMeta) {
      return getZoneHistory(activeZoneMeta.id).map((m) => ({
        id: m.id,
        dateISO: m.dateISO,
        value: m.value,
        unit: 'cm',
        kind: 'measurement',
      }));
    }
    return [];
  });

  function syncInputForSelection(target) {
    if (target === 'poids') {
      inputValue = latestWeightObj?.weight ? String(latestWeightObj.weight) : '';
    } else if (target === 'profil') {
      heightInput = profile.heightCm ? String(profile.heightCm) : '';
      targetWeightInput = profile.targetWeightKg ? String(profile.targetWeightKg) : '';
    } else {
      const latest = getLatestZoneValue(target);
      inputValue = latest != null ? String(latest) : '';
    }
  }

  async function selectTarget(target) {
    selectedTarget = target;
    syncInputForSelection(target);
    await tick();
    renderChart();
  }

  async function handleSaveValue(e) {
    e.preventDefault();
    if (saving) return;

    const val = parseFloat(String(inputValue).replace(',', '.'));
    if (Number.isNaN(val) || val <= 0) {
      notify('Veuillez saisir une valeur valide.', 'error');
      return;
    }

    saving = true;
    try {
      if (selectedTarget === 'poids') {
        await saveBodyWeight(val, inputDate);
        notify(`Poids enregistré (${val} kg).`);
      } else if (activeZoneMeta) {
        await saveBodyMeasurement(activeZoneMeta.id, val, inputDate);
        notify(`${activeZoneMeta.label} enregistré (${val} cm).`);
      }
      await loadAll();
    } catch (err) {
      notify(err?.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (saving) return;

    const h = heightInput ? parseFloat(String(heightInput).replace(',', '.')) : null;
    const tw = targetWeightInput ? parseFloat(String(targetWeightInput).replace(',', '.')) : null;

    saving = true;
    try {
      await saveBodyProfile({ heightCm: h, targetWeightKg: tw });
      notify('Profil corporel mis à jour.');
      await loadAll();
    } catch (err) {
      notify(err?.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDeleteEntry(entry) {
    if (!confirm(`Supprimer la mesure du ${formatDateFR(entry.dateISO)} (${entry.value} ${entry.unit}) ?`)) {
      return;
    }
    try {
      await deleteBodyEntry(entry.kind, entry.id);
      await loadAll();
    } catch (err) {
      notify(err?.message || 'Erreur lors de la suppression.', 'error');
    }
  }

  function renderChart() {
    if (!chartCanvas || selectedTarget === 'profil') {
      if (evolutionChart) {
        evolutionChart.destroy();
        evolutionChart = null;
      }
      return;
    }

    const hist = activeHistory;
    if (evolutionChart) {
      evolutionChart.destroy();
      evolutionChart = null;
    }
    if (hist.length === 0) return;

    const isWeight = selectedTarget === 'poids';
    const lineColor = isWeight ? '#e6a6b2' : '#06375a';
    const pointBorder = isWeight ? '#e6a6b2' : '#e8dccf';
    const fillBg = isWeight ? 'rgba(230, 166, 178, 0.16)' : 'rgba(6, 55, 90, 0.35)';

    evolutionChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: hist.map((d) => d.dateISO.slice(5)),
        datasets: [
          {
            label: isWeight ? 'Poids (kg)' : `${activeZoneMeta?.label || ''} (cm)`,
            data: hist.map((d) => d.value),
            borderColor: lineColor,
            borderWidth: 2.5,
            backgroundColor: fillBg,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: lineColor,
            pointBorderColor: pointBorder,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: 'rgba(247, 245, 242, 0.56)' },
            grid: { display: false },
          },
          y: {
            ticks: { color: 'rgba(247, 245, 242, 0.56)' },
            grid: { color: 'rgba(128, 128, 128, 0.15)' },
          },
        },
      },
    });
  }

  const leftZones = BODY_ZONES.filter((z) => z.side === 'left');
  const rightZones = BODY_ZONES.filter((z) => z.side === 'right');
</script>

<div class="corps">
  <h1>Corps & Mensurations</h1>

  {#if statusMsg}
    <p class="status-banner {statusType}" role="status">{statusMsg}</p>
  {/if}

  {#if loading}
    <div class="loading-screen">
      <span class="spinner" aria-hidden="true"></span>
      <p>Chargement de tes données corporelles…</p>
    </div>
  {:else}
    <!-- Top Summary Cards -->
    <section class="summary" aria-label="Résumé corporel">
      <button
        type="button"
        class="summary-card"
        class:active={selectedTarget === 'poids'}
        onclick={() => selectTarget('poids')}
      >
        <p class="summary-value">
          {latestWeightObj ? `${latestWeightObj.weight}` : '—'}
        </p>
        <p class="summary-label">Poids (kg)</p>
        <p class="sub">
          {#if weightDelta !== null}
            {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg vs préc.
          {:else if profile.targetWeightKg}
            Cible {profile.targetWeightKg} kg
          {:else}
            Toucher pour saisir
          {/if}
        </p>
      </button>

      <button
        type="button"
        class="summary-card"
        class:active={selectedTarget === 'profil'}
        onclick={() => selectTarget('profil')}
      >
        <p class="summary-value">
          {profile.heightCm ? `${profile.heightCm}` : '—'}
        </p>
        <p class="summary-label">Taille (cm)</p>
        <p class="sub">
          {profile.targetWeightKg ? `Obj. ${profile.targetWeightKg} kg` : 'Modifier profil'}
        </p>
      </button>

      <button
        type="button"
        class="summary-card"
        onclick={() => selectTarget('profil')}
      >
        <p class="summary-value">{bmi ?? '—'}</p>
        <p class="summary-label">IMC</p>
        <p class="sub">
          {#if bmi}
            Ratio poids/taille
          {:else}
            Poids + taille requis
          {/if}
        </p>
      </button>
    </section>

    <!-- Interactive Body Map Section -->
    <section class="body-map-section">
      <div class="section-head">
        <h2>Schéma corporel</h2>
        <p class="sub">Touchez une zone du corps ou un label pour mettre à jour sa mesure</p>
      </div>

      <div class="body-map-layout">
        <!-- Left Callout Buttons -->
        <div class="zone-col left">
          {#each leftZones as zone}
            {@const latest = getLatestZoneValue(zone.id)}
            <button
              type="button"
              class="zone-pill"
              class:selected={selectedTarget === zone.id}
              class:has-val={latest != null}
              onclick={() => selectTarget(zone.id)}
            >
              <span class="zone-pill-name">{zone.label}</span>
              <strong class="zone-pill-val">{latest != null ? `${latest} cm` : '—'}</strong>
            </button>
          {/each}
        </div>

        <!-- Center SVG Human Body Silhouette -->
        <div class="silhouette-wrap">
          <svg
            class="body-svg"
            viewBox="0 0 260 350"
            aria-label="Schéma du corps humain interactif"
          >
            <!-- Subtle Center Axis -->
            <line x1="130" y1="15" x2="130" y2="335" class="axis-line" />

            <!-- Athletic Human Silhouette Outline -->
            <g class="body-outline">
              <!-- Head -->
              <ellipse cx="130" cy="36" rx="16" ry="20" />
              <!-- Neck -->
              <path d="M121 54 L121 68 M139 54 L139 68" />
              <!-- Torso & Arms & Legs -->
              <path
                d="M121 68
                   C105 70, 86 74, 80 86
                   C73 98, 70 118, 67 138
                   C64 155, 60 172, 57 186
                   C55 193, 62 196, 66 190
                   C72 176, 77 160, 82 142
                   L94 110
                   C97 126, 102 142, 104 156
                   C105 168, 100 180, 99 194
                   C98 215, 101 242, 103 266
                   C104 285, 104 306, 106 326
                   C107 332, 117 332, 118 326
                   C121 306, 123 285, 124 266
                   L127 210
                   L130 210
                   L133 210
                   L136 266
                   C137 285, 139 306, 142 326
                   C143 332, 153 332, 154 326
                   C156 306, 156 285, 157 266
                   C159 242, 162 215, 161 194
                   C160 180, 155 168, 156 156
                   C158 142, 163 126, 166 110
                   L178 142
                   C183 160, 188 176, 194 190
                   C198 196, 205 193, 203 186
                   C200 172, 196 155, 193 138
                   C190 118, 187 98, 180 86
                   C174 74, 155 70, 139 68 Z"
              />
              <!-- Subtle Pectoral & Abdominal anatomical lines -->
              <path d="M100 108 Q115 115 128 110 M160 108 Q145 115 132 110" class="anat-detail" />
              <path d="M114 132 L146 132 M115 148 L145 148 M117 164 L143 164" class="anat-detail" />
            </g>

            <!-- Interactive Anatomical Measurement Bands & Hotspots -->
            {#each BODY_ZONES as zone}
              {@const isSelected = selectedTarget === zone.id}
              {@const hasVal = getLatestZoneValue(zone.id) != null}
              <g
                class="zone-hotspot"
                class:selected={isSelected}
                class:recorded={hasVal}
                role="button"
                tabindex="0"
                aria-label="Sélectionner {zone.fullName}"
                onclick={() => selectTarget(zone.id)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectTarget(zone.id)}
              >
                <!-- Invisible larger touch target for mobile fingers -->
                <ellipse
                  cx={zone.cx}
                  cy={zone.cy}
                  rx={Math.max(22, zone.rx + 6)}
                  ry="16"
                  fill="transparent"
                />

                <!-- Anatomical Measurement Ring -->
                <ellipse
                  class="zone-band"
                  cx={zone.cx}
                  cy={zone.cy}
                  rx={zone.rx}
                  ry={zone.ry}
                />

                {#if zone.mirrorX}
                  <ellipse
                    class="zone-band"
                    cx={zone.mirrorX}
                    cy={zone.cy}
                    rx={zone.rx}
                    ry={zone.ry}
                  />
                {/if}

                <!-- Center Interactive Node -->
                <circle class="zone-dot" cx={zone.cx} cy={zone.cy} r={isSelected ? 6 : 4.5} />
              </g>
            {/each}
          </svg>
        </div>

        <!-- Right Callout Buttons -->
        <div class="zone-col right">
          {#each rightZones as zone}
            {@const latest = getLatestZoneValue(zone.id)}
            <button
              type="button"
              class="zone-pill"
              class:selected={selectedTarget === zone.id}
              class:has-val={latest != null}
              onclick={() => selectTarget(zone.id)}
            >
              <span class="zone-pill-name">{zone.label}</span>
              <strong class="zone-pill-val">{latest != null ? `${latest} cm` : '—'}</strong>
            </button>
          {/each}
        </div>
      </div>
    </section>

    <!-- Active Selection Editor & Evolution -->
    <section class="editor-panel">
      {#if selectedTarget === 'profil'}
        <div class="editor-head">
          <h2>Profil morphologique</h2>
          <p class="sub">Renseignez votre taille et votre poids cible pour calculer votre IMC.</p>
        </div>

        <form class="profile-form" onsubmit={handleSaveProfile}>
          <div class="form-grid">
            <label class="field-box">
              <span>Taille (cm)</span>
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="100"
                max="250"
                placeholder="178"
                bind:value={heightInput}
              />
            </label>
            <label class="field-box">
              <span>Poids cible (kg · option)</span>
              <input
                type="number"
                inputmode="decimal"
                step="0.1"
                min="30"
                max="250"
                placeholder="75"
                bind:value={targetWeightInput}
              />
            </label>
          </div>
          <button type="submit" class="btn-save-body" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </form>
      {:else}
        {@const title = selectedTarget === 'poids' ? 'Poids de corps' : activeZoneMeta?.fullName}
        {@const unit = selectedTarget === 'poids' ? 'kg' : 'cm'}
        {@const latestVal = selectedTarget === 'poids' ? latestWeightObj?.weight : getLatestZoneValue(selectedTarget)}
        {@const totalDelta = selectedTarget === 'poids' ? weightDelta : getZoneDelta(selectedTarget)}

        <div class="editor-head">
          <div class="editor-title-row">
            <h2>{title}</h2>
            {#if latestVal != null}
              <span class="current-badge">
                {latestVal} {unit}
                {#if totalDelta !== null && totalDelta !== 0}
                  <small class="delta-tag">{totalDelta > 0 ? `+${totalDelta}` : totalDelta} {unit}</small>
                {/if}
              </span>
            {/if}
          </div>
          <p class="sub">Ajoutez une nouvelle mesure ou suivez votre courbe d’évolution.</p>
        </div>

        <form class="measure-form" onsubmit={handleSaveValue}>
          <div class="measure-inputs">
            <label class="field-box">
              <span>Mesure ({unit})</span>
              <input
                type="number"
                inputmode="decimal"
                step="0.1"
                min="10"
                max="300"
                placeholder={selectedTarget === 'poids' ? '75.0' : '38.5'}
                bind:value={inputValue}
                required
              />
            </label>
            <label class="field-box">
              <span>Date</span>
              <input type="date" bind:value={inputDate} required />
            </label>
          </div>
          <button type="submit" class="btn-save-body" disabled={saving}>
            {saving ? 'Enregistrement…' : `Enregistrer (${unit})`}
          </button>
        </form>

        {#if activeHistory.length > 0}
          <div class="chart-wrap">
            <canvas bind:this={chartCanvas}></canvas>
          </div>

          <div class="history-list">
            <h3>Historique ({activeHistory.length})</h3>
            <ul>
              {#each [...activeHistory].reverse().slice(0, 8) as entry}
                <li>
                  <span class="hist-date">{formatDateFR(entry.dateISO)}</span>
                  <div class="hist-right">
                    <strong>{entry.value} {entry.unit}</strong>
                    <button
                      type="button"
                      class="btn-del-entry"
                      onclick={() => handleDeleteEntry(entry)}
                      title="Supprimer cette entrée"
                      aria-label="Supprimer la mesure du {formatDateFR(entry.dateISO)}"
                    >
                      ×
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <p class="empty-zone">Aucune mesure enregistrée pour cette zone.</p>
        {/if}
      {/if}
    </section>

    <!-- Complete Measurements Recap Table -->
    <section class="recap-section">
      <h2>Toutes les mensurations</h2>
      <ul class="recap-list">
        <li>
          <button type="button" class="recap-row" onclick={() => selectTarget('poids')}>
            <span class="recap-name">Poids de corps</span>
            <span class="recap-val">
              {#if latestWeightObj}
                <strong>{latestWeightObj.weight} kg</strong>
                {#if weightDelta !== null && weightDelta !== 0}
                  <small class="recap-delta">{weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg</small>
                {/if}
              {:else}
                <small class="muted-dash">Non renseigné</small>
              {/if}
            </span>
          </button>
        </li>
        {#each BODY_ZONES as zone}
          {@const val = getLatestZoneValue(zone.id)}
          {@const delta = getZoneDelta(zone.id)}
          <li>
            <button type="button" class="recap-row" onclick={() => selectTarget(zone.id)}>
              <span class="recap-name">{zone.fullName}</span>
              <span class="recap-val">
                {#if val != null}
                  <strong>{val} cm</strong>
                  {#if delta !== null && delta !== 0}
                    <small class="recap-delta">{delta > 0 ? `+${delta}` : delta} cm</small>
                  {/if}
                {:else}
                  <small class="muted-dash">Non renseigné</small>
                {/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .corps {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 2rem;
  }

  .corps h1 {
    margin: 0.75rem 0 0;
  }

  .corps h2 {
    font-size: 1.05rem;
    margin: 0;
  }

  .sub {
    color: var(--text-muted);
    font-size: 0.78rem;
    margin: 0.2rem 0 0;
  }

  .status-banner {
    margin: 0;
    padding: 0.7rem 1rem;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    font-size: 0.86rem;
    font-weight: 600;
  }

  .status-banner.success {
    color: #238656;
    border-color: color-mix(in srgb, #238656 40%, transparent);
  }

  .status-banner.error {
    color: var(--destructive);
  }

  /* Summary 3 columns (matching Statistiques.svelte) */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
    padding: 0.5rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .summary-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .summary-card.active {
    border-color: var(--beige);
    background: color-mix(in srgb, #06375a 28%, var(--bg-card));
  }

  .summary-value {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.55rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-heading);
    line-height: 1.05;
    margin: 0 0 0.25rem;
  }

  .summary-label {
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  /* Body Map Section */
  .body-map-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .body-map-layout {
    display: grid;
    grid-template-columns: 1fr 135px 1fr;
    align-items: center;
    gap: 0.35rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1rem 0.5rem;
  }

  .zone-col {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .zone-pill {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.45rem 0.6rem;
    border-radius: 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    cursor: pointer;
    text-align: left;
    min-height: 46px;
    transition: border-color 0.15s, background 0.15s;
  }

  .zone-col.right .zone-pill {
    align-items: flex-end;
    text-align: right;
  }

  .zone-pill.has-val {
    border-color: color-mix(in srgb, #06375a 70%, var(--border));
  }

  .zone-pill.selected {
    background: #06375a;
    border-color: var(--beige);
  }

  .zone-pill-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    line-height: 1.1;
  }

  .zone-pill.selected .zone-pill-name {
    color: var(--beige);
  }

  .zone-pill-val {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
    margin-top: 0.15rem;
  }

  .silhouette-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .body-svg {
    width: 100%;
    max-width: 145px;
    height: auto;
    overflow: visible;
  }

  .axis-line {
    stroke: rgba(247, 245, 242, 0.06);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  .body-outline {
    fill: rgba(6, 55, 90, 0.16);
    stroke: rgba(232, 220, 207, 0.38);
    stroke-width: 1.8;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .anat-detail {
    fill: none;
    stroke: rgba(232, 220, 207, 0.16);
    stroke-width: 1.2;
  }

  .zone-hotspot {
    cursor: pointer;
    outline: none;
  }

  .zone-band {
    fill: transparent;
    stroke: rgba(232, 220, 207, 0.25);
    stroke-width: 1.5;
    stroke-dasharray: 3 2;
    transition: all 0.2s ease;
  }

  .zone-hotspot.recorded .zone-band {
    stroke: #06375a;
    fill: rgba(6, 55, 90, 0.35);
    stroke-dasharray: none;
    stroke-width: 2;
  }

  .zone-hotspot.selected .zone-band {
    stroke: var(--pink);
    fill: rgba(230, 166, 178, 0.28);
    stroke-dasharray: none;
    stroke-width: 2.5;
  }

  .zone-dot {
    fill: var(--bg-card);
    stroke: var(--beige);
    stroke-width: 1.8;
    transition: all 0.2s ease;
  }

  .zone-hotspot.recorded .zone-dot {
    fill: #06375a;
    stroke: var(--beige);
  }

  .zone-hotspot.selected .zone-dot {
    fill: var(--pink);
    stroke: #f7f5f2;
  }

  /* Editor & Evolution Panel */
  .editor-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .editor-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .current-badge {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--beige);
    background: color-mix(in srgb, #06375a 55%, var(--bg));
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .delta-tag {
    font-size: 0.75rem;
    color: var(--pink);
    font-weight: 600;
  }

  .measure-form,
  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .measure-inputs,
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
  }

  .field-box {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field-box span {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .field-box input {
    min-height: 44px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
  }

  .btn-save-body {
    width: 100%;
    min-height: 50px;
    border-radius: 12px;
    background: #06375a;
    color: #f7f5f2;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
    box-shadow: none;
  }

  .btn-save-body:active {
    background: color-mix(in srgb, #06375a 80%, black);
    transform: scale(0.99);
  }

  .btn-save-body:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chart-wrap {
    position: relative;
    height: 190px;
    width: 100%;
    margin-top: 0.25rem;
  }

  .history-list h3 {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin: 0 0 0.4rem;
  }

  .history-list ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .history-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }

  .history-list li:last-child {
    border-bottom: none;
  }

  .hist-date {
    color: var(--text-muted);
    text-transform: capitalize;
  }

  .hist-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .hist-right strong {
    font-family: 'Montserrat', sans-serif;
    font-variant-numeric: tabular-nums;
    color: var(--text-heading);
  }

  .btn-del-entry {
    min-height: 28px;
    min-width: 28px;
    padding: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }

  .btn-del-entry:hover {
    color: var(--destructive);
    border-color: var(--destructive);
  }

  .empty-zone {
    margin: 0.25rem 0 0;
    font-size: 0.84rem;
    color: var(--text-muted);
    text-align: center;
  }

  /* Recap List (matching Records in Statistiques.svelte) */
  .recap-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recap-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .recap-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.7rem 0.15rem;
    border-bottom: 1px solid var(--border);
    background: transparent;
    border-radius: 0;
    text-align: left;
    cursor: pointer;
  }

  .recap-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text);
  }

  .recap-val {
    font-family: 'Montserrat', sans-serif;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: baseline;
    gap: 0.45rem;
    flex-shrink: 0;
  }

  .recap-val strong {
    font-size: 0.95rem;
    color: var(--text-heading);
  }

  .recap-delta {
    font-size: 0.75rem;
    color: var(--beige);
    font-weight: 600;
  }

  .muted-dash {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 400;
  }
</style>
