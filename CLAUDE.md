# CLAUDE.md — ResumeMatch

## Product Goal
This app helps students and early-career job seekers decide whether to apply
for a specific role based on how their resume aligns with a target job description.

The end-user question the app answers:
"Am I a competitive candidate for this role RIGHT NOW — and if not, what should I do?"

Final output is a role readiness decision:
  Apply Now | Apply With Edits | Build Skill First | Consider Adjacent Role
Backed by a skills alignment map and a prioritized action list.

---

## Stack
- Frontend: JavaScript / HTML (deployed on Vercel)
- Data: JSON (skill definitions, role maps, scoring rules)
- No backend framework currently; logic runs client-side

---

## Architecture Target

The app is a decision-centric pipeline. Each layer has clear inputs and outputs.
No cross-layer logic mixing.

  1. Ingest Layer      → Resume + JD text cleanup, section detection
  2. Taxonomy Layer    → Skill extraction, normalization, alias resolution
  3. Inference Layer   → Proficiency scoring (see docs/scoring-model.md), importance tier detection
  4. Scoring Layer     → Role readiness score, gap severity map
  5. Guidance Layer    → Decision output (Apply Now / Edits / Build / Redirect)
  6. UX Layer          → User-facing explanations, strengths, weaknesses, next steps

---

## Skill Competency Scoring (CRITICAL — read docs/scoring-model.md)

Proficiency is NOT inferred from keyword presence alone.
Each skill is scored by a weighted composite of evidence found on the resume:

  Skill Score = SUM(W_type × M_duration) × M_recurrence

W_type (evidence type weight):
  Full-time job history  → 1.0
  Contract / internship  → 0.7
  Personal project       → 0.5
  Academic / coursework  → 0.4
  Skills section only    → 0.1

M_duration (duration modifier):
  4+ years   → 1.5 | 2–4 years → 1.3 | 1–2 years → 1.0
  6–12 mo    → 0.8 | < 6 mo    → 0.6 | unknown   → 0.5

M_recurrence (distinct contexts):
  1 context → 1.0 | 2 contexts → 1.2 | 3+ contexts → 1.4

Score → Level:
  0.00–0.30 = L1 Awareness
  0.30–0.60 = L2 Novice
  0.60–1.10 = L3 Intermediate
  1.10–1.80 = L4 Advanced
  1.80+     = L5 Expert

Full spec: docs/scoring-model.md

---

## Proficiency Scale (OPM-inspired, app-level)
L1 Awareness | L2 Novice | L3 Intermediate | L4 Advanced | L5 Expert

## Importance Tiers (inferred from JD)
Critical > Required > Preferred > Nice-to-Have

---

## Data Sources Target
- Lightcast Open Skills Taxonomy: canonical skill IDs, aliases, categories (free download)
- O*NET Web Services API: role profiles, required skills per occupation (free, no auth)
- BLS Occupational Outlook: growth projections, education requirements (free public data)

---

## Current Known Issues
- Skills.json has 122 skills — coverage gaps confirmed (JD2, JD7 return 0 skills)
- Role database has 10 hardcoded templates — needs O*NET-backed expansion to 20–30 roles
- Inference layer uses phrase signals only — weighted evidence scoring not yet implemented
- No resume test bank yet (only JD test bank exists)
- jobType detection bug for internship/contract JDs (Bug #2)

---

## Working Rules
- Explore before editing. Read relevant files first.
- Propose a plan with affected files and risks before making changes.
- Scope each task to ONE layer at a time.
- Write characterization tests before refactoring existing logic.
- Run verification (npm run test:jd) after every change.
- Do not add new dependencies without asking.
- Do not mix inference logic with UX display logic.
- Prefer clarity over cleverness in scoring and rule logic.
- Flag any hardcoded skill or role data encountered — it belongs in /data.
- Never raise a skill's proficiency level through phrase signals alone
  without structural evidence (job history or project) to support it.

---

## Definition of Done (per task)
- Change is scoped to one layer
- Behavior unchanged unless explicitly requested
- Tests cover the changed logic
- npm run test:jd passes
- CLAUDE.md and/or docs/ updated if architecture changed
- No new hardcoded skill/role data

---

## Key Files
- data/skills.json          ← skill taxonomy (expand to 300–500)
- data/roles.json           ← role templates (expand to 20–30 via O*NET)
- src/lib/registry.js       ← single access point for skill/role data
- src/jd-skill-parser.jsx   ← main parser (rewired to registry)
- tests/jd_test_bank/       ← 10 real JDs
- tests/coverage-gaps.md    ← auto-generated gap report (run: npm run test:jd)
- docs/scoring-model.md     ← weighted evidence scoring spec
- docs/architecture.md      ← overall system design

---

## Phase Roadmap (Current: Phase 1)

Phase 1 — Foundation (May–June 2026)
  ✅ 1. Registry refactor (SKILL_DICTIONARY → JSON)
  ✅ 2. Test bank — 10 real JDs
  🔄 3. Coverage gap report generation
  ⬜ 4. Expand skills.json to 300–500 (Technology domain)
  ⬜ 5. O*NET API integration for role definitions
  ⬜ 6. Expand roles.json to 20–30 Technology roles
  ⬜ 7. Resume test bank (10 real resumes)
  ⬜ 8. Implement weighted evidence scoring (docs/scoring-model.md)
  ⬜ 9. Entry-level calibration logic
  ⬜ 10. End-to-end evaluation: JD + resume → decision output

Phase 2 — Product Quality (June–July 2026)
  Decision output UI | Gap suggestions | Resume rewrite hints
  Adjacent role engine | Confidence scoring | Freemium cap logic

Phase 3 — Monetization (July–August 2026)
  Free tier (3/day) | Monthly sub | One-time pack | Usage analytics

---

## When Stuck — Run This Check
1. Open tests/coverage-gaps.md — what is the top unmatched term? Add it to skills.json.
2. Check the Phase Roadmap above — what is the next ⬜ task in Phase 1?
3. Run npm run test:jd — are all tests still passing?
4. Check known issues — is the 0-skills bug (JD2, JD7) fixed yet?

If none are clear, stop and plan before coding.

