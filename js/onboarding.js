// Onboarding flow — 5 screens: sign up, email verify, 8 questions, welcome dashboard
// Writes unite_profile and unite_token to localStorage for all other features to read

const API = '/api/auth';

// ─── State ───────────────────────────────────────────────────────────

let currentQuestion = 0;
let answers = {};
let registeredEmail = '';
let registeredName = '';

// The 8 onboarding questions — each has a key, question text, choices, and optional multi-select
const QUESTIONS = [
  {
    key: 'program',
    text: 'What program are you in?',
    type: 'single',
    choices: [
      { label: '💻 Computer Science', value: 'cs' },
      { label: '⚙️ Software Engineering', value: 'seng' },
      { label: '📊 Business (Haskayne)', value: 'business' },
      { label: '🏃 Kinesiology', value: 'kinesiology' },
      { label: '🧠 Psychology', value: 'psychology' },
      { label: '🔬 Other Science / Arts', value: 'other' }
    ]
  },
  {
    key: 'year',
    text: 'What year are you in?',
    type: 'single',
    choices: [
      { label: 'Year 1', value: 'Year 1' },
      { label: 'Year 2', value: 'Year 2' },
      { label: 'Year 3', value: 'Year 3' },
      { label: 'Year 4', value: 'Year 4' },
      { label: 'Year 5+', value: 'Year 5+' },
      { label: 'Graduate Student', value: 'Graduate' }
    ]
  },
  {
    key: 'has_car',
    text: 'Do you have a car?',
    type: 'single',
    choices: [
      { label: '🚗 Yes, I have a car', value: true },
      { label: '🚌 No car — I commute or walk', value: false }
    ]
  },
  {
    key: 'housing',
    text: 'Where do you live?',
    type: 'single',
    choices: [
      { label: '🏫 On campus (residence)', value: 'on_campus' },
      { label: '🏠 Off campus', value: 'off_campus' },
      { label: '🚇 Commuter (travel from home)', value: 'commuter' }
    ]
  },
  {
    key: 'challenge',
    text: "What's your biggest challenge right now?",
    type: 'single',
    choices: [
      { label: '👥 Making friends and finding community', value: 'making_friends' },
      { label: '🧭 Planning my degree and picking courses', value: 'planning_degree' },
      { label: '📦 Finding stuff I need (textbooks, furniture)', value: 'finding_stuff' },
      { label: '🎉 Finding things to do on campus', value: 'finding_events' }
    ]
  },
  {
    key: 'personality',
    text: 'Are you more of an introvert or extrovert?',
    type: 'single',
    choices: [
      { label: '🔋 Introvert — I recharge alone', value: 'introvert' },
      { label: '⚡ Extrovert — I love being around people', value: 'extrovert' },
      { label: '⚖️ Depends on the situation', value: 'ambivert' }
    ]
  },
  {
    key: 'interests',
    text: 'What are your interests? (pick all that apply)',
    type: 'multi',
    choices: [
      { label: '⚽ Sports', value: 'sports' },
      { label: '🎵 Music', value: 'music' },
      { label: '🎮 Gaming', value: 'gaming' },
      { label: '📚 Study Groups', value: 'study_groups' },
      { label: '🏔️ Outdoors', value: 'outdoors' },
      { label: '🎨 Arts', value: 'arts' },
      { label: '💻 Tech', value: 'tech' },
      { label: '🍕 Food', value: 'food' }
    ]
  }
];

// ─── Screen helpers ───────────────────────────────────────────────────

// Shows only the named screen and hides all others
function showScreen(id) {
  document.querySelectorAll('.ob-screen').forEach(s => s.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

// Updates the top progress bar based on which question we're on
function updateProgress(step, total) {
  const bar = document.getElementById('ob-progress-bar');
  const prog = document.getElementById('ob-progress');
  if (bar) bar.style.width = `${Math.round((step / total) * 100)}%`;
  if (prog) prog.style.display = 'block';
}

// ─── Sign Up ──────────────────────────────────────────────────────────

// Validates the email field live — shows green check for @ucalgary.ca
function wireEmailValidation() {
  const emailInput = document.getElementById('signup-email');
  const badge = document.getElementById('email-badge');
  const hint = document.getElementById('email-hint');

  if (!emailInput) return;

  emailInput.addEventListener('input', () => {
    const val = emailInput.value.toLowerCase();
    if (val.endsWith('@ucalgary.ca')) {
      badge.textContent = '✅';
      hint.textContent = 'UCalgary email verified';
      hint.className = 'ob-field-hint ob-field-hint--ok';
    } else if (val.includes('@') && val.length > 3) {
      badge.textContent = '❌';
      hint.textContent = 'UNite is for UCalgary students — use your @ucalgary.ca email';
      hint.className = 'ob-field-hint ob-field-hint--err';
    } else {
      badge.textContent = '';
      hint.textContent = '';
      hint.className = 'ob-field-hint';
    }
  });
}

// Handles the Sign Up button — calls /api/auth/register, then shows verify screen
async function handleSignup() {
  const email = document.getElementById('signup-email')?.value.trim();
  const name = document.getElementById('signup-name')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const errorEl = document.getElementById('signup-error');

  errorEl.textContent = '';

  if (!email || !name || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }
  if (!email.toLowerCase().endsWith('@ucalgary.ca')) {
    errorEl.textContent = 'UNite is for UCalgary students. Please use your @ucalgary.ca email.';
    return;
  }
  if (password.length < 8) {
    errorEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating account…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, primaryIntent: getIntent() })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Registration failed. Please try again.';
      btn.textContent = 'Join UNite →';
      btn.disabled = false;
      return;
    }

    registeredEmail = email;
    registeredName = name;
    document.getElementById('verify-email-display').textContent = email;
    showScreen('screen-verify');
  } catch {
    // Demo fallback — if server is unreachable, skip to questions
    registeredEmail = email;
    registeredName = name;
    proceedToQuestions();
  }

  btn.textContent = 'Join UNite →';
  btn.disabled = false;
}

// Handles login — calls /api/auth/login, saves token, skips to welcome
async function handleLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errorEl = document.getElementById('login-error');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.textContent = 'Logging in…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed. Please try again.';
      btn.textContent = 'Log In →';
      btn.disabled = false;
      return;
    }

    saveSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch {
    errorEl.textContent = 'Server unavailable. Try again shortly.';
  }

  btn.textContent = 'Log In →';
  btn.disabled = false;
}

// ─── Questions ────────────────────────────────────────────────────────

// Moves from verify/signup screen to the first onboarding question
function proceedToQuestions() {
  currentQuestion = 0;
  answers = { name: registeredName, email: registeredEmail };
  showScreen('screen-questions');
  renderQuestion(0);
  updateProgress(1, QUESTIONS.length + 1);
}

// Renders the question at the given index into the question screen
function renderQuestion(idx) {
  const q = QUESTIONS[idx];
  if (!q) {
    finishOnboarding();
    return;
  }

  document.getElementById('q-step-label').textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  document.getElementById('q-text').textContent = q.text;
  document.getElementById('q-error').textContent = '';

  const choicesEl = document.getElementById('q-choices');
  choicesEl.innerHTML = '';

  if (q.type === 'text') {
    const input = document.createElement('input');
    input.className = 'input-field ob-text-input';
    input.id = 'q-text-input';
    input.placeholder = q.placeholder || '';
    input.value = answers[q.key] || '';
    choicesEl.appendChild(input);
    return;
  }

  const currentVal = answers[q.key];
  const isMulti = q.type === 'multi';

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'ob-choice' + (isMulti ? ' ob-choice--multi' : '');
    btn.textContent = choice.label;
    btn.dataset.value = String(choice.value);

    const isSelected = isMulti
      ? Array.isArray(currentVal) && currentVal.includes(choice.value)
      : currentVal === choice.value;

    if (isSelected) btn.classList.add('ob-choice--selected');

    btn.addEventListener('click', () => {
      if (isMulti) {
        btn.classList.toggle('ob-choice--selected');
      } else {
        choicesEl.querySelectorAll('.ob-choice').forEach(b => b.classList.remove('ob-choice--selected'));
        btn.classList.add('ob-choice--selected');
      }
    });

    choicesEl.appendChild(btn);
  });

  const backBtn = document.getElementById('q-back-btn');
  if (backBtn) backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
}

// Reads the current question's selected answer and saves it to the answers object
function saveCurrentAnswer() {
  const q = QUESTIONS[currentQuestion];
  if (!q) return true;

  const choicesEl = document.getElementById('q-choices');
  const errorEl = document.getElementById('q-error');

  if (q.type === 'text') {
    const val = document.getElementById('q-text-input')?.value.trim();
    if (!val) { errorEl.textContent = 'Please enter an answer.'; return false; }
    answers[q.key] = val;
    return true;
  }

  if (q.type === 'multi') {
    const selected = [...choicesEl.querySelectorAll('.ob-choice--selected')]
      .map(b => {
        const raw = b.dataset.value;
        return raw === 'true' ? true : raw === 'false' ? false : raw;
      });
    if (selected.length === 0) { errorEl.textContent = 'Pick at least one.'; return false; }
    answers[q.key] = selected;
    return true;
  }

  const selected = choicesEl.querySelector('.ob-choice--selected');
  if (!selected) { errorEl.textContent = 'Please pick an option.'; return false; }
  const raw = selected.dataset.value;
  answers[q.key] = raw === 'true' ? true : raw === 'false' ? false : raw;
  return true;
}

// ─── Finish ───────────────────────────────────────────────────────────

// Saves the completed profile to localStorage and the server, then shows welcome screen
async function finishOnboarding() {
  const profile = {
    name: registeredName,
    email: registeredEmail,
    program: answers.program || 'cs',
    year: answers.year || 'Year 1',
    has_car: answers.has_car === true,
    housing: answers.housing || 'off_campus',
    challenge: answers.challenge || 'planning_degree',
    personality: answers.personality || 'ambivert',
    interests: answers.interests || [],
    primary_intent: getIntent(),
    needed_courses: []
  };

  localStorage.setItem('unite_profile', JSON.stringify(profile));

  // Try to save to server (non-blocking)
  const token = localStorage.getItem('unite_token');
  if (token) {
    fetch(`${API}/onboarding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(profile)
    }).catch(() => {});
  }

  renderWelcomeScreen(profile);
  showScreen('screen-welcome');
  document.getElementById('ob-progress').style.display = 'none';
}

// Renders the personalised welcome screen with 3 feature cards based on the student's answers
function renderWelcomeScreen(profile) {
  const nameEl = document.getElementById('welcome-name');
  const avatarEl = document.getElementById('welcome-avatar');
  const subEl = document.getElementById('welcome-sub');
  const cardsEl = document.getElementById('welcome-cards');

  if (nameEl) nameEl.textContent = profile.name || 'there';
  if (avatarEl) avatarEl.textContent = (profile.name || 'U').charAt(0).toUpperCase();

  // Personalise the subtitle based on challenge
  const subs = {
    planning_degree: 'Your Course Compass roadmap is ready.',
    finding_stuff: 'We found listings near your campus.',
    making_friends: 'Here\'s what\'s happening on campus.',
    finding_events: 'Events that match your interests are waiting.'
  };
  if (subEl) subEl.textContent = subs[profile.challenge] || 'Here\'s what we found for you.';

  // Always show 3 personalised feature cards
  const cards = buildWelcomeCards(profile);
  cardsEl.innerHTML = '';
  cards.forEach(card => {
    const a = document.createElement('a');
    a.href = card.href;
    a.className = 'ob-welcome-card';
    a.innerHTML = `
      <span class="ob-welcome-card__icon">${card.icon}</span>
      <div class="ob-welcome-card__text">
        <strong>${card.title}</strong>
        <span>${card.desc}</span>
      </div>
    `;
    cardsEl.appendChild(a);
  });
}

// Returns 3 personalised feature card configs based on the student's profile
function buildWelcomeCards(profile) {
  const challenge = profile.challenge;

  const allCards = {
    compass: {
      icon: '🧭',
      title: 'Your Degree Roadmap',
      desc: `${programLabel(profile.program)} · ${profile.year}`,
      href: '/features/course-compass.html'
    },
    marketplace: {
      icon: '🛒',
      title: 'Campus Marketplace',
      desc: profile.has_car ? 'Browse all listings' : 'Campus pickup listings near you',
      href: '/features/marketplace.html'
    },
    community: {
      icon: '🤝',
      title: 'Community Hub',
      desc: 'Events, clubs, and sports on campus',
      href: '/features/community.html'
    }
  };

  if (challenge === 'planning_degree') return [allCards.compass, allCards.marketplace, allCards.community];
  if (challenge === 'finding_stuff') return [allCards.marketplace, allCards.compass, allCards.community];
  return [allCards.community, allCards.compass, allCards.marketplace];
}

// Returns a human-readable program name from its key
function programLabel(key) {
  const labels = {
    cs: 'Computer Science',
    seng: 'Software Engineering',
    business: 'Business (Haskayne)',
    kinesiology: 'Kinesiology',
    psychology: 'Psychology',
    other: 'Your Program'
  };
  return labels[key] || 'Your Program';
}

// Reads the intent set by the landing page (Settle In / Find My Way / Meet People)
function getIntent() {
  return localStorage.getItem('unite_intent') || 'course_compass';
}

// Saves the JWT token and user object to localStorage after login
function saveSession(token, user) {
  localStorage.setItem('unite_token', token);
  localStorage.setItem('unite_user', JSON.stringify(user));
  const profile = { ...user, name: user.name || '' };
  localStorage.setItem('unite_profile', JSON.stringify(profile));
}

// Redirects an already-logged-in user to their most relevant feature
function redirectAfterLogin(user) {
  const intent = getIntent();
  const dest = {
    marketplace: '/features/marketplace.html',
    community: '/features/community.html',
    course_compass: '/features/course-compass.html'
  };
  window.location.href = dest[intent] || '/features/course-compass.html';
}

// ─── Wiring ───────────────────────────────────────────────────────────

// Entry point — wires all buttons and screen transitions
function init() {
  // If already logged in, skip straight to Course Compass
  const token = localStorage.getItem('unite_token');
  if (token) {
    window.location.href = '/features/course-compass.html';
    return;
  }

  wireEmailValidation();

  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
  document.getElementById('signup-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignup();
  });

  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('show-login-btn')?.addEventListener('click', e => {
    e.preventDefault();
    showScreen('screen-login');
  });

  document.getElementById('show-signup-btn')?.addEventListener('click', e => {
    e.preventDefault();
    showScreen('screen-signup');
  });

  // "Skip for demo" — bypass email verification
  document.getElementById('skip-verify-btn')?.addEventListener('click', proceedToQuestions);

  document.getElementById('resend-btn')?.addEventListener('click', e => {
    e.preventDefault();
    e.target.textContent = 'Sent!';
  });

  // Question navigation
  document.getElementById('q-next-btn')?.addEventListener('click', () => {
    if (!saveCurrentAnswer()) return;
    currentQuestion++;
    updateProgress(currentQuestion + 1, QUESTIONS.length + 1);
    renderQuestion(currentQuestion);
  });

  document.getElementById('q-back-btn')?.addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion--;
      updateProgress(currentQuestion + 1, QUESTIONS.length + 1);
      renderQuestion(currentQuestion);
    }
  });

  // Go to dashboard button
  document.getElementById('go-dashboard-btn')?.addEventListener('click', () => {
    const intent = getIntent();
    const dest = {
      marketplace: '/features/marketplace.html',
      community: '/features/community.html',
      course_compass: '/features/course-compass.html'
    };
    window.location.href = dest[intent] || '/features/course-compass.html';
  });
}

document.addEventListener('DOMContentLoaded', init);
