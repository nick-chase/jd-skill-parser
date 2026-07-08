# ADR — Adapting tidy-docs and audit-config-sync to the single consolidated PATH_TO_LAUNCH.md

- **Status:** Proposed — awaiting Nicholas's review. No files edited by this ADR.
- **Date:** 2026-07-08
- **Author:** @architect (opus)
- **Scope:** Two coupled decisions triggered by one event — the merge of
  `OPEN_TASKS.md` + `KNOWN_BUGS.md` + `PATH_TO_LAUNCH.md` into a single file at
  `nat20-core/PATH_TO_LAUNCH.md` (repo root, not under `docs/`).
- **Aligns with:** `../nat20-core/docs/master-plan-v5.md`; CLAUDE.md "What NOT to
  build" reviewed — nothing here touches parser/scoring/product surface, this is
  workflow tooling only.

This file carries two clearly labelled decisions:

- **Decision 1** — redesign of `.claude/agents/tidy-docs.md`
- **Decision 2** — corrected logic for Checks 7 and 12 in
  `.claude/hooks/audit-config-sync.ps1`

Neither `tidy-docs.md` nor `audit-config-sync.ps1` is edited here. Both are
proposals for a human-signed-off implementation pass.

---

## Decision 1 — tidy-docs.md redesign

### Context

`tidy-docs.md` (`.claude/agents/tidy-docs.md`) is the end-of-session doc-sync
agent. It reads committed git history for a session, cross-references it against
the live planning docs, and writes complete `FINAL_*.md` replacement files into
`jd-skill-parser/docs/` for Nicholas to copy into `nat20-core` by hand.

Its whole design assumed **three separate source files**. They are now **one
file** (`PATH_TO_LAUNCH.md`), with `master-plan-v5.md` remaining a separate,
un-consolidated file. Every old-file reference in the spec maps to one of three
functional responsibilities (plus the master-plan responsibility, which is out
of scope for the consolidation):

| tidy-docs reference | Line(s) | Responsibility |
|---|---|---|
| "commits since OPEN_TASKS.md's last update" | 4 | **A. Session-boundary detection** |
| "Read the 'Last updated' line at the top of OPEN_TASKS.md" | 27–28 | **A. Session-boundary detection** |
| "OPEN_TASKS.md has no parseable 'Last updated' line → stop" | 100–101 | **A. Session-boundary detection** |
| reads `../nat20-core/OPEN_TASKS.md` | 16 | **B. Task-completion tracking** |
| "Cross-reference against OPEN_TASKS.md" for task IDs | 41–52 | **B. Task-completion tracking** |
| "Never move a task to Completed in OPEN_TASKS on staged-only" | 39, 94, 126 | **B. Task-completion tracking** |
| reads `../nat20-core/KNOWN_BUGS.md` | 17 | **C. Bug-evidence logging** |
| "Check KNOWN_BUGS.md … evidence on that bug's row" | 54–60 | **C. Bug-evidence logging** |
| reads `../nat20-core/docs/PATH_TO_LAUNCH.md` | 19 | **D. Exit-gate checking** |
| "Check PATH_TO_LAUNCH.md's exit-gate checklist" | 71–72 | **D. Exit-gate checking** |
| reads `../nat20-core/docs/master-plan.md` | 18 | **E. Decisions table (NOT consolidated — stays separate)** |
| "Check master-plan.md's Architecture Decisions table" | 62–69 | **E. Decisions table (separate)** |
| FINAL_ write targets (open_tasks / known_bugs / master_plan / path_to_launch) | 79–88 | **Write target** |

Responsibilities A, B, C, and D now all point at **sections of one file**.
Responsibility E (master-plan decisions table) is untouched by the merge.

The core design question: now that A/B/C/D live in one document, do they stay
four passes re-scoped to sections, or do some of them functionally collapse?

### Options

**Option 1 — Merge everything into one "reconcile the doc" pass.**
Treat the whole file as a single blob: diff the session's commits against it,
propose all edits (task moves, bug evidence, exit-gate flips) in one sweep.

**Option 2 — Keep four distinct passes, each re-scoped to a named section of
the one file.** Session-boundary reads the header; task-completion reads Active
Tasks + Queued; bug-evidence reads Known Bugs; exit-gate reads Exit Gate. Write
a single `FINAL_path_to_launch.md`. Master-plan decisions stay a separate pass
writing a separate `FINAL_master_plan_v5.md`.

**Option 3 — Collapse bug-evidence into task-completion (B+C become one), keep
session-boundary and exit-gate distinct.** Rationale: bugs and tasks now live in
one doc, so "did this bug get fixed" is arguably a special case of "did this
task get completed."

### Trade-offs

**Against Option 1 (full merge):** It discards the single most important
invariant in the current spec — the **asymmetric write authority**. The agent
is allowed to *propose moving a task to Completed* (step 4), but is explicitly
*forbidden from closing a bug* — it may only annotate evidence on an existing
row or propose a new "proposed — new" row (step 5, hard rule line 95). A single
undifferentiated pass erases that distinction and invites the agent to "resolve"
a bug row the same way it resolves a task. Reject.

**Against Option 3 (merge B into C):** The consolidated doc itself refutes the
premise. Its "How To Read This Doc" section states a bug *folds into an Active
Task* only "when there's a natural connection," and otherwise "**stays visible
in Known Bugs** until it's picked up as its own piece of work." So bug and task
are deliberately **distinct-but-linkable**, not identical. Two more reasons they
must not collapse:

1. **Different authority** (as above): task → propose-complete; bug →
   evidence-only, never close.
2. **Different trigger**: a bug can be fixed by someone who was already in the
   file, with no task ID ever existing for it. Task-completion keys on task IDs;
   bug-evidence keys on *files/tests touched*. Collapsing them would drop
   file-touch-only bug evidence on the floor.

**For Option 2 (four passes, one file, one FINAL_):** Preserves every existing
invariant, requires the least behavioural change, and maps cleanly onto the new
9-section structure. Its one real cost: because everything is one physical file,
**any** confirmed change forces the agent to reproduce the **entire** document
in `FINAL_path_to_launch.md`, raising the risk of accidental content loss during
regeneration. This is mitigated by an explicit "verbatim except confirmed
deltas" rule and is strictly better than the alternative (Nicholas hand-merging
three partial FINAL_ files back into one — which would directly violate the
existing "full file replacement, no cherry-picking" rule in `auto-update-plan.ps1`).

### Decision

**Adopt Option 2, with one addition (a cross-link between B and C).**

1. **Keep four distinct logical passes**, each re-scoped to a *section* of the
   single `PATH_TO_LAUNCH.md`, not a separate file:
   - **A. Session-boundary** → header note section (section 1).
   - **B. Task-completion** → Active Tasks (section 3) + Queued (section 4);
     moves confirmed items into Completed (section 8). Unchanged authority:
     agent *proposes* Completed moves.
   - **C. Bug-evidence** → Known Bugs (section 2). Unchanged authority: agent
     annotates evidence or proposes a "proposed — new" row; **never closes**.
   - **D. Exit-gate** → Exit Gate (section 5); proposes flipping a checkbox when
     the underlying task is confirmed complete by pass B.
   - **E. Decisions table** → stays a fully separate pass against the separate
     `master-plan-v5.md`. Not consolidated. Not part of `FINAL_path_to_launch.md`.

2. **Do not merge B and C.** They answer different questions, key off different
   signals, and carry different write authority. Add one *cross-link* instead:
   when pass B confirms a task complete that had a bug **folded into it** (per
   the doc's fold-in rule), pass C must also check whether that fold-in bug now
   has evidence to log. Linked, not merged.

3. **Session-boundary anchor moves, and needs a real rolling marker.** The old
   anchor was `OPEN_TASKS.md`'s own "Last updated" line, bumped every session.
   The consolidated header currently carries only `Last consolidated: 2026-07-08`
   — a **one-time** merge date, *not* a rolling per-session marker. Using it
   as-is would make every session's window start on the consolidation date
   forever. Fix:
   - The FINAL_ output **adds and maintains a distinct `Last updated: YYYY-MM-DD`
     line** in the header note section, separate from `Last consolidated:`
     (which is preserved as historical provenance). This line is the canonical
     session-boundary anchor; Nicholas carries it over with each FINAL_ copy.
   - **Fallback:** if no parseable `Last updated:` line is present, derive the
     window start from the last git commit date that touched
     `PATH_TO_LAUNCH.md` in nat20-core
     (`git -C ../nat20-core log -1 --format=%cd -- PATH_TO_LAUNCH.md`).
   - **Hard stop preserved:** if neither the line nor the git fallback yields a
     parseable date, stop and ask — do not guess a window.

4. **Write target collapses to one file for the consolidated doc.** Retire
   `FINAL_open_tasks.md` and `FINAL_known_bugs.md`. The agent writes **one**
   `FINAL_path_to_launch.md` containing the complete 9-section document, changed
   only in the confirmed deltas, whenever *any* of passes A–D produce a confirmed
   change. `FINAL_master_plan_v5.md` remains a **separate** output written only
   when pass E warrants a decision row. (Note the version correction: the spec's
   `FINAL_master_plan.md` / `master-plan.md` should read `master-plan-v5.md`.)

5. **Regeneration-safety rule (new):** because one confirmed delta now forces a
   full-file rewrite, the spec must state: reproduce `PATH_TO_LAUNCH.md`
   verbatim, section for section, changing only the confirmed deltas; never drop,
   reorder, or summarise a section (especially the "Retired — Dead Under New
   Direction" subsection and the Manual section, which are easy to lose).

### Consequences

- **Spec edits required in `tidy-docs.md`** (implementation pass, not this ADR):
  description line 4; "What you read" list (lines 16–19) collapses OPEN_TASKS +
  KNOWN_BUGS + PATH_TO_LAUNCH into one entry plus master-plan-v5; step 1 anchors
  on `Last updated:` in PATH_TO_LAUNCH's header with the git fallback; steps 4/5
  re-scope to sections and gain the B↔C cross-link; step 7 reads the Exit Gate
  section; step 9 write-target list collapses to `FINAL_path_to_launch.md` +
  `FINAL_master_plan_v5.md`; hard-rule line 100 renames OPEN_TASKS → PATH_TO_LAUNCH.
- **Bug-closure safety is retained** — the "never close a bug" rule survives
  intact; consolidation does not weaken it.
- **New dependency on a hand-maintained `Last updated:` line.** If Nicholas
  forgets to carry it over, the git fallback covers it; the hard-stop covers the
  case where both fail. No silent wrong-window behaviour.
- **Tooling inconsistency to resolve at implementation time (flagged, not fixed
  here):** `tidy-docs.md`'s front-matter declares `tools: Read, Grep, Glob, Bash`
  — **no `Write`** — yet its whole job is writing `FINAL_*.md`. The consolidation
  pass is the natural moment to add `Write` (scoped to `jd-skill-parser/docs/`).
  This predates the consolidation but should be corrected in the same edit.
- **No product/parser risk.** This is workflow tooling; CLAUDE.md "What NOT to
  build" is not engaged.

---

## Decision 2 — audit-config-sync.ps1 Checks 7 and 12

### Context

`audit-config-sync.ps1` is a standalone pre-session config auditor (not a wired
hook). Two of its checks assume the now-deleted files:

- **Check 7** (lines ~140–158): verifies CLAUDE.md *points at* `KNOWN_BUGS.md`
  and does **not** carry an inline bug table.
- **Check 12** (lines ~242–260): extracts a `Current Phase:` header from
  `OPEN_TASKS.md` so the session-start hook can read the same marker.

Both target files no longer exist. Bugs and phase now live in sections of
`PATH_TO_LAUNCH.md`. Two complicating facts discovered while auditing:

1. The consolidated `PATH_TO_LAUNCH.md` has **no `Current Phase:` line and no
   `## Current Phase` heading** at all. Phase is only implied by section
   subheaders ("Phase E queued", "Phase F — Publish + Promote", "Phase E Exit
   Gate").
2. `session-start.ps1` (line 45) already greps `PATH_TO_LAUNCH.md` for
   `^## Current Phase` — a heading that **does not exist in the doc** — so its
   phase line silently renders nothing today. Check 12's entire stated purpose
   ("so the session-start hook can extract it") is therefore already broken for
   the same reason. Any fix must make the doc, the hook, and the check agree on
   one machine-readable marker.

### Options

- **7a:** Repoint Check 7's pointer test at `PATH_TO_LAUNCH.md`, keep the inline-
  table guard as-is.
- **12a:** Fuzzy-match the existing `Phase X` section subheaders in
  `PATH_TO_LAUNCH.md` (no doc change).
- **12b:** Require an explicit, greppable `Current Phase:` marker in
  `PATH_TO_LAUNCH.md`'s header, and align Check 12 **and** `session-start.ps1`
  to read it.

### Trade-offs

- **7a** is a clean one-string repoint; the inline-table guard is orthogonal to
  which file bugs live in and needs no logic change, only message wording. Adopt.
- **12a** avoids a doc edit but bakes in fuzzy matching (multiple `Phase X`
  headings exist — E queued, F, E Exit Gate — so "which phase is current?" is
  ambiguous; it could read Phase F off the "Phase F — Publish + Promote" heading
  while the project is still in Phase E). Rejected as unreliable.
- **12b** costs one line in the doc but gives one unambiguous source that the
  hook and the audit both read. It also fixes the *already-broken* session-start
  phase line as a side effect. Adopt.

### Decision

**Check 7 — repoint to PATH_TO_LAUNCH.md; keep the inline-table guard.**

```powershell
# CHECK 7 — CLAUDE.md references PATH_TO_LAUNCH.md for bugs, not an inline bug table
if ($claudeContent) {
    $hasPointer     = $claudeContent -match 'PATH_TO_LAUNCH\.md'
    $hasInlineTable = ($claudeContent -match '\|\s*#\s*\|\s*Bug\s*\|') `
                      -and ($claudeContent -match '\|\s*\d+\s*\|.*priority')

    if ($hasPointer) {
        $ok += "CLAUDE.md points to PATH_TO_LAUNCH.md (single source for tasks + bugs)"
    } else {
        $warnings += "CLAUDE.md does not reference PATH_TO_LAUNCH.md — add a pointer so agents know where tasks and bugs live"
    }

    if ($hasInlineTable) {
        $issues += "CLAUDE.md contains an inline bug table — move bugs to PATH_TO_LAUNCH.md's Known Bugs section and replace with a pointer"
    } else {
        $ok += "CLAUDE.md does not contain an inline bug table"
    }
}
```

Notes: the inline-bug-table regex is unchanged (it guards the *shape* of a bug
table appearing inside CLAUDE.md, independent of the tracker's filename).
Explicit parens added around each `-match` so the `-and` grouping is
unambiguous. The header comment on line 17 changes from "references KNOWN_BUGS.md"
to "references PATH_TO_LAUNCH.md".

**Check 12 — read a canonical phase marker from PATH_TO_LAUNCH.md; require the
doc to carry it; keep session-start.ps1 in sync.**

```powershell
# CHECK 12 — PATH_TO_LAUNCH.md current phase is readable
$pathToLaunchPath = "..\nat20-core\PATH_TO_LAUNCH.md"
if (Test-Path $pathToLaunchPath) {
    $planContent = Get-Content $pathToLaunchPath -Raw

    # Primary: an explicit "Current Phase: E — ..." marker in the header note.
    $phaseMatch = [regex]::Match($planContent, 'Current Phase:\s*([A-Z])\b')

    if ($phaseMatch.Success) {
        $currentPhase = $phaseMatch.Groups[1].Value
        $ok += "Current phase readable from PATH_TO_LAUNCH.md: Phase $currentPhase"

        # Verify CLAUDE.md at least mentions this phase
        if ($claudeContent -and -not ($claudeContent -match "Phase $currentPhase")) {
            $warnings += "CLAUDE.md does not mention Phase $currentPhase — may be referencing a stale phase"
        }
    } else {
        $warnings += "Could not detect current phase from PATH_TO_LAUNCH.md — add a 'Current Phase: <letter> — ...' line to the header note section. session-start.ps1 reads the same marker, so without it both the audit and the session banner show no phase."
    }
} else {
    $issues += "PATH_TO_LAUNCH.md not found at $pathToLaunchPath — session context and phase detection will be missing"
}
```

This check is deliberately **strict, single-pattern** (no fuzzy fallback to
`## Phase X` subheaders) precisely because multiple `Phase X` subheaders coexist
in the doc and would produce an ambiguous read. A missing marker is surfaced as
a warning with a concrete instruction, not silently tolerated.

**Two coupled edits this decision requires (outside Checks 7/12 themselves, but
named here so the implementer does not leave the contract half-wired):**

1. **Add one line to `PATH_TO_LAUNCH.md`'s header note section**, e.g.
   `**Current Phase:** E — accuracy gate before publish`. Nicholas owns this
   edit (nat20-core is read-only to agents); it is the single source both the
   hook and the audit read.
2. **Align `session-start.ps1` (line 45)** to the same regex
   (`Current Phase:\s*([A-Z])`) instead of `^## Current Phase`, which matches
   nothing in the current doc.

### Consequences

- **Also in this file, but out of the Checks-7/12 scope — flag for the same
  implementation pass** (these still carry deleted-file references):
  - **Check 2 `$liveDocs` map (lines 51–57):** still lists
    `"OPEN_TASKS.md" = "..\nat20-core\docs\OPEN_TASKS.md"` and
    `"KNOWN_BUGS.md" = "..\nat20-core\docs\KNOWN_BUGS.md"` — both now missing on
    disk, so this check will emit two false "Live doc missing" *issues* every
    run. Replace both entries with a single
    `"PATH_TO_LAUNCH.md" = "..\nat20-core\PATH_TO_LAUNCH.md"` (repo root, **not**
    `docs\`). Also correct `"master-plan-v4.md"` → `"master-plan-v5.md"` while
    there.
  - **Header comment block (lines 10–23):** the check summaries for 2, 7, and 12
    name the old files; update to match.
- Once the `Current Phase:` marker is added and both readers are aligned, the
  phase line reappears in the session-start banner (currently blank) — a latent
  bug fixed as a side effect.
- No product/parser risk; workflow tooling only.

---

## Summary of proposed file changes (for the implementation pass)

| File | Change | Owner |
|---|---|---|
| `.claude/agents/tidy-docs.md` | Re-scope 4 passes to sections of one file; new `Last updated:` anchor + git fallback; single `FINAL_path_to_launch.md` target; add `Write` tool; version-correct master-plan → v5 | agent edit (this repo) |
| `.claude/hooks/audit-config-sync.ps1` | Check 7 → PATH_TO_LAUNCH.md pointer; Check 12 → strict `Current Phase:` read; Check 2 `$liveDocs` map repointed; v4 → v5; comment block | agent edit (this repo) |
| `.claude/hooks/session-start.ps1` | line 45 regex `^## Current Phase` → `Current Phase:\s*([A-Z])` | agent edit (this repo) |
| `nat20-core/PATH_TO_LAUNCH.md` | Add `**Current Phase:** E — …` line + rolling `Last updated:` line to header | **Nicholas only** (read-only to agents) |

All edits above are proposals. Nothing was modified by this ADR.
