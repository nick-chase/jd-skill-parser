# Nat20 — Master Plan v3

> **Working name:** Nat20 (internal). Public launch name TBD.
> **Tagline:** Skill-based job matching, leveled.
> **Live:** https://jd-skill-parser.vercel.app
> **Repo:** https://github.com/nick-chase/jd-skill-parser
> **Owner:** Nicholas Chase (NJIT M.S. AI, 2026–2027)
> **Plan version:** v3 — supersedes resumematch-master-plan-v2.md
> **Last updated:** May 30, 2026

---

## The Goal (One Sentence)

**By August 31, 2026, Nat20 produces recurring revenue from paying subscribers, without depending on that revenue to operate.**

The plan below is the path. Every session must serve this goal or be deferred.

---

## The Product Thesis

Most resume tools answer: *"How well does your resume match this job?"*

Nat20 answers: **"Should you apply to this job, and if not, what should you do instead?"**

The output is a **decision**, not a number:

| Decision | When | What it shows |
|---|---|---|
| **Apply Now** | Resume demonstrates required level for all Critical and Required skills | Strengths list, optional polish hints |
| **Apply With Edits** | Skills present but evidence language is weak | Specific resume rewrite suggestions |
| **Build Skill First** | One or more Critical skills absent or underdeveloped | Skill gap with priority order |
| **Consider Adjacent Role** | Strong match for a related role, weak for this one | Suggested redirect with match score |

This decision logic is the entire moat. Without it, Nat20 is one of 50 resume scanners. With it, Nat20 is the app that gives users an actionable answer.

---

## Scope Discipline

### In Scope (Summer 2026)
- Tech roles only: Software Engineering, ML/AI, Data Science
- US English JDs and resumes only
- Single-user mode (one resume, one JD at a time)
- Web app (PWA-capable, no native wrapper)
- Freemium pricing model
- Google OAuth + Stripe Checkout for payments
- Supabase free tier for backend

### Out of Scope (Defer to Fall 2026 or later)
- iOS or Android native apps (Capacitor wrap)
- Chrome extension
- Multi-user / team / enterprise features
- Non-English language support
- Non-tech role libraries (Cyber, Finance, Healthcare)
- O*NET API integration (use static curated data for now)
- AI-powered parsing (Claude API integration)
- Resume builder / rewriter
- Job board / aggregator features

### Hard Stops — Do Not Do This Summer
- Do not add features not on this plan without updating the plan first
- Do not switch frameworks (stay React + Vite + Tailwind v4)
- Do not refactor working code without a test to protect against regressions
- Do not pursue any monetization path other than freemium subscription
- Do not optimize before measurement

---

## Architecture (Current + Target)

### Current Stack
- React 18 + Vite
- Tailwind CSS v4 + `@tailwindcss/vite` plugin
- pdfjs-dist (client-side PDF text extraction)
- Vercel hosting (auto-deploy from `master`)
- GitHub (public repo)
- All parsing client-side, no backend yet

### Target Stack (by August 31)
- Everything above, plus:
- **Supabase** — auth (Google OAuth), Postgres (saved JDs/resumes/comparisons), free tier
- **Stripe Checkout** — subscription billing
- **Plausible Analytics** — privacy-respecting usage tracking ($9/mo or self-host free)

### File Structure (Target)
```
nat20/
├── src/
│   ├── App.jsx                      # Root component + router
│   ├── pages/
│   │   ├── ParserPage.jsx           # The current 4-tab parser UI
│   │   ├── HistoryPage.jsx          # User's saved comparisons
│   │   ├── AccountPage.jsx          # Sign in, billing, settings
│   │   └── LandingPage.jsx          # Public marketing page
│   ├── components/
│   │   ├── tabs/
│   │   │   ├── JDTab.jsx
│   │   │   ├── ResumeTab.jsx
│   │   │   ├── MatchTab.jsx
│   │   │   └── ReferenceTab.jsx
│   │   ├── DecisionCard.jsx         # Apply / Edits / Build / Redirect
│   │   └── ...
│   ├── lib/
│   │   ├── registry.js              # Skills + roles data seam
│   │   ├── parser/
│   │   │   ├── parseJD.js
│   │   │   ├── parseResume.js
│   │   │   ├── inference.js         # Weighted evidence scoring
│   │   │   └── decision.js          # Apply / Edits / Build / Redirect logic
│   │   ├── supabase.js              # Supabase client
│   │   └── stripe.js                # Stripe client
│   └── main.jsx
├── data/
│   ├── skills.json                  # 250+ skills (Lightcast-aligned subset)
│   └── roles.json                   # 15–20 tech role templates
├── docs/
│   ├── master-plan-v3.md            # THIS FILE
│   ├── scoring-model.md             # Weighted evidence formula
│   └── architecture.md
├── tests/
│   ├── parser.test.js               # Vitest suite
│   ├── inference.test.js
│   ├── decision.test.js
│   └── fixtures/                    # Sample JDs and resumes
├── public/
│   └── manifest.json                # PWA manifest
└── package.json
```

---

## The 13-Week Roadmap

### Phase A — Foundation Hardening (Weeks 1–2: June 1 – June 14)

**Definition of done:** No embarrassing bugs. Existing functionality is tested. Skill coverage is wide enough for diverse tech JDs.

**Tasks:**

| # | Task | DoD | Files |
|---|------|-----|-------|
| A1 | Set up Vitest test runner | `npm run test` runs and passes 1 example test | `vitest.config.js`, `tests/example.test.js`, `package.json` |
| A2 | Write parser tests for current behavior | 10 tests cover parseJD output for the 10 existing JD fixtures | `tests/parser.test.js`, `tests/fixtures/` |
| A3 | Fix guardWords false positives | "spring", "flask", "express", "next" no longer match unrelated text; regression test added | `src/lib/parser/parseJD.js`, `tests/parser.test.js` |
| A4 | Expand skills.json to 250 entries | At least 250 skills total, Lightcast-aligned where possible | `data/skills.json` |
| A5 | Add coverage gap report | `npm run test:coverage-gaps` outputs unmatched terms from JD test bank | `scripts/coverage-gaps.js` |

**Verification:** All 10 JD fixtures parse with >85% of relevant skills caught. No false positives on the guardWords set.

---

### Phase B — The Decision Engine (Weeks 3–5: June 15 – July 5)

**This is the most important phase.** Without it, Nat20 is undifferentiated. With it, Nat20 has a reason to charge money.

**Definition of done:** A user pasting a JD and resume gets back one of four decisions with a defensible rationale and specific action items.

**Tasks:**

| # | Task | DoD | Files |
|---|------|-----|-------|
| B1 | Implement `parseDateRange()` | Handles "2022–2024", "Jan 2023 – Present", "6 months", "2023 to present"; returns months as integer | `src/lib/parser/inference.js`, `tests/inference.test.js` |
| B2 | Implement `classifyEvidenceType()` | Returns W_type weight based on section name + role title (intern/contract/etc.) | `src/lib/parser/inference.js`, `tests/inference.test.js` |
| B3 | Implement `scoreSkillEvidence()` | Per scoring-model.md: returns `{ score, level, primarySignal, suggestion }` for an array of evidence instances | `src/lib/parser/inference.js`, `tests/inference.test.js` |
| B4 | Wire weighted scoring into resume parsing | Resume skill levels now derived from weighted evidence, not section default | `src/lib/parser/parseResume.js` |
| B5 | Implement decision logic | `getDecision(jdProfile, resumeProfile) → 'apply' | 'edits' | 'build' | 'redirect'` with rationale | `src/lib/parser/decision.js`, `tests/decision.test.js` |
| B6 | Build DecisionCard component | Prominent card on Match tab showing decision + colored badge + rationale + top 3 action items | `src/components/DecisionCard.jsx` |
| B7 | Per-skill action suggestions | Each missing/weak skill shows specific "what to do" text (e.g., "Add duration to your project description") | `src/components/SkillRow.jsx` |
| B8 | Entry-level calibration | Compare against entry-level JD expectations for student users (detect via L2-cap or "intern" language in resume) | `src/lib/parser/decision.js` |

**Verification:** Hand-test 5 real student resumes against 5 real entry-level JDs. A career counselor (or yourself, honestly) would agree with at least 4 out of 5 decisions.

---

### Phase C — Accounts & Persistence (Weeks 6–7: July 6 – July 19)

**Definition of done:** Users can sign in with Google, save comparisons, and return to see their history.

**Tasks:**

| # | Task | DoD | Files |
|---|------|-----|-------|
| C1 | Set up Supabase project | Project created, env vars in `.env.local`, Supabase client initialized | `src/lib/supabase.js`, `.env.example` |
| C2 | Implement Google OAuth | "Sign in with Google" button works, returns user session | `src/components/SignInButton.jsx`, `src/lib/auth.js` |
| C3 | Database schema | Tables: `users`, `saved_jds`, `saved_resumes`, `comparisons`; RLS policies enforced | Supabase dashboard + migration file in `supabase/` |
| C4 | Save comparison on parse | After Match runs, optionally save the comparison to user's history | `src/pages/ParserPage.jsx` |
| C5 | History page | List of past comparisons with date, JD title, decision; click to view full | `src/pages/HistoryPage.jsx` |
| C6 | Account page | Show signed-in user, sign-out button, placeholder for billing | `src/pages/AccountPage.jsx` |
| C7 | Routing | React Router added; routes `/`, `/history`, `/account`, `/pricing` work | `src/App.jsx` |

**Verification:** Sign in → run a parse → see it in history → sign out → sign back in → history still there.

---

### Phase D — Freemium Limits & Payment (Weeks 8–9: July 20 – August 2)

**Definition of done:** Free users hit a daily limit. Paid users get unlimited. Stripe processes real subscriptions.

**Tasks:**

| # | Task | DoD | Files |
|---|------|-----|-------|
| D1 | Define free tier limits | 3 JD parses/day, unlimited resume parses, 7-day comparison history; documented in code | `src/lib/limits.js` |
| D2 | Implement usage tracking | Increment counter on each JD parse; reset daily; surface remaining count in UI | `src/lib/limits.js`, Supabase function |
| D3 | Set up Stripe | Stripe account created, test mode, product + price created ($4.99/mo) | Stripe dashboard, `src/lib/stripe.js` |
| D4 | Stripe Checkout integration | Click "Upgrade" → Stripe Checkout → return to app as paid user | `src/pages/PricingPage.jsx`, Supabase Edge Function for webhook |
| D5 | Subscription state | `users.is_paid` flag flips on successful Stripe webhook; UI respects it | Supabase webhook handler |
| D6 | Upgrade prompts | When free user hits limit, show clear, non-pushy upgrade card | `src/components/UpgradePrompt.jsx` |
| D7 | Customer portal | Paid users can manage/cancel subscription via Stripe Customer Portal link | `src/pages/AccountPage.jsx` |

**Verification:** Sign up as a test user → hit the daily limit → upgrade via Stripe test card → unlimited parses work → cancel via portal → reverts to free.

**Pricing:** $4.99/month, no annual option yet (introduce later when you have data). Free tier is the marketing.

---

### Phase E — Launch & Distribution (Weeks 10–11: August 3 – August 16)

**Definition of done:** Real users beyond your immediate network. At least one paying subscriber.

**Tasks:**

| # | Task | DoD |
|---|------|-----|
| E1 | Build a real landing page | `/` route shows hero, decision-output demo, pricing, FAQ; not just the parser |
| E2 | Add Plausible Analytics | Tracking installed; can see daily visitors, top pages, conversion events |
| E3 | Write launch post for r/cscareerquestions | 500–800 words, focuses on "the app that tells you whether to apply"; not spammy |
| E4 | Write launch post for r/csMajors | Slightly different angle, more student-focused |
| E5 | LinkedIn announcement | Personal post with screenshots, link, brief origin story |
| E6 | Product Hunt submission | Page prepared 2 weeks ahead, launch on a Tuesday |
| E7 | NJIT outreach | Email NJIT career services + AI Master's cohort; offer free tier or codes |
| E8 | Add link to resume + email signature | Bullet on your resume + link in every email you send |
| E9 | Privacy policy + Terms of Service | Required for payment processors and app stores later; use a generator |

**Verification:** Plausible shows 100+ unique visitors in week 11. At least 1 paying subscriber. At least 5 free signups.

---

### Phase F — Iterate from Real Usage (Weeks 12–13: August 17 – August 31)

**Definition of done:** You've shipped at least 3 improvements based on real user feedback. End-of-summer revenue is recurring (even if small).

**Tasks:**

| # | Task | DoD |
|---|------|-----|
| F1 | Review Plausible weekly | Identify the most-visited page, the highest-bounce page, the conversion path |
| F2 | Personal outreach to every paid user | Email or message thanking them, asking what could be better |
| F3 | Triage feedback into bugs vs. features | Bug list, feature wish list, prioritized |
| F4 | Ship top 3 fixes from real feedback | Concrete improvements based on what users actually said |
| F5 | Write a retrospective | What worked, what didn't, what's next for fall |

**End-of-summer outcome:** Working SaaS with at least one paying subscriber and a clear list of what to build in fall.

---

## Realistic Revenue Projections

| Scenario | Paid users by Aug 31 | Monthly recurring | Annual run rate |
|---|---|---|---|
| Pessimistic | 5 | $25 | $300 |
| Realistic | 15 | $75 | $900 |
| Optimistic | 40 | $200 | $2,400 |

**Costs to run:** $0 until ~50k MAU (Vercel free, Supabase free, Stripe transactional only, Plausible $9/mo).

This means: at 5 paid users you are profitable. At 15 you are paying for one nice dinner per month. The goal isn't to get rich — it's to prove the model and have something real on your resume by the time you graduate.

---

## Rules for Every Claude Code Session

**Every session must start with one of these tasks from the roadmap, by task ID.** If a task isn't on the plan, the plan is updated before the work begins.

### Session protocol
1. State the task ID you're working on (e.g., "Starting Task B3")
2. State which files you expect to touch
3. State the Definition of Done from this plan
4. Verify Tailwind v4 is loading before any UI work (test with a red div)
5. Run `npm run test` before committing
6. Commit messages reference the task ID (e.g., `feat(B3): implement scoreSkillEvidence`)

### Things that are not tasks
- "Improve the app"
- "Make it look better"
- "Add more skills"
- "Refactor the parser"

### Things that ARE tasks
- "Implement parseDateRange per scoring-model.md (Task B1)"
- "Wire Stripe Checkout into the upgrade flow (Task D4)"
- "Fix the guardWords false positive in parseJD (Task A3)"

### When stuck
1. Re-read the active task's Definition of Done
2. Check if a dependency from an earlier phase is missing
3. If genuinely blocked, **stop and update the plan** — don't improvise

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| Adding features mid-phase | Scope creep kills timelines | Note the idea in `docs/backlog.md`, return to it after the phase |
| Rewriting code without tests | Regressions are invisible | Write the test first, then refactor |
| Optimizing before measurement | Wastes time on non-problems | Ship, measure with Plausible, optimize what's slow |
| Pursuing app store before product-market fit | $99/yr Apple fee + 30% cut + review delays | PWA installability is enough until you have 500+ DAU |
| Adding AI/Claude API to parser | Costs money per call, complicates pricing model | Keep rule-based parser as the free tier; AI is a v2 feature |
| Building auth from scratch | Tar pit, security risks | Supabase Google OAuth only |
| Pricing too high at launch | Kills conversion when you have no brand | Start at $4.99, raise after 50 subscribers |
| Skipping the landing page | Parser-only UX confuses non-technical visitors | Build a real landing page in Phase E |

---

## Open Questions to Resolve Before Each Phase

### Before Phase B (Decision Engine)
- What does "Apply With Edits" actually offer? Generic rewrite hints, or AI-generated text? **Decision needed by June 14.**
- How do we test the decision output is "right"? Manual review of 5 fixtures, or hire a career counselor for a 1-hour review? **Decision needed by June 28.**

### Before Phase D (Payment)
- Is $4.99 the right launch price? Check competitors (SkillSyncer, RoleReady) one more time before locking it in.
- Annual plan from day one, or wait? **Default: wait. Add annual at $39/year once you have 25 monthly subscribers.**

### Before Phase E (Launch)
- What's the public name? Still Nat20, or rename for launch? **Decision needed by August 1.**
- Personal LLC, or operate as a personal project? **Defer until $500 MRR.**

---

## What Success Looks Like on August 31

- ✅ App produces a decision (not just a number) for any JD + resume pair
- ✅ At least 1 paying subscriber (ideally 5–15)
- ✅ At least 100 unique visitors in a week
- ✅ Vitest suite covers parser + inference + decision modules
- ✅ User accounts, history, and Stripe billing all functional
- ✅ Live on Vercel under custom domain (optional but nice)
- ✅ You can explain the product, the moat, and the business model in 30 seconds

---

## What Failure Looks Like — and What to Do About It

If by August 15 you have:
- Zero paying users → **Pricing is fine, distribution is broken.** Spend Phase F on outreach, not features.
- Visitors but no signups → **Landing page or product confusion.** A/B test the headline and the demo.
- Signups but no paid → **Free tier too generous, or paid features unclear.** Tighten free limits or improve upgrade prompts.
- No visitors at all → **Distribution failure.** Direct outreach to NJIT, classmates, Reddit, LinkedIn.

Failure is data, not death. The product survives because it costs $0 to keep running.

---

## Memory & Continuity

This plan is the source of truth. Update it (not chat memories or scattered notes) when:
- A task is completed (mark with ✅ and date)
- A task changes scope (edit Definition of Done)
- A new task is added (it must fit a phase or be deferred to "fall 2026")
- A decision is made on an open question

Commit this file with every meaningful change. The git history is the project journal.

---

*End of master plan v3. Open `docs/scoring-model.md` for the parsing math. Open the roadmap above for what to ship next.*
