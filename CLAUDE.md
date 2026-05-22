# CLAUDE.md — JD Skill Parser

> Project memory for Claude Code. Every session and every subagent reads this.
> Goal: keep it ~1 page. Long = wasted context every turn.

## What this is
A rule-based job-description and resume **skill parser**. React + Vite, Tailwind CSS, JavaScript ES6+. Extracts skills, proficiency levels (L1–L5), and importance tiers, then runs gap analysis between a JD and a candidate resume. All parsing is **client-side, rule-based regex** — no backend, no API calls (yet).

## Working with me (the human)
- I am the **team lead / product owner**, and I am **learning** agentic architecture and engineering practice. I have a B.S. in Software Development and am an M.S. AI student, but I am light on production engineering depth.
- **Explain your reasoning** as you work — what you changed and why. Treat this as pairing, not just delivery.
- **Never guess or approximate** when I can hand you the exact source in under 5 minutes. Ask me for files, logins, or raw data instead.
- Before a complex task, give me a short checklist of anything *I* need to gather (files, portal logins, raw data). You handle analysis, writing, and code.
- I use **GitHub Desktop** for commits/PRs, not the git CLI. Stage your changes and leave them for me to review and commit there — don't run `git commit`/`git push` yourself unless I ask.

## Stack & layout
- Main file: `src/jd-skill-parser.jsx` — monolithic (all logic + components). Refactor candidate, but don't refactor unless asked.
- `src/index.css`, `src/index.html`, `vite.config.js`, `tailwind.config.js`, `package.json`
- Core data: `SKILL_DICTIONARY` (skill name → regex array, 120+ skills), `ROLE_TEMPLATES` (role → {critical, required, preferred}).
- Key functions: `parseJobDescription()`, `parseResumeText()`, `runGapAnalysis()`, `parseJobMeta()`.

## Run / build
- Dev: `npm run dev` → Vite dev server at http://localhost:5173
- Build: `npm run build`
- Deploy: I push `master` via GitHub Desktop → Vercel auto-builds. **Do not deploy; that's automatic on my commit.**
- Tests: **none yet** (v1 has no automated test suite — adding Vitest is welcome when asked).

## Known bugs (the live backlog — confirm before "fixing" anything else)
1. **Matched-skills logic**: currently counts a skill as "matched" even when resume level << required level. Should only match when resume level ≥ required level.
2. **Job type detection**: `parseJobMeta()` may misdetect "Internship" when the JD says "Full-time" (regex order issue).
3. **False positives**: aliases like "spring", "flask", "express", "next" match unrelated common words. Needs context-aware filtering.
4. **Importance detection**: without clear section headers, all skills default to "Required."

## Conventions
- Don't add dependencies without telling me first and why.
- Keep parsing client-side; no API keys in frontend.
- Small, reviewable diffs. One concern per change.
- After any change: confirm `npm run dev` still loads and the relevant tab renders.
