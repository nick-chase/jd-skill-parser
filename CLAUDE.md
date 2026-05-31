# CLAUDE.md — ResumeMatch

## Two-Repo Workflow

**Claude Code: read this section in full at the start of every session.
The repo split is enforced by a pre-commit hook — bypassing it is
never acceptable.**

This project uses two repos:

- **Public:** `jd-skill-parser` (this repo) — code, tests, public docs, sample data
- **Private:** `../nat20-private/` — master plan, research, scoring weights, strategy

### Rules

- Never add private filenames to this repo. The pre-commit hook enforces this.
- Pricing, monetization strategy, and launch plans live in `nat20-private` only.
- `data/skills.json` and `data/soft-skills.json` are public and contain the
  launch-ready dataset. If a private extended dataset is ever introduced, it
  will live in `nat20-private/data/` and merge at build time — but this does
  not exist today. Treat the public files as the source of truth.
- `docs/scoring-model.md` has been moved to `nat20-private/docs/`. Do not
  recreate it here.

### Hook installation (required on each fresh clone)

The pre-commit hook lives in `.git/hooks/pre-commit` which is NOT
tracked by git. After cloning this repo, the hook will be missing
and commits will be unprotected.

To install: copy `.git/hooks/pre-commit` from a working clone, or
recreate it from `docs/pre-commit-template.md` (a reference copy
kept in this repo for that purpose).

After installing:

    chmod +x .git/hooks/pre-commit

Verify with:

    bash -n .git/hooks/pre-commit    # syntax check
    bash scripts/verify-gitignore.sh # full validation

### Adding a new private file

1. Create it in `../nat20-private/`
2. Add its pattern to `.gitignore` in this repo
3. Add the same pattern to `.git/hooks/pre-commit` BANNED_PATTERNS
4. Run `bash scripts/verify-gitignore.sh` to confirm

### Moving a file from private to public

Sometimes a doc starts private and is later cleared for public release
(e.g., the README, a public architecture doc).

To move private → public:
1. Copy (don't move) the file from `../nat20-private/` to this repo
2. Verify it contains no pricing, strategy, or operational content
3. Verify the pre-commit hook does NOT match its filename pattern
4. Commit to the public repo
5. After confirming the public commit, delete from the private repo
   and commit the deletion there

Never move a file between repos in a single step. Always: copy →
verify → commit public → then delete private.

---

## Product Goal

This app helps students and entry-level job seekers quickly assess how well
their resume matches a specific job description — and decide what to do next.

The one question the app answers:
**"Based on how my resume reads today, how well does it match this JD?"**

The user decides what to do. The app shows them the signal clearly.
The app does NOT make the decision for them.

---

## What Changed in v3 (read before touching any parser logic)

The app no longer uses role templates for inference.
The app no longer assigns a "role type" to a job description.
The app no longer outputs Apply Now / Build Skill / Consider Adjacent Role.

**Why:** Job descriptions are unique documents. Mapping them to a hardcoded role
template adds noise. The parser's job is to read what the JD says and report it.
The user provides all context about themselves and the company.

**What replaced it:** Three signal types extracted from both documents.
See "Three Signal Types" below.

---

## Stack

- Frontend: React + Vite + Tailwind CSS (deployed on Vercel)
- Data: JSON files in /data — single source for both parsers
- No backend; all logic runs client-side
- Test runner: Vitest (122 tests passing as of 2026-05-26)

---

## Three Signal Types

Every signal extracted from a JD or resume belongs to one of three buckets.
Both parsers use the same vocabulary source. The extraction method differs.

### 1. Technical Signals
**What:** Skills, tools, technologies, methodologies
**Examples:** Python, SQL, Git, React, Docker, Agile, TDD, REST APIs
**Source file:** data/skills.json
**Matched:** Yes — scored L1–L5 on resume side; requirement tier on JD side
**This is the primary matching surface.**

### 2. Behavioral Signals
**What:** Soft skills, work traits, interpersonal behaviors
**Examples:** communication, teamwork, attention to detail, problem-solving, leadership
**Source file:** data/soft-skills.json
**Matched:** Present / Absent only — no L1–L5 scoring
**Show as a simple checklist panel, not a scored gap.**

### 3. Job Duties
**What:** What the role actually does day-to-day
**Examples:** "develop backend microservices", "write technical documentation",
             "participate in code reviews", "manage inventory systems"
**Source file:** None — extracted as free text from JD only
**Matched:** NOT matched against resume. Displayed as-is for the user to read.
**The user interprets duties. The app does not score them.**

---

## Output Format (what the user sees)

```
TECHNICAL MATCH
  ✓ Python     — resume: L3 (internship + 2 projects)
  ✓ SQL        — resume: L2 (coursework only) | JD asks for: Required
  ✗ Docker     — not on resume | JD asks for: Required
  ✗ React      — not on resume | JD asks for: Preferred

BEHAVIORAL SIGNALS
  ✓ Teamwork        — found on resume
  ✓ Communication   — found on resume
  — Attention to detail — not found on resume

WHAT THIS ROLE DOES  (read and decide)
  • Design and develop backend microservices
  • Participate in Agile sprint planning and code reviews
  • Write technical documentation
  • Collaborate with frontend and data teams
```

The user reads this and decides: apply now, rewrite resume, or build a skill.

---

## Technical Signal Scoring (unchanged from v2 — see docs/scoring-model.md)

Proficiency is scored by weighted evidence on the resume, not keyword presence.

  Skill Score = SUM(W_type × M_duration) × M_recurrence

W_type:
  Full-time job history  → 1.0
  Contract / internship  → 0.7
  Personal project       → 0.5
  Academic / coursework  → 0.4
  Skills section only    → 0.1

M_duration:
  4+ years → 1.5 | 2–4 years → 1.3 | 1–2 years → 1.0
  6–12 mo  → 0.8 | < 6 mo    → 0.6 | unknown   → 0.5

M_recurrence:
  1 context → 1.0 | 2 contexts → 1.2 | 3+ contexts → 1.4

Score → Level:
  0.00–0.30 = L1 Awareness
  0.30–0.60 = L2 Novice
  0.60–1.10 = L3 Intermediate
  1.10–1.80 = L4 Advanced
  1.80+     = L5 Expert

Full spec: docs/scoring-model.md
Behavioral signals use this scoring: NEVER. Present/absent only.

---

## JD Requirement Tiers (extracted from section context)

Only assign a tier if the JD explicitly signals it:
  "required", "must have", "essential"     → Required
  "preferred", "nice to have", "a plus"    → Preferred
  "familiarity", "exposure to"             → Nice-to-Have
  No signal found                          → Stated (no tier assigned)

Do NOT default all skills to "Required" when no section headers exist.
Do NOT infer a role type from the job title or skill set.

---

## Architecture (updated)

  1. Ingest Layer    → text cleanup, section detection (JD + resume)
  2. Taxonomy Layer  → extract Technical Signals (skills.json)
                       extract Behavioral Signals (soft-skills.json)
                       extract Job Duties (free text, JD only)
  3. Inference Layer → weighted evidence scoring for Technical Signals (resume only)
                       present/absent detection for Behavioral Signals
  4. Gap Layer       → compare JD signals vs resume signals per bucket
  5. Display Layer   → render three-panel output (Technical / Behavioral / Duties)

No role readiness score. No guidance layer. No decision output.
The gap map IS the output.

---

## Data Files

| File | Purpose | Status |
|---|---|---|
| data/skills.json | Technical Signal vocabulary — skills, tools, technologies, methodologies | 122 entries — expand to 300–500 |
| data/soft-skills.json | Behavioral Signal vocabulary — soft skills, work traits | 49 entries |
| data/roles.json | Role reference only — not used in inference | Keep, demote to reference panel |

**roles.json is no longer used by any parser.**
It may be displayed as an optional "what skills are typical for X role" reference panel.
It must not influence skill extraction, gap scoring, or any output.

---

## Key Files

- data/skills.json           ← Technical Signal source (expand)
- data/soft-skills.json      ← Behavioral Signal source (49 terms, wired into registry)
- data/roles.json            ← reference only (do not wire to parsers)
- src/lib/registry.js        ← single data access point (serves skills + soft-skills)
- src/jd-skill-parser.jsx    ← main parser (extracts 3 signal types from JD + resume)
- tests/jd_test_bank/        ← 10 real JDs
- tests/coverage-gaps.md     ← auto-generated gap report
- docs/scoring-model.md      ← weighted evidence scoring spec (unchanged)

---

## Working Rules

- Explore before editing. Read relevant files first.
- Propose a plan with affected files before making changes.
- Scope each task to ONE layer at a time.
- Write or update tests before changing parser logic.
- Run `npm test` after every change. All 122 tests must still pass.
- Do not add new dependencies without asking.
- Do not mix inference logic with display logic.
- Prefer clarity over cleverness.
- Flag any hardcoded skill or role data — it belongs in /data.
- Never score Behavioral Signals with L1–L5. Present/absent only.
- Never apply role templates to JD parsing. roles.json is reference only.
- Never raise a Technical Signal level through phrase signals alone
  without structural evidence (job history or project) to support it.

---

## Definition of Done (per task)

- Change scoped to one layer
- Behavior unchanged unless explicitly requested
- Tests written for changed logic
- `npm test` passes (all 122 + any new tests)
- CLAUDE.md updated if architecture changed
- No new hardcoded skill or role data added to source files

---

## Phase Roadmap (Current: Phase 1)

Phase 1 — Foundation (May–June 2026)
  ✅ 1. Registry refactor (SKILL_DICTIONARY → JSON)
  ✅ 2. JD test bank — 10 real JDs
  ✅ 3. Vitest suite — 122 tests passing
  ✅ 4. Create data/soft-skills.json — behavioral signal vocabulary (49 terms)
  ✅ 5. Wire soft-skills.json into registry.js
  ✅ 6. Update JD parser — extract 3 signal types (Technical / Behavioral / Duties)
  ✅ 7. Update resume parser — extract Technical (scored) + Behavioral (present/absent)
  ✅ 8. Update gap output — 3-panel display
  ⬜ 9. Expand skills.json to 300–500 entries (fix JD2 + JD7 zero-skills bug)
  ⬜ 10. Resume test bank — 10 real resumes
  ⬜ 11. Implement weighted evidence scoring (docs/scoring-model.md)
  ⬜ 12. End-to-end: real JD + real resume → 3-panel gap output

Phase 2 — Output Quality (June–July 2026)
  Per-skill suggestion text | Evidence transparency | Resume rewrite hints
  Export gap as PDF/CSV | Shareable result links

Phase 3 — Scale (July–August 2026)
  Skill database 500+ | Non-tech domain expansion | Usage analytics | Freemium tier

---

## What NOT to build (explicit out-of-scope)

- Role type inference from JD content
- "Apply Now / Build Skill / Consider Adjacent Role" decision output
- Role template matching in any parser or scoring function
- L1–L5 scoring for soft skills / behavioral signals
- Salary data, company ratings, or external enrichment

---

## When Stuck — Run This Check

1. Run `npm test` — are all tests still passing?
2. Check Phase Roadmap — what is the next ⬜ task?
3. Open tests/coverage-gaps.md — what is the top unmatched JD term? Add it to skills.json.
4. Check known bugs below — is the zero-skills bug (JD2, JD7) fixed yet?

If none are clear, stop and plan before coding.

---

## Known Bugs

| # | Bug | Priority |
|---|---|---|
| 1 | JD2 + JD7 return 0 skills — vocabulary gaps in skills.json | High |
| 2 | jobType detection fails for internship/contract JDs | ✅ Fixed (commit 395be96) |
| 3 | Java suppressed when JavaScript present — expected behavior, document it | Low |
| 4 | JD10 jobType returns null — no explicit "Full-time" text | Low |
| 5 | Role template match fires during JD parse — remove this logic | High |
