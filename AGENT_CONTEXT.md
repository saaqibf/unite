# 🤖 AGENT_CONTEXT.md — UNite Team Reference
> This file defines WHO OWNS WHAT and the shared contracts between features.
> It is NOT a live status board — use `git fetch` + `git log` for real-time status.

---

## ⚠️ How To Check What Teammates Actually Pushed

Before starting any session, run this in terminal:

```bash
git fetch origin
git log origin/pair-a --oneline -8
git log origin/pair-b --oneline -8
git status
```

Then tell Cursor:
1. What did Pair A push that I do not have locally yet?
2. What did Pair B push that I do not have locally yet?
3. Is there anything I should pull before I start building?
4. Are there any merge conflicts likely if I pull?

Never start building without running this check first.
Never commit as an AI agent — all commits are your GitHub username only.

---

## How To Pull Someone Else's Work Safely

```bash
git add .
git stash
git pull origin pair-a   # or pair-b
git stash pop
```

If conflicts appear, tell Cursor: "resolve these conflicts — keep my files, keep their server files."

---

## 👥 Who Owns What — Never Change Someone Else's Files

| Person | Branch | Owns These Files |
|---|---|---|
| **Saaqib** | pair-a | `server/`, `js/auth.js`, `js/ai-advisor.js`, `js/course-compass.js`, `features/course-compass.html`, `data/ucalgary_programs.json`, `README.md`, Railway deploy |
| **Mousa** | pair-a | `features/onboarding.html`, `js/onboarding.js`, `js/landing-intent.js`, `css/onboarding.css` |
| **Primel** | pair-b | `features/marketplace.html`, `features/community.html`, `js/marketplace.js`, `js/community.js`, `server/routes/chat.js` |
| **Richard** | pair-b | `css/unite-design-system.css`, `index.html`, `js/unite-nav.js`, `css/landing.css`, all screenshots |

---

## 🔑 localStorage Keys Contract

Every feature that reads or writes localStorage MUST use exactly these key names.
Do not invent new ones. Do not rename these.

```javascript
localStorage.getItem('unite_profile')
// Written by: onboarding.js (Mousa)
// Read by: marketplace.js (Primel), community.js (Primel), course-compass.js (Saaqib)
// Shape: { name, email, program, year, has_car, housing, challenge, personality, interests, primary_intent, needed_courses }

localStorage.getItem('unite_intent')
// Written by: landing-intent.js (Mousa)
// Read by: onboarding.js (Mousa)
// Shape: string — 'marketplace' | 'course_compass' | 'community'

localStorage.getItem('unite_upcoming_courses')
// Written by: course-compass.js (Saaqib)
// Read by: marketplace.js (Primel) — shows "Courses You Will Need" section
// Shape: array of course code strings e.g. ['CPSC331', 'MATH271']

localStorage.getItem('unite_token')
// Written by: onboarding.js after successful /api/auth/register
// Read by: any page making authenticated API calls
// Shape: JWT string

localStorage.getItem('unite_sports_events')
// Written by: community.js (Primel)
// Read by: community.js for feed rendering
// Shape: array of event objects
```

---

## 🔗 API Endpoints (Saaqib owns all of these)

```
POST /api/auth/register   → body: { email, password } → returns { token, user }
POST /api/auth/login      → body: { email, password } → returns { token, user }
POST /api/ai/chat         → body: { message, context } → returns { reply }
POST /api/marketplace/listings → creates a listing
GET  /api/marketplace/listings → returns all listings
POST /api/chat/message    → body: { text, user, program } → triggers Pusher broadcast
GET  /api/chat/config     → returns { key, cluster } for Pusher frontend init
```

Frontend pages call these via `fetch('/api/...')`. If the backend is down, use try/catch and fall back to demo mode.

---

## 📸 Judge Screenshots (5 total)

| # | What | Filename | Owner | Status |
|---|---|---|---|---|
| 1 | Landing hero | `01-landing-hero.png` | Richard | ✅ |
| 2 | Course Compass roadmap | `02-course-compass.png` | Saaqib | ❌ |
| 3 | Marketplace browse | `03-marketplace.png` | Primel | ✅ |
| 4 | Community Hub | `04-community.png` | Primel | ✅ |
| 5 | Group Chat | `05-chat.png` | Richard | ✅ |

**Rule:** After any UI change → retake that page's screenshot → push immediately.
**Before submission:** Retake all 5 with real demo data → `[UI] Final judge screenshots — submission ready`.

---

## 🌿 Merge Plan — Do This In Order

```
Step 1: Saaqib + Mousa push to pair-a
Step 2: Saaqib opens PR: pair-a → dev
Step 3: Richard + Primel push to pair-b
Step 4: Richard opens PR: pair-b → dev
Step 5: Resolve conflicts in dev
Step 6: Saaqib opens PR: dev → main
Step 7: Railway auto-deploys 🚀
```

---

## 🎬 Demo Path — Sarah's Journey

Every feature must support this flow or the demo breaks:

```
1. index.html → Sarah clicks "Find My Way"
2. features/onboarding.html → sarah@ucalgary.ca → CS, Y1, no car
3. features/course-compass.html → CS roadmap → CPSC 331 highlighted
4. features/marketplace.html → "Courses You Will Need" shows CPSC 331 textbook → "Let's Unite"
5. DM thread opens → agrees to meet at TFDL
6. features/community.html → CS Society event RSVP → Pull Up on soccer game
7. Group chat → sends a message → appears in real-time (or seed data for demo)
```

If any step 404s or crashes — the demo fails.

---

## ✂️ Cut List If Running Out Of Time

**Cut first (safe to drop):**
- Email verification send (domain check is enough for demo)
- GPA what-if simulator
- Club verified badge admin toggle
- Live Pusher (seed messages UI already passes for demo)

**Never cut:**
- UCalgary email validation on onboarding
- Course Compass roadmap rendering
- Marketplace browse + "Let's Unite" DM flow
- The full Sarah demo journey working end to end

---

## 🔐 Keys — Share Via Discord DM Only, Never Commit

| Key Set | Who Gets It | Service |
|---|---|---|
| `PUSHER_APP_ID/KEY/SECRET/CLUSTER` | Primel | pusher.com free tier |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Primel | cloudinary.com free tier |
| `DATABASE_URL` | Saaqib | Railway PostgreSQL |
| `ANTHROPIC_API_KEY` | Saaqib | console.anthropic.com |
