<script lang="ts">
  import ProposalDiff from './ProposalDiff.svelte';
  import type { CoachAction } from '@appmuscu/shared-schema';
  import {
    Send,
    Bot,
    User,
    UserCheck,
    FileText,
    Sparkles,
    AlertCircle,
    Wifi,
    WifiOff,
    Loader2,
    ChevronDown,
    Zap,
    TrendingUp,
    Dumbbell,
    Clock,
    Brain,
    Settings,
    Copy,
    Check,
    HelpCircle,
    RefreshCw,
    X,
    Save
  } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';

  interface Message {
    id: string;
    sender: 'user' | 'coach';
    text: string;
    timestamp: string;
    model?: string;
    actions?: CoachAction[];
    reasoning?: string;
    duration?: number | null;
  }

  interface OllamaModel {
    name: string;
    size?: string;
    modifiedAt?: string;
  }

  let messages = $state<Message[]>([]);
  let inputMessage = $state('');
  let loading = $state(false);
  let errorMessage = $state('');
  let copiedMessageId = $state<string | null>(null);

  // Settings & Status
  let ollamaUrl = $state('http://127.0.0.1:11434');
  let selectedModel = $state('');
  let availableModels = $state<OllamaModel[]>([]);
  let ollamaStatus = $state<'checking' | 'ok' | 'offline' | 'no_model' | 'error'>('checking');
  let ollamaStatusMessage = $state('');
  let activeModel = $state('');
  let isTestingConnection = $state(false);
  let showSettingsModal = $state(false);
  let showHelpAccordion = $state(false);

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
  let showScrollButton = $state(false);

  const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    sender: 'coach',
    text: 'Salut ! 👋 Je suis ton **Coach IA personnel**. J\'ai accès à tout ton historique d\'entraînement, tes charges actuelles, tes RPE et ta progression.\n\nPose-moi n\'importe quelle question sur tes séances, demande-moi d\'analyser tes perfs ou d\'ajuster tes charges pour ta prochaine séance !',
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  };

  const QUICK_SUGGESTIONS = [
    { label: 'Bilan global', icon: TrendingUp, prompt: 'Fais-moi un bilan global complet de mes dernières séances. Analyse ma progression, mes points forts et mes axes d\'amélioration.' },
    { label: 'Analyse charges', icon: Dumbbell, prompt: 'Analyse mes charges sur mes exercices principaux. Est-ce que je progresse bien ? Quels ajustements me conseilles-tu ?' },
    { label: 'Prochaine séance', icon: Zap, prompt: 'Quels sont tes conseils pour ma prochaine séance d\'entraînement ? Quels poids devrais-je viser ?' },
    { label: 'Fatigue & RPE', icon: Clock, prompt: 'Analyse mon niveau de fatigue récent d\'après mes RPE et mes sensations. Dois-je lever le pied ou continuer à pousser ?' },
  ];

  onMount(async () => {
    const storedUrl = localStorage.getItem('appmuscu_ollama_url');
    if (storedUrl) ollamaUrl = storedUrl;
    const storedModel = localStorage.getItem('appmuscu_ollama_model');
    if (storedModel) selectedModel = storedModel;

    messages = [WELCOME_MESSAGE];
    await checkOllamaStatus();
  });

  async function checkOllamaStatus(customUrl?: string) {
    ollamaStatus = 'checking';
    const targetUrl = customUrl || ollamaUrl;

    try {
      const res = await fetch(`/api/coach/health?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      ollamaStatus = data.status;
      ollamaStatusMessage = data.message;
      availableModels = data.models || [];
      activeModel = selectedModel || data.preferredModel || (data.models?.[0]?.name ?? '');
      if (!selectedModel && activeModel) {
        selectedModel = activeModel;
      }
    } catch {
      ollamaStatus = 'error';
      ollamaStatusMessage = `Impossible de contacter l'API coach (${targetUrl}).`;
    }
  }

  async function testConnection() {
    isTestingConnection = true;
    await checkOllamaStatus();
    isTestingConnection = false;
  }

  function saveSettings() {
    localStorage.setItem('appmuscu_ollama_url', ollamaUrl);
    if (selectedModel) {
      localStorage.setItem('appmuscu_ollama_model', selectedModel);
    }
    showSettingsModal = false;
    checkOllamaStatus();
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
      }, 1200);
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

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    showScrollButton = scrollHeight - scrollTop - clientHeight > 100;
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
          model: selectedModel || activeModel,
          ollamaUrl
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
      textareaElement?.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function triggerQuickAnalysis() {
    sendMessage('Fais-moi un bilan global complet de mes dernières séances : analyse ma progression, ma fatigue, mes points forts et donne-moi tes recommandations pour les prochains jours.');
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
</script>

<div class="coach-wrapper">
  <div class="coach-container">
    <!-- Header -->
    <header class="coach-header">
      <div class="header-left">
        <div class="header-avatar" class:active={ollamaStatus === 'ok'}>
          <Brain size={22} />
          {#if ollamaStatus === 'ok'}
            <span class="avatar-glow"></span>
          {/if}
        </div>
        <div class="header-info">
          <div class="header-title-row">
            <h2>Coach IA Personnel</h2>
            <span class="badge-ai">Local & Privé</span>
          </div>
          <div class="header-status">
            {#if ollamaStatus === 'checking'}
              <span class="status-dot checking"></span>
              <span class="status-text">Vérification de la connexion…</span>
            {:else if ollamaStatus === 'ok'}
              <span class="status-dot online"></span>
              <span class="status-text">Prêt{activeModel ? ` · ${activeModel}` : ''}</span>
            {:else if ollamaStatus === 'no_model'}
              <span class="status-dot warning"></span>
              <span class="status-text">Ollama actif sans modèle</span>
            {:else}
              <span class="status-dot offline"></span>
              <span class="status-text">Hors ligne</span>
            {/if}
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="btn-sparkle"
          onclick={triggerQuickAnalysis}
          disabled={loading || ollamaStatus !== 'ok'}
          title="Lancer une analyse complète de ton historique"
        >
          <Sparkles size={15} />
          <span class="btn-sparkle-text">Bilan rapide</span>
        </button>

        <button
          type="button"
          class="btn-icon-header"
          onclick={openProfileModal}
          title="Consulter et modifier ma fiche Profil Athlète"
        >
          <UserCheck size={18} />
        </button>

        <button
          type="button"
          class="btn-icon-header"
          onclick={() => showSettingsModal = true}
          title="Paramètres de connexion Ollama"
        >
          <Settings size={18} />
        </button>

        <button
          type="button"
          class="btn-icon-header"
          onclick={() => checkOllamaStatus()}
          title="Rafraîchir l'état"
        >
          <RefreshCw size={17} class={ollamaStatus === 'checking' ? 'spin' : ''} />
        </button>
      </div>
    </header>

    <!-- Status Notice (if offline or error) -->
    {#if ollamaStatus !== 'ok' && ollamaStatus !== 'checking'}
      <div class="status-banner" class:warning={ollamaStatus === 'no_model'} class:error={ollamaStatus === 'offline' || ollamaStatus === 'error'}>
        <div class="status-banner-content">
          <AlertCircle size={17} class="status-icon" />
          <div class="status-banner-text">
            <strong>{ollamaStatus === 'no_model' ? 'Aucun modèle IA installé' : 'Ollama déconnecté'}</strong>
            <p>{ollamaStatusMessage}</p>
          </div>
        </div>
        <button type="button" class="btn-banner-action" onclick={() => showSettingsModal = true}>
          Configurer
        </button>
      </div>
    {/if}

    <!-- Error Banner -->
    {#if errorMessage}
      <div class="status-banner error">
        <div class="status-banner-content">
          <AlertCircle size={17} class="status-icon" />
          <span>{errorMessage}</span>
        </div>
        <button class="dismiss-btn" onclick={() => errorMessage = ''} aria-label="Fermer">✕</button>
      </div>
    {/if}

    <!-- Messages List -->
    <div class="messages-area" bind:this={messagesContainer} onscroll={handleScroll}>
      {#each messages as msg (msg.id)}
        <div class="msg-row {msg.sender}">
          {#if msg.sender === 'coach'}
            <div class="msg-avatar coach-avatar">
              <Bot size={18} />
            </div>
          {/if}

          <div class="msg-bubble {msg.sender}">
            <div class="msg-content">
              {#if msg.sender === 'coach'}
                {@html formatMessageText(msg.text)}
              {:else}
                {msg.text}
              {/if}
            </div>

            <!-- Proposed Actions Diff -->
            {#if msg.actions && msg.actions.length > 0}
              <div class="msg-actions-container">
                <ProposalDiff actions={msg.actions} reasoning={msg.reasoning} />
              </div>
            {/if}

            <!-- Message Footer / Meta -->
            <div class="msg-footer">
              <div class="msg-meta-left">
                <span class="msg-time">{msg.timestamp}</span>
                {#if msg.model}
                  <span class="msg-badge">{msg.model}</span>
                {/if}
                {#if msg.duration}
                  <span class="msg-badge duration">{msg.duration}s</span>
                {/if}
              </div>

              {#if msg.sender === 'coach' && msg.id !== 'welcome'}
                <button
                  type="button"
                  class="msg-copy-btn"
                  onclick={() => copyMessage(msg)}
                  title="Copier la réponse"
                >
                  {#if copiedMessageId === msg.id}
                    <Check size={13} class="copied-icon" />
                    <span>Copié</span>
                  {:else}
                    <Copy size={13} />
                  {/if}
                </button>
              {/if}
            </div>
          </div>

          {#if msg.sender === 'user'}
            <div class="msg-avatar user-avatar">
              <User size={18} />
            </div>
          {/if}
        </div>
      {/each}

      <!-- Thinking Indicator -->
      {#if loading}
        <div class="msg-row coach">
          <div class="msg-avatar coach-avatar pulsing">
            <Bot size={18} />
          </div>
          <div class="msg-bubble coach loading-bubble">
            <div class="typing-indicator">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <div class="typing-info">
                <span class="typing-label">Le coach analyse ton entraînement…</span>
                <span class="typing-timer">{formatElapsed(elapsedSeconds)}</span>
              </div>
            </div>
            {#if elapsedSeconds > 12}
              <div class="typing-patience">
                💡 Analyse approfondie de tes séries, RPE et progression en cours…
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Scroll to bottom button -->
    {#if showScrollButton}
      <button class="scroll-bottom-btn" onclick={() => scrollToBottom()} aria-label="Défiler vers le bas">
        <ChevronDown size={20} />
      </button>
    {/if}

    <!-- Quick Suggestions Bar -->
    {#if messages.length <= 1 && !loading}
      <div class="suggestions-bar">
        <span class="suggestions-label">Suggestions :</span>
        {#each QUICK_SUGGESTIONS as suggestion}
          {@const Icon = suggestion.icon}
          <button
            type="button"
            class="suggestion-chip"
            onclick={() => sendMessage(suggestion.prompt)}
            disabled={ollamaStatus !== 'ok'}
          >
            <Icon size={14} class="chip-icon" />
            <span>{suggestion.label}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Input Bar -->
    <form class="input-area" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
      <div class="input-wrapper">
        <textarea
          bind:this={textareaElement}
          rows="1"
          placeholder={loading ? 'Le coach réfléchit…' : 'Pose une question à ton coach (Entrée pour envoyer)…'}
          bind:value={inputMessage}
          onkeydown={handleKeydown}
          disabled={loading || ollamaStatus === 'offline'}
        ></textarea>
      </div>

      <button
        type="submit"
        class="send-btn"
        disabled={loading || !inputMessage.trim() || ollamaStatus === 'offline'}
        title="Envoyer le message"
      >
        {#if loading}
          <Loader2 size={20} class="spin" />
        {:else}
          <Send size={19} />
        {/if}
      </button>
    </form>
  </div>
</div>

<!-- Connection Settings Modal -->
{#if showSettingsModal}
  <div class="modal-backdrop" onclick={() => showSettingsModal = false} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header">
        <div class="modal-title-group">
          <Settings size={20} class="modal-icon" />
          <h3>Configuration du Coach IA (Ollama)</h3>
        </div>
        <button type="button" class="modal-close" onclick={() => showSettingsModal = false}>
          <X size={18} />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="ollama-url-input">URL du serveur Ollama</label>
          <div class="input-with-action">
            <input
              id="ollama-url-input"
              type="text"
              bind:value={ollamaUrl}
              placeholder="http://127.0.0.1:11434"
            />
            <button
              type="button"
              class="btn-test"
              disabled={isTestingConnection}
              onclick={testConnection}
            >
              {#if isTestingConnection}
                <Loader2 size={15} class="spin" />
              {:else}
                <Wifi size={15} />
              {/if}
              <span>Tester</span>
            </button>
          </div>
          <span class="form-hint">
            Par défaut : <code>http://127.0.0.1:11434</code> (ou ton IP locale / tunnel si sur mobile).
          </span>
        </div>

        <div class="form-group">
          <label for="ollama-model-select">Modèle IA</label>
          {#if availableModels.length > 0}
            <select id="ollama-model-select" bind:value={selectedModel}>
              {#each availableModels as m}
                <option value={m.name}>
                  {m.name} {m.size ? `(${m.size})` : ''}
                </option>
              {/each}
            </select>
          {:else}
            <input
              id="ollama-model-select"
              type="text"
              bind:value={selectedModel}
              placeholder="ex: llama3.1:8b, mistral, deepseek-r1:8b"
            />
          {/if}
          <span class="form-hint">
            Modèles recommandés : <strong>llama3.1:8b</strong>, <strong>mistral</strong>, <strong>deepseek-r1:8b</strong>.
          </span>
        </div>

        <!-- Connection Test Result -->
        <div class="connection-status-box {ollamaStatus}">
          <div class="status-indicator">
            <span class="status-dot {ollamaStatus}"></span>
            <strong>Statut : {ollamaStatus === 'ok' ? 'Connecté' : ollamaStatus === 'no_model' ? 'Sans modèle' : 'Hors ligne'}</strong>
          </div>
          <p>{ollamaStatusMessage}</p>
        </div>

        <!-- Guide de démarrage -->
        <div class="help-section">
          <button
            type="button"
            class="help-toggle"
            onclick={() => showHelpAccordion = !showHelpAccordion}
          >
            <HelpCircle size={16} />
            <span>Guide rapide : lancer Ollama sur ton PC</span>
            <ChevronDown size={16} class="help-chevron {showHelpAccordion ? 'open' : ''}" />
          </button>

          {#if showHelpAccordion}
            <div class="help-content">
              <ol>
                <li>
                  Installe <strong>Ollama</strong> depuis <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>.
                </li>
                <li>
                  Ouvre ton terminal (PowerShell ou Invite de commandes) et télécharge un modèle :
                  <pre><code>ollama pull llama3.1:8b</code></pre>
                </li>
                <li>
                  Lance le serveur Ollama :
                  <pre><code>ollama serve</code></pre>
                </li>
                <li>
                  Si tu utilises l'appli depuis ton téléphone, configure l'adresse IP de ton PC (ex: <code>http://192.168.1.50:11434</code>) ou utilise un tunnel Cloudflare gratuit.
                </li>
              </ol>
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => showSettingsModal = false}>
          Annuler
        </button>
        <button type="button" class="btn-save" onclick={saveSettings}>
          Enregistrer
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Athlete Profile Viewer / Editor Modal -->
{#if showProfileModal}
  <div class="modal-backdrop" onclick={() => showProfileModal = false} role="presentation">
    <div class="modal-card profile-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header">
        <div class="modal-title-group">
          <UserCheck size={20} class="modal-icon" />
          <div>
            <h3>Fiche Profil Athlète & Directives</h3>
            <span class="profile-subtitle">Source de vérité utilisée par le Coach IA</span>
          </div>
        </div>
        <button type="button" class="modal-close" onclick={() => showProfileModal = false}>
          <X size={18} />
        </button>
      </div>

      <div class="modal-body profile-modal-body">
        <p class="profile-info-banner">
          💡 Cette fiche définit ton identité athlétique, tes mensurations (193cm, ~83kg), tes records, ton passé volley et toutes les règles de programmation. Tu peux la modifier manuellement ou laisser le coach te proposer des ajustements au fil de tes séances.
        </p>

        {#if profileSaveFeedback}
          <div class="profile-feedback-box">
            {profileSaveFeedback}
          </div>
        {/if}

        <div class="profile-editor-container">
          <label for="athlete-profile-textarea">Spécification complète du profil :</label>
          <textarea
            id="athlete-profile-textarea"
            class="profile-textarea"
            bind:value={athleteProfileText}
            placeholder="Chargement de ton profil athlète…"
            rows="18"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => showProfileModal = false}>
          Fermer
        </button>
        <button type="button" class="btn-save" disabled={isSavingProfile} onclick={saveProfile}>
          {#if isSavingProfile}
            <Loader2 size={16} class="spin" />
            <span>Enregistrement…</span>
          {:else}
            <Save size={16} />
            <span>Enregistrer mon profil</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .coach-wrapper {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .coach-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
    max-height: 860px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 12px 36px -8px rgba(0, 0, 0, 0.45);
  }

  @media (min-width: 768px) {
    .coach-container {
      height: calc(100vh - 110px);
      max-height: 880px;
    }
  }

  @media (max-width: 767px) {
    .coach-container {
      height: calc(100svh - 135px);
      border-radius: 16px;
    }
  }

  /* === Header === */
  .coach-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-card) 90%, var(--bg-elevated));
    flex-shrink: 0;
    gap: 0.75rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
  }

  .header-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--pink) 50%, var(--deepblue)));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #070706;
    flex-shrink: 0;
    position: relative;
  }

  .avatar-glow {
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    background: var(--pink);
    opacity: 0.35;
    filter: blur(4px);
    z-index: -1;
    animation: pulseGlow 2.5s infinite ease-in-out;
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .header-info h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
    color: var(--text-heading);
    white-space: nowrap;
  }

  .badge-ai {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pink) 18%, transparent);
    color: var(--pink);
    border: 1px solid color-mix(in srgb, var(--pink) 35%, transparent);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1;
  }

  .status-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.online {
    background: #4ade80;
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
  }

  .status-dot.offline {
    background: var(--destructive);
    box-shadow: 0 0 8px rgba(214, 90, 90, 0.5);
  }

  .status-dot.warning {
    background: var(--warning);
    box-shadow: 0 0 8px rgba(201, 146, 58, 0.5);
  }

  .status-dot.checking {
    background: var(--text-muted);
    animation: pulse 1.2s infinite;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn-sparkle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 10px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 25%, var(--bg-card)), color-mix(in srgb, var(--pink) 15%, var(--bg-card)));
    border: 1px solid color-mix(in srgb, var(--pink) 40%, transparent);
    color: var(--pink);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 38px;
    transition: all 0.18s ease;
    font-family: 'Montserrat', sans-serif;
  }

  .btn-sparkle:hover:not(:disabled) {
    background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 35%, var(--bg-card)), color-mix(in srgb, var(--pink) 22%, var(--bg-card)));
    border-color: var(--pink);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(230, 166, 178, 0.2);
  }

  .btn-sparkle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 600px) {
    .btn-sparkle-text {
      display: none;
    }
    .btn-sparkle {
      padding: 0.45rem;
      min-width: 38px;
      justify-content: center;
    }
  }

  .btn-icon-header {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    min-height: 38px;
    min-width: 38px;
    padding: 0;
    transition: all 0.15s ease;
  }

  .btn-icon-header:hover {
    color: var(--text-heading);
    border-color: var(--pink);
    background: color-mix(in srgb, var(--pink) 10%, var(--bg-elevated));
  }

  /* === Status Banner === */
  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.82rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .status-banner.error {
    background: color-mix(in srgb, var(--destructive) 14%, var(--bg-card));
    color: var(--destructive);
    border-color: color-mix(in srgb, var(--destructive) 30%, transparent);
  }

  .status-banner.warning {
    background: color-mix(in srgb, var(--warning) 14%, var(--bg-card));
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning) 30%, transparent);
  }

  .status-banner-content {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
  }

  .status-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .status-banner-text p {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    opacity: 0.9;
  }

  .btn-banner-action {
    background: var(--bg-elevated);
    border: 1px solid currentColor;
    color: inherit;
    border-radius: 8px;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 32px;
    white-space: nowrap;
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    font-size: 1rem;
    min-height: auto;
    opacity: 0.7;
  }

  /* === Messages Area === */
  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
    scroll-behavior: smooth;
  }

  .messages-area::-webkit-scrollbar {
    width: 6px;
  }

  .messages-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-area::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 6px;
  }

  .msg-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    max-width: 88%;
    animation: fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (max-width: 768px) {
    .msg-row {
      max-width: 96%;
    }
  }

  .msg-row.coach {
    align-self: flex-start;
  }

  .msg-row.user {
    align-self: flex-end;
  }

  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .coach-avatar {
    background: linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--pink) 60%, var(--deepblue)));
    color: #070706;
  }

  .coach-avatar.pulsing {
    animation: pulse 1.5s infinite;
  }

  .user-avatar {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }

  .msg-bubble {
    border-radius: 16px;
    padding: 0.95rem 1.2rem;
    font-size: 0.92rem;
    line-height: 1.6;
    min-width: 100px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .msg-bubble.coach {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-top-left-radius: 4px;
    color: var(--text);
  }

  .msg-bubble.user {
    background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 24%, var(--bg-elevated)), color-mix(in srgb, var(--pink) 15%, var(--bg-elevated)));
    border: 1px solid color-mix(in srgb, var(--pink) 35%, transparent);
    border-top-right-radius: 4px;
    color: var(--text-heading);
  }

  .msg-content {
    word-break: break-word;
    white-space: pre-wrap;
  }

  .msg-content :global(strong) {
    font-weight: 700;
    color: var(--pink);
  }

  .msg-content :global(code) {
    background: color-mix(in srgb, var(--pink) 15%, var(--bg-card));
    color: var(--pink);
    padding: 0.15rem 0.4rem;
    border-radius: 6px;
    font-size: 0.85em;
    font-family: monospace;
  }

  .msg-content :global(.list-bullet) {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    margin: 0.35rem 0;
    padding-left: 0.2rem;
  }

  .msg-content :global(.list-bullet.num) {
    gap: 0.55rem;
  }

  .msg-content :global(.num-badge) {
    font-size: 0.72rem;
    font-weight: 700;
    background: color-mix(in srgb, var(--pink) 20%, transparent);
    color: var(--pink);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    line-height: 1.2;
    margin-top: 3px;
  }

  .msg-content :global(.paragraph-gap) {
    height: 0.75rem;
  }

  .msg-actions-container {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px dashed var(--border);
  }

  .msg-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.65rem;
    padding-top: 0.45rem;
    border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .msg-meta-left {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .msg-badge {
    background: color-mix(in srgb, var(--border) 60%, transparent);
    padding: 0.1rem 0.4rem;
    border-radius: 6px;
    font-family: 'Montserrat', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }

  .msg-badge.duration {
    color: var(--pink);
    background: color-mix(in srgb, var(--pink) 12%, transparent);
  }

  .msg-copy-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    min-height: auto;
    font-size: 0.7rem;
    transition: all 0.15s ease;
  }

  .msg-copy-btn:hover {
    color: var(--text-heading);
    background: var(--bg-card);
  }

  .copied-icon {
    color: #4ade80;
  }

  /* === Loading Bubble === */
  .loading-bubble {
    border: 1px dashed color-mix(in srgb, var(--pink) 50%, var(--border)) !important;
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .typing-dots {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--pink);
    animation: typingBounce 1.4s infinite ease-in-out;
    opacity: 0.5;
  }

  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

  .typing-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .typing-label {
    font-size: 0.84rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .typing-timer {
    font-family: 'Montserrat', monospace;
    font-size: 0.72rem;
    color: var(--pink);
    font-weight: 700;
  }

  .typing-patience {
    margin-top: 0.65rem;
    padding-top: 0.55rem;
    border-top: 1px dashed var(--border);
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  /* === Scroll to Bottom Button === */
  .scroll-bottom-btn {
    position: absolute;
    bottom: 130px;
    right: 1.5rem;
    width: 38px;
    height: 38px;
    min-height: 38px;
    border-radius: 50%;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    padding: 0;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;
  }

  .scroll-bottom-btn:hover {
    color: var(--pink);
    border-color: var(--pink);
    transform: translateY(-2px);
  }

  /* === Quick Suggestions Bar === */
  .suggestions-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.25rem;
    overflow-x: auto;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-card) 95%, var(--bg-elevated));
    scrollbar-width: none;
  }

  .suggestions-bar::-webkit-scrollbar {
    display: none;
  }

  .suggestions-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    margin-right: 0.25rem;
  }

  .suggestion-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    min-height: 34px;
    transition: all 0.15s ease;
    font-family: 'Montserrat', sans-serif;
  }

  .suggestion-chip:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pink) 15%, var(--bg-elevated));
    border-color: var(--pink);
    color: var(--pink);
    transform: translateY(-1px);
  }

  .suggestion-chip:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* === Input Area (Fixed & Balanced) === */
  .input-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.25rem;
    border-top: 1px solid var(--border);
    background: var(--bg-card);
    flex-shrink: 0;
    box-sizing: border-box;
    width: 100%;
  }

  .input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .input-wrapper textarea {
    width: 100%;
    min-height: 48px;
    max-height: 120px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.75rem 1rem;
    color: var(--text);
    font-family: 'Open Sans', sans-serif;
    font-size: 0.92rem;
    line-height: 1.4;
    resize: none;
    transition: all 0.18s ease;
    box-sizing: border-box;
    display: block;
  }

  .input-wrapper textarea:focus {
    border-color: var(--pink);
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--pink) 25%, transparent);
  }

  .input-wrapper textarea::placeholder {
    color: var(--text-muted);
    opacity: 0.65;
  }

  .send-btn {
    /* STRICT FIXED DIMENSIONS to override any global width:100% */
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 48px !important;
    min-width: 48px !important;
    max-width: 48px !important;
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
    flex-shrink: 0 !important;
    border-radius: 14px !important;
    background: var(--pink) !important;
    color: #070706 !important;
    border: none !important;
    cursor: pointer !important;
    padding: 0 !important;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
    box-sizing: border-box !important;
  }

  .send-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pink) 85%, #fff) !important;
    transform: scale(1.05) !important;
    box-shadow: 0 4px 14px rgba(230, 166, 178, 0.35) !important;
  }

  .send-btn:disabled {
    opacity: 0.35 !important;
    cursor: not-allowed !important;
    transform: none !important;
    box-shadow: none !important;
  }

  /* === Modal Styles === */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(7, 7, 6, 0.78);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  .modal-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-title-group {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .modal-title-group h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .modal-icon {
    color: var(--pink);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    min-height: auto;
  }

  .modal-close:hover {
    color: var(--text);
  }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-heading);
  }

  .input-with-action {
    display: flex;
    gap: 0.5rem;
  }

  .input-with-action input {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    color: var(--text);
    font-size: 0.9rem;
    min-height: 44px;
  }

  .btn-test {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 1rem;
    border-radius: 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
  }

  .btn-test:hover:not(:disabled) {
    border-color: var(--pink);
    color: var(--pink);
  }

  .form-group select {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    color: var(--text);
    font-size: 0.9rem;
    min-height: 44px;
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .form-hint code {
    background: var(--bg-elevated);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-family: monospace;
    color: var(--pink);
  }

  .connection-status-box {
    padding: 0.85rem 1rem;
    border-radius: 12px;
    font-size: 0.82rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .connection-status-box.ok {
    background: color-mix(in srgb, #4ade80 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, #4ade80 30%, transparent);
    color: var(--text);
  }

  .connection-status-box.offline, .connection-status-box.error {
    background: color-mix(in srgb, var(--destructive) 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--destructive) 30%, transparent);
    color: var(--text);
  }

  .connection-status-box.no_model {
    background: color-mix(in srgb, var(--warning) 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    color: var(--text);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .connection-status-box p {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .help-section {
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .help-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-elevated);
    border: none;
    color: var(--text-heading);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    min-height: auto;
  }

  .help-chevron {
    margin-left: auto;
    transition: transform 0.2s ease;
  }

  .help-chevron.open {
    transform: rotate(180deg);
  }

  .help-content {
    padding: 1rem 1.25rem;
    background: var(--bg-card);
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.6;
    border-top: 1px solid var(--border);
  }

  .help-content ol {
    margin: 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .help-content pre {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    padding: 0.45rem 0.75rem;
    border-radius: 8px;
    margin: 0.3rem 0 0;
    overflow-x: auto;
  }

  .help-content code {
    font-family: monospace;
    color: var(--pink);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border);
  }

  .btn-cancel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    min-height: 42px;
  }

  .btn-save {
    background: var(--pink);
    border: none;
    color: #070706;
    padding: 0.6rem 1.4rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  /* === Athlete Profile Modal Styles === */
  .profile-modal-card {
    max-width: 780px !important;
    max-height: 90vh !important;
  }

  .profile-subtitle {
    font-size: 0.72rem;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
  }

  .profile-modal-body {
    gap: 1rem !important;
  }

  .profile-info-banner {
    background: color-mix(in srgb, var(--pink) 12%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--pink) 30%, transparent);
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.82rem;
    line-height: 1.45;
    margin: 0;
    color: var(--text);
  }

  .profile-feedback-box {
    padding: 0.65rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    background: color-mix(in srgb, #4ade80 18%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, #4ade80 40%, transparent);
    color: #4ade80;
  }

  .profile-editor-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .profile-editor-container label {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .profile-textarea {
    width: 100%;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    color: var(--text);
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 0.85rem;
    line-height: 1.55;
    resize: vertical;
    min-height: 340px;
    box-sizing: border-box;
    display: block;
  }

  .profile-textarea:focus {
    border-color: var(--pink);
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--pink) 25%, transparent);
  }

  /* === Animations === */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes pulseGlow {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50% { opacity: 0.65; transform: scale(1.06); }
  }

  :global(.spin) {
    animation: spinAnimation 1s linear infinite;
  }

  @keyframes spinAnimation {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
