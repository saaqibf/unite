// Course Compass — main JS controller
// Drives the 4 tabs: Roadmap, Prereq Tree, GPA Simulator, AI Advisor
// All program data loaded from /data/ucalgary_programs.json — never hardcoded here

import { getToken, getUser, requireAuth, authHeader } from './auth.js';

// ─── Constants ──────────────────────────────────────────────────────

const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

const QUICK_QUESTIONS = [
  'What should I take next semester?',
  'How do I get into CPSC 331?',
  'What is a good GPA for grad school?',
  'Can I take CPSC 355 and CPSC 351 at the same time?',
  'What are the hardest CS courses at UCalgary?',
  'How many credits do I need to graduate?'
];

// ─── State ──────────────────────────────────────────────────────────

let programsData = null;
let currentProgram = null;
let completedCourses = [];
let gpaRows = [];
let currentTab = 'roadmap';

// ─── Boot ────────────────────────────────────────────────────────────

// Entry point — loads profile, fetches program data, wires all UI
async function init() {
  requireAuth();

  const profile = loadProfile();
  renderProfileSidebar(profile);

  programsData = await fetchProgramsData();

  if (profile?.program) {
    completedCourses = loadCompletedCourses();
    currentProgram = profile.program;
    hideBanner();
    renderRoadmap(profile.program, profile.year, completedCourses);
    renderPrereqTree(profile.program, completedCourses);
    renderGPAScale();
    seedGPARows(profile.program);
  } else {
    showBanner();
  }

  wireTabNav();
  wireSetupForm();
  wireGPASimulator();
  wireAdvisorChat(profile);
  wireNavToggle();
}

// ─── Profile ─────────────────────────────────────────────────────────

// Reads the student's profile from localStorage — set by onboarding.js
function loadProfile() {
  try {
    const raw = localStorage.getItem('unite_profile');
    return raw ? JSON.parse(raw) : getUser();
  } catch {
    return getUser();
  }
}

// Reads completed course codes saved after transcript parsing
function loadCompletedCourses() {
  try {
    const raw = localStorage.getItem('unite_completed_courses');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Fills the sidebar with the student's name, program badge, year, and GPA
function renderProfileSidebar(profile) {
  const name = profile?.name || 'Student';
  const program = profile?.program || '—';
  const year = profile?.year || '—';

  const avatarEl = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const programTag = document.getElementById('profile-program-tag');
  const yearTag = document.getElementById('profile-year-tag');

  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = name;
  if (programTag) programTag.textContent = program;
  if (yearTag) yearTag.textContent = year;
}

// ─── Program Data ─────────────────────────────────────────────────────

// Loads program requirements from the JSON file — used by all tabs
async function fetchProgramsData() {
  try {
    const res = await fetch('/data/ucalgary_programs.json');
    return await res.json();
  } catch {
    console.error('Could not load program data');
    return null;
  }
}

// Returns the program object matching the given key (e.g. 'cs', 'seng')
function getProgramByKey(key) {
  if (!programsData) return null;
  return programsData.programs.find(p => p.key === key) || null;
}

// ─── Tab Navigation ───────────────────────────────────────────────────

// Wires the 4 sidebar tab buttons to show/hide the correct panels
function wireTabNav() {
  const tabs = document.querySelectorAll('.cc-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });
}

// Shows the selected panel and hides all others, updates active tab style
function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.cc-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('cc-tab--active'));

  const panel = document.getElementById(`panel-${tabName}`);
  const tab = document.querySelector(`[data-tab="${tabName}"]`);

  if (panel) panel.style.display = 'flex';
  if (tab) tab.classList.add('cc-tab--active');
}

// ─── Setup Banner ─────────────────────────────────────────────────────

// Shows the "set up your degree" form when no program is set in profile
function showBanner() {
  const banner = document.getElementById('setup-banner');
  const panels = document.querySelectorAll('.cc-panel');
  if (banner) banner.style.display = 'block';
  panels.forEach(p => p.style.display = 'none');
}

// Hides the setup banner and shows the roadmap panel
function hideBanner() {
  const banner = document.getElementById('setup-banner');
  if (banner) banner.style.display = 'none';
  switchTab('roadmap');
}

// Wires the setup form submit button — saves program/year and generates roadmap
function wireSetupForm() {
  const btn = document.getElementById('generate-roadmap-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const programKey = document.getElementById('program-select')?.value;
    const year = document.getElementById('year-select')?.value || 'Year 1';
    const transcriptText = document.getElementById('transcript-input')?.value || '';

    if (!programKey) {
      alert('Please select your program first.');
      return;
    }

    const parsed = parseTranscriptText(transcriptText);
    completedCourses = parsed;
    currentProgram = programKey;

    localStorage.setItem('unite_completed_courses', JSON.stringify(parsed));

    const profile = loadProfile() || {};
    profile.program = programKey;
    profile.year = year;
    localStorage.setItem('unite_profile', JSON.stringify(profile));

    renderProfileSidebar({ ...profile, program: programKey, year });

    hideBanner();
    renderRoadmap(programKey, year, parsed);
    renderPrereqTree(programKey, parsed);
    renderGPAScale();
    seedGPARows(programKey);
    updateGPA();
  });

  // Regenerate button inside the roadmap panel
  const regenBtn = document.getElementById('regenerate-btn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      if (currentProgram) {
        renderRoadmap(currentProgram, loadProfile()?.year || 'Year 1', completedCourses);
      }
    });
  }
}

// ─── Transcript Parser ───────────────────────────────────────────────

// Extracts UCalgary course codes from pasted or uploaded transcript text
function parseTranscriptText(text) {
  const matches = text.toUpperCase().match(/[A-Z]{2,4}\s?\d{3}(\.\d{2})?/g) || [];
  return [...new Set(matches.map(c => c.replace(/\s/g, '')))];
}

// Normalises a course code to match the JSON format (e.g. 'CPSC331' → 'CPSC331')
function normaliseCode(code) {
  return code.replace(/\s/g, '').toUpperCase();
}

// Returns true if the student has completed the given course code
function isCompleted(code) {
  return completedCourses.includes(normaliseCode(code));
}

// ─── Roadmap Tab ──────────────────────────────────────────────────────

// Renders the semester-by-semester roadmap for the student's program
function renderRoadmap(programKey, year, completed) {
  const container = document.getElementById('roadmap-content');
  const loading = document.getElementById('roadmap-loading');
  if (!container) return;

  const program = getProgramByKey(programKey);
  if (!program) {
    container.innerHTML = '<p class="text-muted">Program data not found.</p>';
    return;
  }

  container.innerHTML = '';

  // Build a flat ordered list of all courses from year_breakdown
  const yearOrder = ['year_1', 'year_2', 'year_3', 'year_4'];
  const semesterLabels = {
    year_1: ['Fall — Year 1', 'Winter — Year 1'],
    year_2: ['Fall — Year 2', 'Winter — Year 2'],
    year_3: ['Fall — Year 3', 'Winter — Year 3'],
    year_4: ['Fall — Year 4', 'Winter — Year 4']
  };

  let upcomingCourses = [];
  let firstIncomplete = true;

  yearOrder.forEach(yearKey => {
    const courses = program.year_breakdown[yearKey];
    if (!courses || courses.length === 0) return;

    // Split the year's courses into 2 semesters
    const half = Math.ceil(courses.length / 2);
    const semesters = [courses.slice(0, half), courses.slice(half)];
    const labels = semesterLabels[yearKey] || [`${yearKey} — Semester 1`, `${yearKey} — Semester 2`];

    semesters.forEach((semCourses, idx) => {
      if (semCourses.length === 0) return;

      const semEl = document.createElement('div');
      semEl.className = 'cc-semester';

      const allCompleted = semCourses.every(c => isCompleted(c));
      const totalUnits = semCourses.length * 3;

      semEl.innerHTML = `
        <div class="cc-semester__header">
          <span class="cc-semester__label">${labels[idx]}${allCompleted ? ' ✓' : ''}</span>
          <span class="cc-semester__credits">${totalUnits} units</span>
        </div>
        <div class="cc-semester__courses" id="sem-${yearKey}-${idx}"></div>
      `;

      const coursesContainer = semEl.querySelector(`#sem-${yearKey}-${idx}`);

      semCourses.forEach(code => {
        const done = isCompleted(code);
        const isNext = !done && firstIncomplete;
        if (isNext) {
          firstIncomplete = false;
          upcomingCourses = semCourses.filter(c => !isCompleted(c));
        }

        const row = document.createElement('div');
        row.className = `cc-course-row${done ? ' cc-course-row--completed' : ''}`;
        row.innerHTML = `
          <span class="cc-course-code">${formatCode(code)}</span>
          <span class="cc-course-name">${getCourseTitle(code)}</span>
          <span class="cc-course-units">3 units</span>
          ${isNext ? '<span class="badge badge--red" style="flex-shrink:0;">Next</span>' : ''}
          ${done ? '<span class="badge badge--success" style="flex-shrink:0;">Done</span>' : ''}
        `;
        coursesContainer.appendChild(row);
      });

      container.appendChild(semEl);
    });
  });

  // Save the upcoming courses to localStorage so Marketplace can read them
  if (upcomingCourses.length > 0) {
    localStorage.setItem('unite_upcoming_courses', JSON.stringify(upcomingCourses));
    renderNextCoursesCard(upcomingCourses);
  }

  // Update sidebar credits
  const creditsEl = document.getElementById('credits-done');
  const creditsBar = document.getElementById('credits-bar');
  const done = completedCourses.length;
  const pct = Math.min(100, Math.round((done * 3) / 120 * 100));
  if (creditsEl) creditsEl.textContent = done * 3;
  if (creditsBar) creditsBar.style.width = `${pct}%`;
}

// Shows the "courses you need next" section and saves them for Marketplace
function renderNextCoursesCard(courses) {
  const card = document.getElementById('next-courses-card');
  const chips = document.getElementById('next-courses-chips');
  if (!card || !chips) return;

  card.style.display = 'block';
  chips.innerHTML = '';
  courses.forEach(code => {
    const chip = document.createElement('span');
    chip.className = 'cc-course-chip';
    chip.textContent = formatCode(code);
    chips.appendChild(chip);
  });
}

// Formats a raw course code string to UCalgary display format (e.g. 'CPSC331' → 'CPSC 331')
function formatCode(code) {
  return code.replace(/([A-Z]+)(\d)/, '$1 $2');
}

// Returns a human-readable course title — falls back to the code if not found
function getCourseTitle(code) {
  const titles = {
    'CPSC217': 'Intro to CS for Multidisciplinary Studies',
    'CPSC231': 'Introduction to Computer Science for CS',
    'CPSC233': 'Object-Oriented Programming for CS',
    'CPSC251': 'Introductory Logic for CS',
    'CPSC331': 'Data Structures, Algorithms and Their Analysis',
    'CPSC335': 'Algorithm Design and Analysis',
    'CPSC351': 'Computability and Complexity',
    'CPSC355': 'Computing Machinery I',
    'CPSC359': 'Computing Machinery II',
    'CPSC383': 'Introduction to Machine Intelligence',
    'CPSC457': 'Principles of Operating Systems',
    'CPSC471': 'Data Base Management Systems',
    'CPSC481': 'Human-Computer Interaction I',
    'CPSC491': 'Capstone Topic I',
    'CPSC499': 'Capstone Topic II',
    'MATH211': 'Linear Methods I',
    'MATH249': 'Introductory Calculus',
    'MATH271': 'Discrete Mathematics',
    'STAT213': 'Introduction to Statistics I',
    'SENG300': 'Introduction to Software Engineering',
    'SENG401': 'Software Architecture',
    'SENG437': 'Software Reliability and Testing',
    'SENG438': 'Software Testing, Reliability and Quality Assurance',
    'SENG471': 'Software Requirements Engineering',
    'SENG499': 'Design Project',
    'ENGG200': 'Engineering Design and Communication I',
    'ENGG202': 'Engineering Statics',
    'ACCT217': 'Introductory Financial Accounting',
    'ACCT323': 'Introductory Managerial Accounting',
    'FNCE317': 'Introduction to Finance',
    'FNCE341': 'Financial Management',
    'MGST217': 'Introduction to Organizational Behaviour',
    'MGST301': 'Managing People',
    'KNES201': 'Introduction to Kinesiology',
    'KNES203': 'Foundations of Human Movement',
    'KNES251': 'Exercise Physiology I',
    'KNES303': 'Biomechanics',
    'PSYC200': 'Introduction to Psychology I',
    'PSYC201': 'Introduction to Psychology II',
    'PSYC300': 'Research Methods in Psychology',
    'PSYC301': 'Statistics for Psychology'
  };
  return titles[normaliseCode(code)] || formatCode(code) + ' — UCalgary Course';
}

// ─── Prereq Tree Tab ──────────────────────────────────────────────────

// Renders the prerequisite chain visualizer for the student's program
function renderPrereqTree(programKey, completed) {
  const container = document.getElementById('prereq-tree-container');
  if (!container) return;

  const program = getProgramByKey(programKey);
  if (!program || !program.typical_prereq_chains) {
    container.innerHTML = '<p class="text-muted">No prerequisite data available for this program.</p>';
    return;
  }

  container.innerHTML = '';
  program.typical_prereq_chains.forEach(chain => {
    const chainEl = document.createElement('div');
    chainEl.className = 'cc-prereq-chain';

    const flow = chain.courses.map((code, i) => {
      const done = isCompleted(code);
      const prevDone = i === 0 || isCompleted(chain.courses[i - 1]);
      const isNext = !done && prevDone;
      const locked = !done && !prevDone;

      const nodeClass = done ? 'cc-prereq-node--completed'
        : isNext ? 'cc-prereq-node--next'
          : 'cc-prereq-node--locked';

      const arrow = i < chain.courses.length - 1 ? '<span class="cc-prereq-arrow">→</span>' : '';
      return `<span class="cc-prereq-node ${nodeClass}">${formatCode(code)}</span>${arrow}`;
    }).join('');

    chainEl.innerHTML = `
      <p class="cc-prereq-chain__title">${chain.chain_name}</p>
      <div class="cc-prereq-chain__flow">${flow}</div>
    `;
    container.appendChild(chainEl);
  });

  // Wire the search input to filter chains by course code
  const searchInput = document.getElementById('prereq-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toUpperCase().replace(/\s/g, '');
      document.querySelectorAll('.cc-prereq-chain').forEach(el => {
        el.style.display = el.textContent.toUpperCase().replace(/\s/g, '').includes(q) ? '' : 'none';
      });
    });
  }
}

// ─── GPA Simulator Tab ────────────────────────────────────────────────

// Renders the UCalgary grading scale reference tiles
function renderGPAScale() {
  const grid = document.getElementById('gpa-scale-grid');
  if (!grid || !programsData) return;

  grid.innerHTML = '';
  programsData.grading_scale_display.forEach(entry => {
    const tile = document.createElement('div');
    tile.className = 'cc-grade-tile';
    tile.innerHTML = `
      <span class="cc-grade-tile__letter">${entry.letter}</span>
      <span class="cc-grade-tile__points">${entry.points.toFixed(1)}</span>
      <span class="cc-grade-tile__pct">${entry.percentage}%</span>
    `;
    grid.appendChild(tile);
  });
}

// Seeds the GPA simulator with the student's current semester courses
function seedGPARows(programKey) {
  const program = getProgramByKey(programKey);
  if (!program) return;

  const profileYear = loadProfile()?.year || 'Year 1';
  const yearKey = profileYear.toLowerCase().replace(' ', '_').replace('+', '');
  const yearCourses = program.year_breakdown[yearKey] || program.year_breakdown['year_1'] || [];

  gpaRows = [];
  yearCourses.slice(0, 5).forEach(code => {
    gpaRows.push({ code, grade: 'B+', units: 3 });
  });

  if (gpaRows.length === 0) {
    gpaRows = [
      { code: 'COURSE 1', grade: 'B+', units: 3 },
      { code: 'COURSE 2', grade: 'B+', units: 3 },
      { code: 'COURSE 3', grade: 'A-', units: 3 }
    ];
  }

  renderGPARows();
  updateGPA();
}

// Renders each course row in the GPA simulator with a grade dropdown
function renderGPARows() {
  const list = document.getElementById('gpa-courses-list');
  if (!list) return;

  list.innerHTML = '';
  gpaRows.forEach((row, idx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'cc-gpa-course-row';

    const gradeOptions = Object.keys(GRADE_POINTS).map(g =>
      `<option value="${g}" ${g === row.grade ? 'selected' : ''}>${g} (${GRADE_POINTS[g].toFixed(1)})</option>`
    ).join('');

    rowEl.innerHTML = `
      <input class="input-field" value="${formatCode(row.code)}" placeholder="Course" data-idx="${idx}" data-field="code" />
      <select class="input-field" data-idx="${idx}" data-field="grade">${gradeOptions}</select>
      <button class="cc-gpa-course-row__remove" data-idx="${idx}" aria-label="Remove">✕</button>
    `;
    list.appendChild(rowEl);
  });

  // Update state when user changes a course name or grade
  list.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => {
      const idx = parseInt(el.dataset.idx);
      const field = el.dataset.field;
      gpaRows[idx][field] = el.value;
      updateGPA();
    });
  });

  // Remove a course row when the × button is clicked
  list.querySelectorAll('.cc-gpa-course-row__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      gpaRows.splice(parseInt(btn.dataset.idx), 1);
      renderGPARows();
      updateGPA();
    });
  });
}

// Wires the "Add Course" button and the "What If" calculator
function wireGPASimulator() {
  const addBtn = document.getElementById('add-gpa-course-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      gpaRows.push({ code: 'NEW COURSE', grade: 'B+', units: 3 });
      renderGPARows();
      updateGPA();
    });
  }

  const whatifBtn = document.getElementById('whatif-btn');
  if (whatifBtn) {
    whatifBtn.addEventListener('click', () => {
      const grade = parseFloat(document.getElementById('whatif-grade')?.value || 0);
      const current = calculateGPA();
      const totalUnits = gpaRows.reduce((s, r) => s + r.units, 0);
      const newGPA = ((current * totalUnits) + (grade * 3)) / (totalUnits + 3);
      const diff = newGPA - current;
      const sign = diff >= 0 ? '+' : '';
      const resultEl = document.getElementById('whatif-result');
      if (resultEl) {
        resultEl.textContent = `Your GPA would be ${newGPA.toFixed(2)} (${sign}${diff.toFixed(2)} from current ${current.toFixed(2)})`;
      }
    });
  }
}

// Calculates the weighted GPA from all rows and returns the numeric value
function calculateGPA() {
  if (gpaRows.length === 0) return 0;
  let totalPoints = 0;
  let totalUnits = 0;
  gpaRows.forEach(row => {
    const pts = GRADE_POINTS[row.grade] ?? 0;
    totalPoints += pts * row.units;
    totalUnits += row.units;
  });
  return totalUnits === 0 ? 0 : totalPoints / totalUnits;
}

// Recalculates GPA and updates the display value and colour
function updateGPA() {
  const gpa = calculateGPA();
  const resultEl = document.getElementById('gpa-result-value');
  const subEl = document.getElementById('gpa-result-sub');
  const sidebarEl = document.getElementById('sidebar-gpa');

  const display = gpa.toFixed(2);
  if (resultEl) {
    resultEl.textContent = display;
    resultEl.style.color = gpa >= 3.5 ? 'var(--color-success)'
      : gpa >= 2.7 ? 'var(--color-primary)'
        : gpa >= 2.0 ? 'var(--color-gold)'
          : 'var(--color-danger)';
  }
  if (subEl) {
    subEl.textContent = gpa >= 3.7 ? 'Dean\'s List territory'
      : gpa >= 3.0 ? 'Good standing'
        : gpa >= 2.0 ? 'Minimum required is 2.0'
          : 'Below minimum GPA — seek academic advising';
  }
  if (sidebarEl) sidebarEl.textContent = display;
}

// ─── AI Advisor Chat Tab ──────────────────────────────────────────────

// Wires the AI advisor chat panel — seeds quick questions and send button
function wireAdvisorChat(profile) {
  renderQuickQuestions();
  initAdvisorUI(profile);
}

// Renders the quick-question chips below the chat box
function renderQuickQuestions() {
  const container = document.getElementById('quick-questions');
  if (!container) return;

  QUICK_QUESTIONS.forEach(q => {
    const chip = document.createElement('button');
    chip.className = 'badge badge--muted';
    chip.style.cursor = 'pointer';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      const input = document.getElementById('advisor-input');
      if (input) {
        input.value = q;
        input.focus();
      }
    });
    container.appendChild(chip);
  });
}

// Sets up the advisor chat — shows greeting, wires send button and Enter key
function initAdvisorUI(profile) {
  const messagesEl = document.getElementById('advisor-messages');
  const inputEl = document.getElementById('advisor-input');
  const sendBtn = document.getElementById('advisor-send-btn');

  if (!messagesEl || !inputEl || !sendBtn) return;

  const name = profile?.name || 'there';
  const program = profile?.program || 'your program';
  appendMessage(messagesEl, 'assistant',
    `Hi ${name}! I'm your UCalgary academic advisor. I know your ${program} program requirements, prerequisites, and course catalog. Ask me anything — what to take next, how to boost your GPA, or what you need to graduate.`
  );

  const handleSend = async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;

    appendMessage(messagesEl, 'user', text);
    const thinkingId = appendThinking(messagesEl);

    const reply = await callAdvisorAPI(text, profile);

    removeThinking(thinkingId);
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
    appendMessage(messagesEl, 'assistant', reply);
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
}

// Calls the backend AI route and returns the advisor's reply text
async function callAdvisorAPI(message, profile) {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        message,
        program: profile?.program,
        year: profile?.year,
        transcript: loadCompletedCourses()
      })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.reply;
  } catch {
    return 'The AI advisor is temporarily unavailable. Please try again in a moment.';
  }
}

// Adds a chat bubble to the messages container (role: 'user' or 'assistant')
function appendMessage(container, role, text) {
  const el = document.createElement('div');
  el.className = `chat-message chat-message--${role === 'user' ? 'mine' : 'theirs'}`;

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.style.background = role === 'user' ? 'var(--color-primary)' : 'var(--color-black)';
  avatar.textContent = role === 'user' ? (getUser()?.name?.charAt(0) || 'U') : 'AI';

  const body = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'chat-meta';
  meta.innerHTML = `<span class="chat-name">${role === 'user' ? 'You' : 'Course Compass AI'}</span><span class="chat-timestamp">${formatTime(new Date())}</span>`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;

  body.appendChild(meta);
  body.appendChild(bubble);
  el.appendChild(avatar);
  el.appendChild(body);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

// Shows the animated thinking dots while waiting for the AI to respond
function appendThinking(container) {
  const id = 'thinking-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'chat-message chat-message--theirs';
  el.innerHTML = `
    <div class="chat-avatar" style="background:var(--color-black)">AI</div>
    <div><div class="thinking-dots"><span>.</span><span>.</span><span>.</span></div></div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

// Removes the thinking bubble once the AI reply arrives
function removeThinking(id) {
  document.getElementById(id)?.remove();
}

// Formats a Date object into a short time string like "11:32 PM"
function formatTime(date) {
  return date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}

// ─── Nav toggle (mobile) ──────────────────────────────────────────────

// Wires the hamburger menu toggle for mobile nav
function wireNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('nav--open'));
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
