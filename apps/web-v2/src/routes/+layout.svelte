<script lang="ts">
  import '../app.css';
  import { Dumbbell, CalendarDays, BarChart3, Bot, Settings, LogOut } from 'lucide-svelte';
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { id: '/', label: 'Séance', icon: Dumbbell },
    { id: '/calendrier', label: 'Calendrier', icon: CalendarDays },
    { id: '/stats', label: 'Stats', icon: BarChart3 },
    { id: '/coach', label: 'Coach IA', icon: Bot },
    { id: '/settings', label: 'Réglages', icon: Settings },
  ];

  function isActive(tabId: string, currentPath: string) {
    if (tabId === '/') return currentPath === '/';
    return currentPath.startsWith(tabId);
  }

  // Skip layout on login page
  $effect(() => {});

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    window.location.href = '/login';
  }
</script>

{#if $page.url.pathname === '/login'}
  {@render children()}
{:else}
  <div class="app-shell">
    <nav class="nav-bar" aria-label="Navigation principale">
      <div class="nav-bar-inner">
        <div class="sidebar-logo">
          <span class="logo-text">🏋️ AppMuscu</span>
        </div>
        {#each tabs as tab}
          {@const Icon = tab.icon}
          <a
            href={tab.id}
            class="nav-item"
            class:active={isActive(tab.id, $page.url.pathname)}
          >
            <span class="nav-icon">
              <Icon strokeWidth={isActive(tab.id, $page.url.pathname) ? 2.25 : 1.75} size={20} />
            </span>
            <span class="nav-label">{tab.label}</span>
          </a>
        {/each}
        <div class="sidebar-spacer"></div>
        <button class="nav-item logout-btn" onclick={logout}>
          <span class="nav-icon">
            <LogOut strokeWidth={1.75} size={20} />
          </span>
          <span class="nav-label">Déconnexion</span>
        </button>
      </div>
    </nav>

    <main class="app-main">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .sidebar-logo {
    display: none;
  }

  .sidebar-spacer {
    display: none;
  }

  .logout-btn {
    display: none;
  }

  .nav-label {
    line-height: 1;
    white-space: nowrap;
  }

  @media (min-width: 768px) {
    .sidebar-logo {
      display: block;
      padding: 0.5rem 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.75rem;
    }

    .logo-text {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .sidebar-spacer {
      display: block;
      flex: 1;
    }

    .logout-btn {
      display: flex;
      color: var(--text-muted);
    }

    .logout-btn:hover {
      color: var(--danger);
    }
  }

  a.nav-item {
    text-decoration: none;
  }
</style>
