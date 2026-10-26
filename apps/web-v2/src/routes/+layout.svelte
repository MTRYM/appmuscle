<script lang="ts">
  import '../app.css';
  import { Dumbbell, CalendarDays, BarChart3, Settings } from 'lucide-svelte';
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { id: '/', label: 'Séance', icon: Dumbbell },
    { id: '/calendrier', label: 'Calendrier', icon: CalendarDays },
    { id: '/stats', label: 'Stats', icon: BarChart3 },
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

    <!-- Mobile Bottom Navigation Bar (Apple HIG Native Standard) -->
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
            <div class="nav-tab-icon-wrap">
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
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
    padding-top: max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem));
    padding-left: max(0.85rem, calc(env(safe-area-inset-left, 0px) + 0.5rem));
    padding-right: max(0.85rem, calc(env(safe-area-inset-right, 0px) + 0.5rem));
    padding-bottom: 88px;
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 20px));
    box-sizing: border-box;
  }

  /* === Mobile Bottom Tab Bar (Apple iOS Native Standard) === */
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(7, 7, 6, 0.92);
    backdrop-filter: blur(28px) saturate(190%);
    -webkit-backdrop-filter: blur(28px) saturate(190%);
    border-top: 1px solid rgba(247, 245, 242, 0.08);
    padding-top: 8px;
    padding-bottom: 24px;
    padding-bottom: max(20px, calc(env(safe-area-inset-bottom, 0px) + 10px));
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
    gap: 4px;
    text-decoration: none;
    color: rgba(247, 245, 242, 0.45);
    padding: 3px 10px;
    border-radius: 10px;
    min-width: 58px;
    transition: color 0.15s ease, transform 0.12s ease;
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
    width: 28px;
    height: 24px;
    transition: color 0.15s ease;
  }

  .nav-tab.active {
    color: var(--pink);
  }

  .nav-tab-label {
    font-family: -apple-system, BlinkMacSystemFont, 'Montserrat', sans-serif;
    font-size: 0.65rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
    color: inherit;
  }

  .nav-tab.active .nav-tab-label {
    font-weight: 600;
    color: var(--pink);
  }
</style>
