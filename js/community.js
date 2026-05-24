/**
 * Community Hub — club newsletter, sports Pull Up feed, RSVP, and tabs
 */

const STORAGE_CLUB = 'unite_community_events';
const STORAGE_SPORTS = 'unite_sports_events';
const STORAGE_VERIFIED = 'unite_admin_verified';

const VERIFIED_CLUBS = [
  'UCalgary Computer Science Society',
  'Engineers Without Borders UCalgary',
  'UCalgary Kinesiology Club'
];

let clubEvents = [];
let sportsEvents = [];
let activityFilter = '';

/**
 * Returns the current user from chat config or localStorage profile.
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
 * Returns true when a club name is in the hardcoded verified list or demo toggle is on.
 */
function isClubVerified(orgName) {
  if (!orgName) return false;
  const normalized = orgName.trim().toLowerCase();
  if (VERIFIED_CLUBS.some((c) => c.toLowerCase() === normalized)) return true;
  if (localStorage.getItem(STORAGE_VERIFIED) === 'true') return true;
  return false;
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
 * Formats a date input value for display on event cards.
 */
function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Formats a time input value for display on event cards.
 */
function formatDisplayTime(timeValue) {
  if (!timeValue) return '';
  const [h, m] = timeValue.split(':');
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10));
  return date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Loads club and sports events from localStorage or seeds demo data.
 */
function loadEvents() {
  try {
    const clubs = JSON.parse(localStorage.getItem(STORAGE_CLUB) || '[]');
    if (clubs.length) clubEvents = clubs;
  } catch {
    clubEvents = [];
  }
  if (!clubEvents.length) {
    clubEvents = getSeedClubEvents();
    saveClubEvents();
  }

  try {
    const sports = JSON.parse(localStorage.getItem(STORAGE_SPORTS) || '[]');
    if (sports.length) sportsEvents = sports;
  } catch {
    sportsEvents = [];
  }
  if (!sportsEvents.length) {
    sportsEvents = getSeedSportsEvents();
    saveSportsEvents();
  }
}

/**
 * Persists club events to localStorage.
 */
function saveClubEvents() {
  localStorage.setItem(STORAGE_CLUB, JSON.stringify(clubEvents));
}

/**
 * Persists sports events to unite_sports_events in localStorage.
 */
function saveSportsEvents() {
  localStorage.setItem(STORAGE_SPORTS, JSON.stringify(sportsEvents));
}

/**
 * Returns demo verified club newsletter posts.
 */
function getSeedClubEvents() {
  return [
    {
      id: 'club-1',
      type: 'club',
      org: 'UCalgary Computer Science Society',
      verified: true,
      title: 'Hackathon Prep Night',
      date: 'Thu, May 29',
      time: '6:00 PM',
      location: 'ICT 121',
      description:
        "Join the CS Society for a prep session before Calgary's biggest student hackathon. Pizza provided. Bring your laptop.",
      attendees: ['Sarah C.', 'Marcus T.', 'Priya K.'],
      createdAt: 3
    },
    {
      id: 'club-2',
      type: 'club',
      org: 'Engineers Without Borders UCalgary',
      verified: true,
      title: 'Sustainability Workshop',
      date: 'Wed, May 28',
      time: '5:30 PM',
      location: 'ENG 101',
      description: 'Learn how engineering students can support global development projects this summer.',
      attendees: ['Alex M.', 'Jordan L.'],
      createdAt: 2
    },
    {
      id: 'club-3',
      type: 'club',
      org: 'UCalgary Kinesiology Club',
      verified: true,
      title: 'Intramural Info Session',
      date: 'Fri, May 30',
      time: '4:00 PM',
      location: 'Kinesiology Complex',
      description: 'Sign up for fall intramurals and meet team captains.',
      attendees: ['Taylor R.', 'Casey D.', 'Sam P.'],
      createdAt: 1
    }
  ];
}

/**
 * Returns demo sports Pull Up events.
 */
function getSeedSportsEvents() {
  return [
    {
      id: 'sport-1',
      type: 'sport',
      activity: 'Soccer',
      org: 'Pickup Soccer — Mac Field',
      title: 'Saturday Morning Kickabout',
      date: 'Sat, May 31',
      time: '10:00 AM',
      location: 'MacEwan Field, UCalgary campus',
      description: 'Casual 7v7 pickup soccer. All skill levels welcome. Bring cleats or runners.',
      spots: 12,
      skillLevel: 'Any',
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
 * Builds HTML for a single club newsletter event card.
 */
function renderClubCard(evt) {
  const count = (evt.attendees || []).length;
  const user = getCurrentUser();
  const joined = (evt.attendees || []).includes(user.name);
  const verified = isClubVerified(evt.org) || evt.verified;

  return `
    <article class="event-card" data-id="${escapeHtml(evt.id)}" data-kind="club">
      <header class="event-card__header">
        <div class="event-card__org-row">
          <p class="event-card__org">${escapeHtml(evt.org)}</p>
          ${verified ? '<span class="verified">Verified Club</span>' : ''}
        </div>
      </header>
      <h2 class="event-card__title">${escapeHtml(evt.title)}</h2>
      <div class="event-card__meta">
        <span>${escapeHtml(evt.date)} · ${escapeHtml(evt.time)}</span>
        <span>${escapeHtml(evt.location)}</span>
      </div>
      <p class="event-card__desc">${escapeHtml(evt.description)}</p>
      <footer class="event-card__footer">
        <span class="event-card__rsvp">${count} student${count === 1 ? '' : 's'} going</span>
        <button type="button" class="btn-primary btn-sm ${joined ? 'btn-secondary' : ''}" data-action="rsvp" data-id="${escapeHtml(evt.id)}" ${joined ? 'disabled' : ''}>
          ${joined ? 'Going ✓' : 'RSVP'}
        </button>
      </footer>
    </article>`;
}

/**
 * Builds HTML for a single sports Pull Up event card.
 */
function renderSportCard(evt) {
  const count = (evt.attendees || []).length;
  const user = getCurrentUser();
  const joined = (evt.attendees || []).includes(user.name);
  const spotsLeft = evt.spots != null ? Math.max(0, evt.spots - count) : null;

  return `
    <article class="event-card" data-id="${escapeHtml(evt.id)}" data-kind="sport">
      <header class="event-card__header">
        <div>
          <p class="event-card__org">${escapeHtml(evt.org || evt.activity)}</p>
          <span class="badge badge--gold">${escapeHtml(evt.activityType || evt.activity || 'Sports')}</span>
        </div>
      </header>
      <h2 class="event-card__title">${escapeHtml(evt.title)}</h2>
      <div class="event-card__meta">
        <span>${escapeHtml(evt.date)} · ${escapeHtml(evt.time)}</span>
        <span>${escapeHtml(evt.location)}</span>
        ${spotsLeft != null ? `<span>${spotsLeft} spots left</span>` : ''}
        ${evt.skillLevel ? `<span>${escapeHtml(evt.skillLevel)}</span>` : ''}
      </div>
      <p class="event-card__desc">${escapeHtml(evt.description || '')}</p>
      <footer class="event-card__footer">
        <span class="event-card__rsvp">${count} student${count === 1 ? '' : 's'} going</span>
        <button type="button" class="btn-primary btn-sm ${joined ? 'btn-secondary' : ''}" data-action="pullup" data-id="${escapeHtml(evt.id)}" ${joined ? 'disabled' : ''}>
          ${joined ? 'Pulling Up ✓' : 'Pull Up'}
        </button>
      </footer>
    </article>`;
}

/**
 * Renders club and sports feeds (newest first).
 */
function renderFeed() {
  const clubFeed = document.getElementById('club-feed');
  const sportsFeed = document.getElementById('sports-feed');

  const clubs = [...clubEvents].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  let sports = [...sportsEvents].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (activityFilter) {
    sports = sports.filter((ev) => ev.activityType === activityFilter || ev.activity === activityFilter);
  }

  clubFeed.innerHTML = clubs.map(renderClubCard).join('') || '<p class="text-muted">No club posts yet.</p>';
  sportsFeed.innerHTML = sports.map(renderSportCard).join('') || '<p class="text-muted">No Pull Up events yet — post one below!</p>';

  document.querySelectorAll('[data-action]').forEach((btn) => {
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
  const evt = clubEvents.find((e) => e.id === eventId);
  if (!evt) return;
  const user = getCurrentUser();
  if (!evt.attendees) evt.attendees = [];
  if (!evt.attendees.includes(user.name)) evt.attendees.push(user.name);
  saveClubEvents();
  renderFeed();
}

/**
 * Adds the current user to a sports event attendee list.
 */
function handlePullUp(eventId) {
  const evt = sportsEvents.find((e) => e.id === eventId);
  if (!evt) return;
  const user = getCurrentUser();
  if (!evt.attendees) evt.attendees = [];
  if (evt.spots != null && evt.attendees.length >= evt.spots) return;
  if (!evt.attendees.includes(user.name)) evt.attendees.push(user.name);
  saveSportsEvents();
  renderFeed();
}

/**
 * Opens the club newsletter post modal.
 */
function openPostModal() {
  const modal = document.getElementById('post-modal');
  modal.classList.add('modal-overlay--open');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the club newsletter post modal.
 */
function closePostModal() {
  const modal = document.getElementById('post-modal');
  modal.classList.remove('modal-overlay--open');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('post-form').reset();
}

/**
 * Submits a new verified club post from the modal form.
 */
function submitClubPost(event) {
  event.preventDefault();
  const org = document.getElementById('post-org').value.trim();
  if (!isClubVerified(org)) {
    alert('Only verified clubs can post. Use one of the verified club names or enable Demo: Verify Club.');
    return;
  }

  const user = getCurrentUser();
  const payload = {
    id: `club-${Date.now()}`,
    type: 'club',
    org,
    verified: true,
    title: document.getElementById('post-title').value.trim(),
    date: document.getElementById('post-date').value.trim(),
    time: document.getElementById('post-time').value.trim(),
    location: document.getElementById('post-location').value.trim(),
    description: document.getElementById('post-description').value.trim(),
    attendees: [user.name],
    createdAt: Date.now()
  };

  clubEvents.unshift(payload);
  saveClubEvents();
  closePostModal();
  renderFeed();
}

/**
 * Submits the inline Sports & Hobbies form and prepends a new event card.
 */
function submitSportsPost(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const activity = document.getElementById('sport-activity').value.trim();
  const dateRaw = document.getElementById('sport-date').value;
  const timeRaw = document.getElementById('sport-time').value;
  const location = document.getElementById('sport-location').value.trim() || 'UCalgary campus';
  const spots = Math.min(20, Math.max(1, parseInt(document.getElementById('sport-spots').value, 10) || 10));
  const skillLevel = document.getElementById('sport-skill').value;

  const payload = {
    id: `sport-${Date.now()}`,
    type: 'sport',
    activity,
    activityType: activity,
    org: `${activity} — ${location}`,
    title: `${activity} Pull Up`,
    date: formatDisplayDate(dateRaw),
    time: formatDisplayTime(timeRaw),
    location,
    description: `${activity} on campus. Skill level: ${skillLevel}.`,
    spots,
    skillLevel,
    attendees: [user.name],
    createdAt: Date.now()
  };

  sportsEvents.unshift(payload);
  saveSportsEvents();
  document.getElementById('sports-post-form').reset();
  document.getElementById('sport-location').value = 'UCalgary campus';
  document.getElementById('sport-spots').value = '10';
  renderFeed();
}

/**
 * Toggles demo admin verified-club status for posting any club name.
 */
function toggleAdminVerified() {
  const on = localStorage.getItem(STORAGE_VERIFIED) === 'true';
  localStorage.setItem(STORAGE_VERIFIED, on ? 'false' : 'true');
  const label = document.getElementById('admin-verified-label');
  if (label) label.textContent = on ? 'Demo: Verify Club (off)' : 'Demo: Verify Club (on)';
  renderFeed();
}

/**
 * Wires Community Hub UI events on page load.
 */
function bindEvents() {
  document.querySelectorAll('.community-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('post-club-btn')?.addEventListener('click', openPostModal);
  document.getElementById('post-form')?.addEventListener('submit', submitClubPost);
  document.getElementById('sports-post-form')?.addEventListener('submit', submitSportsPost);
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
