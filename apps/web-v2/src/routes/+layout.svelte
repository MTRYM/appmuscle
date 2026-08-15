<script lang="ts">
  import '../app.css';
  import { Dumbbell, CalendarDays, BarChart3, Bot, Settings } from 'lucide-svelte';
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
</script>

{#if $page.url.pathname === '/login'}
  {@render children()}
{:else}
  <div class="app-shell">
    <main class="app-main">
      {@render children()}
    </main>

    <!-- Mobile Bottom Navigation Bar (100% iPhone 13 & Safari Optimized) -->
    <nav class="mobile-nav" aria-label="Navigation principale">
      <div class="mobile-nav-inner">
        {#each tabs as tab}
          {@const Icon = tab.icon}
          {@const active = isActive(tab.id, $page.url.pathname)}
          <a
            href={tab.id}
            class="nav-tab"
            class:active
            aria-current={active ? 'page' : undefined}
          >
            <div class="nav-tab-icon-wrap" class:active>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span class="nav-tab-label">{tab.label}</span>
          </a>
        {/each}
      </div>
    </nav>
  </div>
{/if}

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    min-height: 100svh;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    position: relative;
    background: var(--bg);
  }

  .app-main {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0.85rem calc(76px + env(safe-area-inset-bottom, 16px));
    box-sizing: border-box;
  }

  /* === Mobile Bottom Tab Bar (iOS Glassmorphism) === */
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(11, 10, 9, 0.88);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid rgba(247, 245, 242, 0.09);
    padding-bottom: max(8px, env(safe-area-inset-bottom, 12px));
    padding-top: 6px;
    display: flex;
    justify-content: center;
  }

  .mobile-nav-inner {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    max-width: 480px;
    padding: 0 0.5rem;
  }

  .nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    text-decoration: none;
    color: var(--text-muted);
    padding: 4px 8px;
    border-radius: 12px;
    min-width: 56px;
    min-height: 48px;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  .nav-tab:active {
    transform: scale(0.92);
  }

  .nav-tab-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    border-radius: 999px;
    transition: all 0.2s ease;
  }

  .nav-tab.active {
    color: var(--pink);
  }

  .nav-tab-icon-wrap.active {
    background: color-mix(in srgb, var(--pink) 16%, transparent);
    color: var(--pink);
  }

  .nav-tab-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.01em;
  }

  .nav-tab.active .nav-tab-label {
    font-weight: 700;
    color: var(--pink);
  }
</style>
