<script>
  import { getPlannedSessions, getAllSessionsWithSets, getBodyData } from '$lib/api';
  import { todayISO, formatDateFR, parseSessionTitle } from '$lib/programme';
  import { Home, Dumbbell } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let message = $state('');
  let messageType = $state('info');
  let exporting = $state(false);
  let loading = $state(true);
  let plan = $state({ next: null, end: null, done: 0, total: 0 });

  onMount(async () => {
    await loadPlan();
  });

  function notify(text, type = 'info') {
    message = text;
    messageType = type;
  }

  async function loadPlan() {
    loading = true;
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
      // Données optionnelles
    } finally {
      loading = false;
    }
  }

  async function exportData() {
    exporting = true;
    try {
      const [planned, sessions, bodyData] = await Promise.all([
        getPlannedSessions(),
        getAllSessionsWithSets(),
        getBodyData().catch(() => ({ profile: null, checkIns: [], measurements: [] })),
      ]);
      const performedSets = sessions.flatMap((s) => s.sets ?? []);
      const workoutSessions = sessions.map(({ sets, performedSets: _p, plannedSession, ...rest }) => rest);
      const payload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        tables: {
          plannedSessions: planned,
          workoutSessions,
          performedSets,
          athleteProfile: bodyData.profile,
          checkIns: bodyData.checkIns,
          measurements: bodyData.measurements,
        },
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

  {#if loading}
    <div class="loading-screen">
      <span class="spinner" aria-hidden="true"></span>
      <p>Chargement des réglages…</p>
    </div>
  {:else}
    {#if plan.total > 0}
      <section>
        <h2>Programme en cours</h2>
        <ul class="facts">
          <li>
            <span>Prochaine séance</span>
            <strong>
              {#if plan.next}
                {@const nextTitle = parseSessionTitle(plan.next.sessionName)}
                <span class="settings-next-session">
                  {#if nextTitle.location === 'home'}
                    <span class="settings-loc-icon" title="Maison"><Home size={13} strokeWidth={1.6} /></span>
                  {:else if nextTitle.location === 'gym'}
                    <span class="settings-loc-icon" title="Salle"><Dumbbell size={13} strokeWidth={1.6} /></span>
                  {/if}
                  <span>{nextTitle.cleanName} · {formatDateFR(plan.next.dateISO)}</span>
                </span>
              {:else}
                Aucune
              {/if}
            </strong>
          </li>
          <li>
            <span>Réalisées</span>
            <strong>{plan.done} / {plan.total}</strong>
          </li>
          {#if plan.end}
            <li>
              <span>Fin prévue</span>
              <strong>{formatDateFR(plan.end)}</strong>
            </li>
          {/if}
        </ul>
      </section>
    {/if}

    <section>
      <h2>Sauvegarde</h2>
      <p class="sub">Télécharge une copie de secours complète de toutes tes séances et séries.</p>
      <button type="button" class="row" disabled={exporting} onclick={exportData}>
        <span>{exporting ? 'Export en cours…' : 'Exporter la sauvegarde'}</span>
        <span class="meta">JSON</span>
      </button>
    </section>

    <section>
      <h2>Session</h2>
      <button type="button" class="row logout" onclick={logout}>
        <span>Se déconnecter</span>
      </button>
    </section>
  {/if}
</div>

<style>
  .settings {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 2rem;
  }

  .settings h1 {
    margin: 0.75rem 0 0;
  }

  .settings h2 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
  }

  .sub {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin: 0 0 0.75rem;
    line-height: 1.4;
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
    margin: 0;
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

  .settings-next-session {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
  }

  .settings-loc-icon {
    display: inline-flex;
    align-items: center;
    color: var(--beige);
    flex-shrink: 0;
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

  .row.logout {
    color: var(--destructive);
  }
</style>
