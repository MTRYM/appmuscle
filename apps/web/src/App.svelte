<script>
  import { onMount } from 'svelte';
  import SeanceDuJour from './components/SeanceDuJour.svelte';
  import Calendrier from './components/Calendrier.svelte';
  import Statistiques from './components/Statistiques.svelte';
  import Settings from './components/Settings.svelte';
  import CoachChat from './components/CoachChat.svelte';
  import LockScreen from './components/LockScreen.svelte';
  import {
    getSettings,
    markMissedSessions,
    replacePlannedSessions,
    syncPlannedWithCompleted,
    db,
  } from './lib/db.js';
  import {
    parseProgramme,
    generatePlannedSessions,
    todayISO,
  } from './lib/programme.js';
  import { Dumbbell, CalendarDays, BarChart3, Settings as SettingsIcon, Bot } from 'lucide-svelte';
  import { isUnlocked, lockApp } from './lib/auth.js';
  import { applyTheme } from './lib/theme.js';

  let activeTab = $state('home');
  let refreshKey = $state(0);
  let ready = $state(false);
  let unlocked = $state(isUnlocked());
  let showOnboarding = $state(false);
  let onboardingDate = $state(todayISO());

  onMount(async () => {
    await initApp();
  });

  async function initApp() {
    const settings = await getSettings();
    applyTheme(settings.theme ?? 'dark');

    await markMissedSessions(todayISO());

    const count = await db.plannedSessions.count();
    if (!settings.programStartDate) {
      showOnboarding = true;
    } else if (count === 0) {
      const programme = parseProgramme();
      const planned = generatePlannedSessions(settings.programStartDate, programme);
      await replacePlannedSessions(planned);
      await syncPlannedWithCompleted();
    }

    ready = true;
  }

  async function confirmOnboarding() {
    const programme = parseProgramme();
    const planned = generatePlannedSessions(onboardingDate, programme);
    await db.settings.put({
      id: 'main',
      programStartDate: onboardingDate,
      theme: 'dark',
    });
    await replacePlannedSessions(planned);
    showOnboarding = false;
    refresh();
  }

  function handleUnlock() {
    unlocked = true;
  }

  async function handleAppReset() {
    lockApp();
    unlocked = false;
    showOnboarding = true;
    onboardingDate = todayISO();
    activeTab = 'home';
    applyTheme('dark');
    refresh();
    ready = true;
  }

  function refresh() {
    refreshKey += 1;
  }

  function setTab(tab) {
    activeTab = tab;
  }

  const tabs = [
    { id: 'home', label: 'Accueil', icon: Dumbbell },
    { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'coach', label: 'Coach IA', icon: Bot },
    { id: 'settings', label: 'Réglages', icon: SettingsIcon },
  ];
</script>

{#if !ready}
  <div class="page-centered loading">
    <p>Chargement…</p>
  </div>
{:else if !unlocked}
  <LockScreen onUnlock={handleUnlock} />
{:else if showOnboarding}
  <div class="page-centered onboarding">
    <h1>Bienvenue</h1>
    <p class="accent-text">Votre programme, votre rythme.</p>
    <p>Choisissez la date de début de votre programme pour générer le calendrier prévisionnel.</p>
    <div class="card onboarding-card">
      <label>
        <span class="label">Date de début</span>
        <div class="date-field">
          <input type="date" bind:value={onboardingDate} />
        </div>
      </label>
    </div>
    <button type="button" class="btn-primary" onclick={confirmOnboarding}>Commencer</button>
  </div>
{:else}
  <div class="app-shell">
    <main class="app-main">
      {#if activeTab === 'home'}
        <SeanceDuJour onSessionSaved={refresh} />
      {:else if activeTab === 'calendar'}
        <Calendrier {refreshKey} onCalendarChanged={refresh} />
      {:else if activeTab === 'stats'}
        <Statistiques {refreshKey} />
      {:else if activeTab === 'coach'}
        <CoachChat />
      {:else if activeTab === 'settings'}
        <Settings onSettingsChanged={refresh} onImportDone={refresh} onAppReset={handleAppReset} />
      {/if}
    </main>

    <nav class="nav-bar" aria-label="Navigation principale">
      <div class="nav-bar-inner">
        {#each tabs as tab}
          {@const Icon = tab.icon}
          <button
            type="button"
            class="nav-item"
            class:active={activeTab === tab.id}
            onclick={() => setTab(tab.id)}
          >
            <span class="nav-icon">
              <Icon strokeWidth={activeTab === tab.id ? 2.25 : 1.75} />
            </span>
            <span class="nav-label">{tab.label}</span>
          </button>
        {/each}
      </div>
    </nav>
  </div>
{/if}

<style>
  .onboarding-card {
    width: 100%;
  }

  .onboarding .label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
    text-align: left;
  }

  .nav-label {
    line-height: 1;
    white-space: nowrap;
  }
</style>
