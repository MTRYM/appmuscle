<script>
  import { getSettings, updateSettings, replacePlannedSessions, getPlannedSessions, getAllSessionsWithSets } from '$lib/api';
  import { applyTheme } from '$lib/theme';
  import { todayISO, parseProgramme, generatePlannedSessions, formatDateFR } from '$lib/programme';
  import { onMount } from 'svelte';

  const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

  let settings = $state(null);
  let startDate = $state('');
  let theme = $state('dark');
  let message = $state('');
  let messageType = $state('info');
  let importing = $state(false);
  let exporting = $state(false);
  let selectedFile = $state(null);
  let plan = $state({ next: null, end: null, done: 0, total: 0 });

  onMount(async () => {
    settings = await getSettings();
    startDate = settings.programStartDate ?? todayISO();
    theme = settings.theme ?? 'dark';
    await loadPlan();
  });

  function notify(text, type = 'info') {
    message = text;
    messageType = type;
  }

  async function loadPlan() {
    try {
      const planned = await getPlannedSessions();
      const today = todayISO();
      const upcoming = planned.filter((p) => p.status === 'pending' && p.dateISO >= today);
      plan = {
        next: upcoming[0] ?? null,
        end: planned.length ? planned[planned.length - 1].dateISO : null,
        done: planned.filter((p) => p.status === 'done').length,
        total: planned.length,
      };
    } catch {
      // Les infos du programme sont optionnelles : on n'affiche rien en cas d'erreur.
    }
  }

  async function saveStartDate() {
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      notify('Choisis une date valide.', 'error');
      return;
    }
    if (
      !confirm(
        'Les séances à venir seront recalculées à partir de cette date. Ton historique (séances faites ou loupées) est conservé. Continuer ?',
      )
    ) {
      return;
    }
    try {
      await updateSettings({ programStartDate: startDate });
      const programme = parseProgramme();
      const planned = generatePlannedSessions(startDate, programme);
      await replacePlannedSessions(planned);
      settings = await getSettings();
      await loadPlan();
      notify('Programme mis à jour.', 'success');
    } catch (err) {
      console.error(err);
      notify('Erreur lors de la génération du programme.', 'error');
    }
  }

  async function setTheme(next) {
    if (next === theme) return;
    const previous = theme;
    theme = next;
    applyTheme(next);
    try {
      await updateSettings({ theme: next });
    } catch {
      theme = previous;
      applyTheme(previous);
      notify('Impossible de changer le thème.', 'error');
    }
  }

  async function exportData() {
    exporting = true;
    try {
      const [planned, sessions] = await Promise.all([getPlannedSessions(), getAllSessionsWithSets()]);
      const performedSets = sessions.flatMap((s) => s.sets ?? []);
      const workoutSessions = sessions.map(({ sets, performedSets: _p, plannedSession, ...rest }) => rest);
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: { plannedSessions: planned, workoutSessions, performedSets },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appmuscu-sauvegarde-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify(`Sauvegarde téléchargée (${workoutSessions.length} séances).`, 'success');
    } catch (err) {
      console.error(err);
      notify('Erreur lors de l\'export.', 'error');
    } finally {
      exporting = false;
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0] ?? null;
    message = '';
    if (file && file.size > MAX_IMPORT_BYTES) {
      selectedFile = null;
      notify('Fichier trop volumineux (10 Mo max).', 'error');
      return;
    }
    selectedFile = file;
  }

  async function importData() {
    if (!selectedFile) return;
    if (!confirm('Importer ce fichier ? Les données déjà présentes ne seront pas écrasées.')) return;
    importing = true;
    notify('Importation en cours…');
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('Format de fichier invalide');

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Le serveur a refusé le fichier');

      selectedFile = null;
      await loadPlan();
      notify('Données importées. Actualise la page pour tout voir.', 'success');
    } catch (err) {
      console.error(err);
      notify('Erreur lors de l\'importation : ' + err.message, 'error');
    } finally {
      importing = false;
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } finally {
      window.location.href = '/login';
    }
  }
</script>

<div class="settings">
  <h1>Réglages</h1>

  {#if message}
    <p class="message {messageType}" role="status">{message}</p>
  {/if}

  <section>
    <h2>Programme</h2>
    {#if plan.total > 0}
      <ul class="facts">
        <li>
          <span>Prochaine séance</span>
          <strong>{plan.next ? `${plan.next.sessionName} · ${formatDateFR(plan.next.dateISO)}` : 'Aucune'}</strong>
        </li>
        <li>
          <span>Réalisées</span>
          <strong>{plan.done} / {plan.total}</strong>
        </li>
        {#if plan.end}
          <li>
            <span>Fin du programme</span>
            <strong>{formatDateFR(plan.end)}</strong>
          </li>
        {/if}
      </ul>
    {/if}
    <label>
      <span class="label">Date de début</span>
      <input type="date" bind:value={startDate} />
    </label>
    <button type="button" class="btn-primary save-date-btn" onclick={saveStartDate}>
      Appliquer
    </button>
  </section>

  <section>
    <h2>Apparence</h2>
    <div class="segmented" role="tablist">
      <button type="button" role="tab" aria-selected={theme === 'dark'} class:on={theme === 'dark'} onclick={() => setTheme('dark')}>Sombre</button>
      <button type="button" role="tab" aria-selected={theme === 'light'} class:on={theme === 'light'} onclick={() => setTheme('light')}>Clair</button>
    </div>
  </section>

  <section>
    <h2>Données</h2>
    <button type="button" class="row" disabled={exporting} onclick={exportData}>
      <span>{exporting ? 'Export…' : 'Exporter une sauvegarde'}</span>
      <span class="meta">JSON</span>
    </button>

    <label class="row file-row">
      <input type="file" accept=".json,application/json" onchange={handleFileSelect} />
      <span>{selectedFile ? selectedFile.name : 'Importer une sauvegarde'}</span>
      <span class="meta">JSON</span>
    </label>
    {#if selectedFile}
      <button type="button" class="btn-primary import-btn" disabled={importing} onclick={importData}>
        {importing ? 'Importation…' : 'Lancer l\'import'}
      </button>
    {/if}
  </section>

  <section>
    <h2>Session</h2>
    <button type="button" class="row logout" onclick={logout}>
      <span>Se déconnecter</span>
    </button>
  </section>
</div>

<style>
  .settings {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .settings h1 {
    margin: 0.75rem 0 0;
  }

  .settings h2 {
    font-size: 1.05rem;
    margin: 0 0 0.75rem;
  }

  .label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }

  .save-date-btn,
  .import-btn {
    margin-top: 0.75rem;
  }

  .message {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: var(--bg-elevated);
    font-size: 0.9rem;
  }

  .message.success {
    color: var(--success);
  }

  .message.error {
    color: var(--destructive);
  }

  .facts {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
  }

  .facts li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.7rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }

  .facts span {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .facts strong {
    text-align: right;
    font-weight: 600;
    text-transform: capitalize;
  }

  .segmented {
    display: flex;
    gap: 0.25rem;
    padding: 3px;
    background: var(--bg-elevated);
    border-radius: 12px;
  }

  .segmented button {
    flex: 1;
    min-height: 40px;
    padding: 0.35rem;
    border-radius: 9px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .segmented button.on {
    background: var(--bg-card);
    color: var(--text-heading);
  }

  .row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 52px;
    padding: 0.75rem 0.15rem;
    border-radius: 0;
    background: transparent;
    color: var(--text);
    font-weight: 600;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }

  .row .meta {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 0.8rem;
  }

  .file-row input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
  }

  .row.logout {
    color: var(--destructive);
  }
</style>
