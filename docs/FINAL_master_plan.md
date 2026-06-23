# Nat20 — Master Plan v5

> **Name:** Nat20
> **Tagline:** Skill-based job matching, leveled.
> **Live:** https://nat20app.com
> **Repo:** https://github.com/nick-chase/jd-skill-parser
> **Owner:** Nicholas Chase (NJIT M.S., 2026–2027)
> **Contact:** nick@nat20app.com
> **Plan version:** v5.0.1
> **Last updated:** June 19, 2026

---

## How This Document Stays Clean

This is the strategy doc. It states the **current** product as fact — what Nat20 *is*,
not the history of how it got here. When a decision is superseded, the old decision is
**removed**, not annotated with "we used to do X." Decision history, if it's worth keeping,
lives in `completed_milestones.md` — never here. The goal is a clean reference, not a scar record.

**Volatile state lives in live documents, not in this file:**
- `OPEN_TASKS.md` — active and queued tasks
- `PATH_TO_LAUNCH.md` — launch sequencing and gates
- `KNOWN_BUGS.md` — bug tracking (single source of truth)
- `PRODUCT_PHILOSOPHY.md` — the principles behind every product decision
- `completed_milestones.md` — archived phase history

---

## The Goal (One Sentence)

**By August 31, 2026, Nat20 is published — the free Lite tier live at nat20app.com — and
promoted across NJIT, Reddit, LinkedIn, and Product Hunt.**

Recurring revenue is a welcome outcome, not the bar. Publishing and promoting are within my
control; whether strangers pay by a fixed date is not. The deadline tracks what I own.

---

## The Product Thesis

Most resume tools answer: *"Here is a score."*

Nat20 answers: **"Based on how my resume reads today, how well does it match this JD?"**

The user already decided they want this job. That decision is not Nat20's to make, second-guess,
or redirect. The app shows the signal clearly; the user decides what to do with it.

The core output is a **three-panel gap map**:

| Panel | Content | Source |
|---|---|---|
| **Technical Match** | Skills found/missing; resume level vs. JD requirement tier | skills.json |
| **Behavioral Signals** | Soft skills present/absent; no scoring | soft-skills.json |
| **What This Role Does** | Job duties extracted as free text; not scored | JD free text |

The moat is **honesty and transparency** — the output shows exactly what was found and where.
A user who disagrees can look at their resume, see why the parser read it that way, and fix it.
That feedback loop is the product value.

The Lite tier shows a compressed version of this map; the Pro tier shows it in full.
See **Product Tiers**.

### What the Parser Is

The parser is a **document reader**. Its job:

1. Extract every signal from the JD — required skills, knowledge, tools, responsibilities
2. Extract every signal from the resume — demonstrated skills, duration, context, action verbs
3. Map them against each other honestly
4. Report the gaps without editorializing

The parser has no opinion about whether the user is qualified, or what role they "should" be in.
It reports what the documents say. Low-weight evidence is handled by **scoring** (a skill in a
non-technical context scores lower), never by filtering signal out at extraction.

The one-sentence test before adding any filter, gate, or conditional:
> *"Am I reading the document, or am I deciding who the user is?"*

If it's the second one, it doesn't belong in the parser.

---

## Two Audiences, One Parser

Extraction, scoring, and inference are identical for both audiences. Only the **framing** of the
output and the emphasis of the suggestions differ.

**Audience 1 — Early-career** (new grads, students, bootcamp grads):
Gap is usually *claims without evidence* — skills listed but not demonstrated. Nat20 helps turn
a list of skills into evidence-backed bullets. Next-step plan: courses and projects.

**Audience 2 — Mid-career, career-changers, non-traditional workers:**
Gap is usually *evidence with weak framing* — senior work described with weak verbs ("helped,"
"worked on," "handled"). Nat20 helps reframe existing experience to reflect the work actually
done. Next-step plan: in-role experiences to seek over the coming months.

**Unifying frame:** *Nat20 helps you close the gap between your work and how your resume
describes it.*

**Unified product description (source of truth for all copy):**
> Nat20 reads your resume the way a hiring system does — looking for specific terms and evidence
> that support your claims. It surfaces the gaps between what you've done and what your resume says
> you've done, and helps you close them. For early-career users, that usually means turning a list
> of skills into evidence-backed bullets. For experienced users, it usually means reframing existing
> experience to reflect the work you actually did. The output is a clearer picture of where you
> stand against the job you want — and a concrete sense of what to change.

---

## Product Tiers

The tiers are **Lite** (free) and **Pro** (paid). The free tier is not the paid product
with handcuffs — it's the marketing: a curated, honest, compressed tease. See `PRODUCT_PHILOSOPHY.md`.

### Lite (free)
- Anonymous. No account, no Supabase writes. localStorage only if any client storage at all.
- **Unlimited parses — the limit is output depth, not call rate.**
- Resume view: top 5 skills by experience, with an "of N detected" teaser.
- Match view: closest matched skill gap; missing behavioral signals; cert/degree gap flagged as
  *existence only* (not the specific cert); teaser counts ("X other skills match but score low").
- Match score shown.
- Abuse-resistant by having nothing exploitable — users get what they get.

### Pro (paid)
- Account required (Supabase + Stripe).
- Full skill list with per-skill detail.
- Per-bullet fast fixes (BoostSection).
- Affiliate links and learning recommendations.
- Priority cards with full context.
- PDF resume upload.
- Resume save / load.

### Architecture of the split
A single conditional at the parse call: `isPaidUser ? parseResume() : parseResumeLite()`.
Two output shapes; the UI renders whichever it receives. The depth difference *is* the gate —
no separate locking, blurring, or rate-limiting logic.

### Pricing — open decision
Genuinely not finilized, and **it does not gate the publish deadline** (decide before charging, not
before publishing). Two live instincts, captured in `PRODUCT_PHILOSOPHY.md`:
- **One-time / time-boxed pass** (e.g. 90-day unlock) — respects the finite duration of a job hunt;
  the leading instinct.
- **Subscription** — secondary; if chosen, must let users leave cleanly (outcome-aligned cancel flow).
-STrip is currntly set up with a $9.99 / month subcription product

Stripe Checkout + webhook are already built; either model plugs into existing infrastructure.

### Affiliate and ads
- **Affiliate links run across both tiers** — but only where they can be honest. On the Lite tier
  that means only on what the tier actually reveals, never beside a withheld specific.
- **Ads are deferred until higher daily traffic.** 

### Launch posture (payments flag)
Stripe payments and the account UI are gated behind a Vercel environment flag. While the flag is
**false**, the live app runs in lite-feedback mode — payments and account features are hidden, so the
app is effectively lite-only and anonymous. Flipping the flag **true** exposes the Pro
upgrade path. This lets Nat20 publish and promote (Lite tier) before the paid tier and pricing
are finalized. The flag is a **temporary launch scaffold** and is removed for production once the
Pro tier goes live permanently.

---

## Scope Discipline

### In scope (Summer 2026)
- Tech roles: Software Engineering, ML/AI, Data Science
- US English JDs and resumes
- Single-user mode (one resume, one JD at a time)
- Web app (PWA-capable, no native wrapper)
- Two-tier model (Lite free / Pro paid); pricing model open
- Google OAuth + Stripe Checkout for the paid tier
- Supabase free tier for backend
- Affiliate links across both tiers

### Out of scope (defer to Fall 2026 or later)
- iOS/Android native apps; Chrome extension
- Multi-user / team / enterprise features
- Non-English language support
- Non-tech role libraries (Cyber, Finance, Healthcare)
- O*NET API integration (use static curated data)
- AI-powered (Claude API) parsing
- Resume builder / rewriter; job board features
- Ads (deferred until 10k daily traffic)

### Hard stops
- Do not add features not on this plan without updating the plan first
- Do not switch frameworks (stay React + Vite + Tailwind v4)
- Do not refactor working code without a test to protect against regressions
- Do not optimize before measurement
- Do not ship RLite-tier output that fails the respect test in `PRODUCT_PHILOSOPHY.md`

---

## Architecture

### Stack
- React 19 + Vite
- Tailwind CSS v4 + `@tailwindcss/vite`
- pdfjs-dist (client-side PDF text extraction)
- Vercel hosting (auto-deploy from `master`)
- Supabase — Google OAuth, Postgres (accounts, resume profiles), Edge Functions; free tier
  (use publishable key `sb_publishable_...`, not the legacy anon key)
- Stripe Checkout — paid-tier billing
- Plausible Analytics — privacy-respecting usage tracking
- Parsing is client-side

### Two-repo split
- **nat20-core** (private) — planning docs (source of truth)
- **jd-skill-parser** (public) — UI - code 

---Vercel cannot read the private repo, so core files are **copied** into the public repo's
`src/core/` and `data/`. When updating core: edit in nat20-core → copy to the public repo →
commit both. --- STALE COMMENT

### File structure
```
jd-skill-parser/  (public repo)
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── jd-skill-parser.jsx          # Main parser UI (3 signal types; auth + profile wired)
│   ├── components/
│   │   ├── SkillRow.jsx             # One row in the gap panel
│   │   ├── ResourceLink.jsx         # Affiliate resource links (gap cards)
│   │   ├── SignInButton.jsx         # Google OAuth sign-in
│   │   ├── UserMenu.jsx             # Signed-in user display
│   │   ├── StatBlock.jsx            # XP-bar skill row for profile page
│   │   ├── AppFooter.jsx            # Minimal legal footer
│   │   ├── HowToTour.jsx            # First-visit coach marks
│   │   ├── RookieResultsView.jsx    # Lite Match tab (free tier)
│   │   ├── RookieResumeView.jsx     # Lite Resume tab (free tier)
│   │   └── TierBadge.jsx            # Pro / Lite tier pill
│   │   # three-panel gap map layout is inline in jd-skill-parser.jsx
│   ├── pages/
│   │   ├── AccountPage.jsx          # /account — Profile + Account tabs
│   │   ├── PricingPage.jsx          # /pricing — upgrade
│   │   ├── LandingPage.jsx          # / — landing page
│   │   ├── PrivacyPage.jsx          # /privacy
│   │   └── TermsPage.jsx            # /terms
│   ├── core/                        # Deployment copy of nat20-core/src/
│   │   ├── registry.js
│   │   └── parser/
│   │       ├── inference.js
│   │       ├── decision.js
│   │       └── parseResumeLite.js       # Compressed output for Lite tier + computeLiteMatch()
│   └── lib/
│       ├── pdfExtract.js
│       ├── supabase.js              # client + save/load profile + plan status
│       ├── auth.js                  # signInWithGoogle, signOut, getOrCreateUser
│       ├── stripe.js                # Stripe Checkout redirect
│       └── analytics.js             # Plausible custom events
├── data/                            # Deployment copy of nat20-core/data/
│   ├── skills.json
│   ├── soft-skills.json
│   ├── roles.json
│   ├── resources.json
│   └── affiliates/                  # per-program JSON files (enabled toggle)
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # users + resume_profiles, RLS
│   └── functions/
│       ├── create-checkout/
│       ├── stripe-webhook/
│       └── create-portal-session/
├── tests/
├── vite.config.js                   # @core/@data aliases
└── package.json

nat20-core/  (private repo — parser logic + data + strategy)
├── src/
│   ├── registry.js
│   └── parser/
│       ├── inference.js             # Weighted evidence scoring (L1–L5)
│       ├── parseResume.js           # Resume extraction (full)
│       └── decision.js              # Match score + gap logic
├── data/
│   ├── skills.json
│   ├── soft-skills.json
│   ├── roles.json                   # reference only
│   ├── resources.json
│   └── affiliates/
└── docs/
    ├── master-plan-v5.md            # THIS FILE
    ├── PATH_TO_LAUNCH.md
    ├── PRODUCT_PHILOSOPHY.md
    ├── OPEN_TASKS.md
    ├── KNOWN_BUGS.md
    ├── completed_milestones.md
    ├── nat20-research-dive-scoring.md
    ├── project_study_findings.md
    └── affiliate_masterplan.md
```

### Cost triggers
First paid subscriber triggers Vercel Pro ($20/mo). Everything else stays free to ~5k MAU.
Stripe is 2.9% + $0.30 per transaction. Plausible upgrade at 10k+ pageviews/mo.

---

## Architecture Decisions (standing record)

Current standing rules. Each is something a future session might otherwise re-litigate or violate.

| Decision | Rationale |
|---|---|
| Parser runs client-side through launch | Zero backend cost; revisit at 1k+ MAU |
| Two-repo split (nat20-core private) | Parser logic + data are proprietary; UI is public |
| Deployment-copy pattern (`src/core/`, `data/`) | Vercel can't read the private repo; the copy is explicit and auditable |
| Parser reads the document, never judges the person | No role-type inference, no qualification verdicts — extraction keeps all signal; scoring weights it |
| roles.json is reference-only | Not used in parsing; kept for a possible future reference panel |
| The product surfaces evidence; it does not decide for the user | No apply / don't-apply verdict; the gap map is the output |
| Match score is shown alongside the gap map | Honest data builds trust (`PRODUCT_PHILOSOPHY.md`); it is not a standalone verdict that replaces the map |
| Two tiers: Lite (free) / Pro (paid); limit is output depth, not call rate | Lite tier is the marketing, not a crippled paid product |
| Affiliate links run across both tiers, only where honest | Recommendation must be correct before it is profitable |
| Ads deferred until 10k daily traffic; Lite ships ad-free | No point before real volume; an ad on the marketing surface disrespects the user |
| No public promotion until the accuracy gate closes (E15/E16 ≥ 85%) | Launching a wrong parser seeds bad word-of-mouth before the model earns trust |
| Bloom multipliers apply per-bullet | Averaged across matching bullet lines; avoids block-level upward inflation |
| Affiliate plugin architecture | Per-program JSON in `data/affiliates/` with an `enabled` toggle; new program = drop a file, zero code changes |
| Placeholder-URL guard in `getResources()` | Filters any URL containing `[` or `]`; prevents broken affiliate links rendering |
| Payments + account UI gated behind a Vercel env flag | Flag off = beta-feedback mode (Stripe + accounts hidden); lets Lite publish before the paid tier is final. Temporary launch scaffold — removed for production once Pro goes live |
| Stripe SDK pinned to v12.18.0 | v14 is incompatible with Supabase Edge Runtime |
| stripe-webhook runs with JWT verify off | Identity is verified via the Stripe signature, not a Supabase JWT |
| computeLiteMatch() split from parseResumeLite() | JD-dependent fields (matchScore, closestGap, missingBehavioral, teaserCounts) computed at render time, not parse time --- eliminates stale-score bug when resume is parsed before JD |
| getMatchScoreLabel() is a shared export | Single function in jd-skill-parser.jsx; imported by both GapAnalysisView and RookieResultsView. Thresholds: ≥70 Strong Match, ≥40 Moderate Match, <40 Weak Match |
| Behavioral signal filter applied at render, not data layer | parseResumeLite() returns allBehavioralSignals (all signals); RookieResumeView filters present=true at display time. Keeps the data shape honest; filters are a display concern |
| TierBadge component replaces hardcoded Beta pill | Single source of truth for tier display; renders Pro or Lite based on isPaidStatus prop. LandingPage hardcodes isPaidStatus={false} (correct --- public page has no auth) |

---

## The Roadmap

### Phases A–D ✅ Complete
Foundation, gap engine, accounts & persistence, payment infrastructure. Archived to
`completed_milestones.md`.

### Phase E — Publish-Ready (current)
Detailed sequencing and the exit gate live in `PATH_TO_LAUNCH.md`. In brief, Phase E delivers:
- **E15 / E16 — accuracy gate:** ≥ 85% exact+adjacent agreement on a fixture set spanning both
  audiences. Runs first; gates public promotion.
- **LITE-01 / 02 / 03 — the Lite tier:** `parseResumeLite()`, the single conditional + two
  output shapes, and hard gating enforcement (PDF upload, parse depth, save gated on isPaidStatus;
  limits.js deleted). Philosophy-aligned copy shipped as part of LITE-02.
- **GATE-01-CLEANUP:** remove the now-vestigial fast-fix hash-lock.
- **Fix-F:** consolidate the duplicated `normalizeSkillId()`.

**Exit gate:** all of the above merged, `npm test` green — before any Phase F promotion.

### Phase F — Publish + Promote
Sequence: NJIT (warm, controlled) → Reddit → LinkedIn → Product Hunt. Affiliate links render
across both tiers (where honest); FTC disclosure present.
**Done when:** Lite tier published, all four channels posted, ~100 unique visitors/week.
A paid conversion is a stretch outcome, not the bar.

### Phase G — Backlog (no gate, no date)
Pulled into future phases as capacity allows. Captures valuable work out of scope for the
summer goal.
- LLM-based extraction (scoped to paid tier to contain cost)
- Under-framing detection (weak verbs in high-scope contexts — serves the mid-career reframe)
- Pre/post-degree employment split in `classifyEvidenceType`
- Finance/business skill cluster expansion (skills.json beyond tech; 500+ entries)
- Skill substitution graph (implies / requiredBy)
- Shareable gap map URL + printable stat card
- Character sheet view (full skill inventory, XP bars) — see open question on its tier
- JD parser extraction from the 1842-line React file (`parseJobDescription` + `runGapAnalysis`)
- Categorized skills parsing (Format C); apostrophe-year date format
- Bias audit on a diverse fixture set
- Code cleanup: `escapeRegex`/`DUTY_HEADER_RE`/`LEVEL_TIPS` dedup; `score === 0` dead branch;
  CLAUDE.md spec-table refresh

---

## Operating Rules (Claude Code)

Full workflow is in `WORKFLOW_DESIGN.md`. The essentials:

- Every session starts from a task ID in `OPEN_TASKS.md`. If it's not on the plan, update the
  plan first.
- State the task ID, the files you expect to touch, and the Definition of Done before starting.
- Run `npm test` before committing; commit messages reference the task ID.
- **Claude Code controls** `jd-skill-parser/` (edits, tests, stages — Nicholas commits manually).
- **Nicholas controls** `nat20-core/` (reviews, commits, pushes). Agents never write there.
- Scope each task to one layer (Ingest, Taxonomy, Inference, Gap, Display).
- "Improve the app," "make it look better," "add more skills" are **not** tasks. A task names a
  specific change with a DoD.

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| Adding features mid-phase | Scope creep kills timelines | Note it in `backlog.md`, return after the phase |
| Rewriting code without tests | Regressions are invisible | Write the test first, then refactor |
| Optimizing before measurement | Wastes time on non-problems | Ship, measure with Plausible, optimize what's slow |
| App store before product-market fit | Apple fee + 30% cut + review delays | PWA installability is enough until 500+ DAU |
| AI/Claude API in the parser | Per-call cost; complicates the model | Rule-based parser through launch; AI is a Phase G feature |
| Building auth from scratch | Tar pit, security risk | Supabase Google OAuth only |
| Server-side parser before launch | Edge Function cost; complicates billing | Client-side through launch; revisit at 1k+ MAU |
| Committing `.env.local` or credentials | Security incident | Verify `.gitignore` before committing |
| Auto-parsing on load or navigation | Fires a parse with no user intent | Parse only on explicit click; start with empty textarea; never parse from `useEffect`/`onChange` |
| Lite-tier copy that fails the respect test | Insults the user; destroys the marketing | Re-read `PRODUCT_PHILOSOPHY.md`; reveal shape, never a fake wall |

---

## What Success Looks Like on August 31

- App produces a three-panel gap map for any JD + resume pair
- Lite tier published and live at nat20app.com — anonymous, depth-limited, honest, ad-free
- Promoted across all four channels (NJIT, Reddit, LinkedIn, Product Hunt)
- ~100 unique visitors in a week
- Vitest suite covers parser + inference + decision modules
- Pro tier functional (PDF, persistence, full report) — *optional by Aug 31*
- ≥ 1 paid conversion — *stretch, not the bar*
- I can explain the product, the moat, and the model in 30 seconds

---

## What Failure Looks Like — and What to Do

If by mid-August:
- **No visitors** → distribution failure. Direct outreach to NJIT, classmates, Reddit, LinkedIn.
- **Visitors but no engagement** → landing page or product confusion. Test the headline and the demo.
- **Engagement but the parser is wrong** → the accuracy gate didn't actually hold. Stop promoting,
  fix the specific failing fixtures, re-gate.

Failure is data, not death. The product survives because it costs $0 to keep running.

---

## Open Questions

- **Pricing model** — one-time/time-boxed pass vs subscription. Decide before charging.
- **Character sheet** — does it stay an Pro feature, fold into the full report, or drop?
  (Old paid tier included it; the current Pro spec doesn't name it.)
- **Personal LLC vs personal project** — defer until $500 MRR.

---

*End of master plan v5.*
*Sequencing → `PATH_TO_LAUNCH.md`. Principles → `PRODUCT_PHILOSOPHY.md`. Tasks → `OPEN_TASKS.md`.*
*Parsing math → `nat20-research-dive-scoring.md`. Affiliate strategy → `affiliate_masterplan.md`.*
*Phase history → `completed_milestones.md`.*
