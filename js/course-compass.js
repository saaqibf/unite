/**
 * UNite Course Compass — Full Implementation
 * Transcript upload, semester roadmap, prereq tree, GPA simulator, AI advisor
 */

const UCALGARY_GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0,
  'IP': null, 'W': null, 'AU': null, 'CR': null
};

// Global state
let TRANSCRIPT_DATA = [];
let CURRENT_PROGRAM = 'computer_science';
let CURRENT_YEAR = 1;

// Demo transcript — real UCalgary course data for Year 3 CS student
const DEMO_TRANSCRIPT = [
  { code: 'CPSC217', title: 'Introduction to Computer Science for Multidisciplinary Studies II', grade: 'A', credits: 3, term: 'Fall 2024', status: 'passed' },
  { code: 'CPSC231', title: 'Introduction to Computer Science for CS Majors I', grade: 'A-', credits: 3, term: 'Fall 2024', status: 'passed' },
  { code: 'MATH211', title: 'Linear Methods I', grade: 'B+', credits: 3, term: 'Fall 2024', status: 'passed' },
  { code: 'MATH249', title: 'Introductory Calculus', grade: 'B', credits: 3, term: 'Fall 2024', status: 'passed' },
  { code: 'STAT205', title: 'Statistics for Scientists and Engineers', grade: 'A-', credits: 3, term: 'Fall 2024', status: 'passed' },
  { code: 'CPSC233', title: 'Introduction to Computer Science for CS Majors II', grade: 'A', credits: 3, term: 'Winter 2025', status: 'passed' },
  { code: 'CPSC251', title: 'Discrete Mathematics for Computer Science I', grade: 'B+', credits: 3, term: 'Winter 2025', status: 'passed' },
  { code: 'MATH271', title: 'Discrete Mathematics', grade: 'B+', credits: 3, term: 'Winter 2025', status: 'passed' },
  { code: 'STAT213', title: 'Introduction to Statistics I', grade: 'A-', credits: 3, term: 'Winter 2025', status: 'passed' },
  { code: 'CPSC329', title: 'Exploring Information Security and Privacy', grade: 'B+', credits: 3, term: 'Fall 2025', status: 'passed' },
  { code: 'CPSC355', title: 'Computing Machinery I', grade: 'B', credits: 3, term: 'Fall 2025', status: 'passed' },
  { code: 'CPSC331', title: 'Data Structures, Algorithms, and Their Analysis', grade: 'A-', credits: 3, term: 'Fall 2025', status: 'passed' },
  { code: 'CPSC351', title: 'Theoretical Foundations of Computer Science II', grade: 'IP', credits: 3, term: 'Winter 2026', status: 'in_progress' },
  { code: 'CPSC411', title: 'Compiler Construction', grade: 'IP', credits: 3, term: 'Winter 2026', status: 'in_progress' },
  { code: 'SENG300', title: 'Introduction to Software Engineering', grade: 'IP', credits: 3, term: 'Winter 2026', status: 'in_progress' },
];

// UCalgary CS program — 4 years, Fall + Winter, real course codes
const CS_PROGRAM = {
  name: 'Computer Science',
  total_credits: 120,
  years: {
    1: {
      fall: [
        { code: 'CPSC217', title: 'Intro to Computer Science (Multidisciplinary)', credits: 3, prereqs: [] },
        { code: 'CPSC231', title: 'Intro to CS for CS Majors I', credits: 3, prereqs: [] },
        { code: 'MATH211', title: 'Linear Methods I', credits: 3, prereqs: [] },
        { code: 'MATH249', title: 'Introductory Calculus', credits: 3, prereqs: [] },
        { code: 'STAT205', title: 'Statistics for Scientists and Engineers', credits: 3, prereqs: [] },
      ],
      winter: [
        { code: 'CPSC233', title: 'Intro to CS for CS Majors II', credits: 3, prereqs: ['CPSC231'] },
        { code: 'CPSC251', title: 'Discrete Mathematics for CS I', credits: 3, prereqs: [] },
        { code: 'MATH271', title: 'Discrete Mathematics', credits: 3, prereqs: ['CPSC251'] },
        { code: 'STAT213', title: 'Introduction to Statistics I', credits: 3, prereqs: [] },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
      ]
    },
    2: {
      fall: [
        { code: 'CPSC331', title: 'Data Structures, Algorithms, and Their Analysis', credits: 3, prereqs: ['CPSC233', 'CPSC251'] },
        { code: 'CPSC355', title: 'Computing Machinery I', credits: 3, prereqs: ['CPSC233'] },
        { code: 'CPSC313', title: 'Introduction to Computability', credits: 3, prereqs: ['CPSC251'] },
        { code: 'CPSC329', title: 'Exploring Information Security and Privacy', credits: 3, prereqs: [] },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
      ],
      winter: [
        { code: 'CPSC335', title: 'Algorithm Design and Analysis', credits: 3, prereqs: ['CPSC331', 'MATH271'] },
        { code: 'CPSC351', title: 'Theoretical Foundations of CS II', credits: 3, prereqs: ['CPSC313'] },
        { code: 'CPSC359', title: 'Computing Machinery II', credits: 3, prereqs: ['CPSC355'] },
        { code: 'SENG300', title: 'Introduction to Software Engineering', credits: 3, prereqs: ['CPSC331'] },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
      ]
    },
    3: {
      fall: [
        { code: 'CPSC411', title: 'Compiler Construction', credits: 3, prereqs: ['CPSC331', 'CPSC355'] },
        { code: 'CPSC413', title: 'Design and Analysis of Algorithms I', credits: 3, prereqs: ['CPSC331', 'CPSC351'] },
        { code: 'CPSC457', title: 'Principles of Operating Systems', credits: 3, prereqs: ['CPSC355', 'CPSC331'] },
        { code: 'CPSC383', title: 'Introduction to Artificial Intelligence', credits: 3, prereqs: ['CPSC331'] },
        { code: 'ELEC', title: 'CS Elective 300+', credits: 3, prereqs: [], isElective: true },
      ],
      winter: [
        { code: 'CPSC441', title: 'Computer Networks', credits: 3, prereqs: ['CPSC457'] },
        { code: 'CPSC453', title: 'Introduction to Computer Graphics', credits: 3, prereqs: ['MATH211', 'CPSC331'] },
        { code: 'CPSC471', title: 'Data Base Management Systems', credits: 3, prereqs: ['CPSC331'] },
        { code: 'SENG401', title: 'Software Architecture', credits: 3, prereqs: ['SENG300'] },
        { code: 'ELEC', title: 'CS Elective 400+', credits: 3, prereqs: [], isElective: true },
      ]
    },
    4: {
      fall: [
        { code: 'CPSC499', title: 'Computer Science Research Project', credits: 3, prereqs: ['CPSC413'] },
        { code: 'CPSC491', title: 'Techniques in Software Engineering', credits: 3, prereqs: ['SENG300'] },
        { code: 'ELEC', title: 'CS Elective 400+', credits: 3, prereqs: [], isElective: true },
        { code: 'ELEC', title: 'CS Elective 400+', credits: 3, prereqs: [], isElective: true },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
      ],
      winter: [
        { code: 'CPSC481', title: 'Human-Computer Interaction I', credits: 3, prereqs: ['CPSC331'] },
        { code: 'ELEC', title: 'CS Elective 400+', credits: 3, prereqs: [], isElective: true },
        { code: 'ELEC', title: 'CS Elective 400+', credits: 3, prereqs: [], isElective: true },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
        { code: 'ELEC', title: 'Open Elective', credits: 3, prereqs: [], isElective: true },
      ]
    }
  }
};

// Simplified roadmaps for other programs using ucalgary_programs.json data
const OTHER_PROGRAMS = {
  software_engineering: {
    name: 'Software Engineering',
    years: {
      1: { fall: ['ENGG233','CPSC233','MATH211','ENGG200','PHYS259'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['ENGG311','SENG265','MATH271','STAT321','ENGG300'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      2: { fall: ['SENG300','CPSC331','SENG301','ENGG407','CPSC355'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['SENG401','SENG403','CPSC441','SENG471','SENG491'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      3: { fall: ['SENG513','SENG533','SENG545','SENG550','CPSC471'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['SENG550','SENG553','SENG599','CPSC481','SENG601'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      4: { fall: ['SENG696A','SENG697A','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['SENG696B','SENG697B','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) }
    }
  },
  business: {
    name: 'Business (Haskayne)',
    years: {
      1: { fall: ['ACCT311','ECON201','ENGL201','MGST217','MATH205'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['ACCT211','ECON203','FNCE317','MGST361','STAT213'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      2: { fall: ['FNCE319','MGST391','MRKT317','OBHR317','SGMA217'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['FNCE323','MGST393','MRKT325','OBHR319','SGMA321'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      3: { fall: ['FNCE411','MGST491','SGMA423','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['MGST493','SGMA425','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      4: { fall: ['SGMA527','ELEC','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['SGMA529','ELEC','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) }
    }
  },
  kinesiology: {
    name: 'Kinesiology',
    years: {
      1: { fall: ['KNES201','KNES203','BIOL203','CHEM201','KNES100'].map(c=>({code:c,title:c,credits:3,prereqs:[]})), winter: ['KNES205','KNES207','BIOL205','PHYS221','STAT213'].map(c=>({code:c,title:c,credits:3,prereqs:[]})) },
      2: { fall: ['KNES301','KNES303','KNES305','PSYC200','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['KNES307','KNES309','KNES311','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      3: { fall: ['KNES401','KNES403','KNES405','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['KNES407','KNES409','KNES411','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      4: { fall: ['KNES501','KNES503','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['KNES505','KNES507','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) }
    }
  },
  psychology: {
    name: 'Psychology',
    years: {
      1: { fall: ['PSYC200','PSYC201','BIOL203','STAT213','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['PSYC203','PSYC205','BIOL205','STAT217','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      2: { fall: ['PSYC301','PSYC303','PSYC305','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['PSYC307','PSYC309','PSYC311','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      3: { fall: ['PSYC401','PSYC403','PSYC405','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['PSYC407','PSYC409','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) },
      4: { fall: ['PSYC501','PSYC503','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})), winter: ['PSYC505','ELEC','ELEC','ELEC','ELEC'].map(c=>({code:c,title:c,credits:3,prereqs:[],isElective:c==='ELEC'})) }
    }
  }
};

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadProfileFromStorage();
  setupTranscriptUpload();
  loadRoadmap();
});

// ─── Profile ─────────────────────────────────────────────────────────────────

function loadProfileFromStorage() {
  const profile = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  const programMap = {
    'Computer Science': 'computer_science',
    'Software Engineering': 'software_engineering',
    'Business': 'business', 'Business (Haskayne)': 'business',
    'Kinesiology': 'kinesiology',
    'Psychology': 'psychology',
  };
  if (profile.program && programMap[profile.program]) {
    CURRENT_PROGRAM = programMap[profile.program];
    const sel = document.getElementById('program-select');
    if (sel) sel.value = CURRENT_PROGRAM;
  }
  if (profile.year) {
    CURRENT_YEAR = Math.min(parseInt(profile.year) || 1, 4);
    const sel = document.getElementById('year-select');
    if (sel) sel.value = CURRENT_YEAR;
  }
  const saved = localStorage.getItem('unite_transcript');
  if (saved) {
    try {
      TRANSCRIPT_DATA = JSON.parse(saved);
      showTranscriptLoaded(TRANSCRIPT_DATA);
    } catch (e) { /* ignore */ }
  }
}

// ─── Transcript Upload ────────────────────────────────────────────────────────

function setupTranscriptUpload() {
  const fileInput = document.getElementById('transcript-file');
  const dropZone  = document.getElementById('upload-drop-zone');
  if (!fileInput || !dropZone) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processTranscriptFile(file);
  });
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processTranscriptFile(e.dataTransfer.files[0]);
  });
}

async function processTranscriptFile(file) {
  const card = document.getElementById('transcript-upload-card');
  card.classList.add('loading');
  try {
    const text = await file.text();
    const parsed = parseUCalgaryTranscript(text);
    TRANSCRIPT_DATA = parsed.courses;
    localStorage.setItem('unite_transcript', JSON.stringify(TRANSCRIPT_DATA));
    showTranscriptLoaded(TRANSCRIPT_DATA, parsed.studentName, parsed.gpa);
    loadRoadmap();
  } catch (err) {
    console.error('Transcript error:', err);
  } finally {
    card.classList.remove('loading');
  }
}

function parseUCalgaryTranscript(text) {
  const courses = [];
  let studentName = '';
  const lines = text.split(/[\n\r]+/);

  for (const line of lines) {
    const nm = line.match(/Name[:\s]+([A-Za-z ,'-]+)/i);
    if (nm && !studentName) { studentName = nm[1].trim(); }

    // Pattern: DEPT 123 ... grade
    const m = line.match(/\b([A-Z]{2,6})\s*(\d{3}[A-Z]?)\b.*?\b([A-F][+-]?|IP|W|AU|CR)\b/);
    if (m) {
      const grade = m[3];
      const status = grade === 'IP' ? 'in_progress' :
                     grade === 'W'  ? 'withdrawn' :
                     (UCALGARY_GRADE_POINTS[grade] ?? 0) >= 1.0 ? 'passed' : 'failed';
      courses.push({ code: m[1] + m[2], title: m[1] + ' ' + m[2], credits: 3, grade, status, term: '' });
    }
  }

  const graded = courses.filter(c => c.status === 'passed' && UCALGARY_GRADE_POINTS[c.grade] !== null);
  let pts = 0, creds = 0;
  graded.forEach(c => { pts += UCALGARY_GRADE_POINTS[c.grade] * c.credits; creds += c.credits; });
  const gpa = creds > 0 ? (pts / creds).toFixed(2) : null;

  return { courses, studentName, gpa };
}

function showTranscriptLoaded(courses, name, gpa) {
  const dropZone  = document.getElementById('upload-drop-zone');
  const loaded    = document.getElementById('transcript-loaded');
  const nameEl    = document.getElementById('transcript-student-name');
  const summaryEl = document.getElementById('transcript-summary');
  if (!loaded) return;

  if (dropZone) dropZone.style.display = 'none';
  loaded.style.display = 'flex';

  const passed     = courses.filter(c => c.status === 'passed').length;
  const inProgress = courses.filter(c => c.status === 'in_progress').length;
  const totalCreds = courses.filter(c => c.status === 'passed').reduce((s, c) => s + (c.credits || 3), 0);

  if (nameEl) nameEl.textContent = name || 'Transcript Loaded';
  if (summaryEl) summaryEl.textContent =
    `${passed} courses completed · ${inProgress} in progress · ${totalCreds} credits earned${gpa ? ` · GPA: ${gpa}` : ''}`;
}

function loadDemoTranscript() {
  TRANSCRIPT_DATA = DEMO_TRANSCRIPT;
  localStorage.setItem('unite_transcript', JSON.stringify(TRANSCRIPT_DATA));
  showTranscriptLoaded(TRANSCRIPT_DATA, 'Sarah Chen', '3.52');
  CURRENT_PROGRAM = 'computer_science';
  CURRENT_YEAR = 3;
  const pSel = document.getElementById('program-select');
  const ySel = document.getElementById('year-select');
  if (pSel) pSel.value = 'computer_science';
  if (ySel) ySel.value = 3;
  loadRoadmap();
  if (document.getElementById('tab-gpa').style.display !== 'none') updateGPASimulator();
}

function clearTranscript() {
  TRANSCRIPT_DATA = [];
  localStorage.removeItem('unite_transcript');
  const dz = document.getElementById('upload-drop-zone');
  const ld = document.getElementById('transcript-loaded');
  if (dz) dz.style.display = 'flex';
  if (ld) ld.style.display = 'none';
  loadRoadmap();
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const isActive = panel.id === `tab-${tabName}`;
    panel.style.display = isActive ? 'block' : 'none';
    panel.classList.toggle('active', isActive);
  });
  if (tabName === 'gpa') updateGPASimulator();
  if (tabName === 'prereqs') initPrereqSearch();
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────

function loadRoadmap() {
  const pSel = document.getElementById('program-select');
  const ySel = document.getElementById('year-select');
  CURRENT_PROGRAM = (pSel && pSel.value) || CURRENT_PROGRAM;
  CURRENT_YEAR    = parseInt((ySel && ySel.value) || CURRENT_YEAR) || 1;

  const program = CURRENT_PROGRAM === 'computer_science' ? CS_PROGRAM
                : OTHER_PROGRAMS[CURRENT_PROGRAM] || CS_PROGRAM;

  const completedCodes   = new Set(TRANSCRIPT_DATA.filter(c => c.status === 'passed').map(c => c.code.replace(/\s+/g, '')));
  const inProgressCodes  = new Set(TRANSCRIPT_DATA.filter(c => c.status === 'in_progress').map(c => c.code.replace(/\s+/g, '')));

  let html = '';
  let nextSemesterCourses = [];

  for (let yr = 1; yr <= 4; yr++) {
    const yearData = program.years[yr];
    if (!yearData) continue;

    const yearClass = yr < CURRENT_YEAR ? 'past-year' : yr === CURRENT_YEAR ? 'current-year' : 'future-year';
    html += `<div class="roadmap-year ${yearClass}">`;
    html += `<div class="year-label">Year ${yr}</div>`;

    for (const [semKey, semLabel, courses] of [['fall', '🍂 Fall', yearData.fall], ['winter', '❄️ Winter', yearData.winter]]) {
      html += `<div class="semester-block"><div class="semester-label">${semLabel}</div><div class="semester-courses">`;

      for (const course of courses) {
        const code = course.code.replace(/\s+/g, '');
        const isCompleted  = completedCodes.has(code);
        const isInProgress = inProgressCodes.has(code);
        const prereqsMet   = course.prereqs.every(p => completedCodes.has(p.replace(/\s+/g, '')));
        const isLocked     = !course.isElective && course.prereqs.length > 0 && !prereqsMet && !isCompleted;

        let status = 'upcoming';
        if (isCompleted)  status = 'completed';
        else if (isInProgress) status = 'current';
        else if (isLocked)    status = 'locked';

        if (status === 'upcoming' && yr === CURRENT_YEAR) {
          if (!nextSemesterCourses.includes(code)) nextSemesterCourses.push(code);
        }

        const gradeObj = TRANSCRIPT_DATA.find(t => t.code.replace(/\s+/g, '') === code);
        const grade    = gradeObj ? gradeObj.grade : '';

        html += `<div class="course-card ${status}" onclick="showCoursePrereqs('${code}')">
          <div class="course-code">${course.code}</div>
          <div class="course-title">${course.title}</div>
          <div class="course-meta">
            <span>${course.credits} units</span>
            ${grade ? `<span class="course-grade grade-${grade.charAt(0)}">${grade}</span>` : ''}
            ${isLocked ? `<span class="prereq-lock" title="Needs: ${course.prereqs.join(', ')}">🔒</span>` : ''}
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
  }

  const grid = document.getElementById('roadmap-grid');
  if (grid) grid.innerHTML = html;

  // Save upcoming courses for marketplace cross-feature
  localStorage.setItem('unite_upcoming_courses', JSON.stringify(nextSemesterCourses));

  // Graduation progress bar
  const totalCompleted = TRANSCRIPT_DATA.filter(c => c.status === 'passed').reduce((s, c) => s + (c.credits || 3), 0);
  const pct = Math.min(100, Math.round((totalCompleted / 120) * 100));
  const progEl = document.getElementById('graduation-progress');
  if (progEl) progEl.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-label">Degree Progress: ${totalCompleted} / 120 credits (${pct}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
}

// ─── Prereq Tree ──────────────────────────────────────────────────────────────

function showCoursePrereqs(code) {
  switchTab('prereqs');
  const inp = document.getElementById('prereq-search');
  if (inp) inp.value = code.replace(/([A-Z]+)(\d+)/, '$1 $2');
  renderPrereqTree(code);
}

function searchPrereqs(query) {
  const code = query.toUpperCase().replace(/\s+/g, '');
  if (code.length >= 6) renderPrereqTree(code);
}

function initPrereqSearch() {
  const raw = localStorage.getItem('unite_upcoming_courses');
  if (raw) {
    try {
      const upcoming = JSON.parse(raw);
      if (upcoming.length > 0) {
        const inp = document.getElementById('prereq-search');
        if (inp) inp.value = upcoming[0].replace(/([A-Z]+)(\d+)/, '$1 $2');
        renderPrereqTree(upcoming[0]);
      }
    } catch (e) { /* ignore */ }
  }
}

function getAllCourses() {
  const program = CURRENT_PROGRAM === 'computer_science' ? CS_PROGRAM : OTHER_PROGRAMS[CURRENT_PROGRAM] || CS_PROGRAM;
  const all = [];
  Object.values(program.years).forEach(yr => {
    Object.values(yr).forEach(sem => sem.forEach(c => all.push(c)));
  });
  return all;
}

function renderPrereqTree(targetCode) {
  const container = document.getElementById('prereq-tree-container');
  if (!container) return;
  const completedCodes = new Set(TRANSCRIPT_DATA.filter(c => c.status === 'passed').map(c => c.code.replace(/\s+/g, '')));
  const allCourses = getAllCourses();
  const course = allCourses.find(c => c.code.replace(/\s+/g, '') === targetCode);

  if (!course) {
    container.innerHTML = `<div class="prereq-placeholder"><p>Course <strong>${targetCode.replace(/([A-Z]+)(\d+)/,'$1 $2')}</strong> not found in your program roadmap.</p></div>`;
    return;
  }

  function buildChain(code, depth, visited) {
    if (visited.has(code) || depth > 5) return null;
    visited.add(code);
    const c = allCourses.find(x => x.code.replace(/\s+/g, '') === code);
    const prereqs = (c ? c.prereqs : [])
      .map(p => buildChain(p.replace(/\s+/g, ''), depth + 1, new Set(visited)))
      .filter(Boolean);
    return { code, title: c ? c.title : code, isCompleted: completedCodes.has(code), isTarget: code === targetCode, prereqs };
  }

  function renderNode(node) {
    const st = node.isTarget ? 'target' : node.isCompleted ? 'completed' : 'needed';
    const label = node.code.replace(/([A-Z]+)(\d+)/, '$1 $2');
    let html = `<div class="prereq-node ${st}">
      <div class="node-code">${label}</div>
      <div class="node-title">${node.title}</div>
      ${node.isCompleted ? '<div class="node-check">✅ Done</div>' : st === 'target' ? '<div class="node-check" style="color:#CC0033;">← Target</div>' : ''}
    </div>`;
    if (node.prereqs.length > 0) {
      html += `<div class="prereq-children">` +
        node.prereqs.map(ch => `<div class="prereq-branch"><div class="prereq-arrow">↑ requires</div>${renderNode(ch)}</div>`).join('') +
        `</div>`;
    }
    return html;
  }

  const chain = buildChain(targetCode, 0, new Set());
  container.innerHTML = `<div class="prereq-tree">${renderNode(chain)}</div>`;
}

// ─── GPA Simulator ───────────────────────────────────────────────────────────

function updateGPASimulator() {
  const grid          = document.getElementById('gpa-course-grid');
  const curDisplay    = document.getElementById('current-gpa-display');
  const projDisplay   = document.getElementById('projected-gpa-display');
  const standing      = document.getElementById('gpa-standing');
  const creditsEl     = document.getElementById('credits-completed-display');
  if (!grid) return;

  const passed = TRANSCRIPT_DATA.filter(c =>
    c.status === 'passed' && UCALGARY_GRADE_POINTS[c.grade] !== null && UCALGARY_GRADE_POINTS[c.grade] !== undefined
  );

  let pts = 0, creds = 0;
  passed.forEach(c => { pts += UCALGARY_GRADE_POINTS[c.grade] * (c.credits || 3); creds += (c.credits || 3); });

  const gpa = creds > 0 ? pts / creds : 0;
  if (curDisplay)  curDisplay.textContent  = creds > 0 ? gpa.toFixed(2) : '--';
  if (projDisplay) projDisplay.textContent = creds > 0 ? gpa.toFixed(2) : '--';
  if (creditsEl)   creditsEl.textContent   = creds;
  if (standing)    standing.textContent    = standingLabel(gpa);

  const inProgress = TRANSCRIPT_DATA.filter(c => c.status === 'in_progress');
  if (TRANSCRIPT_DATA.length === 0) {
    grid.innerHTML = '<div class="gpa-placeholder">Upload your transcript or use the demo transcript to simulate grades</div>';
    return;
  }
  if (inProgress.length === 0) {
    grid.innerHTML = '<div class="gpa-placeholder">No in-progress courses found — your GPA is shown above.</div>';
    return;
  }

  const grades = Object.keys(UCALGARY_GRADE_POINTS).filter(g => UCALGARY_GRADE_POINTS[g] !== null);
  grid.innerHTML = `<div class="gpa-sim-header"><h3>Simulate grades for in-progress courses</h3></div>
    <div class="gpa-sim-courses">` +
    inProgress.map(c => `<div class="gpa-sim-row">
      <div class="gpa-sim-course">
        <span class="gpa-course-code">${c.code.replace(/([A-Z]+)(\d+)/,'$1 $2')}</span>
        <span class="gpa-course-title">${c.title}</span>
      </div>
      <select class="gpa-grade-select" data-code="${c.code}" data-credits="${c.credits||3}" onchange="recalcProjectedGPA()">
        <option value="">Select grade</option>
        ${grades.map(g=>`<option value="${g}">${g}</option>`).join('')}
      </select>
    </div>`).join('') +
    `</div>`;
}

function recalcProjectedGPA() {
  const passed = TRANSCRIPT_DATA.filter(c =>
    c.status === 'passed' && UCALGARY_GRADE_POINTS[c.grade] !== null && UCALGARY_GRADE_POINTS[c.grade] !== undefined
  );
  let pts = 0, creds = 0;
  passed.forEach(c => { pts += UCALGARY_GRADE_POINTS[c.grade] * (c.credits || 3); creds += (c.credits || 3); });

  document.querySelectorAll('.gpa-grade-select').forEach(sel => {
    if (sel.value && UCALGARY_GRADE_POINTS[sel.value] !== null) {
      const cr = parseFloat(sel.dataset.credits) || 3;
      pts += UCALGARY_GRADE_POINTS[sel.value] * cr;
      creds += cr;
    }
  });

  const projected = creds > 0 ? pts / creds : 0;
  const el = document.getElementById('projected-gpa-display');
  const st = document.getElementById('projected-standing');
  if (el) el.textContent = projected.toFixed(2);
  if (st) st.textContent = standingLabel(projected);
}

function standingLabel(gpa) {
  if (gpa >= 3.75) return "Dean's List 🏆";
  if (gpa >= 3.5)  return 'Great Distinction ⭐';
  if (gpa >= 3.0)  return 'Good Standing ✅';
  if (gpa >= 2.0)  return 'Satisfactory 📚';
  return 'At Risk ⚠️';
}

// ─── AI Advisor ───────────────────────────────────────────────────────────────

async function sendAdvisorMessage() {
  const input = document.getElementById('advisor-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendMsg('user', message);
  appendMsg('loading', '');

  const profile  = JSON.parse(localStorage.getItem('unite_profile') || '{}');
  const upcoming = JSON.parse(localStorage.getItem('unite_upcoming_courses') || '[]');

  const body = {
    message,
    program:            profile.program || 'Computer Science',
    year:               profile.year || String(CURRENT_YEAR),
    transcript:         TRANSCRIPT_DATA.filter(c => c.status === 'passed').map(c => `${c.code} ${c.grade}`),
    upcoming_courses:   upcoming,
  };

  try {
    const token = localStorage.getItem('unite_token');
    const res   = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    removeLoading();
    appendMsg('advisor', data.reply || data.message || 'Sorry, I could not get a response. Please try again.');
  } catch (err) {
    removeLoading();
    appendMsg('advisor', generateLocalAdvisorResponse(message, profile, upcoming));
  }
}

function askAdvisor(question) {
  const inp = document.getElementById('advisor-input');
  if (inp) inp.value = question;
  sendAdvisorMessage();
}

function appendMsg(type, text) {
  const msgs = document.getElementById('advisor-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `advisor-message ${type}`;

  if (type === 'loading') {
    div.id = 'loading-message';
    div.innerHTML = `<div class="message-avatar">🎓</div>
      <div class="message-bubble typing"><span></span><span></span><span></span></div>`;
  } else if (type === 'user') {
    const profile  = JSON.parse(localStorage.getItem('unite_profile') || '{}');
    const initial  = (profile.name || 'S').charAt(0).toUpperCase();
    div.innerHTML = `<div class="message-bubble user-bubble">${escHtml(text)}</div>
      <div class="message-avatar user-avatar">${initial}</div>`;
  } else {
    // Render markdown-like formatting from Claude
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    div.innerHTML = `<div class="message-avatar">🎓</div>
      <div class="message-bubble">${formatted}</div>`;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeLoading() {
  const el = document.getElementById('loading-message');
  if (el) el.remove();
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function generateLocalAdvisorResponse(message, profile, upcoming) {
  const msg  = message.toLowerCase();
  const prog = profile.program || 'Computer Science';
  const yr   = profile.year || CURRENT_YEAR;

  if (msg.includes('next') || msg.includes('take')) {
    const list = upcoming.slice(0, 3).map(c => c.replace(/([A-Z]+)(\d+)/, '$1 $2')).join(', ');
    return list
      ? `Based on your ${prog} Year ${yr} roadmap, I recommend: **${list}** next semester. These are the natural next steps in your program sequence. Click any course card in the Roadmap tab for its prereq chain.`
      : `For ${prog} Year ${yr}, check the Roadmap tab to see your recommended next courses. Upload your transcript to unlock personalized recommendations.`;
  }
  if (msg.includes('graduate') || msg.includes('on track')) {
    const creds = TRANSCRIPT_DATA.filter(c => c.status === 'passed').reduce((s,c)=>s+(c.credits||3),0);
    return `You need **120 credits** to graduate. You have **${creds} credits** completed (${Math.round(creds/1.2)}%). At 5 courses/semester you're on track for a 4-year graduation.`;
  }
  if (msg.includes('gpa') || msg.includes('grade') || msg.includes('improve')) {
    const gpa = calculateCurrentGPA();
    return gpa
      ? `Your current GPA is **${gpa}**. ${standingLabel(parseFloat(gpa))}. Use the **GPA Simulator** tab to model different grade scenarios for your in-progress courses.`
      : 'Upload your transcript so I can calculate your GPA and give specific advice.';
  }
  if (msg.includes('hard') || msg.includes('difficult')) {
    return `In **Computer Science**, the courses students find most challenging are: **CPSC 331** (Data Structures), **CPSC 413** (Algorithms), and **CPSC 457** (Operating Systems). Start them when you have a lighter course load and use the study resources at the Taylor Family Digital Library.`;
  }
  return `As a **${prog}** student at UCalgary, use the Roadmap tab to see your full semester-by-semester plan. Upload your transcript for personalized recommendations based on your actual progress.`;
}

function calculateCurrentGPA() {
  const graded = TRANSCRIPT_DATA.filter(c =>
    c.status === 'passed' && UCALGARY_GRADE_POINTS[c.grade] !== null && UCALGARY_GRADE_POINTS[c.grade] !== undefined
  );
  if (!graded.length) return null;
  const pts   = graded.reduce((s,c) => s + UCALGARY_GRADE_POINTS[c.grade]*(c.credits||3), 0);
  const creds = graded.reduce((s,c) => s + (c.credits||3), 0);
  return (pts/creds).toFixed(2);
}
