# Nat20 — Close the Gap Between Your Work and Your Resume

A web app that reads your resume the way a hiring system does — surfacing the
gaps between what you've done and what your resume says you've done, for both
early-career and experienced job seekers.

🔗 **[Live App](https://www.nat20app.com)**
📦 **[Source](https://github.com/nick-chase/jd-skill-parser)**

> *Nat20 is the working name. Public launch name TBD.*

---

## What It Does

Nat20 answers one question for anyone targeting a specific job:

> **Based on how my resume reads today, how well does it match this job description?**

For early-career users — students, bootcamp grads, new grads — that usually means
turning a skills list into evidence-backed bullets. For experienced professionals
and career changers, it usually means reframing existing work so the resume
reflects what was actually done. Same parser, different gap.

Instead of a vague "match percentage," it shows the signal clearly across three panels:

- **Technical Match** — skills scored by weighted evidence (L1–L5 proficiency)
- **Behavioral Signals** — soft skills found or missing on the resume, unscored
- **What This Role Does** — duties listed as free text, for the user to interpret

The parser reads the document. It does not decide whether the user is qualified
or what role they "should" be in — it reports what the resume and JD say, and lets
the user act on the gap.

---

## Product Tiers

Nat20 ships as two tiers, gated by output depth, not by call rate:

### Lite (free)
- Anonymous — no account, no server-side write
- Unlimited parses
- Top 5 skills by experience, with an "of N detected" teaser
- Closest matched skill gap, missing behavioral signals, cert/degree gap flagged
  as existence-only
- Match score shown

### Pro (paid)
- Google OAuth account required
- Full skill list with per-skill detail
- Per-bullet fast-fix suggestions
- Affiliate learning resources
- PDF resume upload, resume save/load

---

## Current Features

### Parse Job Descriptions
- Extract skills against a Lightcast-aligned skill dictionary
- Detect proficiency levels (L1–L5, aligned to the OPM 5-Level Scale)
- Classify importance tiers (Critical / Required / Preferred / Nice-to-have)
- Pull metadata: company, role, location type, job type, salary range

### Parse Resumes
- **PDF upload** (client-side extraction via pdfjs-dist)
- **Text paste** fallback
- Section-aware extraction across Technical Skills, Education/Coursework,
  Projects, and Professional Experience

### Skill Scoring
- Weighted composite scoring per skill: evidence type × Bloom-verb complexity ×
  duration × recurrence, plus a bounded phrase boost
- Grounded in published frameworks rather than intuitive weights — OPM's 5-level
  competency scale, the Dreyfus model of skill acquisition, and Bloom's revised
  taxonomy for action-verb complexity
- Every assigned level carries a confidence indicator (High / Medium / Low)

### Gap Analysis
- Matched skills (resume meets or exceeds required level)
- Level gaps (skill present but below required level)
- Missing skills (required, not on resume)
- Bonus skills (on resume, not required)
- Match score: Strong (≥85) / Partial (≥60) / Weak (<60)

### Accounts & Payments (Pro tier)
- Google OAuth via Supabase Auth
- Stripe Checkout for subscription signup, Stripe Customer Portal for
  self-service plan management and cancellation
- Supabase Postgres (Row-Level Security) for resume profile persistence

---

## How It Works

1. **Parse a JD** — paste any tech job description, get a structured skill profile
2. **Parse a resume** — upload PDF or paste text, get a skill inventory by section
3. **See the gap** — a three-panel comparison, priority-ranked

All parsing runs **client-side**. Resumes never leave the browser on the free tier.

---

## Tech Stack

- **Frontend:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **PDF parsing:** pdfjs-dist (client-side)
- **Auth:** Supabase Auth (Google OAuth)
- **Database:** Supabase Postgres + Row-Level Security
- **Serverless functions:** Supabase Edge Functions (checkout, webhook, billing portal)
- **Payments:** Stripe Checkout + Customer Portal
- **Data layer:** JSON registry (`data/skills.json`, `data/soft-skills.json`,
  `data/roles.json`) via a `registry.js` seam
- **Tests:** Vitest
- **Analytics:** Plausible (future - no current users)
- **Deployment:** Vercel (auto-deploy from `master`)
- **Classification standards:** OPM 5-Level Scale, Dreyfus skill-acquisition
  model, Bloom's revised taxonomy, Lightcast skill taxonomy


## Project Status

**Phase E — Publish-Ready** (current)

Phases A–D (foundation, gap engine, accounts & persistence, payment
infrastructure) are complete. Remaining work before public promotion:

| Task | Status |
|---|---|
| Weighted evidence scoring (Bloom / Dreyfus / OPM-grounded) | ✅ |
| Two-tier model — Lite (free) / Pro (paid) | ✅ |
| Google OAuth + Stripe subscription billing | ✅ |
| Accuracy gate — ≥85% exact+adjacent agreement on a hand-labeled fixture set | 🔄 |
| Lite-tier parser + copy pass | 🔄 |
| Vitest suite covering parser, inference, and decision modules | 🔄 |
| Public promotion (NJIT → Reddit → LinkedIn → Product Hunt) | ⬜ |

**Current state:** in active development, pre-launch. No public users yet, and
no social media or marketing exposure to date. This project is a personal
exercise in using agentic AI to drive the full development lifecycle of a
product, end to end.

**Next phase — Publish + Promote:** ship the Lite tier live, post across all
launch channels, target ~100 unique visitors in the first week. A paid
conversion is a stretch outcome, not the bar.

---

## Author

[Nicholas Chase](https://github.com/nick-chase) — NJIT M.S. Artificial Intelligence
