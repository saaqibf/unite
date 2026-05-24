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
 * Renders a single chat message bubble into the messages container.
 */
function renderMessage(data, currentUser) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isMine = currentUser && data.user === currentUser.name;
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${isMine ? 'chat-message--mine' : 'chat-message--theirs'}`;

  const avatarColor = getAvatarColor(data.user);
  const initials = getInitials(data.user);
  const timeStr = formatTimestamp(data.timestamp);

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.style.backgroundColor = avatarColor;
  avatar.textContent = initials;
  avatar.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');

  const meta = document.createElement('div');
  meta.className = 'chat-meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'chat-name';
  nameEl.textContent = data.user;
  meta.appendChild(nameEl);

  if (data.program) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = data.program;
    meta.appendChild(tag);
  }

  const timeEl = document.createElement('span');
  timeEl.className = 'chat-timestamp';
  timeEl.textContent = timeStr;
  meta.appendChild(timeEl);

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = data.text;

  body.appendChild(meta);
  body.appendChild(bubble);

  if (isMine) {
    wrapper.appendChild(body);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);
  }

  container.appendChild(wrapper);
  scrollToLatestMessage();
}

/**
 * Sends a new chat message to the backend and clears the input field.
 */
async function sendMessage(text, currentUser) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  try {
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });

    if (!res.ok) {
      renderMessage({
        user: currentUser.name,
        program: currentUser.program,
        text: trimmed,
        timestamp: new Date().toISOString()
      }, currentUser);
    }
  } catch {
    renderMessage({
      user: currentUser.name,
      program: currentUser.program,
      text: trimmed,
      timestamp: new Date().toISOString()
    }, currentUser);
  }
}

/**
 * Initializes Pusher real-time chat and wires up the send form.
 */
function initChat(config) {
  const { pusherKey, pusherCluster, currentUser, onlineCount } = config;
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const onlineEl = document.getElementById('chat-online-count');

  if (onlineEl && onlineCount != null) {
    onlineEl.textContent = `${onlineCount} students online`;
  }

  if (messagesEl && config.seedMessages) {
    config.seedMessages.forEach(function(msg) {
      renderMessage(msg, currentUser);
    });
  }

  if (typeof Pusher !== 'undefined' && pusherKey) {
    const pusher = new Pusher(pusherKey, { cluster: pusherCluster || 'mt1' });
    const channel = pusher.subscribe('unite-global-chat');
    channel.bind('new-message', function(data) {
      renderMessage(data, currentUser);
    });
  }

  if (form && input) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      sendMessage(text, currentUser);
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
