<script lang="ts">
  import { syncClient } from '../sync/client';
  import { generateId } from '../import/id-mapping';

  let serverUrl = $state(localStorage.getItem('coachServerUrl') || '');
  let pin = $state('');
  let deviceName = $state(localStorage.getItem('deviceName') || 'Mon iPhone');
  let connectStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
  let syncStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
  let connectError = $state('');
  let syncMessage = $state('');
  let serverPingOk = $state<boolean | null>(null);

  // Pair status from localStorage
  let isPaired = $state(!!localStorage.getItem('devicePaired'));

  function saveServerUrl() {
    const url = serverUrl.trim().replace(/\/$/, '');
    localStorage.setItem('coachServerUrl', url);
    // Reset ping status when URL changes
    serverPingOk = null;
  }

  function getEffectiveServerUrl(): string {
    const saved = serverUrl.trim().replace(/\/$/, '');
    if (saved) return saved;
    // Auto-detect: same host as current page, port 3000
    let host = window.location.hostname;
    if (host === 'localhost') host = '127.0.0.1';
    return `http://${host}:3000`;
  }

  async function testConnection() {
    serverPingOk = null;
    connectError = '';
    const url = getEffectiveServerUrl();
    console.log('[DEBUG] Testing connection to:', url);
    try {
      console.log(`[DEBUG] Fetching ${url}/auth/ping ...`);
      const res = await fetch(`${url}/auth/ping`, { signal: AbortSignal.timeout(5000) });
      console.log(`[DEBUG] Received response:`, res.status, res.statusText);
      if (res.ok) {
        serverPingOk = true;
      } else {
        serverPingOk = false;
        connectError = `Le serveur a répondu avec le code ${res.status}.`;
        console.error('[DEBUG] Ping failed with status:', res.status);
      }
    } catch (e: any) {
      serverPingOk = false;
      connectError = `Impossible de joindre le serveur sur ${url}. Vérifiez que le serveur est lancé et que vous êtes sur le même réseau Wi-Fi.`;
      console.error('[DEBUG] Fetch error during ping:', e.name, e.message, e);
    }
  }

  async function connectWithPin() {
    if (!pin.trim()) {
      connectError = 'Entrez le PIN affiché dans les paramètres du serveur.';
      return;
    }
    connectStatus = 'loading';
    connectError = '';

    const url = getEffectiveServerUrl();
    console.log('[DEBUG] Attempting pairing with PIN to:', url);

    try {
      const deviceId = localStorage.getItem('deviceId') || generateId();
      localStorage.setItem('deviceId', deviceId);

      console.log(`[DEBUG] Fetching ${url}/auth/verify-pin ...`);
      const response = await fetch(`${url}/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pin.trim(),
          deviceName: deviceName || 'iPhone',
        }),
      });

      console.log(`[DEBUG] Received verify response:`, response.status, response.statusText);
      if (!response.ok) {
        const err = await response.json();
        console.error('[DEBUG] Verify error from server:', err);
        throw new Error(err.error || 'Erreur inconnue');
      }

      console.log('[DEBUG] Pairing successful!');
      // Save pairing info
      localStorage.setItem('devicePaired', '1');
      localStorage.setItem('deviceName', deviceName);
      localStorage.setItem('coachServerUrl', url);
      localStorage.setItem('coachPin', pin.trim());
      serverUrl = url;
      isPaired = true;
      connectStatus = 'success';
      pin = '';
    } catch (e: any) {
      console.error('[DEBUG] Pairing exception:', e.name, e.message, e);
      connectStatus = 'error';
      connectError = e.message;
    }
  }

  async function syncNow() {
    syncStatus = 'loading';
    syncMessage = '';
    try {
      const pushResult = await syncClient.pushPendingEvents();
      const pullResult = await syncClient.pullNewEvents();
      syncMessage = `↑ ${pushResult.pushed ?? 0} envoyé(s) · ↓ ${pullResult.pulled ?? 0} reçu(s)`;
      syncStatus = 'success';
    } catch (e: any) {
      syncStatus = 'error';
      syncMessage = e.message;
    }
  }

  function revokePairing() {
    if (!confirm('Révoquer cet appareil ?')) return;
    localStorage.removeItem('devicePaired');
    localStorage.removeItem('deviceId');
    localStorage.removeItem('coachServerUrl');
    localStorage.removeItem('coachPin');
    isPaired = false;
    connectStatus = 'idle';
    serverUrl = '';
    serverPingOk = null;
  }
</script>

<div class="sync-panel">
  <h2>🔗 Connexion au Serveur PC</h2>

  {#if !isPaired}
    <!-- Step 1: Server URL -->
    <div class="card" style="margin-bottom: 1rem;">
      <h3>Étape 1 — Adresse du serveur</h3>
      <p class="hint">Entrez l'adresse IP de votre PC (visible sur le PC dans la console du serveur).</p>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <input
          id="server-url"
          type="url"
          class="text-input"
          placeholder={getEffectiveServerUrl()}
          bind:value={serverUrl}
          oninput={saveServerUrl}
          style="flex:1;"
        />
      </div>
      <p class="hint">Laisser vide = auto-détection ({getEffectiveServerUrl()})</p>

      <button
        type="button"
        class="btn-secondary"
        style="margin-top: 0.75rem; width: 100%;"
        onclick={testConnection}
      >
        📡 Tester la connexion
      </button>

      {#if serverPingOk === true}
        <p class="status-ok">✅ Serveur joignable !</p>
      {/if}
      {#if serverPingOk === false}
        <p class="status-err">❌ {connectError}</p>
      {/if}
    </div>

    <!-- Step 2: PIN -->
    <div class="card">
      <h3>Étape 2 — Entrez le PIN</h3>
      <p class="hint">Le PIN par défaut est <strong>916491</strong> (identique au code d'accès de l'app). Vous pouvez le changer avec la variable d'environnement <code>COACH_PIN</code> sur le serveur.</p>

      <label class="field-label" for="device-name" style="margin-top: 0.75rem;">Nom de cet appareil</label>
      <input id="device-name" type="text" class="text-input" bind:value={deviceName} style="margin-top: 0.3rem;" />

      <label class="field-label" for="pairing-pin" style="margin-top: 0.75rem;">PIN du serveur</label>
      <input
        id="pairing-pin"
        type="password"
        class="text-input"
        inputmode="numeric"
        maxlength="10"
        placeholder="••••••"
        bind:value={pin}
        style="margin-top: 0.3rem; letter-spacing: 0.2em; font-size: 1.1rem; text-align: center;"
      />

      {#if connectError && connectStatus === 'error'}
        <p class="status-err">{connectError}</p>
      {/if}

      <button
        type="button"
        class="btn-primary"
        style="margin-top: 1rem; width: 100%;"
        disabled={connectStatus === 'loading'}
        onclick={connectWithPin}
      >
        {connectStatus === 'loading' ? 'Vérification…' : '🔐 Connecter cet appareil'}
      </button>
    </div>
  {:else}
    <!-- Paired state -->
    <div class="card" style="border-left: 4px solid var(--success);">
      <p style="color: var(--success); font-weight: 600;">✅ Appareil connecté : {deviceName || 'iPhone'}</p>
      <p class="hint" style="margin-top: 0.25rem;">Serveur : {serverUrl || getEffectiveServerUrl()}</p>

      <button
        type="button"
        class="btn-primary"
        style="margin-top: 1rem; width: 100%;"
        disabled={syncStatus === 'loading'}
        onclick={syncNow}
      >
        {syncStatus === 'loading' ? 'Synchronisation…' : '🔄 Synchroniser maintenant'}
      </button>

      {#if syncMessage}
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: {syncStatus === 'error' ? 'var(--danger)' : 'var(--text-muted)'};">
          {syncMessage}
        </p>
      {/if}

      <button
        type="button"
        class="btn-ghost"
        style="margin-top: 0.75rem; width: 100%; color: var(--danger); font-size: 0.8rem;"
        onclick={revokePairing}
      >
        Déconnecter cet appareil
      </button>
    </div>
  {/if}
</div>

<style>
  .sync-panel h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }
  .sync-panel h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .field-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
  }
  .text-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.95rem;
  }
  .hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
  }
  .hint code {
    background: var(--bg-elevated);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-size: 0.7rem;
  }
  .status-ok {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--success);
  }
  .status-err {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--danger);
  }
</style>
