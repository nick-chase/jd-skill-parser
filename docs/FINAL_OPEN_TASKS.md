# Open Tasks — Nat20

> Working surface for active development. Only what's in flight or queued next.
> **Target:** August 31, 2026 — published (Lite tier live) + promoted.
> **Authoritative plans:** `master-plan-v5.md` (strategy) · `PATH_TO_LAUNCH.md` (sequencing)
> **Philosophy:** `PRODUCT_PHILOSOPHY.md` — read before any Lite-tier copy or tier task.
> Last updated: 2026-06-22

---

## Active

_(pull the next item from Queued — Phase E)_



---

## Queued — Phase E (publish-ready; accuracy gate runs first)

- [ ] **Fix-F** — normalizeSkillId deduplication
  Defined in both jd-skill-parser.jsx and SkillRow.jsx. Consolidate to one
  location (src/lib/registry.js or shared constants). KNOWN_BUGS #5.
  (Pulled forward from old Phase F deferral — it's a real pre-launch hygiene item.)


- [ ] **E15** — 85% accuracy gate
  Batch validation ≥ 85% exact+adjacent agreement on the diverse set.
  Gates public promotion. Branch: feature/e15-fixture-validation.




 [ ] isPaid() migration — move isPaid() from limits.js to supabase.js, delete limits.js, drop dead Supabase columns (users.daily_parse_count, users.parse_count_reset_at). Separate session because it touches Supabase. 



### Phase E exit gate (all true before public promotion)
- [ ] E16 + E15 merged: ≥ 85% on diverse fixtures
- [x] LITE-01/02 merged: Lite tier live, honest, mobile-correct (375px) — 2026-06-19
- [x] GATE-01-CLEANUP merged
- [x] LITE-03 merged: hard gating enforcement — 2026-06-22
- [ ] Fix-F merged
- [ ] `npm test` green

---

## Decoupled Track — Pro (paid; does NOT gate the publish deadline)

- [ ] **PDF-01** — Capture raw pdfjs extraction as committed fixture
  Regression baseline. Needed before writing PDF-02.

- [ ] **PDF-02** — Fix degree date continuation lines in PDF extraction
  "Apr 2020 –\nDec 2023" → graduationYear: 2023. Gates PDF-as-paid-feature,
  not the publish deadline. If unfixed at launch, ship paid tier without PDF.

- [ ] **PRICING-DECISION** — Choose pricing model (open product decision)
  One-time/time-boxed pass vs subscription. Decide before charging, not before
  publishing. Philosophy leans toward finite/outcome-bounded. See PRODUCT_PHILOSOPHY.md.

- [ ] **CHARSHEET-DECISION** — Does the character sheet stay a Pro feature?
  Old paid tier had it; new Pro spec didn't mention it. Confirm: keep,
  fold into full report, or drop. Product call.

---

## Queued — Phase F (publish + promote; starts when Phase E gate closes)

- [ ] **F4** — NJIT outreach (first; warmest audience, controlled volume)
- [ ] **F1** — Reddit post (r/cscareerquestions + r/csMajors; draft exists)
- [ ] **F2** — LinkedIn announcement (after Reddit)
- [ ] **F3** — Product Hunt listing (last; Tuesday launch)
- [ ] **F5** — Affiliate links render in UI across both tiers — only where honest
  (never next to a withheld specific, e.g. a named cert beside a "credential gap" tease)
- [ ] **F6** — FTC disclosure renders wherever affiliate links appear

---

## UI Polish (non-blocking; after LITE, before promote)

- [ ] **E-UI-02** — Consistent centered layout container across pages
- [ ] **E-UI-03** — Remove References tab; level descriptions as tooltips

---

## Retired — Dead Under New Direction (do NOT re-add)

- ~~**GATE-02**~~ — Supabase resume uniqueness counter. Replaced by Lite depth limit.
- ~~**GATE-03**~~ — Blurred upgrade prompt. Blur is the anti-pattern; replaced by LITE-03.
- ~~**GATE-04**~~ — Was already a duplicate of GATE-01; absorbed.
- ~~**GATE-05**~~ — Email free tier + server-side abuse tracking. Unneeded — the Lite
  tier is abuse-resistant by having nothing exploitable (anonymous, localStorage, depth-limited).

---

## Completed

- [x] **LITE-03** — Functional gating enforcement — 2026-06-22
  Hard gates shipped: PDF upload, parse depth (parseResumeLite vs parseResume), and
  saveResumeProfile all gated on isPaidStatus. limits.js deleted entirely (91 lines,
  zero live import sites). Upgrade copy follows outcome-aligned pattern.
  Note: PRICING-DECISION dependency was incorrectly listed — the gates read a boolean
  (isPaidStatus) regardless of pricing model shape. PRICING-DECISION remains open but
  does not block gating. Branch: feature/lite-pro-gating, merged via PR #34.

- [x] **LITE-04** — Compare-tab auto-switch — 2026-06-20
  Tab auto-switches to the Compare view when JD is parsed and resumeResults exists.
  Shipped as part of LITE-02.

- [x] **LITE-03** — Philosophy-aligned copy pass — 2026-06-20
  Folded into LITE-02 during the build brief; philosophy-aligned copy (generous-with-mystery
  teasers, outcome-aligned CTAs) baked directly into LiteResultsView construction.

- [x] **LITE-01** — parseResumeLite() + computeLiteMatch() — 2026-06-19
  Compressed output shape: top 5 skills by experience + of-N-detected teaser;
  allBehavioralSignals (present-only filter applied at render); credentialGap
  (degreeLevel token, certCount, existence-only — no specifics); sectionsPresent.
  Anonymous, no Supabase writes. computeLiteMatch() split out for JD-dependent
  fields (matchScore, closestGap, missingBehavioral, teaserCounts, matchedCount,
  missingCount, levelGapsCount). Returns sentinel shape (matchScore: null) when jdProfile is null.

- [x] **LITE-02** — Single conditional + two output shapes — 2026-06-19
  isPaidStatus ? parseResume() : parseResumeLite() at the parse call.
  LiteResultsView (Match tab) + LiteResumeView (Resume tab) render the Lite shape.
  Compare tab auto-switches when JD is parsed and resumeResults exists.
  getMatchScoreLabel() extracted as shared export from jd-skill-parser.jsx;
  used by both GapAnalysisView and LiteResultsView.
  TierBadge component (Pro / Lite pill) replaces Beta pill in header and LandingPage.

- [x] **Parser fixes (recent merge)** — degree field stops at month/year, AI guardWords
  scoped, per-section aggregate scoring, perSectionScores threaded
- [x] **Affiliate canonical resolver** — alias-robust matching (AFF-05, AFF-06, AFF-UI-01/02)
- [x] **GATE-01** — Free-tier fast-fix lock (now vestigial; GATE-01-CLEANUP queued to remove)
- [x] **E13** — Parser fixes: section headers, isTechRole removal, block splitter, date parsing,
  vocabulary expansion (4.6 avg skills/resume, 0 zero-skill resumes)
- [x] **E14** — Inference v2: Bloom verb detector, confidence indicators, outcome detection
- [x] **E-BRAND** — Dual-audience positioning across landing/README/core docs
- [x] **E-UI** — Logo link + AppFooter
- [x] **E0.7** — HowToTour coach marks (beta-app)
- [x] **E-TRIAGE** — Parser triage (6+ skills/resume avg, 0 zero-skill)
- [x] **E-AUDIT** — 6-segment pre-launch audit; 5 blocker chains fixed; 122 → 351 tests
- [x] **E-SCORING-UI** — DecisionCard four-label system removed; primarySignal surfaced in SkillRow
- [x] **E-BETA** — Beta-app standalone branch (no auth/Stripe/Supabase; EmailJS feedback)
- [x] **E11** — Fixture validation population (6 fixtures, hand-labeled key)
- [x] **E12** — Parser accuracy benchmark (exact + adjacent targets)
- [x] **AFF-01..04** — DataCamp + Udemy URLs, branch merge, per-skill Impact links
- [X] **GATE-01-CLEANUP** — Remove vestigial hash-lock
- [X] **GATE-01** fast-fix lock is dead under the lite-tier model. Delete it so it
  doesn't rot. Deletion only, no behavior change.
-[X] **E16** — Fixture set spans both audiences
  Early-career (claims-without-evidence) + mid-career/career-changer
  (evidence-with-weak-framing). Precondition for a valid E15 number —
  measuring agreement on all-new-grad fixtures measures the wrong population.

---

## Manual (Ernest only)

- [ ] Update CLAUDE.md test baseline → 522
- [ ] Fill Udemy placeholder URLs in Impact dashboard (when Udemy affiliate enabled)

---

## Deferred — Phase G Backlog

- [ ] Under-framing detection (weak verbs in high-scope contexts)
- [ ] Pre/post-degree employment split in classifyEvidenceType
- [ ] bulletText for non-experience sections (projects, education)
- [ ] Apostrophe-year date format (Jul '19)
- [ ] Categorized skills section parsing (Format C)
- [ ] Shareable gap map URL + printable stat card
- [ ] Skill graph v1 (implies/requiredBy relationships)
- [ ] Unknown cert surfacing (acronym detected but not in vocabulary)
- [ ] Cert display as held/not-held in gap map matching
- [ ] JD parser extraction from jd-skill-parser.jsx (1842-line file)
- [ ] LEVEL_TIPS / IMPORTANCE_STYLES hardcoded string cleanup
- [ ] `score === 0` dead code filter removal in runGapAnalysis
- [ ] DUTY_HEADER_RE stateful regex refactor
- [ ] yearsRequired misread on vesting language
- [ ] CLAUDE.md spec tables update (E weights, D brackets — stale vs implementation)

---

## Completion Protocol

When you finish a task:
1. Run `npm test` — confirm all groups pass
2. Commit the code change in `jd-skill-parser`
3. Remove the task line from this file
4. Mark it ✅ with today's date in `master-plan-v5.md`
5. Commit nat20-core
6. State: "Task [ID] complete in both repos."

For any Lite-tier copy or tier task, also confirm it passes the respect test
in `PRODUCT_PHILOSOPHY.md` before committing.
