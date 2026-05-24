# 🎓 UNite — Master Hackathon Plan
> **Repo:** `github.com/saaqibf/unite`  
> **Deployment:** Railway (`unite.up.railway.app`)  
> **Build window:** 6:43 PM May 23 → 11:00 AM May 24 (16h 17min)  
> **Team:** 4 people, 2 pairs  
> **Stack:** Vanilla JS + HTML/CSS · Node.js/Express · PostgreSQL · Claude API · Pusher · Cloudinary · Railway

---

## 🧭 What Is UNite?

UNite is the all-in-one campus platform built exclusively for University of Calgary students. It solves the 4 biggest pain points of university life:

1. **No car** — students can't buy or sell things without transportation
2. **No community** — introverted and new students struggle to find people and events
3. **No degree clarity** — students waste semesters taking wrong courses with no guidance
4. **No central hub** — events, clubs, sports, and classmates are scattered across 10 different platforms

UNite brings all of this into one place, verified by UCalgary email, built for the UCalgary campus.

---

## 🎨 Brand Identity

### Logo
**Wordmark:** `U·N·ite` — the `N` is in UCalgary Red `#CC0033`, rest in black `#000000`  
**Font:** `Bebas Neue` for the logo mark (bold, strong, campus energy)  
**Tagline:** *"Let's Unite"*  
**Icon version:** Red circle with white `UN` — used as favicon and app icon

### Color Palette
```css
--color-primary:     #CC0033;  /* UCalgary Red — primary actions, CTAs, logo accent */
--color-primary-dark:#A3002A;  /* Hover states */
--color-black:       #0A0A0A;  /* Text, nav */
--color-gold:        #FFCD00;  /* UCalgary Gold — badges, highlights, verified marks */
--color-white:       #FFFFFF;  /* Backgrounds */
--color-surface:     #F5F5F5;  /* Card backgrounds */
--color-border:      #E0E0E0;  /* Dividers */
--color-text-muted:  #6B7280;  /* Secondary text */
--color-success:     #16A34A;  /* Sold, confirmed */
--color-danger:      #DC2626;  /* Errors */
```

### Typography
```css
--font-display: 'Bebas Neue', sans-serif;   /* Headers, hero text */
--font-body:    'DM Sans', sans-serif;       /* Body, UI elements */
--font-mono:    'JetBrains Mono', monospace; /* Course codes, data */
```
Import from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Design Principles (for AI Judge Pass 4)
- **Card-based layout** — every item, event, course is a card
- **Mobile-first** — design for 390px, then scale up
- **UCalgary Red** is used ONLY for primary actions — do not dilute it
- **Generous whitespace** — clean, not cluttered
- **Consistent border-radius:** `12px` for cards, `8px` for inputs, `999px` for pills/badges

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vanilla JS + HTML/CSS | Fast, works with existing CourseCompass base |
| Backend | Node.js + Express | Existing, already has AI routes |
| Database | PostgreSQL (Railway) | Relational — perfect for courses/prereqs/users |
| Real-time Chat | Pusher | Group chat, zero backend complexity |
| File Storage | Cloudinary | Marketplace item photos |
| AI | Claude API (`claude-sonnet-4-6`) | Course Compass AI advisor |
| Auth | JWT + email domain verification | `@ucalgary.ca` only |
| Deployment | Railway | Auto-deploy from GitHub main |
| Course Data | `ucalgary_courses.json` (pre-processed) | 5,569 UCalgary courses |

---

## 👥 Team Split

### Pair A — Saaqib + [Person 2]
**Owns:** Course Compass · Auth/Onboarding · GitHub repo · README · Deployment · Push Reports

### Pair B — [Person 3] + [Person 4]  
**Owns:** Marketplace · Community Hub · Sports & Hobbies · UI Design System · Landing Page

> **Rule:** Pair B builds the design system (CSS variables, card components, nav, buttons) in the **first 2 hours**. Pair A uses it from hour 3 onward. Nobody designs their own components — everything comes from the shared system.

---

## ⏱️ Build Order — Step by Step

This is the exact order you build things. Do NOT skip ahead. Each step unlocks the next.

### 🔴 HOUR 0–1 | Setup (Everyone)
**Who:** Saaqib  
**What:**
- [ ] Create GitHub repo `unite` at `github.com/saaqibf/unite`
- [ ] Set `main` as protected branch (require PR to merge)
- [ ] Add all 3 teammates as collaborators
- [ ] Create branch structure: `main`, `dev`, `pair-a`, `pair-b`
- [ ] Copy CourseCompass codebase into repo, strip UofL-specific data
- [ ] Commit `ucalgary_courses.json` and `ucalgary_courses_slim.json` to `/data/`
- [ ] Create `.env.example` with all required keys (see Environment Variables section)
- [ ] Set up Railway project, link to GitHub repo, provision PostgreSQL
- [ ] Add `PUSH_REPORT_TEMPLATE.md` and `.github/pull_request_template.md`
- [ ] Confirm Railway auto-deploy is working with a "Hello World" index.html
- [ ] Write initial `README.md` (see README section below)

**Pair B — simultaneously:**
- [ ] Build design system CSS (`/css/unite-design-system.css`) — colors, fonts, cards, buttons, inputs, nav
- [ ] Build the logo SVG wordmark
- [ ] Build the cinematic landing page (`/index.html`) with "Let's Unite" hero

---

### 🔴 HOUR 1–3 | Foundation
**Pair A:**
- [ ] Strip all UofL references from `js/programs.js`, `js/data.js`, `data/courses.csv`
- [ ] Swap in `ucalgary_courses.json` as the data source
- [ ] Add UCalgary email domain check to auth: `email.endsWith('@ucalgary.ca')`
- [ ] Update onboarding flow with the 3-step hybrid experience (see Onboarding section)
- [ ] Build the program selector for UCalgary programs (CS, Engineering, Business, Nursing, Kinesiology, Arts, Science)
- [ ] Confirm auth + onboarding works end-to-end

**Pair B:**
- [ ] Build the main nav component (shared across all features)
- [ ] Build the card component (shared: marketplace card, event card, course card)
- [ ] Build the Marketplace page shell (`/features/marketplace.html`)
- [ ] Build item listing form (photo upload via Cloudinary, title, price, condition, campus meetup selector)

---

### 🔴 HOUR 3–6 | Core Features
**Pair A:**
- [ ] Wire UCalgary course data into Course Compass prerequisite map
- [ ] Update `js/prereq-tree.js` with UCalgary course codes (CPSC, ENGG, MATH, etc.)
- [ ] Update `js/programs.js` with UCalgary program requirements (CS first, then Engineering, Business)
- [ ] Test transcript upload → degree audit → semester roadmap for a UCalgary CS student
- [ ] Wire cross-feature intelligence: Course Compass → Marketplace (see Cross-Feature section)

**Pair B:**
- [ ] Build Marketplace browse page (grid of cards, filter by category, search)
- [ ] Build "I'm Interested" → DM thread flow
- [ ] Build campus meetup selector (UCalgary buildings dropdown)
- [ ] Build Community Hub shell (`/features/community.html`) with events feed

---

### 🔴 HOUR 6–9 | Feature Completion
**Pair A:**
- [ ] Polish Course Compass AI advisor — update system prompt for UCalgary context
- [ ] Add GPA simulator with UCalgary grading scale (A=4.0, B+=3.3, etc.)
- [ ] Add "What if" scenario planner
- [ ] Write push reports for everything completed so far

**Pair B:**
- [ ] Build Sports & Hobbies event creation form ("soccer game at 3pm Saturday, need 5 more people")
- [ ] Build event signup flow ("Pull Up" button → attendee list)
- [ ] Build Club Newsletter section (verified club badge, post form — admin-only toggle for demo)
- [ ] Integrate Pusher for real-time group chat

---

### 🔴 HOUR 9–12 | Integration + Cross-Feature
**Everyone:**
- [ ] Connect all features through the shared nav
- [ ] Test the full Sarah demo journey (see Demo Script section)
- [ ] Fix any broken flows
- [ ] Take 5 screenshots for AI Judge Pass 4 (see Screenshots section)
- [ ] Merge `pair-a` and `pair-b` into `dev`, then `dev` into `main`

---

### 🔴 HOUR 12–14 | Polish
**Pair B:**
- [ ] Mobile responsiveness pass — test every page at 390px
- [ ] Animation pass — add micro-interactions to cards, buttons, page transitions
- [ ] Empty state designs — what does a new user see when there are no items/events yet?
- [ ] Error state designs — what happens when something fails?

**Pair A:**
- [ ] Final README update with screenshots
- [ ] Ensure Railway deployment is live and stable
- [ ] Run through demo script 3 times end-to-end

---

### 🔴 HOUR 14–16 | Buffer + Demo Prep
- [ ] Everything that isn't working gets cut or mocked
- [ ] Seed the database with demo data (fake listings, fake events, fake chat messages)
- [ ] Practice the demo script
- [ ] Final push to main, confirm Railway is live
- [ ] Submit

---

## 🚪 Onboarding Flow (Hybrid Experience)

### Screen 1 — Cinematic Entry
Full-screen. Dark background with subtle campus silhouette. Animated text:

> *"University is better together."*

Three glowing cards appear:
- 🎒 **Settle In** → leads to Marketplace focus
- 🧭 **Find My Way** → leads to Course Compass focus  
- 🤝 **Meet People** → leads to Community Hub focus

They pick one. It sets their `primary_intent` in their profile.

### Screen 2 — Sign Up
- Email field with live validation: shows ✅ when `@ucalgary.ca` detected, ❌ otherwise
- Error message for non-UCalgary emails: *"UNite is for UCalgary students. Use your @ucalgary.ca email to join."*
- Password field
- "Join UNite" button in UCalgary Red

### Screen 3 — Verification
- *"We sent a verification link to your UCalgary email. Check your inbox."*
- Resend button
- This is the security gate — only real UCalgary students get past this

### Screen 4 — The 8 Questions (one at a time, progress bar)
1. **What's your name?** (first name only)
2. **What program are you in?** (dropdown: CS, Engineering, Business, Nursing, Kinesiology, Arts, Science, Other)
3. **What year are you?** (Year 1, 2, 3, 4, 5+, Graduate)
4. **Do you have a car?** (Yes / No) — *powers marketplace defaults*
5. **Where do you live?** (On campus / Off campus / Commuter)
6. **What's your biggest challenge right now?** (Making friends / Planning my degree / Finding stuff I need / Finding things to do)
7. **Are you more of an introvert or extrovert?** (Introvert / Extrovert / Depends) — *powers community recommendations*
8. **What are your interests?** (multi-select: Sports, Music, Gaming, Study Groups, Outdoors, Arts, Tech, Food, Other)

### Screen 5 — Personalized Dashboard
*"Welcome to UNite, [Name]. Here's what we found for you."*  
Shows 3 personalized cards based on their answers.

---

## 🛒 Marketplace — "Let's Unite"

**Philosophy:** Exactly like Facebook Marketplace but UCalgary-only, campus-safe, no car needed.

### Listing a Item
- Photo upload (up to 4 photos, Cloudinary)
- Title, description, price
- Condition: New / Like New / Good / Fair
- Category: Textbooks / Electronics / Furniture / Clothing / Sports / Other
- **Campus Meetup Spot** (dropdown):
  - MacHall (MacEwan Student Centre)
  - TFDL (Taylor Family Digital Library)
  - Science Theatres
  - ICT Building
  - Engineering Building (ENEL/ENCM)
  - Residence (Cascade, Brentwood, Kananaskis)
  - Foothills Campus
  - Other (free text)
- "List It" button

### Browsing
- Grid of cards (photo, title, price, condition badge, meetup spot, time listed)
- Search bar
- Filter by: category, price range, condition, meetup location
- **Smart default:** if user said "no car" in onboarding → filter defaults to campus-only meetup spots

### Interest Flow (Facebook-style)
1. Buyer clicks **"I'm Interested — Let's Unite"** (red button)
2. A direct message thread opens between buyer and seller
3. Pre-filled opening message: *"Hey! I'm interested in your [item]. When can we meet at [meetup spot]?"*
4. They negotiate time/price in the DM thread
5. Meet in person, pay cash or e-transfer
6. Seller clicks **"Mark as Sold"** → item shows SOLD badge, thread closes

### Cross-Feature Intelligence ⭐
> This is what impresses the AI judge

When a student's Course Compass shows they need CPSC 331 next semester:
- Marketplace homepage shows a "Courses You'll Need" section
- Surfaces any CPSC 331 textbooks currently listed
- Label: *"Someone in your program is selling this"*

When a student has no car (from onboarding):
- Marketplace defaults to campus-pickup items only
- Filter chip: "Campus Pickup Only 🎓" pre-selected

---

## 🤝 Community Hub

### Three Sections

#### 1. Club Newsletter (Verified Clubs Only)
- Clubs have a gold ✓ verified badge
- They post: event name, date, time, location, description, photo
- Feed is chronological, newest first
- Any student can RSVP → shows "X students going"
- For the demo: admin can toggle "verified" on any account

#### 2. Sports & Hobbies Events ("Pull Up")
- Any student can post
- Form: sport/activity, date, time, location (UCalgary campus or nearby park), spots available, skill level
- Browse feed with filter by sport/activity type
- **"Pull Up" button** → adds you to the attendee list
- Organizer sees who's coming, can message the group
- Cross-feature: if you listed "Sports" or specific hobbies in onboarding → these events appear on your dashboard

#### 3. Group Chat (Pusher Real-Time)
- One global UCalgary student chat room
- Messages show: avatar initials, name, program badge, timestamp
- New message input at bottom, messages scroll up
- No DMs in group chat — DMs are only in Marketplace threads
- Pusher channel: `unite-global-chat`

---

## 🧭 Course Compass (UCalgary)

### What It Does
1. Student uploads their UCalgary transcript (PDF or manual entry)
2. System parses completed courses
3. AI generates a personalized semester-by-semester roadmap
4. Prerequisite map shows what they can take next
5. GPA simulator shows what-if grade scenarios
6. AI advisor answers questions in plain English

### UCalgary Programs Supported (launch)
- B.Sc. Computer Science
- B.Sc. Software Engineering  
- B.Eng. Electrical Engineering
- B.Comm. (Haskayne School of Business)
- B.Sc. Kinesiology
- B.Sc. Psychology
- B.N. Nursing
- B.Sc. Biological Sciences

### Data Source
- `/data/ucalgary_courses.json` — 5,569 courses, prereqs parsed
- UCalgary grading scale: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, F=0

### AI Advisor System Prompt (update from CourseCompass)
```
You are an academic advisor for the University of Calgary. You help students 
plan their degree, understand prerequisites, and make smart course choices. 
You know UCalgary's course catalog, grading system, and program requirements. 
Be friendly, specific, and always refer to UCalgary course codes (e.g. CPSC 331, 
MATH 271). When a student asks what to take next, check their transcript first 
and give concrete recommendations based on what they've completed.
```

### Cross-Feature Intelligence ⭐
- Courses identified as "needed next semester" → fed to Marketplace to surface relevant textbooks
- Program identified in Course Compass → Community Hub shows relevant club events (CS Society, Engineering Students Society, etc.)

---

## 💬 Real-Time Chat (Pusher)

### Setup
```bash
npm install pusher pusher-js
```

### Backend (add to `server/routes/chat.js`)
```javascript
// What: Broadcasts a new chat message to all connected students
const Pusher = require('pusher');
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

router.post('/message', auth, async (req, res) => {
  const { text } = req.body;
  const user = req.user;
  await pusher.trigger('unite-global-chat', 'new-message', {
    user: user.name,
    program: user.program,
    text,
    timestamp: new Date().toISOString()
  });
  res.json({ ok: true });
});
```

### Frontend (in community hub JS)
```javascript
const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
const channel = pusher.subscribe('unite-global-chat');
channel.bind('new-message', (data) => renderMessage(data));
```

---

## 🔐 Auth & Security

### UCalgary Email Verification
```javascript
// What: Ensures only UCalgary students can register
function isUCalgaryEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@ucalgary.ca');
}

// In registration route
if (!isUCalgaryEmail(req.body.email)) {
  return res.status(400).json({ 
    error: 'UNite is for UCalgary students only. Please use your @ucalgary.ca email.' 
  });
}
```

### Security Checklist
- [ ] All API routes use `auth` middleware (JWT verification)
- [ ] Email domain validated on registration AND login
- [ ] File uploads validated (image types only, max 5MB per file)
- [ ] No API keys in frontend code — all Claude/Pusher/Cloudinary calls go through backend
- [ ] Input sanitization on all form fields (prevent XSS)
- [ ] Rate limiting on auth routes (prevent brute force)
- [ ] `.env` is in `.gitignore` — never commit real keys

### Environment Variables
```bash
# .env.example — commit this. Never commit .env
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
ANTHROPIC_API_KEY=sk-ant-...
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=mt1
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
CLIENT_URL=https://unite.up.railway.app
```

---

## 🧪 Testing

### What to Test Before Submitting
- [ ] Register with `@ucalgary.ca` email → succeeds
- [ ] Register with `@gmail.com` email → blocked with clear error
- [ ] Upload a transcript → Course Compass generates roadmap
- [ ] List a marketplace item with photo → appears in browse feed
- [ ] Click "I'm Interested — Let's Unite" → DM thread opens
- [ ] Post a Sports event → appears in Community Hub
- [ ] Send a message in group chat → appears in real-time for another browser tab
- [ ] All pages load on mobile (390px width)
- [ ] Railway deployment serves the live app

### Basic Smoke Test Script
Open two browser tabs. Register two different `@ucalgary.ca` accounts. Complete the full Sarah journey (see Demo Script). If Sarah can do everything in 5 minutes without errors, you're ready to submit.

---

## 📸 Screenshots (Required for AI Judge Pass 4)

Take exactly these 5 screenshots before submitting:

1. **Landing page** — the cinematic "Let's Unite" hero with the 3 entry cards
2. **Course Compass** — a student's personalized semester roadmap with prerequisite map visible
3. **Marketplace** — browse grid with at least 6 listings, "Campus Pickup Only" filter active
4. **Community Hub** — events feed showing both a club newsletter post (gold verified badge) and a sports event with "Pull Up" button
5. **Group Chat** — real-time chat with 3-4 messages visible, program badges on users

> These screenshots go in `/screenshots/` in the repo AND in the README.

---

## 🎬 Demo Script — "Meet Sarah"

**Presenters:** 2 people. One drives the laptop, one narrates.

**Runtime:** 3 minutes max.

---

**Narrator:** *"Meet Sarah. She's a first-year Computer Science student at the University of Calgary. She just moved here from out of town. She doesn't know anyone. She doesn't have a car. And she has no idea how her degree is supposed to map out over the next 4 years. This is her first day using UNite."*

**[Show landing page]**  
**Driver:** Open `unite.up.railway.app`  
**Narrator:** *"She lands here. Three simple questions: settle in, find my way, or meet people. Sarah clicks 'Find My Way' — she wants to understand her degree first."*

**[Show sign up]**  
**Driver:** Type `sarah.demo@ucalgary.ca`, complete verification  
**Narrator:** *"She signs up with her UCalgary email. Only UCalgary students can join — that's intentional. This platform is built for this community specifically."*

**[Show onboarding]**  
**Driver:** Select CS, Year 1, No Car, Off Campus, Planning my degree, Introvert, Tech + Sports  
**Narrator:** *"UNite learns about Sarah. No car. Introvert. CS student. Year 1. Everything she tells us shapes what she sees next."*

**[Show Course Compass]**  
**Driver:** Show the semester roadmap, click on CPSC 331 prereq chain  
**Narrator:** *"Course Compass shows Sarah exactly how her degree maps out — which courses she needs, in which order, and what's blocking her. No more guessing. No more waiting 3 weeks for an advisor appointment."*

**[Show Marketplace — smart suggestion]**  
**Driver:** Navigate to Marketplace, show "Courses You'll Need" section with CPSC textbook listed  
**Narrator:** *"And here's where it gets interesting. Because UNite knows Sarah needs CPSC 331 next semester, it's already surfacing a textbook for sale — posted by another UCalgary student. Sarah clicks 'I'm Interested — Let's Unite.'"*

**[Show DM thread]**  
**Driver:** Show the pre-filled DM opening message, meetup spot at TFDL  
**Narrator:** *"A message thread opens. They agree to meet at the library. Cash or e-transfer. No car needed. Campus pickup. Problem solved."*

**[Show Community Hub]**  
**Driver:** Show events feed, click on a CS Society event and a soccer game  
**Narrator:** *"Sarah finds a CS Society event posted by a verified club. She RSVPs. She also sees a soccer game happening Saturday — 3 spots left. She hits Pull Up. She's in."*

**[Show Group Chat]**  
**Driver:** Send a message in the live chat, show it appear instantly  
**Narrator:** *"And in the group chat, she says hi. Someone from her program replies. Sarah just went from knowing nobody to having a study group, a textbook, and a soccer game — in under 5 minutes."*

**[Show on mobile]**  
**Driver:** Resize browser to mobile or show on phone  
**Narrator:** *"UNite works on every device. No app download required. Just your UCalgary email."*

**Narrator:** *"We built this for 33,000 UCalgary students. And the architecture scales to every university in Canada — same platform, different email domain. This is UNite."*

---

## 📋 Git Workflow

### Branch Structure
```
main          ← production, auto-deploys to Railway, PR only
dev           ← integration branch, merge pairs here first
pair-a        ← Saaqib + Person 2 working branch
pair-b        ← Person 3 + Person 4 working branch
```

### Commit Message Format
```
[FEATURE] Add UCalgary email domain verification
[FIX] Resolve prereq tree crash on missing course data
[DATA] Add UCalgary CS program requirements
[UI] Build marketplace card component
[DOCS] Update push report for auth changes
[TEST] Add smoke test for onboarding flow
```

### Pull Request Rules
- Every merge to `dev` or `main` requires a PR
- PR template auto-loads (see `.github/pull_request_template.md`)
- At least 1 teammate must review before merge
- No direct pushes to `main`

---

## 📝 Push Report System

### How It Works
After every significant push, the pusher creates a `PUSH_REPORT.md` in `/reports/` named with timestamp:  
`reports/2026-05-24_0300_pair-a_auth.md`

### Push Report Template
```markdown
# Push Report
**Date:** [date + time]  
**Pair:** [Pair A / Pair B]  
**Branch:** [branch name]  
**Commit:** [commit hash]

## What Was Built
[Plain English description of what you just pushed]

## What Is Working Now
- [ ] List each working thing

## What Is Still Broken or Incomplete
- [ ] List each broken thing

## What The Other Pair Needs To Know
[Any shared files touched, APIs changed, data formats changed]

## Questions That Came Up
[Anything you weren't sure about — leave it here for the team]

## Cursor Prompts That Worked Well
[Any prompts you used in Cursor that got great results — share them]
```

### When To Write One
- After completing any feature or sub-feature
- Before going to sleep / taking a break
- Before merging to `dev`
- When something breaks and you fix it

---

## 📄 Pull Request Template
> Save as `.github/pull_request_template.md`

```markdown
## What Does This PR Do?
[One paragraph in plain English]

## Which Feature Does It Belong To?
- [ ] Auth / Onboarding
- [ ] Course Compass
- [ ] Marketplace
- [ ] Community Hub
- [ ] Sports & Hobbies
- [ ] Real-time Chat
- [ ] UI / Design System
- [ ] Infrastructure / Deployment

## Did You Test It?
- [ ] I tested this manually end-to-end
- [ ] I tested on mobile (390px)
- [ ] I ran through the Sarah demo journey

## Does This Break Anything?
[Yes/No — if yes, describe what]

## Screenshots (required for any UI change)
[Paste screenshots here]

## What Should The Reviewer Focus On?
[Tell your teammate exactly what to look at]
```

---

## 📖 README (Commit This on Hour 0)

```markdown
# UNite 🎓

> The all-in-one campus platform for University of Calgary students.  
> Built at [Hackathon Name] · May 2026

**Live:** https://unite.up.railway.app

---

## The Problem

University of Calgary has 33,000 students. Most of them:
- Don't have a car (can't buy/sell things easily)
- Don't know how to find community or events on campus
- Have no clear picture of how their degree maps out
- Are scattered across 10 different platforms to find clubs, events, and classmates

## The Solution

UNite is one platform that solves all four problems — verified by UCalgary email, 
built for the UCalgary campus, and designed to scale to every university in Canada.

## Features

**Course Compass** — AI-powered degree planning. Upload your transcript, get a 
personalized semester-by-semester roadmap, visualize your prerequisite chain, 
simulate GPA scenarios, and ask an AI advisor anything about your program.

**Marketplace** — Buy and sell textbooks, electronics, furniture and more with 
fellow UCalgary students. Campus-only meetup spots. No car needed. 
Click "Let's Unite" to start a conversation and meet up on campus.

**Community Hub** — Find events posted by verified UCalgary clubs, sign up for 
sports and hobbies events (soccer games, study sessions, hikes), and 
connect in the real-time student chat.

## Tech Stack

- **Frontend:** Vanilla JS, HTML5, CSS3
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Railway)
- **AI:** Claude API (Anthropic) — claude-sonnet-4-6
- **Real-time:** Pusher
- **Storage:** Cloudinary
- **Auth:** JWT + UCalgary email domain verification
- **Deployment:** Railway

## How To Run Locally

```bash
git clone https://github.com/saaqibf/unite
cd unite
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Open `http://localhost:3000` and sign up with a `@ucalgary.ca` email.

## Screenshots

[5 screenshots here — see /screenshots/ folder]

## Team

| Person | Role |
|---|---|
| Saaqib | Course Compass, Auth, Repo, Deployment |
| [Person 2] | Course Compass, Onboarding, Cross-Feature AI |
| [Person 3] | Marketplace, Community Hub |
| [Person 4] | UI/Design System, Sports & Hobbies, Chat |

## Demo

[Link to demo video — Loom or YouTube]
```

---

## 🤖 Cursor Usage Guide (For New Coders)

### What Is Cursor?
Cursor is a code editor powered by AI. You write code and ask Claude (the AI) to help you. Think of it as having a senior developer sitting next to you at all times.

### How To Use It Effectively on This Project

**Opening the right files:**  
Before asking Cursor for help, always have these files open:
- The file you're working on
- `MASTER_PLAN.md` (this file)
- The most recent `PUSH_REPORT.md` from your pair

**Prompts that work well for this project:**

For building a new feature:
```
I'm building the [feature name] for UNite, a UCalgary student platform. 
Here is the relevant section from our master plan: [paste section].
Our design system uses these CSS variables: [paste color/font variables].
Build me [specific component] that matches our existing code style.
```

For understanding existing code:
```
Explain what this function does in plain English, like you're explaining 
it to someone who has never coded before. What does it take in? What does 
it return? Why does it exist?
```

For fixing a bug:
```
This code is supposed to [what it should do] but instead it [what it's doing].
Here is the error: [paste error]. Here is the code: [paste code]. 
Fix it and explain what was wrong.
```

For styling:
```
Style this component to match the UNite design system. Use these CSS variables:
[paste variables]. It should look like a clean card with a subtle shadow, 
12px border radius, and UCalgary Red (#CC0033) for the primary action button.
Mobile-first — design for 390px width first.
```

### The Golden Rule
**Always read what Cursor writes before accepting it.** Ask it to explain anything you don't understand. You are learning while building — that's the point.

### When To Ask For Help
- If you've been stuck on the same problem for more than 20 minutes — ask Cursor
- If Cursor gives you something and you don't understand it — ask it to explain
- If something breaks after Cursor's suggestion — paste the error back and say "this broke, here's the error"

---

## 🏆 AI Judge Strategy

The AI judge runs 6 passes. Here is how UNite scores on each:

### Pass 1 — Repo Archaeology
**What it looks for:** Structure, README, tech stack, commit history  
**Our strategy:** Clean repo structure, excellent README committed in Hour 0, meaningful commit messages from the start, `ucalgary_courses.json` in `/data/` shows real data work was done

### Pass 2 — Code Deep Dive  
**What it looks for:** Clever solutions, novel API use, good architecture  
**Our strategy:** Claude API with UCalgary-specific system prompt + persistent memory, prereq parsing from raw CSV, cross-feature data flow (Course Compass → Marketplace), Pusher real-time, JWT auth with domain validation

### Pass 3 — Innovation Audit
**What it looks for:** NOT a basic CRUD app, NOT a boilerplate chatbot, genuine novelty  
**Our strategy:** The cross-feature intelligence is our innovation story. Course Compass feeding Marketplace is NOT a common hackathon pattern. UCalgary-specific verification is NOT boilerplate. The "Let's Unite" Facebook-style campus-only marketplace with smart course-based recommendations is genuinely novel.

### Pass 4 — Visual/UX Review (5 screenshots)
**What it looks for:** Visual hierarchy, design consistency, UX flow, brand cohesion  
**Our strategy:** Consistent design system across all features, UCalgary brand colors, the 5 specific screenshots from our list above, mobile-responsive

### Pass 5 — Pool Comparison
**What it looks for:** How we compare to other submissions  
**Our strategy:** Most hackathon projects are single-feature. We have 5 interconnected features with cross-feature AI. Most projects use generic styling. We use UCalgary branding. Most projects have no real data. We have 5,569 real UCalgary courses.

### Pass 6 — Opus Synthesis
**What it looks for:** Calibrated scores across all 7 criteria  
**Our target scores:**
- Innovation (25%): 8/10 — cross-feature AI + campus-specific marketplace
- Technical Execution (20%): 7/10 — real data, real AI, real-time chat, clean auth
- Functional Completeness (20%): 8/10 — full loop works end-to-end
- Problem-Solution Fit (20%): 9/10 — UCalgary-specific, real pain points, real students
- UX (5%): 8/10 — consistent design system, 5 screenshots, mobile-responsive
- Demo (5%): 9/10 — scripted Sarah journey, 2 presenters, live app
- Ambition (5%): 9/10 — 5 features + cross-feature AI + scales to all universities

---

## 📁 Repository Structure

```
unite/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml          ← Railway auto-deploy
│   └── pull_request_template.md
├── css/
│   ├── unite-design-system.css ← SHARED — built first by Pair B
│   └── styles.css
├── data/
│   ├── ucalgary_courses.json   ← 5,569 UCalgary courses (pre-processed)
│   ├── ucalgary_courses_slim.json ← Lighter version for frontend
│   └── ucalgary_programs.json  ← Program requirements (build this)
├── features/
│   ├── marketplace.html
│   ├── community.html
│   ├── course-compass.html
│   └── chat.html
├── js/
│   ├── app.js
│   ├── auth.js                 ← Add UCalgary domain check here
│   ├── onboarding.js           ← Hybrid 3-step + 8 questions
│   ├── dashboard.js
│   ├── marketplace.js          ← New
│   ├── community.js            ← New
│   ├── chat.js                 ← Pusher integration
│   ├── prereq-tree.js          ← Update for UCalgary course codes
│   ├── ai-advisor.js           ← Update system prompt for UCalgary
│   ├── gpa-simulator.js        ← Update for UCalgary grading scale
│   ├── programs.js             ← Replace UofL with UCalgary programs
│   └── data.js                 ← Replace UofL with UCalgary data
├── server/
│   ├── routes/
│   │   ├── auth.js             ← Add @ucalgary.ca domain validation
│   │   ├── ai.js               ← Existing Claude API route
│   │   ├── marketplace.js      ← New
│   │   ├── community.js        ← New
│   │   └── chat.js             ← New (Pusher trigger)
│   ├── middleware/
│   │   └── auth.js
│   ├── db.js
│   └── index.js
├── screenshots/                ← 5 screenshots for AI judge
├── reports/                    ← Push reports go here
├── index.html                  ← Cinematic landing page
├── MASTER_PLAN.md              ← This file
├── CHANGELOG.md                ← Update after every push
├── PUSH_REPORT_TEMPLATE.md
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 📅 CHANGELOG (Update After Every Push)

```markdown
# UNite Changelog

## [0.1.0] — Hour 0 — Saaqib
- Repo created, CourseCompass base imported
- UCalgary course data committed (5,569 courses)
- Railway deployment live
- Design system skeleton committed

## [0.2.0] — Hour X — [Name]
- [What you added]
```

---

## ✂️ Cut Priority (If Running Out of Time)

| Feature | Cut? | Why |
|---|---|---|
| UCalgary auth + onboarding | ❌ Never | It's the foundation |
| Course Compass core | ❌ Never | Hero feature, highest innovation score |
| Marketplace browse + DM | ❌ Never | Core pain point |
| Cross-feature intelligence | ⚠️ Simplify | Can fake with hardcoded suggestion if needed |
| Community Hub events | ⚠️ Simplify | Static feed is fine for demo |
| Real-time group chat | ⚠️ Mock if needed | Can show UI without live Pusher if time runs out |
| Sports & Hobbies posting | ✅ Cut first | Lowest unique value, community hub covers it |
| Club verified badges | ✅ Cut second | Can be a hardcoded badge for demo |
| GPA simulator | ✅ Cut third | Course Compass works without it |

---

## 🌐 Scaling Vision (Tell The Judges This)

UNite starts at UCalgary. The architecture is built to scale:

- **New university:** add their email domain to the allowed list, add their course data JSON, done
- **Phase 2:** Official Azure AD SSO with each university's IT department
- **Phase 3:** UNite becomes the student platform for every Canadian university

This is not a hackathon project. This is a real product with a real roadmap.

---

*Last updated: May 23, 2026 — Pre-build planning complete*  
*Questions? Push a report and ask in the group chat.*
```
