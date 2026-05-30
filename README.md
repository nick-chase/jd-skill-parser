# Nat20 — Skill-Based Job Matching, Leveled

A web app that parses job descriptions and resumes to identify skill
gaps, proficiency levels, and decision-readiness for tech roles.

🔗 **[Live App](https://jd-skill-parser.vercel.app)**

> *Nat20 is the working name. Public launch name TBD.*

---

## What It Does

Nat20 answers one question for tech job seekers:

> **Am I a competitive candidate for this role right now — and if not,
> what should I do?**

Instead of a vague "match percentage," it produces an actionable
decision based on evidence found in your resume:

- ✅ **Apply Now** — your resume demonstrates the required level
- ✏️ **Apply With Edits** — skills exist but evidence is weak; rewrite hints provided
- 📚 **Build Skill First** — one or more critical skills are absent
- 🔀 **Consider Adjacent Role** — strong match for a related role

*(Decision output UI shipping in Phase 2.)*

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

**Phase 2 — Product Quality** (June–July 2026)
Decision output UI · adjacent role engine · confidence scoring

**Phase 3 — Monetization** (July–August 2026)
Freemium tier · subscription ($12–19/mo) · domain expansion

---

## The Scoring Model

Standard resume parsers match keywords and treat all evidence equally —
a skill listed in a summary weighs the same as a skill used for 3 years
across two jobs.

Nat20 treats skill evidence as a **weighted composite**:

```
Skill Score = SUM(W_type × M_duration) × M_recurrence
```

| Factor | What it captures |
|---|---|
| `W_type` | Type of evidence (job history, project, coursework, etc.) |
| `M_duration` | How long the skill was used in that context |
| `M_recurrence` | How many distinct contexts the skill appears in |

### Evidence Type Weights

| Evidence Type | Weight |
|---|---|
| Full-time job history | 1.0 |
| Contract / internship | 0.7 |
| Personal project | 0.5 |
| Academic / coursework | 0.4 |
| Skills section only | 0.1 |

### Score → Proficiency Level

| Score | Level | Label |
|---|---|---|
| 0.00–0.30 | L1 | Awareness |
| 0.30–0.60 | L2 | Novice |
| 0.60–1.10 | L3 | Intermediate |
| 1.10–1.80 | L4 | Advanced |
| 1.80+ | L5 | Expert |

Full spec with duration modifiers, recurrence multipliers, and worked
examples: [`docs/scoring-model.md`](docs/scoring-model.md)

---

## Author

[Nicholas Chase](https://github.com/nick-chase) — NJIT MS Artificial Intelligence

---

*Skill classifications are rule-based heuristics, not formal assessments.*
