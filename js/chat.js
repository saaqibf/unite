/**
 * Returns initials from a full name (e.g. "Sarah Chen" -> "SC").
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Formats a full name as "First L." to save horizontal space in chat
 * (e.g. "Saaqib Fagbenro" -> "Saaqib F.").
 * If only one word is present it is returned as-is.
 */
function getChatName(name) {
  if (!name) return 'Unknown';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

/**
 * Picks a consistent avatar background color based on the user's name.
 */
function getAvatarColor(name) {
  const colors = ['#CC0033', '#A3002A', '#16A34A', '#2563EB', '#9333EA', '#EA580C'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Formats an ISO timestamp into a readable time string.
 */
function formatTimestamp(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Escapes HTML to prevent XSS in chat messages.
 */
function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text || '';
  return el.innerHTML;
}

/**
 * Scrolls the chat messages container to the latest message.
 */
function scrollToLatestMessage() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Renders a chat message bubble — right side for you, left side for others.
 */
function renderMessage(data) {
  const messages = document.getElementById('chat-messages') ||
                   document.querySelector('.chat-messages') ||
                   document.querySelector('#messages');
  if (!messages) return;

  const currentUser = JSON.parse(localStorage.getItem('unite_user') || '{}');
  const currentProfile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  // Prefer display_name as the canonical identity — matches what sendMessage stores in data.user
  const currentName = currentUser.display_name || currentProfile.display_name ||
                      currentProfile.name || currentUser.first_name || '';
  const isOwn = !!data.user && (
    data.user === currentName ||
    data.user === currentUser.display_name ||
    data.user === currentProfile.name ||
    data.user === currentUser.first_name
  );

  const programShort = {
    'Computer Science': 'CS', 'Software Engineering': 'SENG',
    'Electrical Engineering': 'ENGG', 'Business': 'BUS',
    'Kinesiology': 'KNES', 'Psychology': 'PSYC',
    'Nursing': 'NURS', 'Biological Sciences': 'BIO'
  };

  const time = new Date(data.timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });

  const initials = (data.user || 'S').split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  const programBadge = data.program ? (programShort[data.program] || data.program) : 'UCalgary';
  const yearBadge = data.year ? ` · Y${data.year}` : '';

  const div = document.createElement('div');
  div.className = `chat-message ${isOwn ? 'own-message' : 'other-message'}`;

  if (isOwn) {
    div.innerHTML = `
      <div class="message-row message-row-own">
        <div class="message-content-own">
          <div class="message-time">${time}</div>
          <div class="message-bubble own-bubble">${escapeHtml(data.text)}</div>
        </div>
      </div>`;
  } else {
    div.innerHTML = `
      <div class="message-row message-row-other">
        <div class="message-avatar-circle">${initials}</div>
        <div class="message-content-other">
          <div class="message-meta">
            <span class="message-name">${escapeHtml(getChatName(data.user) || 'Student')}</span>
            <span class="message-badge">${escapeHtml(programBadge)}${escapeHtml(yearBadge)}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-bubble other-bubble">${escapeHtml(data.text)}</div>
        </div>
      </div>`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/**
 * Sends a new chat message to the backend and clears the input field.
 * Identity (name/program/year) is pulled from localStorage so bubbles
 * align correctly for the signed-in student.
 */
async function sendMessage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  const currentUser = JSON.parse(localStorage.getItem('unite_user') || '{}');
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');

  const payload = {
    text: trimmed,
    // Use display_name ("Saaqib Fagbenro") so getChatName can format it as "Saaqib F." for others
    user: currentUser.display_name || profile.display_name || profile.name || currentUser.first_name || 'Student',
    program: profile.program || '',
    year: profile.year || '',
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // If the server can't broadcast (e.g. Pusher not configured), still show
    // the message locally so the sender sees their own bubble.
    if (!res.ok) {
      renderMessage(payload);
    }
  } catch {
    renderMessage(payload);
  }
}

/**
 * Loads Pusher public config from the backend when keys are not inlined.
 */
async function loadPusherConfig(config) {
  if (config.pusherKey || window.PUSHER_KEY) {
    return {
      pusherKey: config.pusherKey || window.PUSHER_KEY,
      pusherCluster: config.pusherCluster || window.PUSHER_CLUSTER || 'mt1'
    };
  }
  try {
    const res = await fetch('/api/chat/config');
    if (res.ok) {
      const data = await res.json();
      window.PUSHER_KEY = data.key || '';
      window.PUSHER_CLUSTER = data.cluster || 'mt1';
      return { pusherKey: data.key, pusherCluster: data.cluster || 'mt1' };
    }
  } catch {
    /* seed-only mode */
  }
  return { pusherKey: '', pusherCluster: config.pusherCluster || 'mt1' };
}

/**
 * Fetches persisted chat history from the server.
 * Returns an array of messages (empty array on failure — graceful degradation).
 */
async function fetchChatHistory() {
  try {
    const res = await fetch('/api/chat/history?limit=50');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/**
 * Initializes Pusher real-time chat and wires up the send form.
 * On load: fetches persisted history first, then subscribes to live updates.
 * This means chat messages survive page refreshes and new sessions.
 */
async function initChat(config) {
  const pusherCfg = await loadPusherConfig(config);
  const pusherKey = pusherCfg.pusherKey;
  const pusherCluster = pusherCfg.pusherCluster;
  const { onlineCount } = config;
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const onlineEl = document.getElementById('chat-online-count');

  if (onlineEl && onlineCount != null) {
    onlineEl.textContent = `${onlineCount} students online`;
  }

  // Load persisted history from the server first
  const history = await fetchChatHistory();

  if (messagesEl) {
    if (history.length > 0) {
      // Real messages exist — show them. Map DB column names to what renderMessage expects.
      history.forEach(function(msg) {
        renderMessage({
          user: msg.user_name || msg.user,
          program: msg.program || '',
          year: msg.year || '',
          text: msg.text,
          timestamp: msg.created_at || msg.timestamp
        });
      });
    } else if (config.seedMessages) {
      // No real history yet — show seed messages so chat never looks empty
      config.seedMessages.forEach(function(msg) {
        renderMessage(msg);
      });
    }
  }

  if (typeof Pusher !== 'undefined' && pusherKey) {
    const pusher = new Pusher(pusherKey, { cluster: pusherCluster || 'mt1' });
    const channel = pusher.subscribe('unite-global-chat');
    channel.bind('new-message', function(data) {
      renderMessage(data);
    });
  }

  if (form && input) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      sendMessage(text);
    });
  }
}

/**
 * Switches between Events and Chat tabs on mobile.
 */
function initCommunityTabs() {
  const tabs = document.querySelectorAll('.community-tab');
  const feed = document.getElementById('community-feed');
  const chat = document.getElementById('community-chat');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      const target = tab.dataset.tab;
      tabs.forEach(function(t) {
        t.classList.toggle('community-tab--active', t === tab);
      });
      if (feed) feed.classList.toggle('community-feed--hidden', target === 'chat');
      if (chat) chat.classList.toggle('community-chat-section--active', target === 'chat');
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initCommunityTabs();

  if (window.UNITE_CHAT_CONFIG) {
    initChat(window.UNITE_CHAT_CONFIG);
  }
});
