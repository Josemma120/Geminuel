// ============================================================
//  Geminuel — Interfaz (lógica de UI)
//  ============================================================
//  Maneja DOM, estado de conversaciones y renderizado.
//  Las respuestas del asistente se obtienen desde el motor
//  (js/engine.js) a través de  GeminuelEngine.getResponse().
// ============================================================

// ---- Constants ----
const STORAGE_KEY = 'geminuel.chats.v1';
const THEME_KEY   = 'geminuel.theme';

// ---- State ----
const state = {
  isDark: true,
  isTyping: false,
  chats: [],
  currentChatId: null,
  nextChatId: 2,
};
state.chats = loadChats();

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

// ---- Storage helpers ----
function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const chats = parsed.filter(c => c && typeof c.title === 'string' && Array.isArray(c.messages));
    let maxId = 0;
    for (const c of chats) maxId = Math.max(maxId, Number(c.id) || 0);
    state.nextChatId = maxId + 1;
    return chats;
  } catch {
    return [];
  }
}

function saveChats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats)); } catch {}
}

function loadTheme() {
  try { state.isDark = localStorage.getItem(THEME_KEY) !== 'light'; } catch {}
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.isDark ? '' : 'light');
  themeIconDark.style.display  = state.isDark ? 'none' : '';
  themeIconLight.style.display = state.isDark ? '' : 'none';
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
    const item = document.createElement('div');
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
      <button class="chat-item-delete" title="Eliminar conversación" aria-label="Eliminar">×</button>
    `;
    chatList.appendChild(item);
  }
}

chatList.addEventListener('click', e => {
  const item = e.target.closest('.chat-item');
  if (!item) return;
  const id = Number(item.dataset.id);
  if (e.target.closest('.chat-item-delete')) {
    deleteChat(id);
    return;
  }
  openChat(id);
});

function deleteChat(id) {
  if (!confirm('¿Eliminar esta conversación?')) return;
  state.chats = state.chats.filter(c => c.id !== id);
  saveChats();
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
  updateTopbarTitle();
  welcomeScreen.style.display = 'none';
  messagesEl.innerHTML = '';
  for (const m of chat.messages) renderLoadedMessage(m.role, m.content);
  renderChatList();
  scrollToBottom(false);
  if (isMobile()) hideSidebar();
}

function startNewChat() {
  state.currentChatId = null;
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
        <div class="ai-avatar">
          <span class="ai-avatar-glyph" aria-hidden="true">G</span>
        </div>
        <span class="ai-name">Geminuel</span>
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
  const el = document.createElement('div');
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

// ---- Render AI typing indicator ----
function renderTyping() {
  const el = document.createElement('div');
  el.className = 'message ai';
  el.id = 'typing-msg';
  el.innerHTML = `
    <div class="message-inner">
      <div class="ai-header">
        <div class="ai-avatar">
          <span class="ai-avatar-glyph" aria-hidden="true">G</span>
        </div>
        <span class="ai-name">Geminuel</span>
      </div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
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
      <div class="ai-avatar">
        <span class="ai-avatar-glyph" aria-hidden="true">G</span>
      </div>
      <span class="ai-name">Geminuel</span>
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
      <button class="action-btn regenerate-btn" title="Regenerar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span class="action-label">Regenerar</span>
      </button>
    </div>
  `;

  const contentEl = typingEl.querySelector('.ai-content');

  // Stream character by character
  let displayed = '';
  const chunkSize = 3;
  for (let i = 0; i < text.length; i += chunkSize) {
    displayed += text.slice(i, i + chunkSize);
    contentEl.innerHTML = parseMarkdown(displayed) + '<span class="cursor"></span>';
    scrollToBottom(false);
    await new Promise(r => setTimeout(r, 18 + Math.random() * 12));
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

  // Create a new chat if none is active
  if (state.currentChatId === null) {
    const chat = {
      id: state.nextChatId++,
      title: makeTitle(text),
      messages: [],
      ts: Date.now(),
    };
    state.chats.push(chat);
    state.currentChatId = chat.id;
  }

  const chat = currentChat();
  chat.ts = Date.now();
  chat.messages.push({ role: 'user', content: text });
  saveChats();

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
  await new Promise(r => setTimeout(r, 300));

  // Show typing indicator
  const typingEl = renderTyping();
  scrollToBottom();

  // Get response from the Geminuel engine (Gemini API)
  const result = await GeminuelEngine.getResponse(text, chat.messages);

  // Stream response (con aviso visible si la API falló)
  await streamAIResponse(result.text, typingEl, result.ok ? null : result.warning);

  chat.messages.push({ role: 'assistant', content: result.text });
  chat.ts = Date.now();
  saveChats();

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
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(inputEl.value);
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

// ---- Init ----
loadTheme();
applyTheme();
if (isMobile()) hideSidebar();
renderChatList();
updateSidebarForTyping();

const latest = [...state.chats].sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
if (latest) {
  openChat(latest.id);
} else {
  startNewChat();
}
inputEl.focus();