/**
 * Community Hub — events feed, RSVP, Pull Up, tabs, and post forms
 */

const STORAGE_EVENTS = 'unite_community_events';
const STORAGE_VERIFIED = 'unite_admin_verified';

let events = [];
let activityFilter = '';

/**
 * Returns the current user from chat config or a demo profile.
 */
function getCurrentUser() {
  const cfg = window.UNITE_CHAT_CONFIG && window.UNITE_CHAT_CONFIG.currentUser;
  if (cfg) return { name: cfg.name, program: cfg.program, verified: false };
  try {
    return JSON.parse(localStorage.getItem('unite_profile') || '{}');
  } catch {
    return { name: 'UNite Student', program: 'UCalgary', verified: false };
  }
}

/**
 * Checks if the current user has admin verified-club toggle for demo.
 */
function isVerifiedClub() {
  if (localStorage.getItem(STORAGE_VERIFIED) === 'true') return true;
  const user = getCurrentUser();
  return Boolean(user.verified);
}

/**
 * Escapes HTML for safe rendering in the feed.
 */
function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text == null ? '' : String(text);
  return el.innerHTML;
}

/**
 * Loads events from localStorage or returns built-in demo events.
 */
function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]');
    if (stored.length) {
      events = stored;
      return;
    }
  } catch {
    /* ignore */
  }
  events = getSeedEvents();
  saveEvents();
}

/**
 * Persists the events array to localStorage.
 */
function saveEvents() {
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
}

/**
 * Returns default demo events for club newsletter and Pull Up sports.
 */
function getSeedEvents() {
  return [
    {
      id: 'evt-1',
      type: 'club',
      org: 'CS Society',
      verified: true,
      title: 'Hackathon Prep Night',
      date: 'Thu, May 29',
      time: '6:00 PM',
      location: 'ICT 121',
      description:
        "Join the CS Society for a prep session before Calgary's biggest student hackathon. Pizza provided. Bring your laptop.",
      attendees: ['Sarah C.', 'Marcus T.', 'Priya K.'],
      activityType: '',
      createdAt: 1
    },
    {
      id: 'evt-2',
      type: 'sport',
      org: 'Pickup Soccer — Mac Field',
      title: 'Saturday Morning Kickabout',
      date: 'Sat, May 31',
      time: '10:00 AM',
      location: 'MacEwan Field',
      description: 'Casual 7v7 pickup soccer. All skill levels welcome. Bring cleats or runners.',
      spots: 12,
      skillLevel: 'All levels',
      activityType: 'Soccer',
      attendees: ['Alex M.', 'Jordan L.', 'Taylor R.', 'Primel J.', 'Richard H.', 'Casey D.', 'Sam P.', 'Riley K.', 'Morgan B.'],
      createdAt: 2
    }
  ];
}

/**
 * Switches between Events and Group Chat tabs on mobile.
 */
function switchTab(tab) {
  const feed = document.getElementById('community-feed');
  const chat = document.getElementById('community-chat');
  document.querySelectorAll('.community-tab').forEach((btn) => {
    btn.classList.toggle('community-tab--active', btn.dataset.tab === tab);
  });
  if (tab === 'chat') {
    feed.classList.add('community-feed--hidden');
    chat.classList.add('community-chat-section--active');
  } else {
    feed.classList.remove('community-feed--hidden');
    chat.classList.remove('community-chat-section--active');
  }
}

/**
 * Renders the chronological events feed (newest first).
 */
function renderFeed() {
  const feed = document.getElementById('community-feed');
  let list = [...events];
  if (activityFilter) {
    list = list.filter((ev) => ev.type !== 'sport' || ev.activityType === activityFilter);
  }
  const sorted = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const cards = sorted
    .map((evt) => {
      const isClub = evt.type === 'club';
      const count = (evt.attendees || []).length;
      const user = getCurrentUser();
      const joined = (evt.attendees || []).includes(user.name);
      const spotsLeft =
        evt.type === 'sport' && evt.spots != null ? Math.max(0, evt.spots - count) : null;

      return `
        <article class="event-card" data-id="${escapeHtml(evt.id)}">
          <header class="event-card__header">
            <div>
              <p class="event-card__org">${escapeHtml(evt.org || evt.activityType || 'UNite Event')}</p>
              ${isClub && evt.verified ? '<span class="verified">Verified Club</span>' : ''}
              ${!isClub ? `<span class="badge badge--gold">${escapeHtml(evt.activityType || 'Sports')}</span>` : ''}
            </div>
          </header>
          <h2 class="event-card__title">${escapeHtml(evt.title)}</h2>
          <div class="event-card__meta">
            <span>${escapeHtml(evt.date)} · ${escapeHtml(evt.time)}</span>
            <span>${escapeHtml(evt.location)}</span>
            ${spotsLeft != null ? `<span>${spotsLeft} spots left</span>` : ''}
            ${evt.skillLevel ? `<span>${escapeHtml(evt.skillLevel)}</span>` : ''}
          </div>
          <p class="event-card__desc">${escapeHtml(evt.description)}</p>
          <footer class="event-card__footer">
            <span class="event-card__rsvp">${count} student${count === 1 ? '' : 's'} going</span>
            <button type="button" class="btn-primary btn-sm ${joined ? 'btn-secondary' : ''}" data-action="${isClub ? 'rsvp' : 'pullup'}" data-id="${escapeHtml(evt.id)}" ${joined ? 'disabled' : ''}>
              ${joined ? (isClub ? 'Going ✓' : 'Pulling Up ✓') : isClub ? 'RSVP' : 'Pull Up'}
            </button>
          </footer>
        </article>`;
    })
    .join('');

  const actions = document.getElementById('community-actions');
  feed.innerHTML = (actions ? actions.outerHTML : '') + cards;

  feed.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'rsvp') handleRsvp(btn.dataset.id);
      else handlePullUp(btn.dataset.id);
    });
  });
}

/**
 * Adds the current user to a club event RSVP list.
 */
function handleRsvp(eventId) {
  const evt = events.find((e) => e.id === eventId);
  if (!evt) return;
  const user = getCurrentUser();
  if (!evt.attendees) evt.attendees = [];
  if (!evt.attendees.includes(user.name)) evt.attendees.push(user.name);
  saveEvents();
  renderFeed();
}

/**
 * Adds the current user to a sports event attendee list.
 */
function handlePullUp(eventId) {
  const evt = events.find((e) => e.id === eventId);
  if (!evt) return;
  const user = getCurrentUser();
  if (!evt.attendees) evt.attendees = [];
  if (evt.spots != null && evt.attendees.length >= evt.spots) return;
  if (!evt.attendees.includes(user.name)) evt.attendees.push(user.name);
  saveEvents();
  renderFeed();
}

/**
 * Opens the post-event modal for club or sports type.
 */
function openPostModal(type) {
  const modal = document.getElementById('post-modal');
  document.getElementById('post-type').value = type;
  document.getElementById('post-modal-title').textContent =
    type === 'club' ? 'Club Newsletter Post' : 'Pull Up — Sports & Hobbies';
  document.getElementById('club-only-fields').hidden = type !== 'club';
  document.getElementById('sport-only-fields').hidden = type !== 'sport';
  document.getElementById('sport-spots-field').hidden = type !== 'sport';
  document.getElementById('sport-skill-field').hidden = type !== 'sport';
  document.getElementById('post-org').required = type === 'club';
  document.getElementById('post-activity').required = type === 'sport';
  modal.classList.add('modal-overlay--open');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the post-event modal.
 */
function closePostModal() {
  const modal = document.getElementById('post-modal');
  modal.classList.remove('modal-overlay--open');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('post-form').reset();
}

/**
 * Submits a new club or sports event from the post form.
 */
function submitPost(event) {
  event.preventDefault();
  const type = document.getElementById('post-type').value;
  const user = getCurrentUser();
  const payload = {
    id: `evt-${Date.now()}`,
    type,
    org: document.getElementById('post-org').value.trim(),
    title: document.getElementById('post-title').value.trim(),
    date: document.getElementById('post-date').value.trim(),
    time: document.getElementById('post-time').value.trim(),
    location: document.getElementById('post-location').value.trim(),
    description: document.getElementById('post-description').value.trim(),
    attendees: [user.name],
    createdAt: Date.now()
  };

  if (type === 'club') {
    payload.verified = isVerifiedClub();
    if (!payload.verified) {
      alert('Only verified clubs can post to the newsletter. Enable demo verified mode in admin toggle.');
      return;
    }
  } else {
    payload.activityType = document.getElementById('post-activity').value.trim();
    payload.spots = parseInt(document.getElementById('post-spots').value, 10) || 10;
    payload.skillLevel = document.getElementById('post-skill').value;
    payload.org = `${payload.activityType} — ${payload.location}`;
  }

  events.unshift(payload);
  saveEvents();
  closePostModal();
  renderFeed();
}

/**
 * Toggles demo admin verified-club status for posting.
 */
function toggleAdminVerified() {
  const on = localStorage.getItem(STORAGE_VERIFIED) === 'true';
  localStorage.setItem(STORAGE_VERIFIED, on ? 'false' : 'true');
  const label = document.getElementById('admin-verified-label');
  if (label) label.textContent = on ? 'Demo: Verify Club (off)' : 'Demo: Verify Club (on)';
}

/**
 * Wires Community Hub UI events on page load.
 */
function bindEvents() {
  document.querySelectorAll('.community-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('post-club-btn')?.addEventListener('click', () => openPostModal('club'));
  document.getElementById('post-sport-btn')?.addEventListener('click', () => openPostModal('sport'));
  document.getElementById('post-form')?.addEventListener('submit', submitPost);
  document.querySelector('[data-close-modal="post-modal"]')?.addEventListener('click', closePostModal);
  document.getElementById('admin-verified-toggle')?.addEventListener('click', toggleAdminVerified);

  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.querySelector('.nav').classList.toggle('nav--open');
  });

  document.getElementById('filter-activity')?.addEventListener('change', (e) => {
    activityFilter = e.target.value;
    renderFeed();
  });
}

/**
 * Initializes Community Hub on DOM ready.
 */
function init() {
  loadEvents();
  bindEvents();
  renderFeed();
  const on = localStorage.getItem(STORAGE_VERIFIED) === 'true';
  const label = document.getElementById('admin-verified-label');
  if (label) label.textContent = on ? 'Demo: Verify Club (on)' : 'Demo: Verify Club (off)';
}

document.addEventListener('DOMContentLoaded', init);
