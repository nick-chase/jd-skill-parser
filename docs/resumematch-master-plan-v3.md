# ResumeMatch — Master Product & Engineering Plan v3

> Supersedes v2. Core pivot: three-signal extraction, no role inference.
> Synced with CLAUDE.md. Updated: May 2026

---

## What This App Is

A **document comparison engine** for students and entry-level job seekers.

It answers one question:
**"Based on how my resume reads today, how well does it match this job description?"**

The output is three clear panels of signal. The user reads them and decides.
The app does not decide for them.

---

## The Core Design Principle

> **Extract only what the documents say. Never assume what they mean.**

The JD is a unique document written by one employer for one role.
It is not a template. It is not a role profile. It says what it says.
The parser reads it and reports it — nothing more.

The resume is a document. The app evaluates its evidence, not the person behind it.
A weak resume description of a strong skill is still a weak signal — and that is useful information.

---

## What the App Does NOT Do

| ❌ Not doing | Why |
|---|---|
| Infer a role type from the JD | JDs don't map cleanly to roles |
| Apply role templates to parsing | Templates encode assumptions the JD didn't make |
| Output Apply Now / Build Skill / Consider Adjacent Role | User has context the app cannot access |
| Score behavioral signals L1–L5 | Soft skills can't be reliably proficiency-scored from resume text |
| Rank or compare multiple JDs | Out of scope |
| Evaluate company fit or culture | Out of scope |

---

## The One Problem We Cannot Control

The app cannot verify whether the resume accurately reflects the person's real skills.
Someone may know Python deeply but have described it weakly on their resume.

**This is intentional scope.** The app evaluates the resume as a document, not the person.
The output is: *"Based on how your resume reads, here is how it matches this JD."*

This is honest and actionable — because resume language is controllable,
and that is exactly what the app helps the user improve.

---

## Three Signal Types

Both parsers share the same vocabulary sources.
The extraction method differs between JD and resume. The buckets are the same.

### Signal 1 — Technical Signals
What: skills, tools, technologies, methodologies
Examples: Python, SQL, Git, React, Docker, Agile, TDD, REST APIs
Vocabulary source: `data/skills.json`
JD side: extract + capture requirement tier if stated
Resume side: extract + score L1–L5 via weighted evidence formula
Matched: Yes — this is the primary scored matching surface

### Signal 2 — Behavioral Signals
What: soft skills, work traits, interpersonal behaviors
Examples: communication, teamwork, attention to detail, problem-solving, leadership
Vocabulary source: `data/soft-skills.json` (does not exist yet — Phase 1 task 4)
JD side: extract — note if stated as required
Resume side: detect presence or absence only
Matched: Present / Absent — no L1–L5 scoring, ever

### Signal 3 — Job Duties
What: what the role actually does day-to-day
Examples: "develop backend microservices", "write technical documentation",
          "participate in code reviews", "manage inventory systems"
Vocabulary source: none — extracted as free text from the JD only
Resume side: not extracted, not matched
Matched: NOT matched. Displayed as-is for the user to read and interpret.

---

## Output Format

```
TECHNICAL MATCH
  ✓ Python     — resume: L3 (internship + 2 projects) | JD: Required
  ✓ SQL        — resume: L2 (coursework only)         | JD: Required
  ✗ Docker     — not on resume                        | JD: Required
  ✗ React      — not on resume                        | JD: Preferred

BEHAVIORAL SIGNALS
  ✓ Teamwork             — found on resume
  ✓ Communication        — found on resume
  — Attention to detail  — not found on resume

WHAT THIS ROLE DOES  (read and decide for yourself)
  • Design and develop backend microservices
  • Participate in Agile sprint planning and code reviews
  • Write technical documentation
  • Collaborate with frontend and data teams
```

No verdict. No color-coded decision. The signal is the output.

---

## Technical Signal Scoring (applies to resume side only)

Proficiency is scored by weighted evidence, not keyword presence.
Full spec: `docs/scoring-model.md`

```
Skill Score = SUM(W_type × M_duration) × M_recurrence
```

**Evidence Type Weight (W_type)**

| Evidence Type | Weight | Detection |
|---|---|---|
| Full-time job history | 1.0 | Role + employer + date range in Experience |
| Contract / internship | 0.7 | "intern", "contract", "co-op" in role title |
| Personal project | 0.5 | Projects section, no employer |
| Academic / coursework | 0.4 | Education section or coursework mention |
| Skills section only | 0.1 | Mentioned in Skills/Summary, no other context |

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

**Score → Proficiency Level**

| Score | Level | Label |
|---|---|---|
| 0.00–0.30 | L1 | Awareness |
| 0.30–0.60 | L2 | Novice |
| 0.60–1.10 | L3 | Intermediate |
| 1.10–1.80 | L4 | Advanced |
| 1.80+ | L5 | Expert |

**Phrase Signals (small additive modifier)**

| Pattern | Boost |
|---|---|
| "led", "architected", "owned", "designed" | +0.2 |
| "built", "developed", "implemented" | +0.1 |
| "used", "worked with", "applied" | +0.0 |
| "familiar with", "exposure to", "introductory" | −0.1 |
| "basic", "some knowledge of" | −0.1 |

Phrase boosts cannot raise a score past the next level threshold without
structural evidence (job history or project) to support it.

---

## JD Requirement Tier Detection

Only assign a tier if the JD explicitly signals it:

| Signal Words | Tier |
|---|---|
| "required", "must have", "mandatory", "essential" | Required |
| "preferred", "nice to have", "bonus", "a plus" | Preferred |
| "familiarity", "exposure to", "knowledge of" | Nice-to-Have |
| No signal found | Stated (no tier) |

If the JD has no section headers distinguishing required from preferred,
all extracted signals are "Stated." The app does not guess.

---

## Gap Analysis Logic

For each Technical Signal the JD mentions:

| Status | Condition |
|---|---|
| Strong Match | Resume has skill at L3+ or score meets JD proficiency signal |
| Weak Match | Resume has skill at L1–L2, or skills-section-only evidence |
| Missing | In JD, not found on resume |
| Bonus | On resume, not mentioned in JD |

For each Behavioral Signal the JD mentions:

| Status | Condition |
|---|---|
| Found | Detected anywhere on resume |
| Not Found | Not detected on resume |

Job Duties: no comparison. Display panel only.

**Summary line (informational):**
> "Your resume demonstrates {n} of {total} technical skills this JD mentions.
> {n} are well-supported. {n} have thin evidence. {n} are not on your resume."

---

## Data Files

| File | Purpose | Status |
|---|---|---|
| `data/skills.json` | Technical Signal vocabulary — skills, tools, technologies, methodologies with aliases and guard words | 122 entries — expand to 300–500 |
| `data/soft-skills.json` | Behavioral Signal vocabulary — soft skills and work traits with aliases | Does not exist — create in Phase 1 |
| `data/roles.json` | Role reference panel only — never used in inference or scoring | Exists — demote to reference |

**Hard rule: `roles.json` must never be read by any parser, scoring, or gap function.**
It may only be accessed by an optional UI reference panel the user explicitly opens.

---

## Architecture

```
/data
  skills.json          ← Technical Signal vocabulary (expand to 300–500)
  soft-skills.json     ← Behavioral Signal vocabulary (create: 50–100 terms)
  roles.json           ← reference panel only — not wired to parsers

/src/lib
  registry.js          ← single data access point
                          exports: getSkills(), getSoftSkills(), getRoles()
                          roles only served to UI reference panel

/src
  jd-skill-parser.jsx  ← main parser
                          JD: extracts Technical + Behavioral + Duties (3 buckets)
                          Resume: extracts Technical (scored) + Behavioral (present/absent)

/tests
  /jd_test_bank        ← 10 real JDs ✅
  /resume_test_bank    ← 10 real resumes ⬜
  /unit
    registry.test.js   ← 24 unit tests ✅
  /integration
    parser.test.js     ← 29 integration tests ✅
  coverage-gaps.md     ← auto-generated gap report ⬜

/docs
  scoring-model.md     ← weighted evidence formula ✅
  architecture.md      ← system design
```

**Current test baseline: 54 tests passing. Every change must keep this green.**

---

## Phase Roadmap

### Phase 1 — Foundation (May–June 2026)

| # | Task | Status |
|---|---|---|
| 1 | Registry refactor — skills.json, roles.json, registry.js | ✅ Done |
| 2 | JD test bank — 10 real JDs | ✅ Done |
| 3 | Vitest suite — 54 tests passing | ✅ Done |
| 4 | Create data/soft-skills.json (50–100 behavioral terms + aliases) | ⬜ Next |
| 5 | Add getSoftSkills() to registry.js + tests | ⬜ |
| 6 | Update JD parser — extract all 3 signal types | ⬜ |
| 7 | Update resume parser — Technical scored + Behavioral present/absent | ⬜ |
| 8 | Update gap output — 3-panel display | ⬜ |
| 9 | Remove role-template inference from JD parser (Bug #5) | ⬜ |
| 10 | Expand skills.json to 300–500 entries (fixes JD2 + JD7 zero-skills bug) | ⬜ |
| 11 | Resume test bank — 10 real resumes | ⬜ |
| 12 | Implement weighted evidence scoring in inference layer | ⬜ |
| 13 | End-to-end: real JD + real resume → 3-panel output | ⬜ |

### Phase 2 — Output Quality (June–July 2026)

Per-skill suggestion text ("add duration to strengthen this signal")
Evidence transparency — show user why a skill scored L2 not L3
Resume rewrite hints per weak or missing signal
Export gap as PDF or CSV
Shareable result links

### Phase 3 — Scale (July–August 2026)

Skill database 500+ entries
Non-tech domain expansion (Data Analytics, Finance)
Freemium usage cap (3 comparisons/day free)
Monthly subscription tier
Usage analytics

---

## Known Bugs

| # | Bug | Priority |
|---|---|---|
| 1 | JD2 + JD7 return 0 skills — vocabulary gaps in skills.json | High |
| 2 | jobType detection fails for internship/contract JDs | ✅ Fixed (commit 395be96) |
| 3 | Java suppressed when JavaScript present — expected, document it | Low |
| 4 | JD10 jobType returns null — no explicit "Full-time" text | Low |
| 5 | Role template match fires on JD parse — remove this logic | High |

---

## Rules for Every Dev Session

Before writing a line of code, state:
- Which Phase 1 task number you are working on
- Which files will be touched
- Definition of done
- Verification step (always: `npm test` — all 54+ tests must pass)

**"Improve the parser" is not a task.**
**"Create data/soft-skills.json with 50 behavioral terms and wire it into registry.js" is a task.**

The parser reads documents and reports signal.
The user reads the signal and makes the decision.
