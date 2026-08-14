<script lang="ts">
  import { syncClient } from '../sync/client';
  import { generateId } from '../import/id-mapping';
  import ProposalDiff from './ProposalDiff.svelte';
  import type { CoachAction } from '@appmuscu/shared-schema';
  import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-svelte';

  interface Message {
    id: string;
    sender: 'user' | 'coach';
    text: string;
    timestamp: string;
    model?: string;
    actions?: CoachAction[];
    reasoning?: string;
  }

  let messages = $state<Message[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: 'Bonjour ! Je suis ton coach personnel local. Tu peux me poser des questions sur tes entraînements, ta progression, tes douleurs ou me demander d\'analyser tes séances récentes.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  let inputMessage = $state('');
  let loading = $state(false);
  let errorMessage = $state('');

  async function sendMessage() {
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    inputMessage = '';
    errorMessage = '';

    // Add user message
    messages.push({
      id: generateId(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    loading = true;

    try {
      const deviceId = localStorage.getItem('deviceId') || 'local';
      const serverUrl = syncClient.serverUrl;

      const response = await fetch(`${serverUrl}/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, message: userText })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Serveur indisponible');
      }

      const data = await response.json();
      messages.push({
        id: generateId(),
        sender: 'coach',
        text: data.answer,
        model: data.model,
        actions: data.proposedActions || [],
        reasoning: data.reasoning || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (e: any) {
      errorMessage = e.message || 'Le serveur du coach est introuvable. Assure-toi que Ollama et le serveur PC fonctionnent.';
    } finally {
      loading = false;
    }
  }

  async function triggerAnalysis() {
    inputMessage = 'Fais-moi un bilan global de mes dernières séances et donne-moi tes recommandations.';
    await sendMessage();
  }
</script>

<div class="coach-chat-container">
  <div class="chat-header">
    <div style="display: flex; align-items: center; gap: 0.6rem;">
      <Bot class="icon-accent" size={24} />
      <div>
        <h2>Coach IA Personnel</h2>
        <p class="subtitle">Propulsé localement par Ollama & Serveur PC</p>
      </div>
    </div>

    <button type="button" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" onclick={triggerAnalysis}>
      <Sparkles size={14} style="margin-right: 0.3rem;" /> Bilan rapide
    </button>
  </div>

  {#if errorMessage}
    <div class="error-banner">
      <AlertCircle size={16} />
      <span>{errorMessage}</span>
    </div>
  {/if}

  <div class="messages-list">
    {#each messages as msg}
      <div class="message-bubble {msg.sender}">
        <div class="bubble-header">
          <span class="sender-name">
            {#if msg.sender === 'coach'}
              <Bot size={14} /> Coach IA {msg.model ? `(${msg.model})` : ''}
            {:else}
              <User size={14} /> Vous
            {/if}
          </span>
          <span class="timestamp">{msg.timestamp}</span>
        </div>
        <div class="bubble-text">{msg.text}</div>
        
        {#if msg.actions && msg.actions.length > 0}
          <ProposalDiff actions={msg.actions} reasoning={msg.reasoning} />
        {/if}
      </div>
    {/each}

    {#if loading}
      <div class="message-bubble coach loading-bubble">
        <Bot size={14} />
        <span>Le coach réfléchit…</span>
      </div>
    {/if}
  </div>

  <form class="chat-input-area" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
    <input
      type="text"
      placeholder="Pose une question à ton coach (ex: Que penses-tu de ma charge au squat ?)"
      bind:value={inputMessage}
      disabled={loading}
    />
    <button type="submit" class="btn-primary" disabled={loading || !inputMessage.trim()}>
      <Send size={18} />
    </button>
  </form>
</div>

<style>
  .coach-chat-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 180px);
    max-height: 750px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-elevated) 80%, var(--bg-base));
  }

  .chat-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
  }

  .subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .icon-accent {
    color: var(--accent);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: color-mix(in srgb, var(--danger) 15%, var(--bg-base));
    color: var(--danger);
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--border);
  }

  .messages-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .message-bubble {
    max-width: 85%;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    line-height: 1.45;
    font-size: 0.92rem;
  }

  .message-bubble.coach {
    align-self: flex-start;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-top-left-radius: 2px;
  }

  .message-bubble.user {
    align-self: flex-end;
    background: color-mix(in srgb, var(--accent) 20%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-top-right-radius: 2px;
  }

  .bubble-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sender-name {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
  }

  .timestamp {
    font-size: 0.7rem;
    opacity: 0.8;
  }

  .bubble-text {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .loading-bubble {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-style: italic;
    color: var(--text-muted);
  }

  .chat-input-area {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .chat-input-area input {
    flex: 1;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 0.85rem;
    color: var(--text-primary);
    font-size: 0.92rem;
  }

  .chat-input-area button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
  }
</style>
