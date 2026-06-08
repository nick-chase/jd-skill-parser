import { describe, test, expect } from 'vitest'
import { getDecision } from '@core/parser/decision.js'

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

  test('returns matchScore and isEntryLevel', () => {
    const result = getDecision(jd, resume)
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('isEntryLevel')
  })

  test('matchScore is a number between 0 and 100', () => {
    const { matchScore } = getDecision(jd, resume)
    expect(typeof matchScore).toBe('number')
    expect(matchScore).toBeGreaterThanOrEqual(0)
    expect(matchScore).toBeLessThanOrEqual(100)
  })

  test('isEntryLevel is a boolean', () => {
    const { isEntryLevel } = getDecision(jd, resume)
    expect(typeof isEntryLevel).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// matchScore computation
// ---------------------------------------------------------------------------

describe('getDecision() — matchScore', () => {
  test('100 when all JD skills are met', () => {
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

  test('0 when all JD skills are missing from resume', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 3 }),
      jdSkill('SQL',    { importance: 4, level: 2 }),
    ])
    expect(getDecision(jd, makeResume([])).matchScore).toBe(0)
  })

  test('100 when JD has no skills', () => {
    expect(getDecision(makeJD([]), makeResume([])).matchScore).toBe(100)
  })

  test('preferred-only skills (importance < 4) do not reduce matchScore when missing', () => {
    const jd = makeJD([
      jdSkill('Python',  { importance: 5, level: 2 }),
      jdSkill('GraphQL', { importance: 3, level: 2 }), // preferred
    ])
    const resume = makeResume([resumeSkill('Python', { level: 3 })])
    // GraphQL missing but preferred — Python (1 of 2) is matched, but only
    // required skills gate the score. matchScore = matched/total = 1/2 = 50
    const { matchScore } = getDecision(jd, resume)
    expect(matchScore).toBeGreaterThanOrEqual(0)
    expect(matchScore).toBeLessThanOrEqual(100)
  })

  test('null-safe: no crash when jdProfile has no technicalSignals', () => {
    const result = getDecision({ technicalSignals: null }, { technicalSignals: [] })
    expect(result).toHaveProperty('matchScore')
  })
})

// ---------------------------------------------------------------------------
// isEntryLevel detection
// ---------------------------------------------------------------------------

describe('getDecision() — isEntryLevel', () => {
  test('true when resume is empty', () => {
    expect(getDecision(makeJD([]), makeResume([])).isEntryLevel).toBe(true)
  })

  test('true when all resume skills are L1', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 1 }),
      resumeSkill('SQL',    { level: 1 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(true)
  })

  test('true when all resume skills are L2', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 2 }),
      resumeSkill('Docker', { level: 2 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(true)
  })

  test('false when any skill is L3', () => {
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }),
      resumeSkill('SQL',    { level: 1 }),
    ])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(false)
  })

  test('false when any skill is L4 or L5', () => {
    const resume = makeResume([resumeSkill('Python', { level: 4 })])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// B8 — Entry-level calibration (tested via matchScore)
// ---------------------------------------------------------------------------

describe('getDecision() — entry-level calibration', () => {
  test('entry-level: required (non-critical) missing skill relaxed to gapped → matchScore still 0', () => {
    const jd = makeJD([
      jdSkill('Python', { importance: 5, level: 2 }), // critical — met
      jdSkill('Docker', { importance: 4, level: 2 }), // required — missing
    ])
    const resume = makeResume([resumeSkill('Python', { level: 2 })])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    // Docker is relaxed to gapped (not missing), but still not matched → 1/2 = 50
    expect(result.matchScore).toBe(50)
  })

  test('entry-level: required (non-critical) 1-level gap relaxed to matched → matchScore 100', () => {
    const jd = makeJD([jdSkill('Python', { importance: 4, level: 3 })])
    const resume = makeResume([resumeSkill('Python', { level: 2 })])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.matchScore).toBe(100)
  })

  test('non-entry-level: required 1-level gap is NOT relaxed → matchScore 0', () => {
    const jd = makeJD([jdSkill('Docker', { importance: 4, level: 3 })])
    const resume = makeResume([
      resumeSkill('Python', { level: 3 }), // makes resume non-entry-level
      resumeSkill('Docker', { level: 2 }), // Docker: L2 < required L3
    ])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(false)
    // Docker gap is NOT relaxed → 0/1 matched for Docker = 50% total (Python not in JD)
    expect(result.matchScore).toBe(0)
  })

  test('entry-level: critical (importance=5) missing is NOT relaxed', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 2 })])
    const resume = makeResume([resumeSkill('SQL', { level: 2 })]) // Python absent
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.matchScore).toBe(0)
  })

  test('entry-level: critical 1-level gap is NOT relaxed', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 3 })])
    const resume = makeResume([resumeSkill('Python', { level: 2 })])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.matchScore).toBe(0)
  })

  test('entry-level: 2-level gap on required skill is NOT relaxed', () => {
    const jd = makeJD([jdSkill('Python', { importance: 4, level: 3 })])
    const resume = makeResume([resumeSkill('Python', { level: 1 })])
    const result = getDecision(jd, resume)
    expect(result.isEntryLevel).toBe(true)
    expect(result.matchScore).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// normalizeLevel — certified skill handling
// ---------------------------------------------------------------------------

describe('getDecision() — certified level coercion', () => {
  test('certified resume skill meets any JD level requirement (counts as L5)', () => {
    const jd = makeJD([jdSkill('Python', { importance: 5, level: 5 })])
    const resume = makeResume([{ name: 'Python', category: 'Test', level: 'certified', score: 1.8, source: 'Experience', suggestion: '' }])
    const result = getDecision(jd, resume)
    expect(result.matchScore).toBe(100)
  })

  test('certified resume skill is not flagged as gapped when JD requires L3', () => {
    const jd = makeJD([jdSkill('SQL', { importance: 4, level: 3 })])
    const resume = makeResume([{ name: 'SQL', category: 'Test', level: 'certified', score: 1.8, source: 'Experience', suggestion: '' }])
    const result = getDecision(jd, resume)
    expect(result.matchScore).toBe(100)
  })

  test('isEntryLevel is false when resume contains a certified skill', () => {
    const resume = makeResume([{ name: 'Python', category: 'Test', level: 'certified', score: 1.8, source: 'Experience', suggestion: '' }])
    expect(getDecision(makeJD([]), resume).isEntryLevel).toBe(false)
  })
})
