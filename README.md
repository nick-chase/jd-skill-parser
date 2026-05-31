# Nat20 — Skill-Based Job Matching, Leveled

A web app that parses job descriptions and resumes to identify skill
gaps, proficiency levels, and decision-readiness for tech roles.

🔗 **[Live App](https://jd-skill-parser.vercel.app)**

> *Nat20 is the working name. Public launch name TBD.*

---

## What It Does

Nat20 answers one question for tech job seekers:

> **Based on how my resume reads today, how well does it match this job description?**

Instead of a vague "match percentage," it shows you the signal clearly across three panels:

- **Technical Match** — skills scored by weighted evidence (L1–L5 proficiency)
- **Behavioral Signals** — soft skills found or missing on your resume
- **What This Role Does** — duties listed as-is, for you to interpret

---

## Current Features

### Parse Job Descriptions
- Extract skills against a 122-skill, Lightcast-aligned dictionary
- Detect proficiency levels (L1–L5, OPM 5-Level Scale)
- Classify importance tiers (Critical / Required / Preferred / Nice-to-have)
- Pull metadata: company, role, location type, job type, salary range

### Parse Resumes
- **PDF upload** (client-side extraction via pdfjs-dist)
- **Text paste** fallback
- Section-aware extraction:
  - Technical Skills section — L2 max
  - Education / coursework — L1–L2 by grade
  - Projects — L2 default
  - Professional Experience — L3+ for tech roles only

### Gap Analysis
- Matched skills (resume meets or exceeds required level)
- Level gaps (skill present but below required level)
- Missing skills (required, not on resume)
- Bonus skills (on resume, not required)
- Match score: Strong (≥70%) / Partial (≥40%) / Weak (<40%)

### Reference Library
- Built-in OPM 5-Level Scale documentation
- Importance tier definitions
- Phrase-to-level detection rules
- Years-of-experience-to-level mapping

---

## How It Works

1. **Parse a JD** — paste any tech job description, get a structured
   skill profile
2. **Parse your resume** — upload PDF or paste text, get your skill
   inventory by section
3. **See the gap** — comparison with priority-ranked results

All parsing is **client-side**. Resumes never leave the browser.

---

## Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS 4 + Inter font
- **PDF parsing:** pdfjs-dist (client-side)
- **Data layer:** JSON registry (`data/skills.json`, `data/roles.json`)
  via `src/lib/registry.js` seam
- **Tests:** Vitest (137 passing)
- **Deployment:** Vercel (auto-deploy from `master`)
- **Classification standards:** OPM 5-Level Scale + Lightcast Skill Taxonomy

---

## Getting Started

```bash
git clone https://github.com/nick-chase/jd-skill-parser.git
cd jd-skill-parser
npm install
npm run dev        # http://localhost:5173
npm test           # run Vitest suite
npm run build      # production build
```

---

## Project Status

**Phase 1 — Foundation** (May–June 2026)

| | Task | Status |
|---|---|---|
| 1 | Registry refactor (constants → JSON) | ✅ |
| 2 | PDF upload + text paste parity | ✅ |
| 3 | 4-tab UI (JD / Resume / Match / Reference) | ✅ |
| 4 | Tailwind v4 migration + Nat20 rebrand | ✅ |
| 5 | Mobile-responsive layout | ✅ |
| 6 | JD test bank (10 real JDs) | ✅ |
| 7 | Vitest test suite | 🔄 |
| 8 | `guardWords` false-positive fix | ⬜ |
| 9 | Expand `skills.json` to 300–500 (Lightcast-aligned) | ⬜ |
| 10 | O*NET API integration for role definitions | ⬜ |
| 11 | Weighted evidence scoring (see `docs/scoring-model.md`) | ⬜ |
| 12 | Entry-level calibration logic | ⬜ |

**Phase 2 — Output Quality** (June–July 2026)
Per-skill action suggestions · evidence transparency · resume rewrite hints · export to PDF/CSV

**Phase 3 — Scale** (July–August 2026)
Skill database 500+ · non-tech domain expansion

---

## Author

[Nicholas Chase](https://github.com/nick-chase) — NJIT MS Artificial Intelligence

---

*Skill classifications are rule-based heuristics, not formal assessments.*
