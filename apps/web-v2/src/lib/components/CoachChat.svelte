<script lang="ts">
  import ProposalDiff from './ProposalDiff.svelte';
  import type { CoachAction } from '@appmuscu/shared-schema';
  import {
    Send,
    Bot,
    User,
    UserCheck,
    Sparkles,
    AlertCircle,
    Wifi,
    Loader2,
    TrendingUp,
    Dumbbell,
    Clock,
    Brain,
    Settings,
    Copy,
    Check,
    RefreshCw,
    X,
    Save,
    ExternalLink,
    ShieldCheck
  } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';

  interface Message {
    id: string;
    sender: 'user' | 'coach';
    text: string;
    timestamp: string;
    model?: string;
    provider?: string;
    actions?: CoachAction[];
    reasoning?: string;
    duration?: number | null;
  }

  interface ProviderModel {
    name: string;
    description?: string;
  }

  let messages = $state<Message[]>([]);
  let inputMessage = $state('');
  let loading = $state(false);
  let errorMessage = $state('');
  let copiedMessageId = $state<string | null>(null);

  // Settings & Status
  let provider = $state<'gemini' | 'groq' | 'openai' | 'anthropic' | 'ollama'>('gemini');
  let apiKey = $state('');
  let selectedModel = $state('gemini-2.0-flash');

  let availableModels = $state<ProviderModel[]>([]);
  let coachStatus = $state<'checking' | 'ok' | 'no_key' | 'offline' | 'no_model' | 'error'>('checking');
  let coachStatusMessage = $state('');
  let activeModel = $state('');
  let isTestingConnection = $state(false);
  let showSettingsModal = $state(false);

  // Athlete Profile State
  let showProfileModal = $state(false);
  let athleteProfileText = $state('');
  let isSavingProfile = $state(false);
  let profileSaveFeedback = $state('');

  // UI state
  let messagesContainer: HTMLElement | undefined = $state(undefined);
  let textareaElement: HTMLTextAreaElement | undefined = $state(undefined);
  let loadingStartTime = $state(0);
  let elapsedSeconds = $state(0);
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    sender: 'coach',
    text: 'Salut ! 👋 Je suis ton **Coach IA personnel**. J\'ai accès à tout ton profil d\'athlète (193 cm, ~83 kg), tes antécédents sportifs et tout ton historique de séances.\n\nPose-moi tes questions d\'entraînement, demande-moi d\'analyser tes progrès ou de planifier tes prochaines charges !',
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  };

  const QUICK_SUGGESTIONS = [
    { label: 'Bilan global', icon: TrendingUp, prompt: 'Fais-moi un bilan complet de ma progression selon mon profil athlète (193cm, 83kg) et mes dernières séances.' },
    { label: 'Analyse charges', icon: Dumbbell, prompt: 'Analyse mes charges actuelles (Bench 70kg, Squat 100kg, Tractions +15kg). Quels sont tes conseils pour surcharger proprement ?' },
    { label: 'Prochaine séance', icon: Sparkles, prompt: 'Quels sont tes conseils pour ma prochaine séance d\'entraînement ? Quels poids et durées devrais-je viser ?' },
    { label: 'Front Lever', icon: Clock, prompt: 'Analyse mon niveau sur le Front Lever (tuck 15-20s). Comment structurer mes maintiens cette semaine ?' },
  ];

  onMount(async () => {
    const storedProvider = localStorage.getItem('appmuscu_llm_provider') as any;
    if (storedProvider) provider = storedProvider;
    const storedKey = localStorage.getItem('appmuscu_api_key');
    if (storedKey) apiKey = storedKey;
    const storedModel = localStorage.getItem('appmuscu_llm_model');
    if (storedModel) selectedModel = storedModel;

    messages = [WELCOME_MESSAGE];
    await checkHealth();
  });

  async function checkHealth(overrideProvider?: string, overrideKey?: string) {
    coachStatus = 'checking';
    const activeProv = overrideProvider || provider;
    const activeK = overrideKey !== undefined ? overrideKey : apiKey;

    try {
      const url = `/api/coach/health?provider=${activeProv}&apiKey=${encodeURIComponent(activeK)}`;
      const res = await fetch(url);
      const data = await res.json();
      coachStatus = data.status;
      coachStatusMessage = data.message;
      availableModels = data.models || [];
      activeModel = selectedModel || data.preferredModel || (data.models?.[0]?.name ?? '');
      if (!selectedModel && activeModel) {
        selectedModel = activeModel;
      }
    } catch {
      coachStatus = 'error';
      coachStatusMessage = "Impossible de contacter l'API coach.";
    }
  }

  async function testConnection() {
    isTestingConnection = true;
    await checkHealth();
    isTestingConnection = false;
  }

  function saveSettings() {
    localStorage.setItem('appmuscu_llm_provider', provider);
    localStorage.setItem('appmuscu_api_key', apiKey);
    if (selectedModel) {
      localStorage.setItem('appmuscu_llm_model', selectedModel);
    }
    showSettingsModal = false;
    checkHealth();
  }

  async function openProfileModal() {
    showProfileModal = true;
    profileSaveFeedback = '';
    try {
      const res = await fetch('/api/athlete-profile');
      const data = await res.json();
      athleteProfileText = data.text || '';
    } catch {
      profileSaveFeedback = 'Impossible de charger le profil.';
    }
  }

  async function saveProfile() {
    isSavingProfile = true;
    profileSaveFeedback = '';
    try {
      const res = await fetch('/api/athlete-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: athleteProfileText })
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      profileSaveFeedback = 'Profil enregistré avec succès ! ✅';
      setTimeout(() => {
        showProfileModal = false;
        profileSaveFeedback = '';
      }, 1000);
    } catch (err: any) {
      profileSaveFeedback = err.message || 'Erreur de sauvegarde';
    } finally {
      isSavingProfile = false;
    }
  }

  async function scrollToBottom(smooth = true) {
    await tick();
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant'
      });
    }
  }

  function startElapsedTimer() {
    loadingStartTime = Date.now();
    elapsedSeconds = 0;
    elapsedTimer = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - loadingStartTime) / 1000);
    }, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }

  function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec.toString().padStart(2, '0')}s`;
  }

  async function copyMessage(msg: Message) {
    try {
      await navigator.clipboard.writeText(msg.text);
      copiedMessageId = msg.id;
      setTimeout(() => {
        copiedMessageId = null;
      }, 2000);
    } catch (e) {
      console.error('Erreur lors de la copie:', e);
    }
  }

  async function sendMessage(overrideText?: string) {
    const userText = (overrideText || inputMessage).trim();
    if (!userText || loading) return;

    inputMessage = '';
    errorMessage = '';

    messages = [...messages, {
      id: crypto.randomUUID(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }];

    await scrollToBottom();
    loading = true;
    startElapsedTimer();

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          provider,
          apiKey,
          model: selectedModel || activeModel
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Erreur serveur (${response.status})`);
      }

      const data = await response.json();
      messages = [...messages, {
        id: crypto.randomUUID(),
        sender: 'coach',
        text: data.answer,
        model: data.model,
        provider: data.provider,
        actions: data.proposedActions || [],
        reasoning: data.reasoning || '',
        duration: data.totalDuration,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }];

      await scrollToBottom();
    } catch (e: any) {
      errorMessage = e.message || 'Erreur de communication avec le coach.';
    } finally {
      loading = false;
      stopElapsedTimer();
      await tick();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatMessageText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<div class="list-bullet">• <span>$1</span></div>')
      .replace(/^(\d+)\. (.+)$/gm, '<div class="list-bullet num"><span class="num-badge">$1</span> <span>$2</span></div>')
      .replace(/\n\n/g, '<div class="paragraph-gap"></div>')
      .replace(/\n/g, '<br>');
  }

  function onProviderChange() {
    if (provider === 'gemini') selectedModel = 'gemini-2.0-flash';
    else if (provider === 'groq') selectedModel = 'llama-3.3-70b-versatile';
    else if (provider === 'openai') selectedModel = 'gpt-4o-mini';
    else if (provider === 'anthropic') selectedModel = 'claude-3-7-sonnet-20250219';
    checkHealth(provider);
  }
</script>

<div class="mobile-chat-container">
  <!-- Top Navigation Bar (iOS Style) -->
  <header class="mobile-chat-header">
    <div class="header-main-info">
      <div class="avatar-ring" class:active={coachStatus === 'ok'}>
        <Brain size={20} />
      </div>
      <div class="title-meta">
        <div class="title-row">
          <h1>Coach IA</h1>
          <span class="badge-tag">
            {#if provider === 'gemini'}
              Gemini 0€
            {:else if provider === 'groq'}
              Groq 0€
            {:else if provider === 'anthropic'}
              Claude
            {:else}
              OpenAI
            {/if}
          </span>
        </div>
        <div class="status-indicator-line">
          {#if coachStatus === 'checking'}
            <span class="dot checking"></span>
            <span class="status-text">Connexion en cours…</span>
          {:else if coachStatus === 'ok'}
            <span class="dot online"></span>
            <span class="status-text">Prêt{activeModel ? ` · ${activeModel}` : ''}</span>
          {:else if coachStatus === 'no_key'}
            <span class="dot warning"></span>
            <span class="status-text">Clé API requise (Gratuit 0€)</span>
          {:else}
            <span class="dot offline"></span>
            <span class="status-text">Déconnecté</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Quick Action Icons -->
    <div class="header-action-group">
      <button
        type="button"
        class="icon-btn-pill"
        onclick={openProfileModal}
        title="Fiche Profil Athlète"
      >
        <UserCheck size={18} />
      </button>

      <button
        type="button"
        class="icon-btn-pill"
        onclick={() => showSettingsModal = true}
        title="Paramètres de l'IA"
      >
        <Settings size={18} />
      </button>
    </div>
  </header>

  <!-- Status Alert (if needed) -->
  {#if coachStatus === 'no_key'}
    <div class="mobile-alert-banner">
      <div class="alert-text">
        <strong>Active ton Coach IA (100% Gratuit 0€)</strong>
        <p>Obtiens ta clé Google AI Studio en 30s sans carte bancaire.</p>
      </div>
      <button type="button" class="btn-alert-cta" onclick={() => showSettingsModal = true}>
        Activer
      </button>
    </div>
  {/if}

  {#if errorMessage}
    <div class="mobile-alert-banner error">
      <div class="alert-text">
        <p>{errorMessage}</p>
      </div>
      <button type="button" class="btn-close-alert" onclick={() => errorMessage = ''}>✕</button>
    </div>
  {/if}

  <!-- Messages Scroll Area (Momentum iOS Scrolling) -->
  <div class="mobile-messages-scroll" bind:this={messagesContainer}>
    {#each messages as msg (msg.id)}
      <div class="msg-bubble-wrap {msg.sender}">
        {#if msg.sender === 'coach'}
          <div class="bubble-avatar-coach">
            <Bot size={16} />
          </div>
        {/if}

        <div class="msg-bubble {msg.sender}">
          <div class="msg-text-body">
            {#if msg.sender === 'coach'}
              {@html formatMessageText(msg.text)}
            {:else}
              {msg.text}
            {/if}
          </div>

          <!-- Proposal Diff if Coach suggests adjustments -->
          {#if msg.actions && msg.actions.length > 0}
            <div class="proposal-embed">
              <ProposalDiff actions={msg.actions} reasoning={msg.reasoning} />
            </div>
          {/if}

          <!-- Bubble Metadata (Time, Model, Copy) -->
          <div class="msg-meta-bar">
            <span class="meta-time">{msg.timestamp}</span>
            {#if msg.duration}
              <span class="meta-duration">{msg.duration}s</span>
            {/if}
            {#if msg.sender === 'coach' && msg.id !== 'welcome'}
              <button
                type="button"
                class="btn-copy-bubble"
                onclick={() => copyMessage(msg)}
                title="Copier"
              >
                {#if copiedMessageId === msg.id}
                  <Check size={12} class="copied-color" />
                {:else}
                  <Copy size={12} />
                {/if}
              </button>
            {/if}
          </div>
        </div>

        {#if msg.sender === 'user'}
          <div class="bubble-avatar-user">
            <User size={16} />
          </div>
        {/if}
      </div>
    {/each}

    <!-- Thinking Indicator -->
    {#if loading}
      <div class="msg-bubble-wrap coach">
        <div class="bubble-avatar-coach pulse">
          <Bot size={16} />
        </div>
        <div class="msg-bubble coach thinking-bubble">
          <div class="thinking-row">
            <div class="dots-bounce">
              <span></span><span></span><span></span>
            </div>
            <span class="thinking-text">Le coach analyse ton entraînement… ({formatElapsed(elapsedSeconds)})</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Horizontal Quick Prompt Chips (Swipeable) -->
  {#if messages.length <= 1 && !loading}
    <div class="quick-chips-scroll">
      {#each QUICK_SUGGESTIONS as item}
        {@const Icon = item.icon}
        <button
          type="button"
          class="chip-pill"
          onclick={() => sendMessage(item.prompt)}
          disabled={coachStatus !== 'ok'}
        >
          <Icon size={13} />
          <span>{item.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Mobile Bottom Input Dock -->
  <footer class="mobile-input-dock">
    <form class="dock-form" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
      <div class="textarea-shell">
        <textarea
          bind:this={textareaElement}
          rows="1"
          placeholder={loading ? 'Analyse en cours…' : coachStatus !== 'ok' ? 'Configure ta clé API dans ⚙️…' : 'Pose une question à ton coach…'}
          bind:value={inputMessage}
          onkeydown={handleKeydown}
          disabled={loading || coachStatus === 'no_key'}
        ></textarea>
      </div>

      <button
        type="submit"
        class="btn-send-circle"
        disabled={loading || !inputMessage.trim() || coachStatus === 'no_key'}
        aria-label="Envoyer"
      >
        {#if loading}
          <Loader2 size={18} class="spin" />
        {:else}
          <Send size={18} />
        {/if}
      </button>
    </form>
  </footer>
</div>

<!-- Settings Action Sheet Modal (iOS Bottom Drawer) -->
{#if showSettingsModal}
  <div class="sheet-backdrop" onclick={() => showSettingsModal = false} role="presentation">
    <div class="sheet-drawer" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="sheet-handle-bar"></div>

      <div class="sheet-header">
        <div class="sheet-title-group">
          <Brain size={20} class="pink-icon" />
          <h3>Moteur d'Intelligence Artificielle</h3>
        </div>
        <button type="button" class="btn-sheet-close" onclick={() => showSettingsModal = false}>
          <X size={18} />
        </button>
      </div>

      <div class="sheet-body">
        <div class="sheet-field">
          <label for="mobile-provider-select">Fournisseur d'IA</label>
          <select id="mobile-provider-select" bind:value={provider} onchange={onProviderChange}>
            <option value="gemini">Google Gemini (Recommandé · 100% Gratuit 0€)</option>
            <option value="groq">Groq Cloud (Llama 3.3 70B · 100% Gratuit 0€)</option>
            <option value="openai">OpenAI (GPT-4o mini / GPT-4o)</option>
            <option value="anthropic">Anthropic Claude (Claude 3.7 Sonnet)</option>
          </select>
        </div>

        {#if provider === 'gemini'}
          <div class="sheet-field">
            <div class="label-row-link">
              <label for="mobile-gemini-key">Clé API Google Gemini (0€)</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" class="link-small">
                <span>Créer ma clé gratuite</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <div class="input-test-wrap">
              <input
                id="mobile-gemini-key"
                type="password"
                bind:value={apiKey}
                placeholder="Colle ta clé (AIzaSy...)"
              />
              <button
                type="button"
                class="btn-test-sheet"
                disabled={isTestingConnection || !apiKey.trim()}
                onclick={testConnection}
              >
                {#if isTestingConnection}
                  <Loader2 size={14} class="spin" />
                {:else}
                  <Wifi size={14} />
                {/if}
                <span>Tester</span>
              </button>
            </div>
            <span class="sheet-hint">
              🔒 100% Gratuit et sans carte bancaire requise.
            </span>
          </div>
        {:else if provider === 'groq'}
          <div class="sheet-field">
            <div class="label-row-link">
              <label for="mobile-groq-key">Clé API Groq (0€)</label>
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" class="link-small">
                <span>Obtenir ma clé</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <input
              id="mobile-groq-key"
              type="password"
              bind:value={apiKey}
              placeholder="gsk_..."
            />
          </div>
        {:else}
          <div class="sheet-field">
            <label for="mobile-cloud-key">Clé API {provider === 'openai' ? 'OpenAI' : 'Anthropic'}</label>
            <input
              id="mobile-cloud-key"
              type="password"
              bind:value={apiKey}
              placeholder="sk-..."
            />
          </div>
        {/if}

        <!-- Dynamic Model List -->
        {#if availableModels.length > 0}
          <div class="sheet-field">
            <label for="mobile-model-select">Modèle sélectionné</label>
            <select id="mobile-model-select" bind:value={selectedModel}>
              {#each availableModels as m}
                <option value={m.name}>
                  {m.description ? m.description : m.name}
                </option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Status Result -->
        <div class="sheet-status-card {coachStatus}">
          <div class="status-top">
            <span class="dot {coachStatus}"></span>
            <strong>{coachStatus === 'ok' ? 'Connecté & Prêt' : coachStatus === 'no_key' ? 'Clé requise' : 'Déconnecté'}</strong>
          </div>
          <p>{coachStatusMessage}</p>
        </div>

        <div class="sheet-security-tag">
          <ShieldCheck size={14} />
          <span>Ta clé est enregistrée sur ton iPhone et protégée contre tout entraînement d'IA.</span>
        </div>
      </div>

      <div class="sheet-footer">
        <button type="button" class="btn-sheet-cancel" onclick={() => showSettingsModal = false}>
          Annuler
        </button>
        <button type="button" class="btn-sheet-save" onclick={saveSettings}>
          Enregistrer
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Athlete Profile Fullscreen Sheet Modal -->
{#if showProfileModal}
  <div class="sheet-backdrop" onclick={() => showProfileModal = false} role="presentation">
    <div class="sheet-drawer fullscreen-drawer" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="sheet-handle-bar"></div>

      <div class="sheet-header">
        <div class="sheet-title-group">
          <UserCheck size={20} class="pink-icon" />
          <div>
            <h3>Fiche Profil Athlète</h3>
            <span class="sheet-sub">Directives utilisées par le Coach</span>
          </div>
        </div>
        <button type="button" class="btn-sheet-close" onclick={() => showProfileModal = false}>
          <X size={18} />
        </button>
      </div>

      <div class="sheet-body profile-body">
        <div class="profile-note">
          💡 Contient tes mensurations (193cm, ~83kg), tes objectifs (Front Lever, Handstand, Squat 100kg) et toutes les règles d'entraînement.
        </div>

        {#if profileSaveFeedback}
          <div class="profile-feedback-tag">
            {profileSaveFeedback}
          </div>
        {/if}

        <textarea
          class="profile-mobile-editor"
          bind:value={athleteProfileText}
          placeholder="Chargement du profil…"
          rows="16"
        ></textarea>
      </div>

      <div class="sheet-footer">
        <button type="button" class="btn-sheet-cancel" onclick={() => showProfileModal = false}>
          Fermer
        </button>
        <button type="button" class="btn-sheet-save" disabled={isSavingProfile} onclick={saveProfile}>
          {#if isSavingProfile}
            <Loader2 size={16} class="spin" />
            <span>Enregistrement…</span>
          {:else}
            <Save size={16} />
            <span>Enregistrer</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .mobile-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }

  /* === Top Header === */
  .mobile-chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-card) 90%, var(--bg-elevated));
    flex-shrink: 0;
    gap: 0.5rem;
  }

  .header-main-info {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .avatar-ring {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--pink) 50%, var(--deepblue)));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #070706;
    flex-shrink: 0;
  }

  .title-meta {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .title-row h1 {
    font-size: 0.98rem;
    font-weight: 800;
    margin: 0;
    line-height: 1.2;
    color: var(--text-heading);
  }

  .badge-tag {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pink) 16%, transparent);
    color: var(--pink);
    border: 1px solid color-mix(in srgb, var(--pink) 30%, transparent);
  }

  .status-indicator-line {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1;
  }

  .status-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 170px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.online { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
  .dot.offline { background: var(--destructive); }
  .dot.warning { background: var(--warning); }
  .dot.checking { background: var(--text-muted); animation: pulse 1.2s infinite; }

  .header-action-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .icon-btn-pill {
    width: 36px;
    height: 36px;
    min-height: 36px;
    min-width: 36px;
    border-radius: 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
  }

  .icon-btn-pill:active {
    color: var(--pink);
    border-color: var(--pink);
    transform: scale(0.94);
  }

  /* === Mobile Alert Banner === */
  .mobile-alert-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.65rem 0.95rem;
    background: color-mix(in srgb, var(--warning) 12%, var(--bg-card));
    border-bottom: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
    color: var(--warning);
    font-size: 0.78rem;
  }

  .mobile-alert-banner.error {
    background: color-mix(in srgb, var(--destructive) 12%, var(--bg-card));
    border-color: color-mix(in srgb, var(--destructive) 25%, transparent);
    color: var(--destructive);
  }

  .alert-text p {
    margin: 0.1rem 0 0;
    font-size: 0.72rem;
    opacity: 0.88;
  }

  .btn-alert-cta {
    background: var(--warning);
    color: #070706;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.3rem 0.65rem;
    border-radius: 8px;
    min-height: auto;
    white-space: nowrap;
  }

  .btn-close-alert {
    background: none;
    border: none;
    color: inherit;
    font-size: 0.9rem;
    min-height: auto;
    padding: 0.2rem;
  }

  /* === Messages Scroll Area === */
  .mobile-messages-scroll {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0.95rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .msg-bubble-wrap {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    max-width: 92%;
    animation: fadeInMsg 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .msg-bubble-wrap.coach {
    align-self: flex-start;
  }

  .msg-bubble-wrap.user {
    align-self: flex-end;
  }

  .bubble-avatar-coach {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--pink) 60%, var(--deepblue)));
    color: #070706;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .bubble-avatar-user {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .msg-bubble {
    border-radius: 16px;
    padding: 0.75rem 0.95rem;
    font-size: 0.88rem;
    line-height: 1.5;
    word-break: break-word;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  }

  .msg-bubble.coach {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-top-left-radius: 4px;
    color: var(--text);
  }

  .msg-bubble.user {
    background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 25%, var(--bg-elevated)), color-mix(in srgb, var(--pink) 15%, var(--bg-elevated)));
    border: 1px solid color-mix(in srgb, var(--pink) 35%, transparent);
    border-top-right-radius: 4px;
    color: var(--text-heading);
  }

  .msg-text-body :global(strong) {
    font-weight: 700;
    color: var(--pink);
  }

  .msg-text-body :global(code) {
    background: color-mix(in srgb, var(--pink) 15%, var(--bg-card));
    color: var(--pink);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
  }

  .msg-text-body :global(.list-bullet) {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin: 0.3rem 0;
  }

  .msg-text-body :global(.num-badge) {
    font-size: 0.7rem;
    font-weight: 700;
    background: color-mix(in srgb, var(--pink) 20%, transparent);
    color: var(--pink);
    padding: 0 0.3rem;
    border-radius: 4px;
  }

  .msg-text-body :global(.paragraph-gap) {
    height: 0.6rem;
  }

  .proposal-embed {
    margin-top: 0.65rem;
    padding-top: 0.65rem;
    border-top: 1px dashed var(--border);
  }

  .msg-meta-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    margin-top: 0.4rem;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .meta-duration {
    color: var(--pink);
  }

  .btn-copy-bubble {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.1rem 0.3rem;
    cursor: pointer;
    min-height: auto;
  }

  .copied-color {
    color: #4ade80;
  }

  /* === Thinking Bubble === */
  .thinking-bubble {
    border: 1px dashed color-mix(in srgb, var(--pink) 40%, var(--border)) !important;
  }

  .thinking-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .dots-bounce {
    display: flex;
    gap: 3px;
  }

  .dots-bounce span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--pink);
    animation: bounce 1.4s infinite ease-in-out;
  }

  .dots-bounce span:nth-child(2) { animation-delay: 0.2s; }
  .dots-bounce span:nth-child(3) { animation-delay: 0.4s; }

  .thinking-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
  }

  /* === Quick Chips === */
  .quick-chips-scroll {
    display: flex;
    gap: 0.45rem;
    padding: 0.5rem 0.85rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-card) 95%, var(--bg-elevated));
    flex-shrink: 0;
  }

  .quick-chips-scroll::-webkit-scrollbar {
    display: none;
  }

  .chip-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    min-height: 32px;
    flex-shrink: 0;
  }

  .chip-pill:active {
    color: var(--pink);
    border-color: var(--pink);
  }

  /* === Mobile Input Dock === */
  .mobile-input-dock {
    padding: 0.65rem 0.85rem;
    border-top: 1px solid var(--border);
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .dock-form {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
  }

  .textarea-shell {
    flex: 1;
    min-width: 0;
  }

  .textarea-shell textarea {
    width: 100%;
    min-height: 44px;
    max-height: 100px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.65rem 0.85rem;
    color: var(--text);
    font-size: 16px !important;
    line-height: 1.35;
    resize: none;
    display: block;
    box-sizing: border-box;
  }

  .textarea-shell textarea:focus {
    border-color: var(--pink);
    outline: none;
  }

  .btn-send-circle {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    max-width: 44px !important;
    max-height: 44px !important;
    border-radius: 50% !important;
    background: var(--pink) !important;
    color: #070706 !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 2px 10px rgba(230, 166, 178, 0.3) !important;
  }

  .btn-send-circle:active {
    transform: scale(0.92) !important;
  }

  .btn-send-circle:disabled {
    opacity: 0.35 !important;
    box-shadow: none !important;
  }

  /* === iOS Bottom Sheet Drawer === */
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(7, 7, 6, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 2000;
  }

  .sheet-drawer {
    background: var(--bg-card);
    border-radius: 24px 24px 0 0;
    border: 1px solid var(--border);
    border-bottom: none;
    width: 100%;
    max-width: 500px;
    max-height: 88dvh;
    max-height: 88svh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 16px));
    animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
  }

  .fullscreen-drawer {
    max-height: 94dvh !important;
    max-height: 94svh !important;
  }

  .sheet-handle-bar {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--border) 180%, transparent);
    margin: 8px auto 4px;
    flex-shrink: 0;
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .sheet-title-group {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .sheet-title-group h3 {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 700;
  }

  .sheet-sub {
    font-size: 0.7rem;
    color: var(--text-muted);
    display: block;
  }

  .pink-icon {
    color: var(--pink);
  }

  .btn-sheet-close {
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 0.25rem;
    min-height: auto;
  }

  .sheet-body {
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .sheet-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .sheet-field label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .label-row-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .link-small {
    font-size: 0.72rem;
    color: var(--pink);
    text-decoration: underline;
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .input-test-wrap {
    display: flex;
    gap: 0.45rem;
  }

  .input-test-wrap input {
    flex: 1;
  }

  .btn-test-sheet {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0 0.85rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    min-height: 48px;
  }

  .sheet-hint {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .sheet-status-card {
    padding: 0.75rem 0.95rem;
    border-radius: 12px;
    font-size: 0.78rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sheet-status-card.ok {
    background: color-mix(in srgb, #4ade80 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, #4ade80 30%, transparent);
  }

  .sheet-status-card.no_key, .sheet-status-card.offline {
    background: color-mix(in srgb, var(--warning) 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  }

  .status-top {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .sheet-status-card p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .sheet-security-tag {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: color-mix(in srgb, var(--pink) 10%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--pink) 20%, transparent);
    padding: 0.55rem 0.75rem;
    border-radius: 10px;
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .sheet-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    padding: 0.85rem 1.25rem 0;
    border-top: 1px solid var(--border);
  }

  .btn-sheet-cancel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0.6rem 1.1rem;
    border-radius: 12px;
    font-size: 0.88rem;
    min-height: 44px;
  }

  .btn-sheet-save {
    background: var(--pink);
    color: #070706;
    padding: 0.6rem 1.3rem;
    border-radius: 12px;
    font-size: 0.88rem;
    font-weight: 700;
    min-height: 44px;
  }

  /* === Profile Modal Mobile Sheet === */
  .profile-note {
    background: color-mix(in srgb, var(--pink) 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--pink) 25%, transparent);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .profile-feedback-tag {
    padding: 0.55rem 0.85rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    background: color-mix(in srgb, #4ade80 18%, var(--bg-elevated));
    color: #4ade80;
  }

  .profile-mobile-editor {
    width: 100%;
    min-height: 320px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 0.82rem !important;
    line-height: 1.5;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.75rem 0.85rem;
    color: var(--text);
    box-sizing: border-box;
  }

  @keyframes fadeInMsg {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
