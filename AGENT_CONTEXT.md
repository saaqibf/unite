# 🤖 AGENT_CONTEXT.md — UNite Team Reference
> Defines WHO OWNS WHAT and the shared contracts between features.
> Not a live status board — use `git fetch + git log` for real-time status.

---

## ⚠️ Check What Teammates Pushed Before Starting Every Session

```bash
git fetch origin
git log origin/pair-a --oneline -8
git log origin/pair-b --oneline -8
git status
```

To get a teammate's work:
```bash
git pull origin pair-a   # Saaqib + Mousa's work
git pull origin pair-b   # Richard + Primel's work
```

---

## 👥 Who Owns What — Never Change Someone Else's Files

| Person | Branch | Owns These Files |
|--------|--------|-----------------|
| **Saaqib** | pair-a | `server/`, `js/auth.js`, `js/ai-advisor.js`, `js/course-compass.js`, `features/course-compass.html`, `css/course-compass.css`, `data/ucalgary_programs.json`, `README.md`, Railway deploy |
| **Mousa** | pair-a | `features/onboarding.html`, `js/onboarding.js`, `js/landing-intent.js`, `css/onboarding.css` |
| **Primel** | pair-b | `features/marketplace.html`, `features/community.html`, `js/marketplace.js`, `js/community.js`, `server/routes/chat.js` |
| **Richard** | pair-b | `css/unite-design-system.css`, `index.html`, `js/chat.js`, `css/landing.css`, all screenshots |

---

## 🔑 localStorage Keys Contract

Every feature that reads or writes localStorage MUST use exactly these key names.

```javascript
localStorage.getItem('unite_profile')
// Written by: onboarding.js (Mousa)
// Read by: marketplace.js, community.js, course-compass.js
// Shape: { name, email, program, year, has_car, housing, challenge, personality, interests, primary_intent, needed_courses }

localStorage.getItem('unite_intent')
// Written by: landing-intent.js (Mousa)
// Read by: onboarding.js
// Shape: 'marketplace' | 'course_compass' | 'community'

localStorage.getItem('unite_upcoming_courses')
// Written by: course-compass.js (Saaqib) — set after roadmap renders
// Read by: marketplace.js (Primel) — shows "Courses You Will Need" textbooks
// Shape: ['CPSC331', 'MATH271', ...]

localStorage.getItem('unite_token')
// Written by: onboarding.js after /api/auth/register
// Read by: any page making authenticated API calls
// Shape: JWT string

localStorage.getItem('unite_completed_courses')
// Written by: course-compass.js transcript parser
// Read by: course-compass.js for roadmap completion state
// Shape: ['CPSC217', 'MATH211', ...]
```

---

## 🌿 Merge Plan — In This Order

```
1. Saaqib + Mousa both push to pair-a
2. Saaqib opens PR: pair-a → dev
3. Richard + Primel both push to pair-b
4. Richard opens PR: pair-b → dev
5. Resolve any conflicts in dev
6. Saaqib opens PR: dev → main
7. Railway auto-deploys from main 🚀
```

---

## 🔗 API Endpoints (Saaqib owns all of these)

```
POST /api/auth/register         → { email, password } → { token, user }
POST /api/auth/login            → { email, password } → { token, user }
GET  /api/auth/me               → returns current user profile
PUT  /api/auth/onboarding       → saves program, year, interests to DB
PUT  /api/auth/needed-courses   → saves upcoming courses (cross-feature)
POST /api/ai/chat               → { message, program, year, transcript } → { reply }
POST /api/ai/roadmap            → { program, year, completed_courses } → { roadmap }
POST /api/chat/message          → { text } → triggers Pusher broadcast
```

If backend is down → use try/catch and fall back to demo/localStorage mode.

---

## 📸 Judge Screenshots (5 required)

| # | File | Owner | Status |
|---|------|-------|--------|
| 1 | `screenshots/01-landing-hero.png` | Richard | ✅ |
| 2 | `screenshots/02-course-compass.png` | Saaqib | ❌ take after JS done |
| 3 | `screenshots/03-marketplace.png` | Primel | ✅ |
| 4 | `screenshots/04-community.png` | Primel | ✅ |
| 5 | `screenshots/05-chat.png` | Richard | ❌ |

---

## ✂️ Cut List If Running Out Of Time

**Cut first:**
- Email verification send (domain check is enough for demo)
- GPA what-if simulator
- Sports & Hobbies posting form
- Club verified badge admin toggle
- Live Pusher (seed messages UI is fine for demo)

**Never cut:**
- UCalgary `@ucalgary.ca` validation on register/login
- Course Compass roadmap rendering
- Marketplace browse + "Let's Unite" DM flow
- The full Sarah demo journey working end-to-end

---

## 🎬 Sarah Demo Path — Every Page Must Load

```
1. index.html            → clicks "Find My Way"
2. onboarding.html       → sarah@ucalgary.ca, CS, Year 1, no car
3. course-compass.html   → sees CS roadmap, CPSC 331 highlighted
4. marketplace.html      → "Courses You'll Need" shows CPSC 331 textbook
5. community.html        → RSVPs to CS Society event, Pull Up on soccer
6. community.html        → sends chat message (appears instantly or via seed)
```

If any step 404s or errors — the demo fails. Every page must load before submission.

---

## 🔑 Keys Needed In .env (share via Discord DM — never commit)

```
DATABASE_URL        → Saaqib gets from Railway
JWT_SECRET          → any 32+ char random string (each person can use own)
ANTHROPIC_API_KEY   → Saaqib's key
PUSHER_APP_ID       → Primel gets from pusher.com
PUSHER_KEY          → Primel shares
PUSHER_SECRET       → Primel shares
PUSHER_CLUSTER      → mt1
CLOUDINARY_CLOUD_NAME → Primel gets from cloudinary.com
CLOUDINARY_API_KEY    → Primel shares
CLOUDINARY_API_SECRET → Primel shares
EMAIL_USER          → Gmail address for verification emails
EMAIL_PASS          → Gmail App Password
CLIENT_URL          → https://unite.up.railway.app (prod) or http://localhost:3000 (dev)
```
