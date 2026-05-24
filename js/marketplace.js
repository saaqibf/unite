/**
 * Marketplace — browse, list, filter, interest/DM, and course suggestions
 */

const MEETUP_SPOTS = [
  'MacHall',
  'TFDL',
  'Science Theatres',
  'ICT Building',
  'Engineering Building',
  'Residence',
  'Foothills Campus'
];

const MAX_PHOTOS = 4;
const STORAGE_LISTINGS = 'unite_marketplace_listings';
const STORAGE_THREADS = 'unite_marketplace_threads';

let listings = [];
let activeListingId = null;
let activeThreadId = null;
let photoFiles = [];

/**
 * Returns API base URL from page config or default path.
 */
function getApiBase() {
  return (window.UNITE_MARKETPLACE_CONFIG && window.UNITE_MARKETPLACE_CONFIG.apiBase) || '/api/marketplace';
}

/**
 * Returns the logged-in demo user from config or localStorage profile.
 */
function getCurrentUser() {
  const cfg = window.UNITE_MARKETPLACE_CONFIG && window.UNITE_MARKETPLACE_CONFIG.currentUser;
  if (cfg) return cfg;
  try {
    const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
    return {
      id: profile.id || 'demo-user',
      name: profile.name || 'UNite Student',
      program: profile.program || 'UCalgary'
    };
  } catch {
    return { id: 'demo-user', name: 'UNite Student', program: 'UCalgary' };
  }
}

/**
 * Reads whether the student has no car from onboarding profile.
 */
function userHasNoCar() {
  try {
    const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
    if (!profile.has_car && profile.has_car !== true) return true;
    if (profile.has_car === false || profile.has_car === 'no') return true;
    if (profile.hasCar === false || profile.hasCar === 'No') return true;
  } catch {
    /* ignore */
  }
  return localStorage.getItem('unite_demo_no_car') === 'true';
}

/**
 * Reads upcoming course codes from Course Compass (empty if not set).
 */
function getUpcomingCourses() {
  try {
    const raw = localStorage.getItem('unite_upcoming_courses');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns true when listing title/description matches an upcoming course code.
 */
function listingMatchesCourses(item, courses) {
  if (!courses.length) return false;
  const hay = `${item.title} ${item.description} ${(item.courseTags || []).join(' ')}`.toUpperCase();
  return courses.some((code) => {
    const normalized = String(code).toUpperCase().replace(/\s+/g, ' ');
    return hay.includes(normalized);
  });
}

/**
 * Escapes text for safe HTML rendering.
 */
function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text == null ? '' : String(text);
  return el.innerHTML;
}

/**
 * Formats a price number as CAD currency display.
 */
function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return '$0';
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

/**
 * Formats ISO date as relative time listed.
 */
function formatTimeListed(iso) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Builds full meetup label including custom Other text.
 */
function meetupLabel(listing) {
  if (listing.meetupSpot === 'Other' && listing.meetupOther) {
    return listing.meetupOther;
  }
  return listing.meetupSpot || 'Campus';
}

/**
 * Returns true if listing uses an on-campus predefined meetup spot.
 */
function isCampusPickup(listing) {
  return MEETUP_SPOTS.includes(listing.meetupSpot);
}

/**
 * Performs a JSON fetch against the marketplace API with demo user header.
 */
async function apiFetch(path, options) {
  const user = getCurrentUser();
  const headers = Object.assign(
    { 'Content-Type': 'application/json', 'X-UNite-User-Id': user.id, 'X-UNite-User-Name': user.name },
    (options && options.headers) || {}
  );
  const res = await fetch(getApiBase() + path, Object.assign({}, options, { headers }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || 'Request failed');
  }
  return res.json();
}

/**
 * Loads listings from API with localStorage fallback for offline demo.
 */
async function loadListings() {
  try {
    const data = await apiFetch('/listings?' + buildFilterQuery());
    listings = data.listings || [];
    persistListingsLocal(listings);
    return;
  } catch {
    listings = getLocalListings();
    if (!listings.length) {
      listings = getSeedListings();
      persistListingsLocal(listings);
    }
    applyClientFilters();
  }
}

/**
 * Saves listings array to localStorage for demo persistence.
 */
function persistListingsLocal(items) {
  localStorage.setItem(STORAGE_LISTINGS, JSON.stringify(items));
}

/**
 * Reads listings from localStorage.
 */
function getLocalListings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_LISTINGS) || '[]');
  } catch {
    return [];
  }
}

/**
 * Returns demo seed listings when API and storage are empty.
 */
function getSeedListings() {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-1',
      sellerId: 'seed-sarah',
      sellerName: 'Sarah C.',
      title: 'CPSC 331 — Algorithm Design Textbook',
      description: '4th edition, light highlighting. Perfect for next semester.',
      price: 85,
      condition: 'Good',
      category: 'Textbooks',
      meetupSpot: 'TFDL',
      photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop'],
      status: 'active',
      courseTags: ['CPSC 331'],
      createdAt: now
    },
    {
      id: 'seed-2',
      sellerId: 'seed-marcus',
      sellerName: 'Marcus T.',
      title: 'MATH 271 — Calculus II Bundle',
      description: 'Textbook + solution manual. Meet at Science Theatres.',
      price: 60,
      condition: 'Like New',
      category: 'Textbooks',
      meetupSpot: 'Science Theatres',
      photos: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop'],
      status: 'active',
      courseTags: ['MATH 271'],
      createdAt: now
    },
    {
      id: 'seed-3',
      sellerId: 'seed-priya',
      sellerName: 'Priya K.',
      title: 'USB-C Laptop Charger 65W',
      description: 'Works with most laptops. Barely used.',
      price: 25,
      condition: 'Like New',
      category: 'Electronics',
      meetupSpot: 'MacHall',
      photos: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-4',
      sellerId: 'seed-alex',
      sellerName: 'Alex M.',
      title: 'IKEA Desk + Chair',
      description: 'Moving out of residence. Pick up at Cascade.',
      price: 120,
      condition: 'Good',
      category: 'Furniture',
      meetupSpot: 'Residence',
      photos: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-5',
      sellerId: 'seed-jordan',
      sellerName: 'Jordan L.',
      title: 'Intermediate Hockey Stick',
      description: 'Right-handed, great for intramurals.',
      price: 45,
      condition: 'Good',
      category: 'Sports',
      meetupSpot: 'ICT Building',
      photos: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    },
    {
      id: 'seed-6',
      sellerId: 'seed-taylor',
      sellerName: 'Taylor R.',
      title: 'Winter Parka — Men\'s M',
      description: 'Warm, clean, worn one season.',
      price: 55,
      condition: 'Good',
      category: 'Clothing',
      meetupSpot: 'Engineering Building',
      photos: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop'],
      status: 'active',
      createdAt: now
    }
  ];
}

/**
 * Builds query string from current filter UI state.
 */
function buildFilterQuery() {
  const params = new URLSearchParams();
  const q = document.getElementById('search-input').value.trim();
  if (q) params.set('q', q);
  const cat = document.getElementById('filter-category').value;
  if (cat) params.set('category', cat);
  const min = document.getElementById('filter-min-price').value;
  if (min) params.set('minPrice', min);
  const max = document.getElementById('filter-max-price').value;
  if (max) params.set('maxPrice', max);
  const cond = document.getElementById('filter-condition').value;
  if (cond) params.set('condition', cond);
  const meetup = document.getElementById('filter-meetup').value;
  if (meetup) params.set('meetup', meetup);
  if (document.getElementById('campus-pickup-chip').classList.contains('filter-chip--active')) {
    params.set('campusOnly', 'true');
  }
  return params.toString();
}

/**
 * Applies browse filters on the client when using local data.
 */
function applyClientFilters() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const cat = document.getElementById('filter-category').value;
  const min = parseFloat(document.getElementById('filter-min-price').value);
  const max = parseFloat(document.getElementById('filter-max-price').value);
  const cond = document.getElementById('filter-condition').value;
  const meetup = document.getElementById('filter-meetup').value;
  const campusOnly = document.getElementById('campus-pickup-chip').classList.contains('filter-chip--active');

  const all = getLocalListings().length ? getLocalListings() : listings;
  listings = all.filter((item) => {
    if (item.status === 'sold' && !document.getElementById('show-sold')) return true;
    if (q && !(`${item.title} ${item.description}`.toLowerCase().includes(q))) return false;
    if (cat && item.category !== cat) return false;
    if (!Number.isNaN(min) && document.getElementById('filter-min-price').value && Number(item.price) < min) return false;
    if (!Number.isNaN(max) && document.getElementById('filter-max-price').value && Number(item.price) > max) return false;
    if (cond && item.condition !== cond) return false;
    if (meetup && item.meetupSpot !== meetup) return false;
    if (campusOnly && !isCampusPickup(item)) return false;
    return true;
  });
}

/**
 * Renders the marketplace listing grid from current listings array.
 */
function renderGrid() {
  const grid = document.getElementById('marketplace-grid');
  const empty = document.getElementById('marketplace-empty');
  if (!listings.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = listings
    .map((item) => {
      const img = (item.photos && item.photos[0]) || '';
      const sold = item.status === 'sold';
      return `
        <article class="marketplace-card ${sold ? 'marketplace-card--sold' : ''}" data-id="${escapeHtml(item.id)}" tabindex="0">
          <div class="marketplace-card__img-wrap">
            ${img ? `<img class="marketplace-card__img" src="${escapeHtml(img)}" alt="">` : '<div class="marketplace-card__img"></div>'}
            ${sold ? '<span class="badge badge--success marketplace-card__sold">SOLD</span>' : ''}
          </div>
          <div class="marketplace-card__body">
            <p class="marketplace-card__price">${escapeHtml(formatPrice(item.price))}</p>
            <h3 class="marketplace-card__title">${escapeHtml(item.title)}</h3>
            <span class="badge badge--muted">${escapeHtml(item.condition)}</span>
            <div class="marketplace-card__meta">
              <span>${escapeHtml(meetupLabel(item))}</span>
              <span>·</span>
              <span>${escapeHtml(formatTimeListed(item.createdAt))}</span>
            </div>
          </div>
        </article>`;
    })
    .join('');

  grid.querySelectorAll('.marketplace-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openDetail(card.dataset.id);
    });
  });
}

/**
 * Renders Course Compass textbook suggestions for upcoming courses.
 */
function renderCourseSuggestions() {
  const courses = getUpcomingCourses();
  const section = document.getElementById('course-suggestions');
  const grid = document.getElementById('course-suggestions-grid');

  if (!courses.length) {
    section.hidden = true;
    grid.innerHTML = '';
    return;
  }

  const all = getLocalListings().length ? getLocalListings() : listings.length ? listings : getSeedListings();
  const matches = all.filter((item) => listingMatchesCourses(item, courses));

  if (!matches.length) {
    section.hidden = true;
    grid.innerHTML = '';
    return;
  }

  section.hidden = false;
  grid.innerHTML = matches
    .slice(0, 6)
    .map((item) => {
      const img = (item.photos && item.photos[0]) || '';
      return `
        <article class="marketplace-card" data-id="${escapeHtml(item.id)}" tabindex="0">
          <div class="marketplace-card__img-wrap">
            ${img ? `<img class="marketplace-card__img" src="${escapeHtml(img)}" alt="">` : ''}
          </div>
          <div class="marketplace-card__body">
            <p class="marketplace-card__program-label">Someone in your program is selling this 🎓</p>
            <p class="marketplace-card__price">${escapeHtml(formatPrice(item.price))}</p>
            <h3 class="marketplace-card__title">${escapeHtml(item.title)}</h3>
          </div>
        </article>`;
    })
    .join('');

  grid.querySelectorAll('.marketplace-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

/**
 * Opens the item detail modal for a listing by id.
 */
function openDetail(id) {
  const all = getLocalListings().length ? getLocalListings() : listings;
  const item = all.find((l) => String(l.id) === String(id)) || listings.find((l) => String(l.id) === String(id));
  if (!item) return;
  activeListingId = item.id;
  const user = getCurrentUser();
  const isSeller = String(item.sellerId) === String(user.id);
  const sold = item.status === 'sold';
  const photos = (item.photos || [])
    .map((url) => `<img src="${escapeHtml(url)}" alt="">`)
    .join('');

  document.getElementById('detail-panel').innerHTML = `
    <div class="modal-panel__header">
      <h2 class="modal-panel__title">${escapeHtml(item.title)}</h2>
      <button type="button" class="modal-close" data-close-modal="detail-modal" aria-label="Close">&times;</button>
    </div>
    <div class="item-detail__gallery">${photos || '<p class="text-muted">No photos</p>'}</div>
    <p class="marketplace-card__price" style="margin-bottom:var(--space-sm)">${escapeHtml(formatPrice(item.price))}</p>
    <p><span class="badge badge--muted">${escapeHtml(item.condition)}</span> <span class="badge badge--gold">${escapeHtml(item.category)}</span></p>
    <p class="text-muted" style="margin:var(--space-md) 0">${escapeHtml(item.description)}</p>
    <p><strong>Meet at:</strong> ${escapeHtml(meetupLabel(item))}</p>
    <p class="text-muted" style="font-size:0.875rem;margin-top:var(--space-xs)">Seller: ${escapeHtml(item.sellerName)} · ${escapeHtml(formatTimeListed(item.createdAt))}</p>
    <div style="margin-top:var(--space-lg)" class="stack">
      ${
        sold
          ? '<span class="badge badge--success">SOLD</span>'
          : isSeller
            ? '<button type="button" class="btn-secondary btn-block" id="mark-sold-btn">Mark as Sold</button>'
            : `<button type="button" class="btn-primary btn-block" id="interest-btn">I'm Interested — Let's Unite</button>`
      }
    </div>`;

  openModal('detail-modal');
  document.querySelector('[data-close-modal="detail-modal"]')?.addEventListener('click', () => closeModal('detail-modal'));
  document.getElementById('interest-btn')?.addEventListener('click', () => startInterest(item));
  document.getElementById('mark-sold-btn')?.addEventListener('click', () => markSold(item.id));
}

/**
 * Opens a modal overlay by element id.
 */
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('modal-overlay--open');
  el.setAttribute('aria-hidden', 'false');
}

/**
 * Closes a modal overlay by element id.
 */
function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('modal-overlay--open');
  el.setAttribute('aria-hidden', 'true');
}

/**
 * Starts interest flow — opens DM with pre-filled message to seller.
 */
async function startInterest(item) {
  const user = getCurrentUser();
  const prefilled = `Hey! I am interested in your ${item.title}. When can we meet at ${meetupLabel(item)}?`;
  let thread;

  try {
    thread = await apiFetch(`/listings/${item.id}/interest`, {
      method: 'POST',
      body: JSON.stringify({ message: prefilled })
    });
  } catch {
    thread = createLocalThread(item, user, prefilled);
  }

  activeThreadId = thread.id;
  activeListingId = item.id;
  closeModal('detail-modal');
  openDmModal(thread, item);
}

/**
 * Creates a DM thread in localStorage when API is unavailable.
 */
function createLocalThread(item, user, prefilled) {
  const threads = getLocalThreads();
  const existing = threads.find(
    (t) => String(t.listingId) === String(item.id) && String(t.buyerId) === String(user.id)
  );
  if (existing) return existing;

  const thread = {
    id: `thread-${Date.now()}`,
    listingId: item.id,
    listingTitle: item.title,
    buyerId: user.id,
    buyerName: user.name,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    messages: [{ from: user.id, text: prefilled, at: new Date().toISOString() }]
  };
  threads.push(thread);
  localStorage.setItem(STORAGE_THREADS, JSON.stringify(threads));
  return thread;
}

/**
 * Reads DM threads from localStorage.
 */
function getLocalThreads() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_THREADS) || '[]');
  } catch {
    return [];
  }
}

/**
 * Opens the DM modal and renders messages for a thread.
 */
function openDmModal(thread, item) {
  document.getElementById('dm-modal-title').textContent = item.title;
  renderDmMessages(thread);
  openModal('dm-modal');
}

/**
 * Renders messages inside the DM thread panel.
 */
function renderDmMessages(thread) {
  const user = getCurrentUser();
  const container = document.getElementById('dm-thread');
  container.innerHTML = (thread.messages || [])
    .map((msg) => {
      const mine = String(msg.from) === String(user.id) || msg.from === 'buyer' && String(thread.buyerId) === String(user.id);
      return `<div class="dm-message ${mine ? 'dm-message--mine' : 'dm-message--theirs'}">${escapeHtml(msg.text)}</div>`;
    })
    .join('');
  container.scrollTop = container.scrollHeight;
}

/**
 * Sends a new message in the active DM thread.
 */
async function sendDmMessage(text) {
  if (!activeThreadId) return;
  const user = getCurrentUser();

  try {
    const updated = await apiFetch(`/threads/${activeThreadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    renderDmMessages(updated);
    return;
  } catch {
    const threads = getLocalThreads();
    const thread = threads.find((t) => String(t.id) === String(activeThreadId));
    if (!thread) return;
    thread.messages.push({ from: user.id, text, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_THREADS, JSON.stringify(threads));
    renderDmMessages(thread);
  }
}

/**
 * Marks a listing as sold via API or localStorage.
 */
async function markSold(id) {
  try {
    await apiFetch(`/listings/${id}/sold`, { method: 'POST' });
  } catch {
    const all = getLocalListings();
    const idx = all.findIndex((l) => String(l.id) === String(id));
    if (idx >= 0) {
      all[idx].status = 'sold';
      persistListingsLocal(all);
    }
  }
  closeModal('detail-modal');
  await refreshBrowse();
}

/**
 * Refreshes listings and re-renders grid and suggestions.
 */
async function refreshBrowse() {
  await loadListings();
  renderGrid();
  renderCourseSuggestions();
}

/**
 * Builds photo upload slots in the list-item form.
 */
function initPhotoUpload() {
  const grid = document.getElementById('photo-upload-grid');
  grid.innerHTML = '';
  photoFiles = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const slot = document.createElement('label');
    slot.className = 'photo-upload-slot';
    slot.innerHTML = `<span>+ Photo</span><input type="file" accept="image/*" data-index="${i}">`;
    const input = slot.querySelector('input');
    input.addEventListener('change', (e) => handlePhotoSelect(e, slot, i));
    grid.appendChild(slot);
  }
}

/**
 * Handles a photo file selection and preview in a slot.
 */
function handlePhotoSelect(event, slot, index) {
  const file = event.target.files[0];
  if (!file) return;
  photoFiles[index] = file;
  const url = URL.createObjectURL(file);
  slot.innerHTML = `<img src="${url}" alt=""><button type="button" class="photo-upload-slot__remove" aria-label="Remove">×</button><input type="file" accept="image/*" data-index="${index}">`;
  slot.querySelector('.photo-upload-slot__remove').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    photoFiles[index] = null;
    slot.innerHTML = `<span>+ Photo</span><input type="file" accept="image/*" data-index="${index}">`;
    slot.querySelector('input').addEventListener('change', (ev) => handlePhotoSelect(ev, slot, index));
  });
  slot.querySelector('input').addEventListener('change', (ev) => handlePhotoSelect(ev, slot, index));
}

/**
 * Uploads photos to Cloudinary via backend or returns data URLs as fallback.
 */
async function uploadPhotos() {
  const urls = [];
  const files = photoFiles.filter(Boolean);
  for (const file of files) {
    try {
      const form = new FormData();
      form.append('photo', file);
      const user = getCurrentUser();
      const res = await fetch(getApiBase() + '/upload', {
        method: 'POST',
        headers: { 'X-UNite-User-Id': user.id },
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        urls.push(data.url);
        continue;
      }
    } catch {
      /* fallback below */
    }
    urls.push(await fileToDataUrl(file));
  }
  return urls;
}

/**
 * Converts a File to a base64 data URL for offline demo.
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Submits the list-item form to create a new marketplace listing.
 */
async function submitListing(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const meetupSpot = document.getElementById('list-meetup').value;
  const payload = {
    title: document.getElementById('list-title').value.trim(),
    description: document.getElementById('list-description').value.trim(),
    price: parseFloat(document.getElementById('list-price').value),
    condition: document.getElementById('list-condition').value,
    category: document.getElementById('list-category').value,
    meetupSpot,
    meetupOther: meetupSpot === 'Other' ? document.getElementById('list-meetup-other').value.trim() : ''
  };

  const photos = await uploadPhotos();
  payload.photos = photos;

  try {
    await apiFetch('/listings', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    const all = getLocalListings().length ? getLocalListings() : getSeedListings();
    all.unshift({
      id: `local-${Date.now()}`,
      sellerId: user.id,
      sellerName: user.name,
      ...payload,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    persistListingsLocal(all);
  }

  closeModal('list-modal');
  document.getElementById('list-form').reset();
  photoFiles = [];
  initPhotoUpload();
  await refreshBrowse();
}

/**
 * Wires all marketplace page event listeners on load.
 */
function bindEvents() {
  document.getElementById('open-list-btn').addEventListener('click', () => {
    initPhotoUpload();
    openModal('list-modal');
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
  });

  document.getElementById('list-meetup').addEventListener('change', (e) => {
    document.getElementById('meetup-other-group').hidden = e.target.value !== 'Other';
  });

  document.getElementById('list-form').addEventListener('submit', submitListing);

  const refresh = () => refreshBrowse();
  document.getElementById('search-input').addEventListener('input', debounce(refresh, 300));
  ['filter-category', 'filter-min-price', 'filter-max-price', 'filter-condition', 'filter-meetup'].forEach((id) => {
    document.getElementById(id).addEventListener('change', refresh);
  });

  document.getElementById('campus-pickup-chip').addEventListener('click', function () {
    this.classList.toggle('filter-chip--active');
    this.setAttribute('aria-pressed', this.classList.contains('filter-chip--active'));
    refresh();
  });

  document.getElementById('toggle-filters-btn').addEventListener('click', () => {
    const panel = document.getElementById('filters-panel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });

  document.getElementById('dm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('dm-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await sendDmMessage(text);
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

/**
 * Debounces a function call by wait milliseconds.
 */
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Applies cross-feature defaults from Course Compass and onboarding profile at load.
 */
function applyCrossFeatureDefaults() {
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  if (!profile.has_car || profile.has_car === false || profile.has_car === 'no' || profile.hasCar === false || profile.hasCar === 'No') {
    const chip = document.getElementById('campus-pickup-chip');
    chip.classList.add('filter-chip--active');
    chip.setAttribute('aria-pressed', 'true');
  }
  renderCourseSuggestions();
}

/**
 * Initializes the marketplace page on DOM ready.
 */
// Redirects to onboarding if the user has not completed their profile
function checkOnboardingComplete() {
  var profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  var token = localStorage.getItem('unite_token');
  if (token && (!profile.program || !profile.year)) {
    window.location.href = '/features/onboarding.html';
    return false;
  }
  return true;
}

async function init() {
  if (!checkOnboardingComplete()) return;
  if (!getLocalListings().length) {
    persistListingsLocal(getSeedListings());
  }
  applyCrossFeatureDefaults();
  bindEvents();
  initPhotoUpload();
  await refreshBrowse();
}

document.addEventListener('DOMContentLoaded', init);
