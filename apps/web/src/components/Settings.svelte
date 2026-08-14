<script>
  import {
    getSettings,
    updateSettings,
    replacePlannedSessions,
    syncPlannedWithCompleted,
    exportAll,
    importAll,
    markMissedSessions,
    resetAllData,
    RESET_CONFIRMATION_PHRASE,
  } from '../lib/db.js';
  import {
    parseProgramme,
    generatePlannedSessions,
    todayISO,
  } from '../lib/programme.js';
  import { applyTheme } from '../lib/theme.js';
  import { importer } from '../import/importer';
  import { exportDatabaseV3, generateEncryptedExport } from '../export/exporter';
  import { restoreDatabaseV3 } from '../export/restore';
  import SyncPanel from './SyncPanel.svelte';

  let {
    onSettingsChanged = () => {},
    onImportDone = () => {},
    onAppReset = () => {},
  } = $props();

  let settings = $state(null);
  let startDate = $state('');
  let theme = $state('dark');
  let message = $state('');
  let importInput = $state(null);

  let showResetPanel = $state(false);
  let resetInput = $state('');
  let resetting = $state(false);
  let migrationReport = $state(null);

  $effect(() => {
    loadSettings();
  });

  async function loadSettings() {
    settings = await getSettings();
    startDate = settings.programStartDate ?? todayISO();
    theme = settings.theme ?? 'dark';
  }

  async function saveStartDate() {
    if (!startDate) return;

    const existing = settings?.programStartDate;
    if (existing && existing !== startDate) {
      if (!confirm('Changer la date de début regénère le calendrier prévisionnel. Continuer ?')) {
        startDate = existing;
        return;
      }
    }

    await updateSettings({ programStartDate: startDate });
    const programme = parseProgramme();
    const planned = generatePlannedSessions(startDate, programme);
    await replacePlannedSessions(planned);
    await syncPlannedWithCompleted();
    await markMissedSessions(todayISO());

    settings = await getSettings();
    message = 'Date de début enregistrée et calendrier regénéré.';
    onSettingsChanged();
  }

  async function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme });
    applyTheme(theme);
    settings = await getSettings();
    onSettingsChanged();
  }

  async function handleExportLegacy() {
    const data = await exportAll();
    downloadJson(data, `appmuscu-legacy-backup-${todayISO()}.json`);
    message = 'Export Legacy téléchargé.';
  }

  async function handleExportV3Clear() {
    const data = await exportDatabaseV3();
    downloadJson(data, `appmuscu-v3-backup-${todayISO()}.json`);
    message = 'Export V3 téléchargé.';
  }

  async function handleExportV3Encrypted() {
    const pwd = prompt('Entrez un mot de passe pour chiffrer la sauvegarde :');
    if (!pwd) return;
    
    try {
      message = 'Chiffrement en cours...';
      const data = await generateEncryptedExport(pwd);
      downloadJson(data, `appmuscu-v3-secure-${todayISO()}.json`);
      message = 'Export chiffré téléchargé.';
    } catch(err) {
      message = `Erreur de chiffrement : ${err.message}`;
    }
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("L'import remplace toutes vos données locales. Continuer ?")) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.version === 3) {
        // C'est une sauvegarde V3
        let pwd = undefined;
        if (data.isEncrypted) {
          pwd = prompt('Cette sauvegarde est chiffrée. Entrez le mot de passe :');
          if (!pwd) {
            event.target.value = '';
            return;
          }
        }
        
        const result = await restoreDatabaseV3(data, pwd);
        message = result.message;
        if (result.success) {
           onImportDone();
        }
      } else {
        // Legacy import
        await importAll(data);
        migrationReport = await importer.commit(text);
        
        if (migrationReport.status === 'success') {
           message = `Import legacy réussi et migration V3 effectuée (${migrationReport.counts.workoutSessions} séances migrées).`;
        } else {
           message = `Import legacy réussi mais échec migration V3 : ${migrationReport.errors.join(', ')}`;
        }
        onImportDone();
      }
      
      settings = await getSettings();
      startDate = settings.programStartDate ?? todayISO();
      theme = settings.theme ?? 'dark';
      applyTheme(theme);
      
    } catch (err) {
      message = `Erreur : ${err.message}`;
    }

    event.target.value = '';
  }

  function openResetPanel() {
    showResetPanel = true;
    resetInput = '';
    message = '';
  }

  function cancelReset() {
    showResetPanel = false;
    resetInput = '';
  }

  let resetConfirmed = $derived(resetInput.trim() === RESET_CONFIRMATION_PHRASE);

  async function executeReset() {
    if (!resetConfirmed || resetting) return;
    resetting = true;

    try {
      await resetAllData();
      showResetPanel = false;
      resetInput = '';
    } finally {
      resetting = false;
    }
  }

  let diagnostics = $state(null);

  async function checkDiagnostics() {
    const { db } = await import('../db/database');
    
    const legacy = {
      sessions: await db.sessions.count(),
      sets: await db.sets.count(),
      planned: await db.plannedSessions.count(),
      vacations: await db.vacations.count(),
    };
    
    const v3 = {
      workoutSessions: await db.workoutSessions.count(),
      performedSets: await db.performedSets.count(),
      plannedWorkouts: await db.plannedWorkouts.count(),
      vacations: await db.vacationsV3.count(),
      exercises: await db.exercises.count(),
    };
    
    const isSync = 
      legacy.sessions === v3.workoutSessions &&
      legacy.sets === v3.performedSets &&
      legacy.planned === v3.plannedWorkouts &&
      legacy.vacations === v3.vacations;
      
    diagnostics = { legacy, v3, isSync };
  }
</script>

<div class="settings">
  <h1>Réglages</h1>

  <SyncPanel />

  {#if message}
    <div class="card message">{message}</div>
  {/if}

  <div class="card">
    <h2>Programme</h2>
    <p class="hint">Le fichier programme.yaml est lu au build. Modifiez-le localement puis rebuild/redeploy.</p>

    <label>
      <span class="label">Date de début du programme</span>
      <div class="date-field">
        <input type="date" bind:value={startDate} />
      </div>
    </label>
    <button type="button" class="btn-primary save-date-btn" onclick={saveStartDate}>
      Enregistrer la date
    </button>
  </div>

  <div class="card">
    <h2>Apparence</h2>
    <button type="button" class="btn-secondary" onclick={toggleTheme}>
      Thème : {theme === 'dark' ? 'Sombre' : 'Clair'} — Appuyer pour changer
    </button>
  </div>

  <div class="card">
    <h2>Sauvegarde</h2>
    <p class="hint">Exportez régulièrement vos données. Aucune donnée n'est envoyée à un serveur.</p>
    <div class="backup-actions">
      <button type="button" class="btn-primary" onclick={handleExportV3Clear}>Exporter V3 (JSON)</button>
      <button type="button" class="btn-primary" onclick={handleExportV3Encrypted} style="background: var(--destructive); border-color: var(--destructive);">
        Exporter V3 (Chiffré)
      </button>
      <button type="button" class="btn-secondary" onclick={handleExportLegacy} style="font-size: 0.8rem;">Exporter Legacy (Ancien format)</button>
      
      <button type="button" class="btn-secondary" onclick={() => importInput?.click()} style="margin-top: 1rem;">
        Importer (Accepte JSON V1/V2/V3 et Chiffré)
      </button>
      <input
        bind:this={importInput}
        class="hidden-input"
        type="file"
        accept="application/json,.json"
        onchange={handleImport}
      />
    </div>
  </div>

  <div class="card danger-zone">
    <h2>Zone dangereuse</h2>
    <p class="hint">
      Supprime définitivement toutes les séances, statistiques, calendrier et réglages enregistrés sur cet appareil.
    </p>

    {#if !showResetPanel}
      <button type="button" class="btn-danger" onclick={openResetPanel}>
        Réinitialiser l'application
      </button>
    {:else}
      <div class="reset-panel">
        <p class="reset-warning">
          Cette action est <strong>irréversible</strong>. Exportez vos données avant si vous souhaitez les conserver.
        </p>
        <p class="label">Recopiez exactement cette phrase :</p>
        <p class="confirm-phrase" aria-label="Phrase de confirmation">{RESET_CONFIRMATION_PHRASE}</p>
        <label>
          <span class="label">Confirmation</span>
          <input
            type="text"
            bind:value={resetInput}
            placeholder="Collez la phrase ici"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </label>
        <div class="reset-actions">
          <button
            type="button"
            class="btn-danger"
            disabled={!resetConfirmed || resetting}
            onclick={executeReset}
          >
            {resetting ? 'Suppression…' : 'Supprimer toutes les données'}
          </button>
          <button type="button" class="btn-secondary" disabled={resetting} onclick={cancelReset}>
            Annuler
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="card about">
    <h2>À propos & Diagnostics V3</h2>
    <p>AppMuscu — PWA offline mono-utilisateur.</p>
    <p class="hint">Ajoutez l'app à votre écran d'accueil iOS via Safari pour le mode standalone.</p>
    
    <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-body); border-radius: 8px;">
      <h3 style="font-size: 1rem; margin-bottom: 0.5rem;">Diagnostic de Migration</h3>
      <button type="button" class="btn-secondary" onclick={checkDiagnostics} style="margin-bottom: 0.5rem;">
        Vérifier les données en base
      </button>
      
      {#if diagnostics}
        <ul style="font-size: 0.85rem; color: var(--text-muted); list-style: none; padding: 0;">
          <li>Sessions: {diagnostics.legacy.sessions} (Ancien) vs {diagnostics.v3.workoutSessions} (V3)</li>
          <li>Sets: {diagnostics.legacy.sets} (Ancien) vs {diagnostics.v3.performedSets} (V3)</li>
          <li>Planned: {diagnostics.legacy.planned} (Ancien) vs {diagnostics.v3.plannedWorkouts} (V3)</li>
          <li>Vacations: {diagnostics.legacy.vacations} (Ancien) vs {diagnostics.v3.vacations} (V3)</li>
          <li>Exercices uniques (V3): {diagnostics.v3.exercises}</li>
        </ul>
        {#if diagnostics.isSync}
          <p style="color: var(--success); font-weight: bold; margin-top: 0.5rem;">✅ Migration parfaitement synchronisée.</p>
        {:else}
          <p style="color: var(--destructive); font-weight: bold; margin-top: 0.5rem;">⚠️ Désynchronisation détectée.</p>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .settings {
    width: 100%;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }

  .save-date-btn {
    margin-top: 0.75rem;
  }

  .backup-actions,
  .reset-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .message {
    background: color-mix(in srgb, var(--success) 15%, var(--bg-card));
    border-color: var(--success);
    color: var(--text);
  }

  .about p {
    margin-bottom: 0.5rem;
  }

  .reset-warning {
    font-size: 0.9rem;
    color: var(--destructive);
    margin-bottom: 0.75rem;
  }

  .reset-panel {
    margin-top: 0.5rem;
  }
</style>
