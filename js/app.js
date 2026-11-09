// ============================================================
//  Geminuel — Interfaz (lógica de UI)
// ============================================================
//  Maneja DOM, estado de conversaciones y renderizado.
//  La persistencia de chats se gestiona en el servidor Python
//  a través de la API REST (/api/chats).
//  Las respuestas del asistente se obtienen desde el motor
//  (js/engine.js) a través de GeminuelEngine.getResponse().
// ============================================================

// ---- Constants ----
const THEME_KEY = 'geminuel.theme';

// ---- State ----
const state = {
  isDark: true,
  isTyping: false,
  chats: [],
  currentChatId: null,
  provider: 'cascade',
};

// ---- DOM References ----
const chatArea        = document.getElementById('chat-area');
const messagesEl      = document.getElementById('messages');
const welcomeScreen   = document.getElementById('welcome-screen');
const inputEl         = document.getElementById('message-input');
const sendBtn         = document.getElementById('send-btn');
const themeToggle     = document.getElementById('theme-toggle');
const themeIconDark   = document.getElementById('theme-icon-dark');
const themeIconLight  = document.getElementById('theme-icon-light');
const charCounter     = document.getElementById('char-counter');
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebar-overlay');
const menuBtn         = document.getElementById('menu-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const newChatBtn      = document.getElementById('new-chat-btn');
const chatList        = document.getElementById('chat-list');
const chatListEmpty   = document.getElementById('chat-list-empty');
const topbarChatTitle = document.getElementById('topbar-chat-title');
const cascadeBadge    = document.getElementById('cascade-badge');
const xboxSplash       = document.getElementById('xbox-splash');
const xboxSplashButton = document.getElementById('xbox-splash-button');
const xboxSplashSkip   = document.getElementById('xbox-splash-skip');
const xboxStatusText   = document.getElementById('xbox-status-text');
const replaySplashBtn  = document.getElementById('replay-splash-btn');
const topbarTitle      = document.getElementById('topbar-title');

// ---- REST API Helpers ----
async function apiGet(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

async function apiDelete(path) {
  const r = await fetch(path, { method: 'DELETE' });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

// ---- Chat API ----
async function fetchChats() {
  const data = await apiGet('/api/chats');
  return data.chats || [];
}

async function createChatAPI(title) {
  const data = await apiPost('/api/chats', { title });
  return data.chat;
}

async function addMessageAPI(chatId, role, content, provider = null, cascaded = false) {
  return apiPost(`/api/chats/${chatId}/messages`, { role, content, provider, cascaded });
}

async function deleteChatAPI(chatId) {
  return apiDelete(`/api/chats/${chatId}`);
}

// ---- Theme ----
function loadTheme() {
  try { state.isDark = localStorage.getItem(THEME_KEY) !== 'light'; } catch {}
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.isDark ? '' : 'light');
  themeIconDark.style.display  = state.isDark ? 'none' : '';
  themeIconLight.style.display = state.isDark ? '' : 'none';
}

function setProvider() {
  state.provider = 'cascade';
  inputEl.placeholder = 'Escribe un mensaje a MonseNuel...';
}

// ---- Chat helpers ----
function currentChat() {
  return state.chats.find(c => c.id === state.currentChatId) || null;
}

function makeTitle(text) {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length > 36 ? singleLine.slice(0, 35).trim() + '…' : singleLine;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString('es');
}

// ---- Helpers ----
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMarkdown(text) {
  let html = escapeHtml(text);

  // Reasoning block (<think>...</think>)
  html = html.replace(/&lt;think&gt;([\s\S]*?)&lt;\/think&gt;/gi, (_, thought) =>
    `<details class="reasoning-block" open><summary class="reasoning-summary">🧠 Proceso de razonamiento</summary><div class="reasoning-content">${thought.trim()}</div></details>`
  );

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0;">');

  // Ordered lists
  html = html.replace(/^(\d+\.\s+.+)(\n\d+\.\s+.+)*/gm, match => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^\d+\.\s+/, '')}</li>`
    ).join('');
    return `<ol>${items}</ol>`;
  });

  // Unordered lists
  html = html.replace(/^(-\s+.+)(\n-\s+.+)*/gm, match => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^-\s+/, '')}</li>`
    ).join('');
    return `<ul>${items}</ul>`;
  });

  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<')) return para;
    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

function scrollToBottom(smooth = true) {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

// ---- Sidebar ----
const isMobile = () => window.innerWidth <= 768;

function hideSidebar() {
  sidebar.classList.add('collapsed');
  sidebarOverlay.classList.remove('show');
}

function toggleSidebar() {
  const collapsed = sidebar.classList.toggle('collapsed');
  sidebarOverlay.classList.toggle('show', !collapsed);
}

function updateSidebarForTyping() {
  if (isMobile()) return;
  const writing = document.activeElement === inputEl && (inputEl.value.trim() !== '' || state.isTyping);
  sidebar.classList.toggle('collapsed', writing);
}

menuBtn.addEventListener('click', toggleSidebar);
sidebarCloseBtn.addEventListener('click', hideSidebar);
sidebarOverlay.addEventListener('click', hideSidebar);

newChatBtn.addEventListener('click', () => {
  startNewChat();
  if (isMobile()) hideSidebar();

});

inputEl.addEventListener('input', updateSidebarForTyping);
inputEl.addEventListener('focus', updateSidebarForTyping);
inputEl.addEventListener('blur', updateSidebarForTyping);
window.addEventListener('resize', () => {
  if (isMobile()) {
    sidebar.classList.add('collapsed');
    sidebarOverlay.classList.remove('show');
  }
});

// ---- Sidebar rendering ----
function renderChatList() {
  chatList.innerHTML = '';
  chatListEmpty.hidden = state.chats.length !== 0;

  const sorted = [...state.chats].sort((a, b) => b.ts - a.ts);
  for (const chat of sorted) {
    const item = document.createElement('li');
    item.className = 'chat-item' + (chat.id === state.currentChatId ? ' active' : '');
    item.dataset.id = chat.id;
    item.innerHTML = `
      <svg class="chat-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div class="chat-item-text">
        <span class="chat-item-title">${escapeHtml(chat.title)}</span>
        <span class="chat-item-time">${timeAgo(chat.ts || Date.now())}</span>
      </div>
      <button class="chat-item-delete" title="Eliminar conversación" aria-label="Eliminar conversación">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    chatList.appendChild(item);
  }
}

chatList.addEventListener('click', e => {
  const item = e.target.closest('.chat-item');
  if (!item) return;
  const id = Number(item.dataset.id);
  if (e.target.closest('.chat-item-delete')) {
    e.stopPropagation();
    deleteChat(id);
    return;
  }
  openChat(id);
});

async function deleteChat(id) {
  const chat = state.chats.find(c => c.id === id);
  const chatName = chat?.title || 'esta conversación';

  const confirmed = await showConfirmModal({
    title: '¿Eliminar conversación?',
    message: 'Esta acción no se puede deshacer. Se borrarán todos los mensajes de esta conversación.',
    chatTitle: chatName,
    confirmText: 'Eliminar conversación',
    cancelText: 'Cancelar',
    isDanger: true
  });

  if (!confirmed) return;

  try {
    await deleteChatAPI(id);
  } catch (e) {
    console.error('[Geminuel] Error eliminando chat del servidor:', e);
  }
  state.chats = state.chats.filter(c => c.id !== id);
  if (state.currentChatId === id) {
    startNewChat();
  } else {
    renderChatList();
  }
}

// ---- Conversation navigation ----
function updateTopbarTitle() {
  const chat = currentChat();
  if (chat) {
    topbarChatTitle.textContent = chat.title;
    topbarChatTitle.hidden = false;
  } else {
    topbarChatTitle.textContent = '';
    topbarChatTitle.hidden = true;
  }
}

function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;
  state.currentChatId = id;
  if (window.syncRepoUIForChat) window.syncRepoUIForChat(chat);
  updateTopbarTitle();
  welcomeScreen.style.display = 'none';
  messagesEl.innerHTML = '';
  for (const m of chat.messages) renderLoadedMessage(m.role, m.content, m.provider, m.cascaded);
  renderChatList();
  scrollToBottom(false);
  if (isMobile()) hideSidebar();

}

function startNewChat() {
  state.currentChatId = null;
  if (window.syncRepoUIForChat) window.syncRepoUIForChat(null);
  updateTopbarTitle();
  welcomeScreen.style.display = '';
  messagesEl.innerHTML = '';
  renderChatList();
  inputEl.value = '';
  inputEl.style.height = 'auto';
  charCounter.textContent = '';
  sendBtn.disabled = true;
  inputEl.focus();
}

// ---- Render a message ----
function aiBlockHTML(content) {
  return `
    <div class="message-inner">
      <div class="ai-header">
        <div class="ai-avatar" title="MonseNuel">
          <span class="ai-avatar-glyph" aria-hidden="true">G</span>
        </div>
        <span class="ai-name"><span class="brand-monse">Monse</span><span class="brand-nuel">Nuel</span></span>
      </div>
      <div class="ai-content">${parseMarkdown(content)}</div>
      <div class="message-actions">
        <button class="action-btn copy-btn" title="Copiar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="action-label">Copiar</span>
        </button>
      </div>
    </div>`;
}

function renderLoadedMessage(role, content) {
  const el = document.createElement('article');
  el.className = 'message ' + role;

  if (role === 'user') {
    el.innerHTML = `
      <div class="message-inner">
        <div class="user-label">Tú</div>
        <div class="user-bubble">${escapeHtml(content)}</div>
      </div>`;
  } else {
    el.innerHTML = aiBlockHTML(content);
    const copyBtn = el.querySelector('.copy-btn');
    if (copyBtn) bindCopy(copyBtn, content);
  }

  messagesEl.appendChild(el);
}

function bindCopy(btn, text) {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      const label = btn.querySelector('.action-label');
      if (label) label.textContent = '¡Copiado!';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (label) label.textContent = 'Copiar';
      }, 1800);
    });
  });
}

// ---- Render AI typing indicator (Xbox Controller Pulse Style) ----
function renderTyping() {
  const el = document.createElement('article');
  el.className = 'message ai';
  el.id = 'typing-msg';
  el.innerHTML = `
    <div class="message-inner">
      <div class="ai-header">
        <div class="ai-avatar" title="MonseNuel">
          <span class="ai-avatar-glyph" aria-hidden="true">G</span>
        </div>
        <span class="ai-name"><span class="brand-monse">Monse</span><span class="brand-nuel">Nuel</span></span>
      </div>
      <div class="xbox-thinking-container">
        <div class="xbox-thinking-orb-wrap">
          <div class="xbox-mini-wave wave-1"></div>
          <div class="xbox-mini-wave wave-2"></div>
          <div class="xbox-thinking-sphere">
            <div class="xbox-sphere-sheen mini"></div>
            <div class="thinking-guide-g" aria-hidden="true">
              <span class="thinking-g-char">G</span><span class="thinking-g-cursor"></span>
            </div>
          </div>
        </div>
        <div class="xbox-thinking-info">
          <div class="xbox-thinking-title">
            <span>Pensando respuesta</span>
            <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>
      </div>
    </div>
  `;
  messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

// ---- Stream AI text character by character ----
async function streamAIResponse(text, typingEl, warning) {
  const inner = typingEl.querySelector('.message-inner');

  // Replace typing dots with content container
  inner.innerHTML = `
    <div class="ai-header">
      <div class="ai-avatar" title="MonseNuel">
        <span class="ai-avatar-glyph" aria-hidden="true">G</span>
      </div>
      <span class="ai-name"><span class="brand-monse">Monse</span><span class="brand-nuel">Nuel</span></span>
    </div>
    ${warning ? `<div class="api-warning" role="alert">${escapeHtml(warning)}</div>` : ''}
    <div class="ai-content"></div>
    <div class="message-actions">
      <button class="action-btn copy-btn" title="Copiar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span class="action-label">Copiar</span>
      </button>
    </div>
  `;

  const contentEl = typingEl.querySelector('.ai-content');

  // Stream character by character
  let displayed = '';
  const chunkSize = 20;
  for (let i = 0; i < text.length; i += chunkSize) {
    displayed += text.slice(i, i + chunkSize);
    contentEl.innerHTML = parseMarkdown(displayed) + '<span class="cursor"></span>';
    scrollToBottom(false);
    await new Promise(r => setTimeout(r, 6 + Math.random() * 6));
  }

  // Final render without cursor
  contentEl.innerHTML = parseMarkdown(text);
  typingEl.removeAttribute('id');

  // Bind copy button
  const copyBtn = typingEl.querySelector('.copy-btn');
  if (copyBtn) bindCopy(copyBtn, text);
}

// ---- Send a message ----
async function sendMessage(text) {
  text = text.trim();
  if (!text || state.isTyping) return;

  // Crear chat nuevo en el servidor si no hay uno activo
  if (state.currentChatId === null) {
    try {
      const newChat = await createChatAPI(makeTitle(text));
      state.chats.push(newChat);
      state.currentChatId = newChat.id;
    } catch (e) {
      console.error('[Geminuel] Error creando chat en el servidor:', e);
      return;
    }
  }

  const chat = currentChat();
  chat.ts = Date.now();
  chat.messages.push({ role: 'user', content: text });

  // Persiste mensaje del usuario (fire-and-forget)
  addMessageAPI(state.currentChatId, 'user', text).catch(e =>
    console.warn('[Geminuel] Error guardando mensaje de usuario:', e)
  );

  // Hide welcome screen
  welcomeScreen.style.display = 'none';

  // Render user message
  renderLoadedMessage('user', text);
  renderChatList();
  updateTopbarTitle();

  // Clear input
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;
  charCounter.textContent = '';

  state.isTyping = true;
  updateSidebarForTyping();

  // Small delay before typing indicator
  await new Promise(r => setTimeout(r, 150));

  // Show typing indicator
  const typingEl = renderTyping();
  scrollToBottom();

  // Get response through the automatic cascade
  const result = await GeminuelEngine.getResponse(text, chat.messages, 'cascade', state.currentChatId);

  // Stream response
  await streamAIResponse(
    result.text,
    typingEl,
    result.ok ? null : result.warning
  );

  // Solo se guarda en el historial una respuesta real
  if (result.ok) {
    chat.messages.push({
      role: 'assistant',
      content: result.text,
    });
    // Persiste respuesta del asistente (fire-and-forget)
    addMessageAPI(state.currentChatId, 'assistant', result.text, result.provider, result.cascaded)
      .catch(e => console.warn('[Geminuel] Error guardando respuesta del asistente:', e));
  }
  chat.ts = Date.now();

  state.isTyping = false;
  sendBtn.disabled = inputEl.value.trim() === '';
  renderChatList();
  updateSidebarForTyping();
  scrollToBottom();
}

// ---- Input auto-resize ----
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + 'px';

  const len = inputEl.value.length;
  sendBtn.disabled = len === 0 || state.isTyping;
  charCounter.textContent = len > 50 ? len : '';
});

// ---- Send on Enter (Shift+Enter = new line) ----
const chatForm = document.getElementById('chat-form');
if (chatForm) {
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    sendMessage(inputEl.value);
  });
}

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (chatForm) {
      chatForm.requestSubmit();
    } else {
      sendMessage(inputEl.value);
    }
  }
});

// ---- Send button ----
sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

// ---- Suggestion cards ----
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    inputEl.value = prompt;
    sendMessage(prompt);
  });
});

// ---- Theme toggle ----
themeToggle.addEventListener('click', () => {
  state.isDark = !state.isDark;
  try { localStorage.setItem(THEME_KEY, state.isDark ? 'dark' : 'light'); } catch {}
  applyTheme();
});

// ---- Xbox Startup Audio & Lifecycle ----
function playXboxChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.07 / (idx + 1), now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 1.4);
    });
  } catch {}
}

let splashDismissed = false;
function dismissXboxSplash(fast = false) {
  if (splashDismissed || !xboxSplash) return;
  splashDismissed = true;

  const btn = document.getElementById('xbox-splash-button');
  if (btn) btn.classList.add('flare');
  if (!fast) playXboxChime();

  setTimeout(() => {
    if (xboxSplash) xboxSplash.classList.add('fade-out');
    setTimeout(() => {
      if (xboxSplash) xboxSplash.style.display = 'none';
      inputEl.focus();
    }, 550);
  }, fast ? 80 : 360);
}

function startXboxSplash() {
  if (!xboxSplash) return;
  splashDismissed = false;
  xboxSplash.style.display = 'flex';
  void xboxSplash.offsetWidth; // Force reflow
  xboxSplash.classList.remove('fade-out');
  const btn = document.getElementById('xbox-splash-button');
  if (btn) btn.classList.remove('flare');

  if (xboxStatusText) xboxStatusText.textContent = 'Iniciando MonseNuel...';

  setTimeout(() => {
    if (!splashDismissed && xboxStatusText) {
      xboxStatusText.textContent = 'Preparando entorno de programación...';
    }
  }, 1100);

  setTimeout(() => {
    if (!splashDismissed && xboxStatusText) {
      xboxStatusText.textContent = '¡Listo para programar!';
      if (btn) btn.classList.add('flare');
      playXboxChime();
    }
  }, 2200);

  setTimeout(() => {
    if (!splashDismissed) dismissXboxSplash(false);
  }, 2600);
}

function initXboxSplash() {
  if (!xboxSplash) return;
  startXboxSplash();

  xboxSplash.addEventListener('click', e => {
    if (e.target.closest('#xbox-splash-skip')) {
      e.stopPropagation();
      dismissXboxSplash(true);
      return;
    }
    dismissXboxSplash(false);
  });

  window.addEventListener('keydown', e => {
    if ((e.key === 'Escape' || e.key === 'Enter') && !splashDismissed) {
      dismissXboxSplash(true);
    }
  });

  if (replaySplashBtn) {
    replaySplashBtn.addEventListener('click', () => startXboxSplash());
  }
  if (topbarTitle) {
    topbarTitle.style.cursor = 'pointer';
    topbarTitle.setAttribute('title', 'Clic para ver animación Xbox de inicio');
    topbarTitle.addEventListener('click', () => startXboxSplash());
  }
}

// ============================================================
// CUSTOM CONFIRMATION MODAL SYSTEM
// ============================================================
let confirmModalResolver = null;
let lastActiveElement = null;

function showConfirmModal({
  title = '¿Eliminar conversación?',
  message = 'Esta acción no se puede deshacer. Los mensajes se borrarán definitivamente de tu historial.',
  chatTitle = '',
  confirmText = 'Eliminar conversación',
  cancelText = 'Cancelar',
  isDanger = true
} = {}) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) {
    return Promise.resolve(window.confirm(message));
  }

  const modalTitle = document.getElementById('confirm-modal-title');
  const modalDesc = document.getElementById('confirm-modal-desc');
  const modalChatTitle = document.getElementById('confirm-modal-chat-title');
  const modalPreview = document.getElementById('confirm-modal-preview');
  const acceptBtnText = document.getElementById('confirm-modal-accept-text');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const acceptBtn = document.getElementById('confirm-modal-accept');
  const iconWrapper = document.getElementById('confirm-modal-icon');

  lastActiveElement = document.activeElement;

  if (modalTitle) modalTitle.textContent = title;
  if (modalDesc) modalDesc.textContent = message;
  if (acceptBtnText) acceptBtnText.textContent = confirmText;
  if (cancelBtn) cancelBtn.textContent = cancelText;

  if (iconWrapper) {
    iconWrapper.className = 'confirm-modal-icon-wrapper' + (isDanger ? ' danger' : '');
  }

  if (chatTitle && modalPreview && modalChatTitle) {
    modalChatTitle.textContent = chatTitle;
    modalPreview.style.display = 'flex';
  } else if (modalPreview) {
    modalPreview.style.display = 'none';
  }

  modal.classList.remove('closing');
  if (typeof modal.showModal === 'function') {
    if (!modal.open) modal.showModal();
  } else {
    modal.hidden = false;
  }

  // Focus the cancel button so pressing Enter/Space does not accidentally delete
  if (cancelBtn) {
    setTimeout(() => cancelBtn.focus(), 25);
  }

  return new Promise(resolve => {
    confirmModalResolver = resolve;
  });
}

function closeConfirmModal(result = false) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;
  const isOpen = (typeof modal.open === 'boolean' ? modal.open : !modal.hidden);
  if (!isOpen) return;

  modal.classList.add('closing');
  setTimeout(() => {
    if (typeof modal.close === 'function' && modal.open) {
      try { modal.close(); } catch (_) {}
    } else {
      modal.hidden = true;
    }
    modal.classList.remove('closing');
    if (confirmModalResolver) {
      confirmModalResolver(result);
      confirmModalResolver = null;
    }
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      try { lastActiveElement.focus(); } catch (_) {}
    }
  }, 160);
}

function initConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;

  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const closeBtn  = document.getElementById('confirm-modal-close');
  const acceptBtn = document.getElementById('confirm-modal-accept');

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeConfirmModal(false));
  if (closeBtn)  closeBtn.addEventListener('click', () => closeConfirmModal(false));
  if (acceptBtn) acceptBtn.addEventListener('click', () => closeConfirmModal(true));

  // Native HTML5 dialog cancel event (triggers on Escape)
  modal.addEventListener('cancel', e => {
    e.preventDefault();
    closeConfirmModal(false);
  });

  // Click on dialog backdrop (outside card) closes modal
  modal.addEventListener('click', e => {
    const card = modal.querySelector('.confirm-modal-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const clickedInside = (
      rect.top <= e.clientY && e.clientY <= rect.bottom &&
      rect.left <= e.clientX && e.clientX <= rect.right
    );
    if (!clickedInside) {
      closeConfirmModal(false);
    }
  });

  window.addEventListener('keydown', e => {
    const isOpen = typeof modal.open === 'boolean' ? modal.open : !modal.hidden;
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeConfirmModal(false);
    }
  });
}

// ---- Init ----
(async function init() {
  loadTheme();
  applyTheme();
  setProvider();
  if (isMobile()) hideSidebar();

  initXboxSplash();
  initConfirmModal();

  // Cargar chats desde el servidor Python
  try {
    state.chats = await fetchChats();
  } catch (e) {
    console.warn('[Geminuel] No se pudieron cargar los chats del servidor:', e);
    state.chats = [];
  }

  renderChatList();
  updateSidebarForTyping();

  const latest = [...state.chats].sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
  if (latest) {
    openChat(latest.id);
  } else {
    startNewChat();
  }
  inputEl.focus();
})();

// ============================================================
//  Geminuel — Analizador de repositorios de GitHub
// ============================================================
//  Asociado de forma exclusiva a cada conversación (chatId).
//  Si se cambia de chat, se muestra el repo de ese chat.
//  Si es un chat nuevo sin repo, funciona normal.
// ============================================================
(() => {
  'use strict';

  const form = document.getElementById('repo-form');
  const input = document.getElementById('repo-url-input');
  const loadBtn = document.getElementById('repo-load-btn');
  const clearBtn = document.getElementById('repo-clear-btn');
  const statusEl = document.getElementById('repo-status');
  if (!form || !input || !loadBtn || !statusEl) return;

  function setStatus(text, kind = 'info') {
    statusEl.hidden = !text;
    statusEl.textContent = text || '';
    statusEl.dataset.kind = kind;
  }

  function setBusy(busy) {
    loadBtn.disabled = busy;
    input.disabled = busy;
    loadBtn.textContent = busy ? 'Analizando...' : 'Analizar repositorio';
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function showRepo(repo) {
    if (!repo) return;
    clearBtn.hidden = false;
    const bits = [
      `Repositorio: ${repo.repo} (${repo.branch || 'main'})`,
      `${repo.fileCount} archivo${repo.fileCount === 1 ? '' : 's'}`,
      `${(repo.chars / 1000).toFixed(1)}k caracteres`,
    ];
    if (repo.truncated) bits.push('contexto recortado');
    setStatus(bits.join(' · '), 'ok');
  }

  function clearRepo() {
    clearBtn.hidden = true;
    input.value = '';
    setStatus('', 'info');
  }

  // Sincroniza la barra de repositorio con la conversación activa
  window.syncRepoUIForChat = function(chat) {
    if (chat && chat.repo) {
      input.value = chat.repo.url || '';
      showRepo(chat.repo);
    } else {
      clearRepo();
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = input.value.trim();
    if (!url) {
      setStatus('Pega el enlace de un repositorio de GitHub.', 'error');
      input.focus();
      return;
    }

    setBusy(true);
    setStatus('Descargando y analizando repositorio...', 'info');
    try {
      const res = await fetch('/api/repo/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url, chatId: state.currentChatId }),
      });

      let data = null;
      try { data = await res.json(); } catch { /* respuesta sin JSON */ }

      if (!res.ok || !data || data.ok !== true) {
        const detail = (data && (data.detail || data.error)) || `Error ${res.status}`;
        throw new Error(detail);
      }

      if (data.chat && (!state.currentChatId || state.currentChatId !== data.chatId)) {
        // Se creó una conversación nueva vinculada al repo
        const idx = state.chats.findIndex(c => c.id === data.chat.id);
        if (idx >= 0) {
          state.chats[idx] = data.chat;
        } else {
          state.chats.push(data.chat);
        }
        renderChatList();
        openChat(data.chat.id);
      } else {
        const chat = currentChat();
        if (chat) chat.repo = data.repo;
      }
      showRepo(data.repo);
    } catch (err) {
      clearBtn.hidden = true;
      setStatus(err && err.message ? err.message : 'No se pudo analizar el repositorio.', 'error');
    } finally {
      setBusy(false);
    }
  });

  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    try {
      if (state.currentChatId) {
        await fetch(`/api/repo?chatId=${state.currentChatId}`, { method: 'DELETE' });
        const chat = currentChat();
        if (chat) chat.repo = null;
      }
    } catch { /* ignorar */ }
    clearBtn.disabled = false;
    clearRepo();
  });
})();
