# Fixture Schema — Resume Validation Fixtures

Each fixture is a pair of files:

```
{name}.txt          — the resume text (plain text, no PDF)
{name}.answers.json — the hand-labeled answer key
```

---

## Answer Key Shape

```json
{
  "meta": {
    "audience": "early-career" | "mid-career" | "career-changer",
    "notes": "one line describing what this fixture tests"
  },
  "skills": {
    "Python": { "level": 3, "minLevel": 2, "maxLevel": 4 },
    "SQL":    { "level": 2, "minLevel": 1, "maxLevel": 3 }
  },
  "behavioral": ["Collaboration", "Leadership"],
  "degree": {
    "degreeLevel": 2,
    "status": "completed" | "in_progress" | "expected"
  }
}
```

---

## Field Definitions

### meta
| Field    | Type   | Description |
|----------|--------|-------------|
| audience | string | One of: `early-career`, `mid-career`, `career-changer` |
| notes    | string | One sentence describing what edge case or scenario this fixture tests |

### skills
Keys are canonical skill names as they appear in `data/skills.json`.

| Field    | Type    | Description |
|----------|---------|-------------|
| level    | integer | Hand-labeled expected level (1–5) |
| minLevel | integer | Lowest acceptable level (inclusive) — defines the adjacent band |
| maxLevel | integer | Highest acceptable level (inclusive) — defines the adjacent band |

#### Agreement Definitions
- **EXACT** — parser output level matches `level` exactly
- **ADJACENT** — parser output level falls within `minLevel`–`maxLevel` inclusive (but not exact)
- **FAIL** — parser output level falls outside `minLevel`–`maxLevel`

The gate metric is: `(exact + adjacent) / total >= 85%`

#### Certified skills
Skills with `level: "certified"` are treated as present/absent only.
A parser result of `"certified"` counts as EXACT; any numeric level counts as FAIL.

### behavioral
Array of canonical behavioral signal names (from `data/soft-skills.json`).
Validation checks that each listed signal is present in parser output.
Extra signals in parser output do not count against the score.

### degree
| Field       | Type    | Description |
|-------------|---------|-------------|
| degreeLevel | integer | 1=Associate, 2=Bachelor, 3=Master, 4=PhD, null=none detected |
| status      | string  | One of: `completed`, `in_progress`, `expected` |

---

## Validation Script

Run with:
```
npm run validate:fixtures
```

Source: `scripts/validate-fixtures.js`

Exit code 0 = gate passes (exact+adjacent >= 85%)
Exit code 1 = gate fails

---

## Fixture Index

| File            | Audience       | Notes |
|-----------------|----------------|-------|
| new_grad        | early-career   | CS new grad, two internships, two projects, coursework as certifications |
| career_changer  | career-changer | Former teacher transitioning to SWE via bootcamp; project portfolio only, zero paid tech experience |
| senior_dev      | mid-career     | 7+ year backend engineer with multi-role recurrence and Bloom-Create verbs; surfaces weak-framing bug where JavaScript/SQL score L1 despite multi-year implied history (E16 accuracy gate target) |
