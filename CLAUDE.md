# CLAUDE.md — Nat20 (jd-skill-parser)

> Read this file in full at the start of every session.
> This file contains STABLE rules and architecture only.
> Anything that changes session-to-session lives in a live document.
> If a live document contradicts this file, the live document wins.

---

## Session Defaults

- Default effort: medium (`/effort medium`)
- Default model: sonnet
- Override to `opus` only for `@architect` invocations
- Override to `low` for `@explorer` read-only passes

---

## Live Documents — Read These at Session Start

| Document | Path | Contains |
|----------|------|----------|
| Open tasks + current phase | `../nat20-core/OPEN_TASKS.md` | Active task IDs, DoDs, what's in flight |
| Master plan | `../nat20-core/docs/master-plan-v4.md` | Phase definitions, completed history, architecture decisions |
| Scoring spec | `../nat20-core/docs/scoring-model.md` | Full E×C×D×R tables, weight values, score→level map |
| Known bugs | `../nat20-core/KNOWN_BUGS.md` | Open bugs, priority, status — single source of truth |
| Affiliate plan | `../nat20-core/docs/affiliate_masterplan.md` | Affiliate program strategy and implementation |

Do not rely on anything in this file for current task state, bug status,
or test counts. Read the live documents directly.

---

## Two-Repo Workflow

| Repo | Location | Claude Code can... |
|------|----------|--------------------|
| **jd-skill-parser** (public) | `C:\Users\nikec\Desktop\jd-skill-parser` | Read + write freely |
| **nat20-core** (private) | `C:\Users\nikec\Desktop\nat20-core` | Read only — never write |

### Deployment copy pattern

Vercel cannot access nat20-core. Core files are copied into this repo:
- `nat20-core/src/` → `src/core/`
- `nat20-core/data/` → `data/`

When editing core files (`inference.js`, `parseResume.js`, `skills.json`),
edit the copy in this repo. Nicholas copies changes back to nat20-core manually.

### Hard rules — no exceptions

## Hard Rules — File System
- NEVER write to ~/.claude/ or the global Claude config directory
- Hook scripts belong in .claude/hooks/ (project level) only
- settings.local.json belongs in .claude/ (project level) only
- Global Claude config (~/.claude/) is managed by Nicholas manually

- NEVER commit. NEVER push. Nicholas commits manually via GitHub Desktop.
- NEVER write to `../nat20-core/`.
- NEVER edit `OPEN_TASKS.md`, `master-plan-v4.md`, or `KNOWN_BUGS.md` —
  Nicholas updates those.
- NEVER bypass the pre-commit hook with `--no-verify`.
- NEVER add new dependencies without explicit approval.
- NEVER add hardcoded skill or role data to source files — belongs in `/data`.
- All work on feature branches. Never edit master directly.


---

## Branch Discipline

```
main (production — never touch directly)
  └── feature/e11-description    ← one branch per task
        └── commit freely here
              └── merge to main when done, delete branch
```

Branch naming:
- `feature/e11-date-parser` — new work, maps to a task ID
- `fix/pdf-yearLocked-flag` — bug fix
- `chore/update-docs` — docs or config only

**Create a branch before touching any file. No exceptions.**

---

## Product Goal

**By August 31, 2026, Nat20 produces recurring revenue from paying subscribers.**

The one question the app answers:
> "Based on how my resume reads today, how well does it match this JD?"

The user decides what to do. The app shows the signal. The app does not
make the decision for them.

**Two audiences, one parser:**
- **Early-career** (students, new grads, bootcamp grads): gap is claims
  without evidence — skills listed but not demonstrated.
- **Mid-career / career-changers**: gap is evidence with weak framing —
  senior work described with passive verbs ("helped," "worked on").

---

## Parser Philosophy

The parser is a **document reader**. Read the document, don't judge the person.

One-sentence test before adding any filter or conditional:
> *"Am I reading the document, or am I deciding who the user is?"*

If it's the second one, it does not belong in the parser.

---

## What NOT to Build

Permanent decisions — not phase-specific deferrals:

- Role type inference from JD content
- "Apply Now / Build Skill / Consider Adjacent Role" output —
  deleted in v3, do not recreate under any framing
- L1–L5 scoring for behavioral signals — present/absent only, always
- A single 0–100 overall match score displayed to users — explicitly banned
- Role template matching in any parser or scoring function
- Salary data, company ratings, or external enrichment

---

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4
- **Auth:** Supabase (Google OAuth)
- **Database:** Supabase Postgres (resume profiles, user accounts)
- **Payments:** Stripe Checkout + webhooks via Supabase Edge Functions
- **PDF parsing:** pdfjs-dist (client-side)
- **Email:** EmailJS (`@emailjs/browser`)
- **Analytics:** Plausible
- **Hosting:** Vercel (auto-deploy from master)
- **Test runner:** Vitest (`npm test` = `vitest run`, single pass, exits)

---

## Three Signal Types

| Signal | Source | Scoring |
|--------|--------|---------|
| **Technical** | `data/skills.json` | L1–L5 via E×C×D×R formula |
| **Behavioral** | `data/soft-skills.json` | Present / Absent only — never L1–L5 |
| **Job Duties** | JD free text | Not scored — displayed as-is |

---

## Scoring Formula

Formula structure is stable. Full weight tables live in the scoring spec:
`../nat20-core/docs/scoring-model.md`

```
Skill Score = SUM(E × C × D) × R + B
```

| Factor | What | Derived from |
|--------|------|--------------|
| E | Evidence type weight | Where skill appears in resume |
| C | Bloom complexity multiplier | Action verb level in bullet text |
| D | Duration multiplier | Date range in that context |
| R | Recurrence multiplier | Count of distinct contexts |
| B | Bounded phrase boost | Self-claim language (capped, Dunning-Kruger guard) |

Score maps to L1 (Awareness) → L5 (Expert).
Full tables: `../nat20-core/docs/scoring-model.md`

---

## Date Parsing — Single Source of Truth

`parseDateRange()` is the only date parser. All date extraction routes
through it. `extractDateFromTitleLine()` delegates to `parseDateRange()`
and does not maintain its own regex.

Recognized patterns (stable as of June 9, 2026 — update this list when
new patterns are added):

| Pattern | Example | Behavior |
|---------|---------|----------|
| Closed range | `Jan 2020 – Mar 2022` | start + end + duration |
| Open range | `Jan 2023 – Present` | start + duration to today |
| Season + year | `Summer 2023` | 3mo / Fall=4mo / Spring=5mo / Winter=3mo |
| Duration only | `6 months` | duration, no dates |
| Bare year | `2022` | null duration, known point-in-time |
| Expected prefix | `Expected May 2026` | null until status shape-change (see KNOWN_BUGS.md #7) |

Degree scoring rules (always enforced):
- `in_progress` or `expected` status → no completed credential weight
- In-progress graduation year → never used as duration anchor for jobs

---

## Test Suite

`npm test` must pass fully before staging any change.
Do not track a total count — the count grows. Track groups.

| Group | File | Protects |
|-------|------|----------|
| Unit: inference | `tests/unit/inference.test.js` | E×C×D×R scoring, Bloom, confidence |
| Unit: registry | `tests/unit/registry.test.js` | skills.json + soft-skills.json access |
| Unit: decision | `tests/unit/decision.test.js` | matchScore, isEntryLevel |
| Unit: resources | `tests/unit/resources.test.js` | Affiliate lookup, level filtering |
| Unit: degree | `tests/unit/degree.test.js` | Degree parsing, in_progress gate |
| Unit: projects | `tests/unit/projects.test.js` | Project evidence, outcome flag |
| Unit: certifications | `tests/unit/certifications.test.js` | Cert detection and scoring |
| Unit: supabase | `tests/unit/supabase.test.js` | Supabase client init |
| Integration: parser | `tests/integration/parser.test.js` | End-to-end resume parsing |
| Integration: JD bank | `tests/integration/jd-test-bank.test.js` | 10 real JD fixtures |
| Integration: alt JDs | `tests/integration/alt-jd-fixtures.test.js` | Edge case JDs |
| Diagnostic | `tests/diagnostic-output/` | Fixture snapshots — informational only |
| Smoke | `tests/smoke.test.js` | App loads without crashing |

Rules:
- All groups must be green before staging
- Skipped tests must have a documented reason in the test file
- Diagnostic group failures flag output changes, not broken logic

---

## Architecture Layers

```
1. Ingest      → text cleanup, section detection (JD + resume)
2. Taxonomy    → extract Technical / Behavioral / Duty signals
3. Inference   → E×C×D×R scoring (Technical); present/absent (Behavioral)
4. Gap         → compare JD signals vs resume signals per bucket
5. Display     → three-panel output (Technical / Behavioral / Duties)
```

- Scope each task to ONE layer at a time
- Never mix inference logic with display logic
- Never mix display logic with gap computation

---

## Key Files

| File | Purpose |
|------|---------|
| `src/core/parser/parseResume.js` | Resume parser — sections, blocks, date extraction |
| `src/core/parser/inference.js` | E×C×D×R scoring, Bloom detection, confidence |
| `src/core/parser/decision.js` | matchScore + isEntryLevel only |
| `src/lib/registry.js` | Single data access point (skills + soft-skills) |
| `src/jd-skill-parser.jsx` | Main UI + inline JD extraction (1842 lines) |
| `src/components/SkillRow.jsx` | Gap row — level, primarySignal, confidence, suggestion |
| `data/skills.json` | Technical signal vocabulary |
| `data/soft-skills.json` | Behavioral signal vocabulary |
| `data/resources.json` | Resource links for gap skills |
| `data/affiliates/` | Per-program affiliate JSON (plugin architecture) |

---

## Working Rules

- Explore before editing. Read relevant files first.
- Propose a plan with affected files before making changes.
- Scope each task to ONE layer at a time.
- Write or update tests before changing parser logic.
- Run `npm test` after every change. All groups must pass.
- Do not add new dependencies without asking.
- Do not mix inference logic with display logic.
- Prefer clarity over cleverness.
- Flag any hardcoded skill or role data — it belongs in `/data`.
- Never score Behavioral Signals with L1–L5. Present/absent only.
- Never apply role templates. `roles.json` is reference only.
- Never raise a Technical Signal level through phrase signals alone
  without structural evidence to support it.

---

## Task Completion Protocol

1. Run `npm test` — confirm all groups pass
2. Stage changes (`git add`) — do NOT commit
3. Report to Nicholas: what changed, which files, test group summary
4. Nicholas reviews staged changes
5. Nicholas commits via GitHub Desktop
6. Nicholas updates `OPEN_TASKS.md` and `master-plan-v4.md` in nat20-core
7. If a new bug was found, Nicholas adds it to `KNOWN_BUGS.md`

**Do not commit. Do not push. Do not write to nat20-core.**

---

## Agent Routing

| Task type | Agent | Model |
|-----------|-------|-------|
| Read-only investigation | `@explorer` | haiku |
| Make a code change | `@ship-feature` | sonnet |
| Write tests | `@test-writer` | sonnet |
| Fix a bug | `@debugger` | sonnet |
| Review a diff | `@code-reviewer` | sonnet |
| Architecture decision | `@architect` | opus (rare) |

Full agent specs: `.claude/agents/`

---

## Architecture Decisions

Append-only. Full history in `master-plan-v4.md`.
Only the decisions most relevant to daily parser work are listed here.

| Decision | Date |
|----------|------|
| Parser stays client-side through launch | June 1, 2026 |
| Two-repo split — parser logic private, UI public | June 1, 2026 |
| isTechRole() removed — judged person not document | June 2, 2026 |
| roles.json is reference-only — never used in inference | June 2, 2026 |
| Four-decision label system retired — DecisionCard deleted | June 8, 2026 |
| Single 0–100 match score banned from display | June 8, 2026 |
| Affiliate plugin architecture — per-program JSON in data/affiliates/ | June 8, 2026 |
| Bloom multipliers applied per-bullet, not per-block | June 8, 2026 |
| JD parser extraction from React file deferred to Phase F | June 8, 2026 |
| parseDateRange() is single source of truth for all date extraction | June 9, 2026 |
| Season date recognition live — Summer/Fall/Spring/Winter YYYY | June 9, 2026 |

---

## When Stuck

1. Run `npm test` — are all groups still passing?
2. Read `../nat20-core/docs/OPEN_TASKS.md` — what is the active task?
3. Re-read the task's Definition of Done in `master-plan-v4.md`
4. Check `../nat20-core/docs/KNOWN_BUGS.md` — is this a known issue?
5. If genuinely blocked, stop and report — do not improvise
