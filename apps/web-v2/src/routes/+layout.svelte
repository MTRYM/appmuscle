<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { id: '/', label: 'Séance' },
    { id: '/calendrier', label: 'Calendrier' },
    { id: '/stats', label: 'Stats' },
    { id: '/settings', label: 'Réglages' },
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
          {@const active = isActive(tab.id, $page.url.pathname)}
          <a
            href={tab.id}
            class="nav-tab"
            class:active
            aria-current={active ? 'page' : undefined}
          >
            <div class="nav-tab-icon-wrap">
              {#if tab.id === '/'}
                <!-- Apple Fitness style horizontal solid/outline dumbbell -->
                <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor">
                  {#if active}
                    <rect x="2" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" stroke="none" />
                    <rect x="5" y="8" width="1.5" height="8" rx="0.75" fill="currentColor" stroke="none" />
                    <rect x="7" y="10.5" width="10" height="3" rx="1.5" fill="currentColor" stroke="none" />
                    <rect x="17.5" y="8" width="1.5" height="8" rx="0.75" fill="currentColor" stroke="none" />
                    <rect x="19.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" stroke="none" />
                  {:else}
                    <rect x="2.5" y="6.5" width="2" height="11" rx="1" stroke-width="1.6" />
                    <rect x="5.5" y="8.5" width="1.2" height="7" rx="0.6" stroke-width="1.6" />
                    <line x1="7" y1="12" x2="17" y2="12" stroke-width="2.2" stroke-linecap="round" />
                    <rect x="17.3" y="8.5" width="1.2" height="7" rx="0.6" stroke-width="1.6" />
                    <rect x="19.5" y="6.5" width="2" height="11" rx="1" stroke-width="1.6" />
                  {/if}
                </svg>
              {:else if tab.id === '/calendrier'}
                <!-- iOS Calendar Symbol -->
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4.5" width="18" height="16" rx="3.5" stroke-width="1.6" />
                  <line x1="16" y1="2.5" x2="16" y2="5" stroke-width="1.8" />
                  <line x1="8" y1="2.5" x2="8" y2="5" stroke-width="1.8" />
                  <line x1="3" y1="9.5" x2="21" y2="9.5" stroke-width="1.6" />
                  {#if active}
                    <path d="M3 8C3 6.067 4.567 4.5 6.5 4.5H17.5C19.433 4.5 21 6.067 21 8V9.5H3V8Z" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
                  {:else}
                    <circle cx="8" cy="14" r="0.8" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none" />
                    <circle cx="16" cy="14" r="0.8" fill="currentColor" stroke="none" />
                  {/if}
                </svg>
              {:else if tab.id === '/stats'}
                <!-- Apple Health Analytics Pill Bars -->
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <rect x="3.5" y="13" width="3.2" height="7.5" rx="1.6" opacity={active ? 1 : 0.7} />
                  <rect x="8.5" y="8" width="3.2" height="12.5" rx="1.6" opacity={active ? 1 : 0.7} />
                  <rect x="13.5" y="4" width="3.2" height="16.5" rx="1.6" opacity={active ? 1 : 0.7} />
                  <rect x="18.5" y="10.5" width="3.2" height="10" rx="1.6" opacity={active ? 1 : 0.7} />
                </svg>
              {:else if tab.id === '/settings'}
                <!-- Precision iOS Gear Symbol -->
                <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor">
                  {#if active}
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-1.4-12.8c.5-.3 1.3-.3 1.8 0l.4 1.2a1 1 0 0 0 1.2.7l1.2-.4c.6-.2 1.3.1 1.6.7l1 1.7c.3.5.2 1.2-.3 1.6l-1 .8a1 1 0 0 0 0 1.4l1 .8c.5.4.6 1.1.3 1.6l-1 1.7c-.3.6-1 .9-1.6.7l-1.2-.4a1 1 0 0 0-1.2.7l-.4 1.2c-.2.6-.7 1-1.4 1h-1.8c-.7 0-1.2-.4-1.4-1l-.4-1.2a1 1 0 0 0-1.2-.7l-1.2.4c-.6.2-1.3-.1-1.6-.7l-1-1.7c-.3-.5-.2-1.2.3-1.6l1-.8a1 1 0 0 0 0-1.4l-1-.8c-.5-.4-.6-1.1-.3-1.6l1-1.7c.3-.6 1-.9 1.6-.7l1.2.4a1 1 0 0 0 1.2-.7l.4-1.2c.2-.6.7-1 1.4-1h1.8Z" stroke="none" />
                  {:else}
                    <path stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3" stroke-width="1.6"/>
                  {/if}
                </svg>
              {/if}
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
    padding-bottom: 64px;
    padding-bottom: calc(50px + env(safe-area-inset-bottom, 16px));
    box-sizing: border-box;
  }

  /* === Mobile Bottom Tab Bar (Apple iOS Native Standard) === */
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(7, 7, 6, 0.90);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 0.5px solid rgba(255, 255, 255, 0.09);
    padding-top: 4px;
    padding-bottom: 8px;
    padding-bottom: env(safe-area-inset-bottom, 8px);
    display: flex;
    justify-content: center;
  }

  .mobile-nav-inner {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    max-width: 420px;
    padding: 0;
  }

  .nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-decoration: none;
    color: rgba(247, 245, 242, 0.38);
    padding: 2px 0 3px;
    flex: 1;
    max-width: 76px;
    transition: color 0.15s ease, transform 0.1s ease;
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
    width: 24px;
    height: 24px;
  }

  .nav-tab.active {
    color: var(--pink);
  }

  .nav-tab-label {
    font-family: -apple-system, BlinkMacSystemFont, 'Montserrat', sans-serif;
    font-size: 10px;
    font-size: 0.625rem;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: inherit;
    margin-top: 1px;
  }

  .nav-tab.active .nav-tab-label {
    font-weight: 600;
    color: var(--pink);
  }
</style>
