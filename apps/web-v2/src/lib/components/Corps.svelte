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

  // Valeurs initiales du fichier AthleteProfil
  const DEFAULT_PROFILE = {
    age: 16,
    heightCm: 193,
    targetWeightKg: 88,
    targetWeightRange: '85–90 kg',
    wingspanCm: 195,
    legLengthCm: 95,
    armLengthCm: 52,
    armLengthWithShoulderCm: 64,
  };

  const DEFAULT_MEASUREMENTS = [
    { id: 'init-cou', dateISO: todayISO(), type: 'cou', value: 37 },
    { id: 'init-poitrine', dateISO: todayISO(), type: 'poitrine', value: 96 },
    { id: 'init-taille', dateISO: todayISO(), type: 'taille', value: 79 },
    { id: 'init-bras', dateISO: todayISO(), type: 'bras', value: 37 },
    { id: 'init-bras-repos', dateISO: todayISO(), type: 'bras_repos', value: 32 },
    { id: 'init-cuisses', dateISO: todayISO(), type: 'cuisses', value: 59 },
  ];

  const DEFAULT_CHECKINS = [
    { id: 'init-weight', dateISO: todayISO(), weight: 83, notes: 'Profil initial' },
  ];

  // Coordonnées géométriques exactes sur le canevas SVG (380 × 400, axe central X = 190)
  const BODY_ZONES = [
    {
      id: 'cou',
      label: 'COU',
      fullName: 'Tour de cou',
      unit: 'cm',
      side: 'left',
      ax: 181,
      ay: 72,
      bandCx: 190,
      bandRx: 10,
      bandRy: 3.5,
    },
    {
      id: 'poitrine',
      label: 'POITRINE',
      fullName: 'Tour de poitrine',
      unit: 'cm',
      side: 'left',
      ax: 158,
      ay: 114,
      bandCx: 190,
      bandRx: 32,
      bandRy: 7,
    },
    {
      id: 'bras_repos',
      label: 'BRAS REPOS',
      fullName: 'Tour de bras au repos',
      unit: 'cm',
      side: 'left',
      ax: 135,
      ay: 148,
      bandCx: 135,
      bandRx: 9,
      bandRy: 4.5,
    },
    {
      id: 'taille',
      label: 'TAILLE',
      fullName: 'Tour de taille',
      unit: 'cm',
      side: 'left',
      ax: 166,
      ay: 182,
      bandCx: 190,
      bandRx: 24,
      bandRy: 5.5,
    },
    {
      id: 'hanches',
      label: 'HANCHES',
      fullName: 'Tour de hanches',
      unit: 'cm',
      side: 'left',
      ax: 160,
      ay: 216,
      bandCx: 190,
      bandRx: 30,
      bandRy: 6.5,
    },
    {
      id: 'epaules',
      label: 'ÉPAULES',
      fullName: 'Tour d’épaules',
      unit: 'cm',
      side: 'right',
      ax: 236,
      ay: 90,
      bandCx: 190,
      bandRx: 46,
      bandRy: 7.5,
    },
    {
      id: 'bras',
      label: 'BRAS CONTR.',
      fullName: 'Tour de bras contracté',
      unit: 'cm',
      side: 'right',
      ax: 244,
      ay: 134,
      bandCx: 244,
      bandRx: 9.5,
      bandRy: 5,
    },
    {
      id: 'avant_bras',
      label: 'AVANT-BRAS',
      fullName: 'Tour d’avant-bras',
      unit: 'cm',
      side: 'right',
      ax: 254,
      ay: 178,
      bandCx: 254,
      bandRx: 7.5,
      bandRy: 4,
    },
    {
      id: 'cuisses',
      label: 'CUISSES',
      fullName: 'Tour de cuisse',
      unit: 'cm',
      side: 'right',
      ax: 210,
      ay: 262,
      bandCx: 207,
      bandRx: 14,
      bandRy: 6,
    },
    {
      id: 'mollets',
      label: 'MOLLETS',
      fullName: 'Tour de mollet',
      unit: 'cm',
      side: 'right',
      ax: 208,
      ay: 334,
      bandCx: 207,
      bandRx: 9.5,
      bandRy: 4.5,
    },
  ];

  let loading = $state(true);
  let saving = $state(false);
  let statusMsg = $state('');
  let statusType = $state('info');

  let profile = $state({ ...DEFAULT_PROFILE });
  let checkIns = $state([...DEFAULT_CHECKINS]);
  let measurements = $state([...DEFAULT_MEASUREMENTS]);

  // Active selection: 'poids' | 'profil' | zone.id
  let selectedTarget = $state('poitrine');

  // Form inputs
  let inputValue = $state('96');
  let inputDate = $state(todayISO());
  let heightInput = $state('193');
  let targetWeightInput = $state('88');
  let wingspanInput = $state('195');
  let legLengthInput = $state('95');
  let armLengthInput = $state('52');

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
      profile = { ...DEFAULT_PROFILE, ...(data.profile || {}) };
      checkIns = data.checkIns?.length ? data.checkIns : [...DEFAULT_CHECKINS];
      measurements = data.measurements?.length ? data.measurements : [...DEFAULT_MEASUREMENTS];
      heightInput = profile.heightCm ? String(profile.heightCm) : '193';
      targetWeightInput = profile.targetWeightKg ? String(profile.targetWeightKg) : '88';
      wingspanInput = profile.wingspanCm ? String(profile.wingspanCm) : '195';
      legLengthInput = profile.legLengthCm ? String(profile.legLengthCm) : '95';
      armLengthInput = profile.armLengthCm ? String(profile.armLengthCm) : '52';
      syncInputForSelection(selectedTarget);
      await tick();
      renderChart();
    } catch (err) {
      console.warn('Erreur chargement données corps:', err);
      syncInputForSelection(selectedTarget);
    } finally {
      loading = false;
    }
  }

  let latestWeightObj = $derived(
    checkIns.length > 0 ? checkIns[checkIns.length - 1] : { weight: 83, dateISO: todayISO() },
  );
  let previousWeightObj = $derived(
    checkIns.length > 1 ? checkIns[checkIns.length - 2] : null,
  );
  let weightDelta = $derived.by(() => {
    if (!latestWeightObj || !previousWeightObj) return null;
    return Math.round((latestWeightObj.weight - previousWeightObj.weight) * 10) / 10;
  });

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
      wingspanInput = profile.wingspanCm ? String(profile.wingspanCm) : '';
      legLengthInput = profile.legLengthCm ? String(profile.legLengthCm) : '';
      armLengthInput = profile.armLengthCm ? String(profile.armLengthCm) : '';
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
      notify('Valeur invalide.', 'error');
      return;
    }

    saving = true;
    try {
      if (selectedTarget === 'poids') {
        await saveBodyWeight(val, inputDate);
        notify(`Poids mis à jour (${val} kg).`);
      } else if (activeZoneMeta) {
        await saveBodyMeasurement(activeZoneMeta.id, val, inputDate);
        notify(`${activeZoneMeta.fullName} mis à jour (${val} cm).`);
      }
      await loadAll();
    } catch (err) {
      notify(err?.message || 'Erreur de sauvegarde.', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (saving) return;

    const h = heightInput ? parseFloat(String(heightInput).replace(',', '.')) : null;
    const tw = targetWeightInput ? parseFloat(String(targetWeightInput).replace(',', '.')) : null;
    const wSpan = wingspanInput ? parseFloat(String(wingspanInput).replace(',', '.')) : null;
    const legL = legLengthInput ? parseFloat(String(legLengthInput).replace(',', '.')) : null;
    const armL = armLengthInput ? parseFloat(String(armLengthInput).replace(',', '.')) : null;

    saving = true;
    try {
      await saveBodyProfile({
        heightCm: h,
        targetWeightKg: tw,
        wingspanCm: wSpan,
        legLengthCm: legL,
        armLengthCm: armL,
      });
      notify('Profil mis à jour.');
      await loadAll();
    } catch (err) {
      notify(err?.message || 'Erreur de sauvegarde.', 'error');
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
    if (hist.length < 2) return;

    const isWeight = selectedTarget === 'poids';
    const lineColor = isWeight ? '#e6a6b2' : '#06375a';
    const pointBorder = isWeight ? '#e6a6b2' : '#e8dccf';
    const fillBg = isWeight ? 'rgba(230, 166, 178, 0.14)' : 'rgba(6, 55, 90, 0.3)';

    evolutionChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: hist.map((d) => d.dateISO.slice(5)),
        datasets: [
          {
            label: isWeight ? 'Poids (kg)' : `${activeZoneMeta?.label || ''} (cm)`,
            data: hist.map((d) => d.value),
            borderColor: lineColor,
            borderWidth: 2,
            backgroundColor: fillBg,
            fill: true,
            tension: 0.3,
            pointRadius: 3.5,
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
            ticks: { color: 'rgba(247, 245, 242, 0.5)' },
            grid: { display: false },
          },
          y: {
            ticks: { color: 'rgba(247, 245, 242, 0.5)' },
            grid: { color: 'rgba(128, 128, 128, 0.12)' },
          },
        },
      },
    });
  }
</script>

<div class="corps">
  <h1>Corps</h1>

  {#if statusMsg}
    <p class="status-line {statusType}" role="status">{statusMsg}</p>
  {/if}

  {#if loading}
    <div class="loading-screen">
      <span class="spinner" aria-hidden="true"></span>
      <p>Chargement…</p>
    </div>
  {:else}
    <!-- Minimalist Borderless Summary (identical rhythm to Statistiques.svelte) -->
    <section class="summary" aria-label="Constantes">
      <button
        type="button"
        class="summary-item"
        class:active={selectedTarget === 'poids'}
        onclick={() => selectTarget('poids')}
      >
        <p class="summary-value">{latestWeightObj ? latestWeightObj.weight : '—'}</p>
        <p class="summary-label">Poids (kg)</p>
        <p class="sub">
          {#if weightDelta !== null && weightDelta !== 0}
            {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
          {:else}
            Obj. {profile.targetWeightRange || `${profile.targetWeightKg} kg`}
          {/if}
        </p>
      </button>

      <button
        type="button"
        class="summary-item"
        class:active={selectedTarget === 'profil'}
        onclick={() => selectTarget('profil')}
      >
        <p class="summary-value">{profile.heightCm ?? '—'}</p>
        <p class="summary-label">Taille (cm)</p>
        <p class="sub">Env. {profile.wingspanCm ?? 195} cm</p>
      </button>

      <button
        type="button"
        class="summary-item"
        onclick={() => selectTarget('profil')}
      >
        <p class="summary-value">{bmi ?? '—'}</p>
        <p class="summary-label">IMC</p>
        <p class="sub">{profile.legLengthCm ?? 95} · {profile.armLengthCm ?? 52} cm</p>
      </button>
    </section>

    <!-- Pure Geometric Compass Diagram (zero cards, zero borders) -->
    <section class="compass-section" aria-label="Schéma anatomique">
      <svg
        class="compass-svg"
        viewBox="0 0 380 390"
        aria-label="Schéma corporel géométrique interactif"
      >
        <!-- Compass / Vitruvian Construction Geometry -->
        <g class="compass-guides" aria-hidden="true">
          <!-- Outer Vitruvian Circle -->
          <circle cx="190" cy="195" r="156" class="guide-circle" />
          <!-- Inner Torso Proportion Circle -->
          <circle cx="190" cy="148" r="64" class="guide-circle-inner" />
          <!-- Vertical Symmetry Axis -->
          <line x1="190" y1="16" x2="190" y2="376" class="guide-axis" />
          <!-- Horizontal Datum Ticks -->
          <line x1="184" y1="24" x2="196" y2="24" class="guide-tick" />
          <line x1="176" y1="195" x2="204" y2="195" class="guide-tick" />
          <line x1="184" y1="366" x2="196" y2="366" class="guide-tick" />
        </g>

        <!-- Athletic Human Silhouette (centered at X = 190) -->
        <g class="silhouette" aria-hidden="true">
          <!-- Head -->
          <ellipse cx="190" cy="44" rx="15.5" ry="20" />
          <!-- Neck -->
          <path d="M181 62 L181 76 M199 62 L199 76" />
          <!-- Body Contour -->
          <path
            d="M181 76
               C165 78, 146 82, 140 93
               C133 105, 130 124, 127 144
               C124 162, 120 179, 117 193
               C115 200, 122 203, 126 197
               C132 183, 137 167, 142 149
               L154 116
               C157 132, 162 149, 165 168
               C166 180, 160 194, 159 212
               C158 234, 161 262, 163 288
               C164 310, 164 332, 166 354
               C167 360, 177 360, 178 354
               C181 332, 183 310, 184 288
               L187 224
               L193 224
               L196 288
               C197 310, 199 332, 202 354
               C203 360, 213 360, 214 354
               C216 332, 216 310, 217 288
               C219 262, 222 234, 221 212
               C220 194, 214 180, 215 168
               C218 149, 223 132, 226 116
               L238 149
               C243 167, 248 183, 254 197
               C258 203, 265 200, 263 193
               C260 179, 256 162, 253 144
               C250 124, 247 105, 240 93
               C234 82, 215 78, 199 76 Z"
          />
          <!-- Internal Anatomical Lines -->
          <path d="M160 115 Q175 121 188 116 M220 115 Q205 121 192 116" class="anat-line" />
          <path d="M174 142 L206 142 M175 160 L205 160 M177 178 L203 178" class="anat-line" />
        </g>

        <!-- Geometric Horizontal Callouts & Anatomical Rings -->
        {#each BODY_ZONES as zone}
          {@const isSelected = selectedTarget === zone.id}
          {@const val = getLatestZoneValue(zone.id)}
          {@const hasVal = val != null}
          {@const isLeft = zone.side === 'left'}
          {@const edgeX = isLeft ? 4 : 376}

          <g
            class="callout-group"
            class:selected={isSelected}
            class:recorded={hasVal}
            role="button"
            tabindex="0"
            aria-label="{zone.fullName} : {hasVal ? `${val} cm` : 'non renseigné'}"
            onclick={() => selectTarget(zone.id)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectTarget(zone.id)}
          >
            <!-- Generous Invisible Touch Hitbox across label + line + body point -->
            <rect
              x={isLeft ? 0 : zone.ax - 12}
              y={zone.ay - 19}
              width={isLeft ? zone.ax + 12 : 380 - zone.ax + 12}
              height="38"
              fill="transparent"
            />

            <!-- Anatomical Elliptical Section on Body -->
            <ellipse
              class="anat-band"
              cx={zone.bandCx}
              cy={zone.ay}
              rx={zone.bandRx}
              ry={zone.bandRy}
            />

            <!-- Pure Horizontal Leader Line (Ligne de cote) -->
            <line
              class="leader-line"
              x1={edgeX}
              y1={zone.ay}
              x2={zone.ax}
              y2={zone.ay}
            />

            <!-- Outer Margin Tick -->
            <line
              class="leader-tick"
              x1={edgeX}
              y1={zone.ay - 3.5}
              x2={edgeX}
              y2={zone.ay + 3.5}
            />

            <!-- Anchor Point on Body -->
            <circle
              class="anchor-dot"
              cx={zone.ax}
              cy={zone.ay}
              r={isSelected ? 4.5 : 3}
            />

            <!-- Label above line -->
            <text
              class="callout-label"
              x={isLeft ? 10 : 370}
              y={zone.ay - 6}
              text-anchor={isLeft ? 'start' : 'end'}
            >
              {zone.label}
            </text>

            <!-- Value below line -->
            <text
              class="callout-val"
              x={isLeft ? 10 : 370}
              y={zone.ay + 14}
              text-anchor={isLeft ? 'start' : 'end'}
            >
              {hasVal ? `${val} cm` : '—'}
            </text>
          </g>
        {/each}
      </svg>
    </section>

    <!-- Minimalist Borderless Inline Editor -->
    <section class="editor-section">
      {#if selectedTarget === 'profil'}
        <div class="editor-header">
          <h2>Profil & Segments</h2>
          <span class="editor-meta">Athlete Profile</span>
        </div>

        <form class="clean-form" onsubmit={handleSaveProfile}>
          <div class="clean-inputs three">
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="100"
                max="250"
                bind:value={heightInput}
              />
              <span>taille (cm)</span>
            </label>
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="100"
                max="270"
                bind:value={wingspanInput}
              />
              <span>envergure (cm)</span>
            </label>
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="30"
                max="250"
                bind:value={targetWeightInput}
              />
              <span>cible (kg)</span>
            </label>
          </div>

          <div class="clean-inputs two">
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="40"
                max="150"
                bind:value={legLengthInput}
              />
              <span>jambes (cm)</span>
            </label>
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.5"
                min="25"
                max="110"
                bind:value={armLengthInput}
              />
              <span>bras (cm)</span>
            </label>
          </div>

          <button type="submit" class="btn-action" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Mettre à jour le profil'}
          </button>
        </form>
      {:else}
        {@const title = selectedTarget === 'poids' ? 'Poids de corps' : activeZoneMeta?.fullName}
        {@const unit = selectedTarget === 'poids' ? 'kg' : 'cm'}
        {@const latestVal = selectedTarget === 'poids' ? latestWeightObj?.weight : getLatestZoneValue(selectedTarget)}
        {@const totalDelta = selectedTarget === 'poids' ? weightDelta : getZoneDelta(selectedTarget)}

        <div class="editor-header">
          <h2>{title}</h2>
          <span class="editor-meta">
            {#if latestVal != null}
              {latestVal} {unit}
              {#if totalDelta !== null && totalDelta !== 0}
                · {totalDelta > 0 ? `+${totalDelta}` : totalDelta} {unit}
              {/if}
            {:else}
              Non mesuré
            {/if}
          </span>
        </div>

        <form class="clean-form" onsubmit={handleSaveValue}>
          <div class="clean-inputs two">
            <label class="clean-field">
              <input
                type="number"
                inputmode="decimal"
                step="0.1"
                min="10"
                max="300"
                placeholder="0"
                bind:value={inputValue}
                required
              />
              <span>{unit}</span>
            </label>
            <label class="clean-field date-field">
              <input type="date" bind:value={inputDate} required />
              <span>date</span>
            </label>
          </div>

          <button type="submit" class="btn-action" disabled={saving}>
            {saving ? 'Enregistrement…' : `Enregistrer · ${title}`}
          </button>
        </form>

        {#if activeHistory.length >= 2}
          <div class="chart-wrap">
            <canvas bind:this={chartCanvas}></canvas>
          </div>
        {/if}

        {#if activeHistory.length > 0}
          <details class="clean-group">
            <summary>
              <span>Historique · {title}</span>
              <span class="sub">{activeHistory.length}</span>
            </summary>
            <ul class="clean-list">
              {#each [...activeHistory].reverse().slice(0, 10) as entry}
                <li>
                  <span class="row-label">{formatDateFR(entry.dateISO)}</span>
                  <span class="row-right">
                    <strong>{entry.value} {entry.unit}</strong>
                    {#if !String(entry.id).startsWith('init-')}
                      <button
                        type="button"
                        class="btn-del"
                        onclick={() => handleDeleteEntry(entry)}
                        aria-label="Supprimer"
                      >
                        ×
                      </button>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          </details>
        {/if}
      {/if}
    </section>

    <!-- Collapsible Anthropometry & Measurements (matching Records in Statistiques.svelte) -->
    <section class="lists-section">
      <details class="clean-group" open>
        <summary>
          <span>Anthropométrie fixe</span>
          <span class="sub">5</span>
        </summary>
        <ul class="clean-list">
          <li>
            <span class="row-label">Taille</span>
            <span class="row-val">{profile.heightCm ?? 193} cm</span>
          </li>
          <li>
            <span class="row-label">Envergure</span>
            <span class="row-val">{profile.wingspanCm ?? 195} cm <span class="sub">· +{(profile.wingspanCm ?? 195) - (profile.heightCm ?? 193)} cm</span></span>
          </li>
          <li>
            <span class="row-label">Longueur de jambes</span>
            <span class="row-val">{profile.legLengthCm ?? 95} cm</span>
          </li>
          <li>
            <span class="row-label">Longueur de bras</span>
            <span class="row-val">{profile.armLengthCm ?? 52} cm <span class="sub">· {profile.armLengthWithShoulderCm ?? 64} cm av. épaule</span></span>
          </li>
          <li>
            <span class="row-label">Objectif poids long terme</span>
            <span class="row-val">{profile.targetWeightRange || `${profile.targetWeightKg ?? 88} kg`}</span>
          </li>
        </ul>
      </details>

      <details class="clean-group">
        <summary>
          <span>Toutes les mensurations</span>
          <span class="sub">{BODY_ZONES.length}</span>
        </summary>
        <ul class="clean-list">
          {#each BODY_ZONES as zone}
            {@const val = getLatestZoneValue(zone.id)}
            {@const delta = getZoneDelta(zone.id)}
            <li>
              <button type="button" class="list-btn-row" onclick={() => selectTarget(zone.id)}>
                <span class="row-label">{zone.fullName}</span>
                <span class="row-val">
                  {#if val != null}
                    {val} cm
                    {#if delta !== null && delta !== 0}
                      <span class="sub">· {delta > 0 ? `+${delta}` : delta}</span>
                    {/if}
                  {:else}
                    <span class="sub">—</span>
                  {/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </details>
    </section>
  {/if}
</div>

<style>
  .corps {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
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
    font-size: 0.78rem;
    color: var(--text-muted);
    margin: 0;
    font-weight: 400;
  }

  .status-line {
    margin: -0.5rem 0 0;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
    font-weight: 600;
    color: #238656;
  }

  .status-line.error {
    color: var(--destructive);
  }

  /* === Minimalist Borderless Summary (same as Statistiques.svelte) === */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0.9rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .summary-item {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0.15rem 0;
    min-height: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    cursor: pointer;
    position: relative;
  }

  .summary-item p {
    margin: 0;
  }

  .summary-item.active .summary-value {
    color: var(--beige);
  }

  .summary-value {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
    transition: color 0.15s ease;
  }

  .summary-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin: 0.2rem 0 0.15rem !important;
    font-weight: 600;
  }

  /* === Geometric Compass Body Diagram (Borderless) === */
  .compass-section {
    width: 100%;
    padding: 0.25rem 0;
  }

  .compass-svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
    user-select: none;
    -webkit-user-select: none;
  }

  .guide-circle {
    fill: none;
    stroke: rgba(232, 220, 207, 0.06);
    stroke-width: 1;
  }

  .guide-circle-inner {
    fill: none;
    stroke: rgba(6, 55, 90, 0.28);
    stroke-width: 1;
    stroke-dasharray: 2 4;
  }

  .guide-axis {
    stroke: rgba(232, 220, 207, 0.08);
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }

  .guide-tick {
    stroke: rgba(232, 220, 207, 0.18);
    stroke-width: 1;
  }

  .silhouette {
    fill: rgba(6, 55, 90, 0.18);
    stroke: rgba(232, 220, 207, 0.42);
    stroke-width: 1.4;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .anat-line {
    fill: none;
    stroke: rgba(232, 220, 207, 0.14);
    stroke-width: 1;
  }

  .callout-group {
    cursor: pointer;
    outline: none;
  }

  .anat-band {
    fill: transparent;
    stroke: transparent;
    stroke-width: 1.2;
    transition: all 0.18s ease;
  }

  .callout-group.recorded .anat-band {
    stroke: rgba(6, 55, 90, 0.7);
    fill: rgba(6, 55, 90, 0.22);
  }

  .callout-group.selected .anat-band {
    stroke: var(--beige);
    fill: rgba(232, 220, 207, 0.18);
    stroke-width: 1.6;
  }

  .leader-line {
    stroke: rgba(247, 245, 242, 0.14);
    stroke-width: 1;
    transition: stroke 0.18s ease, stroke-width 0.18s ease;
  }

  .callout-group.recorded .leader-line {
    stroke: rgba(232, 220, 207, 0.26);
  }

  .callout-group.selected .leader-line {
    stroke: var(--beige);
    stroke-width: 1.4;
  }

  .leader-tick {
    stroke: rgba(247, 245, 242, 0.22);
    stroke-width: 1;
  }

  .callout-group.selected .leader-tick {
    stroke: var(--beige);
    stroke-width: 1.5;
  }

  .anchor-dot {
    fill: var(--bg);
    stroke: rgba(232, 220, 207, 0.45);
    stroke-width: 1.4;
    transition: all 0.18s ease;
  }

  .callout-group.recorded .anchor-dot {
    fill: #06375a;
    stroke: var(--beige);
  }

  .callout-group.selected .anchor-dot {
    fill: var(--beige);
    stroke: #06375a;
  }

  .callout-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.12em;
    fill: rgba(247, 245, 242, 0.48);
    transition: fill 0.15s ease;
  }

  .callout-group.selected .callout-label {
    fill: var(--beige);
    font-weight: 700;
  }

  .callout-val {
    font-family: 'Montserrat', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    fill: rgba(247, 245, 242, 0.35);
    font-variant-numeric: tabular-nums;
    transition: fill 0.15s ease;
  }

  .callout-group.recorded .callout-val {
    fill: var(--text-heading);
  }

  .callout-group.selected .callout-val {
    fill: var(--beige);
  }

  /* === Minimalist Borderless Editor (matching SeanceDuJour w-field) === */
  .editor-section {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
  }

  .editor-meta {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--beige);
    font-variant-numeric: tabular-nums;
  }

  .clean-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .clean-inputs {
    display: grid;
    gap: 1rem;
  }

  .clean-inputs.two {
    grid-template-columns: 1fr 1fr;
  }

  .clean-inputs.three {
    grid-template-columns: repeat(3, 1fr);
  }

  .clean-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0 0.5rem;
    border-bottom: 1.5px solid var(--border);
    transition: border-color 0.15s ease;
  }

  .clean-field:focus-within {
    border-color: var(--beige);
  }

  .clean-field input {
    width: 100%;
    min-height: 40px;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-heading);
    box-shadow: none;
  }

  .clean-field.date-field input {
    font-size: 0.92rem;
    font-weight: 600;
  }

  .clean-field input:focus {
    outline: none;
    box-shadow: none;
  }

  .clean-field span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-top: 0.2rem;
    font-weight: 600;
  }

  .btn-action {
    width: 100%;
    min-height: 52px;
    border-radius: 12px;
    background: #06375a;
    color: #f7f5f2;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    border: none;
    box-shadow: none;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .btn-action:active {
    background: color-mix(in srgb, #06375a 80%, black);
    transform: scale(0.99);
  }

  .btn-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chart-wrap {
    position: relative;
    height: 185px;
    width: 100%;
    margin-top: 0.25rem;
  }

  /* === Flat Lists & Accordions (matching Statistiques.svelte) === */
  .lists-section {
    display: flex;
    flex-direction: column;
  }

  .clean-group summary {
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

  .clean-group summary::-webkit-details-marker {
    display: none;
  }

  .clean-group[open] summary {
    color: var(--beige);
  }

  .clean-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .clean-list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.72rem 0.15rem;
    border-bottom: 1px solid var(--border);
  }

  .list-btn-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0;
    min-height: auto;
    background: transparent;
    border: none;
    border-radius: 0;
    text-align: left;
    cursor: pointer;
  }

  .row-label {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text);
  }

  .row-val,
  .row-right {
    flex-shrink: 0;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-del {
    min-height: auto;
    min-width: auto;
    padding: 0 0.35rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.05rem;
    cursor: pointer;
  }

  .btn-del:hover {
    color: var(--destructive);
  }
</style>
