<script>
  import { getSettings, updateSettings } from '$lib/api';
  import { applyTheme } from '$lib/theme';
  import { todayISO } from '$lib/programme';
  import { onMount } from 'svelte';

  let settings = $state(null);
  let startDate = $state('');
  let theme = $state('dark');
  let message = $state('');
  let importing = $state(false);
  let selectedFile = $state(null);

  onMount(async () => {
    settings = await getSettings();
    startDate = settings.programStartDate ?? todayISO();
    theme = settings.theme ?? 'dark';
  });

  async function saveStartDate() {
    if (!startDate) return;
    await updateSettings({ programStartDate: startDate });
    settings = await getSettings();
    message = 'Date de début enregistrée.';
  }

  async function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme });
    applyTheme(theme);
    settings = await getSettings();
  }

  function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    message = '';
  }

  async function importData() {
    if (!selectedFile) return;
    importing = true;
    message = 'Importation en cours...';
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      message = 'Données importées avec succès ! 🎉 Tu peux actualiser la page.';
      selectedFile = null;
    } catch (err) {
      console.error(err);
      message = 'Erreur lors de l\'importation : ' + err.message;
    } finally {
      importing = false;
    }
  }

</script>

<div class="settings">
  <h1>Réglages</h1>

  {#if message}
    <div class="card message">{message}</div>
  {/if}

  <div class="card">
    <h2>Programme</h2>
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
    <h2>Données</h2>
    <p class="description">Importe ton ancienne sauvegarde JSON pour retrouver tout ton historique.</p>
    <label class="file-upload">
      <input type="file" accept=".json" onchange={handleFileSelect} />
      <span>{selectedFile ? selectedFile.name : 'Choisir un fichier JSON'}</span>
    </label>
    {#if selectedFile}
      <button type="button" class="btn-primary" disabled={importing} onclick={importData}>
        {importing ? 'Importation en cours...' : 'Importer les données'}
      </button>
    {/if}
  </div>
</div>

<style>
  .settings {
    width: 100%;
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

  .message {
    background: color-mix(in srgb, var(--success) 15%, var(--bg-card));
    border-color: var(--success);
    color: var(--text);
  }
</style>
