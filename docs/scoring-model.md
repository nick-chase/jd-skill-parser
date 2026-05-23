# ResumeMatch — Skill Competency Scoring Model

> Reference document for `core/inference.js` implementation.
> This model produces a weighted composite score per skill from resume evidence.
> Score maps to L1–L5 proficiency level used in gap analysis and role readiness output.

---

## The Core Problem

Resume parsers that match keywords treat all evidence equally.
A skill listed in a summary carries the same weight as a skill used for 3 years across two jobs.
This produces false proficiency levels — especially for students and early-career users.

This model fixes that by treating skill evidence as a **weighted composite**:
evidence type × duration × recurrence = competency score per skill.

---

## The Formula

For each skill found on a resume, collect all evidence instances and compute:

  Skill Score = SUM over all instances of (W_type × M_duration) × M_recurrence

Where:
  W_type       = evidence type weight (see table below)
  M_duration   = duration modifier for that specific evidence instance
  M_recurrence = single multiplier based on count of distinct contexts

---

## Lookup Tables

### Evidence Type Weight (W_type)

| Evidence Type          | Weight | Detection Signal                                      |
|------------------------|--------|-------------------------------------------------------|
| Job history (FT)       | 1.0    | Role with employer + date range in Experience section |
| Contract / internship  | 0.7    | "intern", "contract", "temp", "co-op" in role title   |
| Personal project       | 0.5    | Projects section, no employer, personal GitHub        |
| Academic / coursework  | 0.4    | Education section, "course", "class", "capstone"      |
| Skills section only    | 0.1    | Skill mentioned only in Skills/Summary, no context    |

### Duration Modifier (M_duration)

| Duration Detected      | Job History | Project |
|------------------------|-------------|---------|
| Not stated / unknown   | 0.5         | 0.4     |
| < 6 months             | 0.6         | 0.5     |
| 6–12 months            | 0.8         | 0.6     |
| 1–2 years              | 1.0         | 0.7     |
| 2–4 years              | 1.3         | —       |
| 4+ years               | 1.5         | —       |

### Recurrence Multiplier (M_recurrence)

| Distinct Contexts Skill Appears In | Multiplier |
|------------------------------------|------------|
| 1                                  | 1.0        |
| 2                                  | 1.2        |
| 3+                                 | 1.4        |

---

## Score → Proficiency Level Map

| Score Range | Level | Label        | Meaning                                      |
|-------------|-------|--------------|----------------------------------------------|
| 0.00 – 0.30 | L1    | Awareness    | Mentioned but no supporting evidence         |
| 0.30 – 0.60 | L2    | Novice       | Limited exposure; project or coursework only |
| 0.60 – 1.10 | L3    | Intermediate | Sustained use; internship or multiple projects |
| 1.10 – 1.80 | L4    | Advanced     | Multi-year job history or high recurrence    |
| 1.80+       | L5    | Expert       | Extended sustained use across many contexts  |

---

## Worked Examples

### Example 1 — Student with internship + projects (Python)

Evidence instances:
  1. Internship 6 months:        W=0.7 × M=0.8 = 0.56
  2. Personal project 3 months:  W=0.5 × M=0.6 = 0.30
  3. Skills section mention:     W=0.1 × M=0.5 = 0.05

Recurrence = 3 contexts → M_recurrence = 1.4

Score = (0.56 + 0.30 + 0.05) × 1.4 = 0.91 × 1.4 = 1.27 → L4 Advanced

Interpretation: credible for an active intern + project builder.

---

### Example 2 — Skill listed only, no history

Evidence instances:
  1. Skills section only:        W=0.1 × M=0.5 = 0.05

Recurrence = 1 context → M_recurrence = 1.0

Score = 0.05 × 1.0 = 0.05 → L1 Awareness

Interpretation: resume does not support a higher claim.
App message: "Add duration and outcomes to raise this score."

---

### Example 3 — 3-year full-time job (SQL)

Evidence instances:
  1. Full-time 3 years:          W=1.0 × M=1.3 = 1.30
  2. Personal project (no date): W=0.5 × M=0.4 = 0.20

Recurrence = 2 contexts → M_recurrence = 1.2

Score = (1.30 + 0.20) × 1.2 = 1.50 × 1.2 = 1.80 → L5 Expert

---

## What the App Should Communicate to Users

For each skill in the gap analysis, show:

  {Skill} — {Level Label}
  Evidence: {count} instance(s) found
  Strongest signal: {evidence type} ({duration if known})
  To improve: {actionable suggestion}

Example output:
  Python — L2 Novice
  Evidence: 1 project found, no duration stated
  To improve: Add duration and a specific outcome to your project description.

Example output:
  SQL — L4 Advanced
  Evidence: 2-year internship + 1 personal project
  Strongest signal: Sustained job history (2 years)

---

## Uncertainty Handling

| Situation                             | Behavior                                              |
|---------------------------------------|-------------------------------------------------------|
| No date range found in job history    | Apply M_duration = 0.5 (unknown), flag for user       |
| Project with no duration stated       | Apply M_duration = 0.4 (unknown), suggest adding date |
| Skill in summary but no context found | W_type = 0.1 (Skills section only)                   |
| Conflicting signals                   | Use highest W_type instance for primary display       |
| Duration spans present date           | Calculate from start to today                         |

---

## Implementation Notes (for core/inference.js)

Three functions needed:

1. parseDateRange(text) → durationMonths | null
   - Handle: "2022–2024", "Jan 2023 – Present", "2023 to present", "6 months"
   - Return months as integer; null if unparseable

2. classifyEvidenceType(sectionName, roleTitle) → W_type
   - sectionName: "experience" | "projects" | "education" | "skills" | "summary"
   - roleTitle: check for "intern", "contract", "co-op", "temp"

3. scoreSkillEvidence(instances[]) → { score, level, primarySignal, suggestion }
   - instances[]: array of { W_type, durationMonths, sectionName }
   - Returns final score, mapped level, strongest signal, user-facing suggestion

---

## Phrase Signals (Additive Modifier)

In addition to structural evidence, phrase-level signals from bullet points
add a small additive boost to the base score:

| Phrase Pattern                                  | Boost |
|-------------------------------------------------|-------|
| "led", "architected", "owned", "designed"       | +0.2  |
| "built", "developed", "implemented", "created"  | +0.1  |
| "used", "worked with", "applied"                | +0.0  |
| "familiar with", "exposure to", "introductory"  | -0.1  |
| "basic", "some knowledge of"                    | -0.1  |

These are capped: phrase boosts cannot raise a score above the next level threshold
without structural evidence to support it.

