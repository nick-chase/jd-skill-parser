import { describe, test, expect } from 'vitest'
import { getDecision } from '../../src/lib/parser/decision.js'

// ---------------------------------------------------------------------------
// Helpers — minimal synthetic profiles so tests don't depend on the parser
// ---------------------------------------------------------------------------

function jdSkill(name, { importance = 4, level = 3 } = {}) {
  return { name, category: 'Test', importance, level }
}

function resumeSkill(name, { level = 3, score = 0.8 } = {}) {
  return { name, category: 'Test', level, score, source: 'Experience', suggestion: '' }
}

function makeJD(skills) {
  return { technicalSignals: skills, behavioralSignals: [], jobDuties: [] }
}

function makeResume(skills) {
  return { technicalSignals: skills, behavioralSignals: [] }
}

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('getDecision() — return shape', () => {
  const jd     = makeJD([jdSkill('Python')])
  const resume = makeResume([resumeSkill('Python')])

  test('returns an object with decision, rationale, actions, matchScore', () => {
    const result = getDecision(jd, resume)
    expect(result).toHaveProperty('decision')
    expect(result).toHaveProperty('rationale')
    expect(result).toHaveProperty('actions')
    expect(result).toHaveProperty('matchScore')
  })

  test('decision is one of the four valid values', () => {
    const { decision } = getDecision(jd, resume)
    expect(['apply', 'edits', 'build', 'redirect']).toContain(decision)
  })

  test('rationale is a non-empty string', () => {
    const { rationale } = getDecision(jd, resume)
    expect(typeof rationale).toBe('string')
    expect(rationale.length).toBeGreaterThan(0)
  })

  test('actions is an array of strings (0–3 items)', () => {
    const { actions } = getDecision(jd, resume)
    expect(Array.isArray(actions)).toBe(true)
    expect(actions.length).toBeGreaterThanOrEqual(0)
    expect(actions.length).toBeLessThanOrEqual(3)
    for (const a of actions) expect(typeof a).toBe('string')
  })

  test('matchScore is a number between 0 and 100', () => {
    const { matchScore } = getDecision(jd, resume)
    expect(typeof matchScore).toBe('number')
    expect(matchScore).toBeGreaterThanOrEqual(0)
    expect(matchScore).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// B5 — 'apply' decision
// ---------------------------------------------------------------------------

describe("getDecision() — 'apply'", () => {
  test('all required skills met at or above required level → apply', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('SQL',    { importance: 4, level: 2 }),
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('SQL',    { level: 3 }), // exceeds required
    ])
    expect(getDecision(jd, resume).decision).toBe('apply')
  })

  test('required skills met + bonus skills on resume → still apply', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 2 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('React',  { level: 2 }),
    ])
    expect(getDecision(jd, resume).decision).toBe('apply')
  })

  test('matchScore equals 100 when all JD skills are met', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 2 }),
      jdSkill('Git',    { importance: 4, level: 1 }),
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('Git',    { level: 2 }),
    ])
    expect(getDecision(jd, resume).matchScore).toBe(100)
  })

  test('preferred-only gaps (importance < 4) do not block apply', () => {
    const jd = makeJD([
      jdSkill('Python',  { importance: 5, level: 2 }),
      jdSkill('GraphQL', { importance: 3, level: 2 }), // preferred, not required
    ])
    const resume = makeResume([resumeSkill('Python', { level: 3 })])
    // GraphQL missing but it's only preferred → should still be apply
    expect(getDecision(jd, resume).decision).toBe('apply')
  })
})

// ---------------------------------------------------------------------------
// B5 — 'edits' decision
// ---------------------------------------------------------------------------

describe("getDecision() — 'edits'", () => {
  test('required skill present but below required level → edits', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('SQL',    { importance: 4, level: 3 }),
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // met
      resumeSkill('SQL',    { level: 2 }), // present but L2 < required L3
    ])
    expect(getDecision(jd, resume).decision).toBe('edits')
  })

  test('single required skill at L1 (weak evidence) → edits', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 3 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 1, score: 0.04 }), // present but very weak
    ])
    expect(getDecision(jd, resume).decision).toBe('edits')
  })

  test('actions list is non-empty for edits decision', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 3 })])
    const resume = makeResume([resumeSkill('Python', { level: 2 })])
    const { actions } = getDecision(jd, resume)
    expect(actions.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// B5 — 'build' decision
// ---------------------------------------------------------------------------

describe("getDecision() — 'build'", () => {
  test('one required skill completely absent → build', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('Docker', { importance: 5, level: 2 }),
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // met
      // Docker is missing from resume
    ])
    expect(getDecision(jd, resume).decision).toBe('build')
  })

  test('critical skill missing even when match score is otherwise decent → build', () => {
    const jd = makeJD([
      jdSkill('Python',    { importance: 5, level: 3 }),
      jdSkill('SQL',       { importance: 4, level: 2 }),
      jdSkill('TensorFlow',{ importance: 5, level: 2 }), // critical, absent
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('SQL',    { level: 3 }),
    ])
    expect(getDecision(jd, resume).decision).toBe('build')
  })

  test('actions include the missing critical skill name', () => {
    const jd = makeJD([jdSkill('Docker', { importance: 5, level: 2 })])
    const resume = makeResume([])
    const { actions } = getDecision(jd, resume)
    const actionText = actions.join(' ')
    expect(actionText).toMatch(/Docker/i)
  })

  test('all JD skills missing (empty resume) → build, matchScore = 0', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('SQL',    { importance: 4, level: 2 }),
    ])
    const resume = makeResume([])
    const result = getDecision(jd, resume)
    expect(result.decision).toBe('build')
    expect(result.matchScore).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// B5 — 'redirect' decision
// ---------------------------------------------------------------------------

describe("getDecision() — 'redirect'", () => {
  test('match score < 25% with 5+ JD skills → redirect', () => {
    const jd = makeJD([
      jdSkill('Python',   { importance: 5, level: 3 }),
      jdSkill('Docker',   { importance: 5, level: 2 }),
      jdSkill('Kafka',    { importance: 4, level: 2 }),
      jdSkill('Airflow',  { importance: 4, level: 2 }),
      jdSkill('Spark',    { importance: 4, level: 2 }),
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // only 1 of 5 matched
    ])
    expect(getDecision(jd, resume).decision).toBe('redirect')
  })

  test('fewer than 5 JD skills does not trigger redirect (fall through to build)', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('Docker', { importance: 5, level: 3 }),
    ])
    const resume = makeResume([]) // 0 / 2 = 0%, but only 2 JD skills
    const result = getDecision(jd, resume)
    expect(result.decision).not.toBe('redirect')
    expect(result.decision).toBe('build')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('getDecision() — edge cases', () => {
  test('empty JD and empty resume → apply (nothing required, nothing missing)', () => {
    const result = getDecision(makeJD([]), makeResume([]))
    expect(result.decision).toBe('apply')
    expect(result.matchScore).toBe(100)
  })

  test('empty JD signals → apply regardless of resume content', () => {
    const resume = makeResume([resumeSkill('Python')])
    const result = getDecision(makeJD([]), resume)
    expect(result.decision).toBe('apply')
  })

  test('null-safe: returns a result when jdProfile has no technicalSignals', () => {
    const result = getDecision({ technicalSignals: null }, { technicalSignals: [] })
    expect(result).toHaveProperty('decision')
  })
})

// ---------------------------------------------------------------------------
// B8 — Entry-level calibration
// ---------------------------------------------------------------------------

describe('getDecision() — isEntryLevel detection', () => {
  test('returns isEntryLevel field', () => {
    const result = getDecision(makeJD([]), makeResume([]))
    expect(result).toHaveProperty('isEntryLevel')
    expect(typeof result.isEntryLevel).toBe('boolean')
  })

  test('isEntryLevel true when all resume skills are L1', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 1 }),
      resumeSkill('SQL',    { level: 1 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(true)
  })

  test('isEntryLevel true when all resume skills are L2', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 2 }),
      resumeSkill('Docker', { level: 2 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(true)
  })

  test('isEntryLevel true when resume is empty', () => {
    expect(getDecision(makeJD([]), makeResume([])).isEntryLevel).toBe(true)
  })

  test('isEntryLevel false when any skill is L3', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('SQL',    { level: 1 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(false)
  })

  test('isEntryLevel false when any skill is L4 or L5', () => {
    const resume = makeResume([resumeSkill('Python', { level: 4 })])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(false)
  })
})

describe("getDecision() — B8 entry-level calibration thresholds", () => {
  // ---- Required (importance=4) missing ----

  test('entry-level + required skill missing → edits, not build', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 2 }), // critical — met
      jdSkill('Docker', { importance: 4, level: 2 }), // required — missing
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 2 }), // L2 resume → entry-level
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.decision).toBe('edits')
  })

  test('non-entry-level + required skill missing → build', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 2 }),
      jdSkill('Docker', { importance: 4, level: 2 }), // required — missing
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // L3 resume → NOT entry-level
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(false)
    expect(result.decision).toBe('build')
  })

  // ---- Critical (importance=5) missing — always strict ----

  test('entry-level + critical skill missing → still build', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 2 })])
    const resume = makeResume([resumeSkill('SQL', { level: 2 })]) // Python absent
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.decision).toBe('build')
  })

  // ---- Required (importance=4) 1-level gap ----

  test('entry-level + required skill 1-level gap → apply, not edits', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 4, level: 3 }), // required, need L3
    ])
    const resume = makeResume([
      resumeSkill('Python', { level: 2 }), // L2 — 1-level below, entry-level resume
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.decision).toBe('apply')
  })

  test('non-entry-level + required skill 1-level gap → edits', () => {
    const jd = makeJD([jdSkill('Python', { importance: 4, level: 3 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // one L3 skill makes it non-entry-level
      resumeSkill('SQL',    { level: 2 }), // Python is L2 in this scenario...
    ])
    // For this test: Python needs to be below required level
    // Use a fresh scenario where the L3 skill is a different one
    const jd2 = makeJD([jdSkill('Docker', { importance: 4, level: 3 })])
    const resume2 = makeResume([
      resumeSkill('Python', { level: 3 }), // makes resume non-entry-level
      resumeSkill('Docker', { level: 2 }), // Docker: L2 < required L3
    ])
    const result = getDecision(jd2, resume2)
    expect(result.isEntryLevel).toBe(false)
    expect(result.decision).toBe('edits')
  })

  // ---- Required (importance=4) 2-level gap — strict even for entry-level ----

  test('entry-level + required skill 2-level gap → edits (not apply)', () => {
    const jd = makeJD([jdSkill('Python', { importance: 4, level: 3 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 1 }), // L1 vs required L3 — 2-level gap
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.decision).toBe('edits')
  })

  // ---- Critical (importance=5) 1-level gap — always strict ----

  test('entry-level + critical skill 1-level gap → edits (not apply)', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 3 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 2 }), // L2 vs critical L3
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.decision).toBe('edits')
  })
})
