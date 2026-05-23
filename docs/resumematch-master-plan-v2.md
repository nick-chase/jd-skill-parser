# ResumeMatch — Master Product & Engineering Plan v2

---

## What This App Is

A role readiness engine for students and early-career job seekers.

It answers one question: **"Am I a competitive candidate for this role right now — and if not, what should I do?"**

The output is a decision, not a number:
- **Apply Now** — resume demonstrates the required level for Critical and Required skills
- **Apply With Edits** — skills exist but evidence language is weak; resume rewrites help
- **Build Skill First** — one or more Critical skills are absent or underdeveloped
- **Consider Adjacent Role** — strong match for a related role; redirected suggestion offered

---

## The One Problem We Cannot Control (and Must Design Around)

The app cannot verify whether the resume accurately reflects the user's real skills.
A user may know Python deeply but have described it weakly on their resume.
A user may have listed "expert in React" with no supporting evidence.

**This is intentional scope.** The app evaluates the resume as a document, not the person.
The output is: *"Based on how your resume reads, here is how you match this role."*

This is honest, useful, and actionable — because resume language IS controllable,
and that is exactly what the app helps fix.

The app's credibility depends entirely on: **the underlying skill and role data must be industry-accurate.**

---

## The Two Core Data Problems

### Problem 1 — Industry-Level Role Database

**Current state:** 10 hardcoded role templates in `data/roles.json`
**Required state:** Role definitions backed by real occupational data

What a solid role database looks like:
- Mapped to O*NET occupation codes (e.g., 15-1252 = Software Developer)
- Skill requirements derived from real employer postings, not assumptions
- Separated into Critical / Required / Preferred / Nice-to-Have tiers
- Covers seniority signals: entry-level vs mid-level vs senior language
- Includes education, certification, and credential signals per role
- Refreshable — roles evolve, new roles emerge

**Data sources:**
| Source | What It Provides | Cost |
|--------|-----------------|------|
| O*NET Web Services API | 900+ occupation profiles, skills, tasks, education | Free, no auth |
| Lightcast Open Skills | 34,000+ skills mapped to job postings | Free taxonomy download |
| BLS Occupational Outlook | Growth projections, wage data, education requirements | Free public data |

**Phase 1 target:** 20–30 Technology domain roles

---

### Problem 2 — Industry-Level Skill Database

**Current state:** 122 hardcoded skills — confirmed coverage gaps
**Required state:** 300–500 skills, Lightcast-aligned, with aliases and guard words
**Confirmed gaps (from test bank):** UAT, SWIFT, dbt, Informatica, Talend, ETL tooling, Ansible, Monitoring, Big Data, Prompt Engineering, Xcode

---

## Skill Competency Scoring Model

> Full spec: docs/scoring-model.md

### The Core Insight

Skill evidence on a resume comes in three types with fundamentally different weight:

| Evidence Type | What It Tells You | Reliability |
|---|---|---|
| Job history with duration | Sustained, repeated use over time | High |
| One-off project | Applied once, possibly under guidance | Medium |
| Listed / summary mention | Claimed but unsupported | Low |

### The Formula

For each skill, collect all evidence instances and compute:

  Skill Score = SUM(W_type × M_duration) × M_recurrence

**Evidence Type Weight (W_type)**

| Evidence Type | Weight |
|---|---|
| Job history (full-time) | 1.0 |
| Contract / internship | 0.7 |
| Personal project | 0.5 |
| Academic / coursework | 0.4 |
| Skills section only | 0.1 |

**Duration Modifier (M_duration)**

| Duration | Job History | Project |
|---|---|---|
| Not stated | 0.5 | 0.4 |
| < 6 months | 0.6 | 0.5 |
| 6–12 months | 0.8 | 0.6 |
| 1–2 years | 1.0 | 0.7 |
| 2–4 years | 1.3 | — |
| 4+ years | 1.5 | — |

**Recurrence Multiplier (M_recurrence)**

| Distinct Contexts | Multiplier |
|---|---|
| 1 | 1.0 |
| 2 | 1.2 |
| 3+ | 1.4 |

**Score → Level**

| Score | Level | Label |
|---|---|---|
| 0.00–0.30 | L1 | Awareness |
| 0.30–0.60 | L2 | Novice |
| 0.60–1.10 | L3 | Intermediate |
| 1.10–1.80 | L4 | Advanced |
| 1.80+ | L5 | Expert |

### Why This Matters for Students

Two resumes, both list Python:
- **Resume A:** Python in skills section only → Score 0.05 → L1 — app says "add evidence"
- **Resume B:** Python in 2-year internship + 3 projects → Score 1.27 → L4 — app says "strong, apply"

Resume A user should NOT apply for Python-required roles without more work.
Resume B user probably should.
Current parser cannot tell them apart. This model fixes that.

### The One-Off Project Problem

A project with no stated duration is treated as **exposure, not proficiency** unless:
- Duration is stated ("3-month capstone")
- Outcome is quantified ("built app with 500 users")
- Team context exists ("led 4-person team")

App communicates uncertainty: *"Add duration and outcomes to strengthen this signal."*

---

## Resume Assessment Quality Standard

Results must be **solid and believable** for students and entry-level users.

### What makes a result believable

1. Proficiency inferred from evidence weight, not keyword presence
2. Section context matters — Education implies coursework (L1–L2); Experience implies application
3. Duration and recurrence raise scores — one mention ≠ three years
4. Missing skills distinguished from hidden skills — "not on resume" ≠ "doesn't have it"
5. Entry-level calibration — compare against entry-level JD expectations, not senior requirements

### Acceptance Criteria for Phase 2 Completion

The app meets its quality bar when:
1. A real student resume vs a real entry-level JD produces a result a career counselor considers fair
2. Gap list identifies skills the student actually lacks (not false negatives)
3. Strength list reflects skills actually evidenced (not false positives)
4. Decision output (Apply Now / Edits / Build / Redirect) is defensible
5. A user who acts on suggestions improves their match score measurably
6. Results pass review by someone with real hiring experience in the role family

---

## Architecture Target

```
/domains
  /technology
    roles.json                ← O*NET-mapped, 20–30 roles
    skills.json               ← Lightcast-aligned, 300–500 skills
    importance-rules.json
    proficiency-signals.json
    fixtures/
  /data-analytics             ← Phase 2
  /healthcare                 ← Phase 3

/core
  ingest.js                   ← text cleanup, section detection
  normalize.js                ← skill extraction, alias resolution
  inference.js                ← weighted evidence scoring (scoring-model.md)
  scoring.js                  ← role readiness score + gap map
  guidance.js                 ← decision output + action list
  output.js                   ← UI-ready result formatting

/tests
  /jd_test_bank               ← 10 real JDs ✅
  /resume_test_bank           ← 10 real resumes ⬜
  /expected
  coverage-gaps.md            ← auto-generated ✅
  run-tests.js

/docs
  scoring-model.md            ← weighted evidence formula spec ✅
  architecture.md
  taxonomy-plan.md
```

---

## Phase Roadmap

### Phase 1 — Foundation (May–June 2026)

| # | Task | Status |
|---|------|--------|
| 1 | Registry refactor (SKILL_DICTIONARY → JSON) | ✅ Done |
| 2 | Test bank — 10 real JDs | ✅ Done |
| 3 | Coverage gap report generation | 🔄 In Progress |
| 4 | Expand skills.json to 300–500 (Technology) | ⬜ Next |
| 5 | O*NET API integration for role definitions | ⬜ |
| 6 | Expand roles.json to 20–30 Technology roles | ⬜ |
| 7 | Resume test bank (10 real resumes) | ⬜ |
| 8 | Implement weighted evidence scoring (scoring-model.md) | ⬜ |
| 9 | Entry-level calibration logic | ⬜ |
| 10 | End-to-end evaluation: JD + resume → decision output | ⬜ |

### Phase 2 — Product Quality (June–July 2026)
Decision output UI | Gap suggestions | Resume rewrite hints
Adjacent role engine | Confidence scoring | Freemium cap logic

### Phase 3 — Monetization (July–August 2026)
Free tier (3/day) | Monthly sub ($12–19/mo) | One-time pack ($19–29)
Usage analytics | Domain expansion (Data Analytics)

---

## Rules for Claude Code Sessions

Every session must state:
- Which Phase Roadmap task number you are working on
- What files will be touched
- Definition of done
- Verification step (always includes: npm run test:jd)

**"Improve the app" is not a task.**
"Implement parseDateRange() in core/inference.js per scoring-model.md" is a task.

---

## Current Known Bugs

| # | Bug | Priority |
|---|-----|----------|
| 1 | JD2 + JD7 return 0 skills — vocabulary gaps | High |
| 2 | jobType detection fails for internship/contract | Medium |
| 3 | Java suppressed when JavaScript present — expected, document it | Low |
| 4 | JD10 jobType returns null — no explicit "Full-time" text | Low |

---

## When Stuck in Claude Code

1. Open tests/coverage-gaps.md — add the top unmatched term to skills.json
2. Check Phase Roadmap — what is the next ⬜ task in Phase 1?
3. Run npm run test:jd — confirm nothing is broken
4. Check bug table — is Bug #1 fixed yet?

If none are clear, stop and plan before coding.

