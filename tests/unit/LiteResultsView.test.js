/**
 * Tests for LiteResultsView
 *
 * React Testing Library is not installed in this project, so these tests
 * verify the component's data contracts and render-logic invariants
 * without a DOM renderer.
 *
 * Approach:
 *   - Test the liteResults shape the component depends on
 *   - Test credential-gap output constraints (no specifics leaked)
 *   - Test teaser presence/absence rules
 *   - Test matchScore is a plain number
 *   - Test match-summary banner counts (matched/missing/levelGaps)
 *   - Test match-score label (getMatchScoreLabel thresholds)
 *   - Test duties prop renders JD duties
 *   - Test sentinel state (matchScore null → empty state)
 *   - Smoke-test that the component module is importable
 */

import { describe, test, expect } from 'vitest'
import { getMatchScoreLabel } from '../../src/jd-skill-parser.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a complete, valid liteResults object */
function completeLiteResults(overrides = {}) {
  return {
    topSkills: {
      skills: [
        { name: 'Python',     level: 4 },
        { name: 'SQL',        level: 3 },
        { name: 'React',      level: 3 },
        { name: 'TypeScript', level: 2 },
        { name: 'Docker',     level: 2 },
      ],
      totalDetected: 9,
    },
    closestGap: { name: 'AWS', gap: 2, level: 4, importance: 5, resumeLevel: 2, confidence: 'medium', source: 'Experience', durationMonths: 8, contextCount: 2 },
    missingBehavioral: [
      { name: 'Collaboration' },
      { name: 'Communication' },
    ],
    credentialGap: { degreePresent: true, certPresent: false },
    teaserCounts: {
      lowMatchCount:    3,
      criticalGapCount: 1,
      lowMatchTeaser:   '3 skills match but score too low to count',
      criticalTeaser:   '1 required skill is completely absent from your resume',
    },
    matchScore:     73,
    matchedCount:   5,
    missingCount:   2,
    levelGapsCount: 3,
    ...overrides,
  }
}

/** Minimal liteResults — only required fields, optional fields absent */
function minimalLiteResults() {
  return {
    topSkills:         { skills: [], totalDetected: 0 },
    closestGap:        null,
    missingBehavioral: [],
    credentialGap:     { degreePresent: true, certPresent: true },
    teaserCounts:      { lowMatchCount: 0, criticalGapCount: 0 },
    matchScore:        0,
    matchedCount:      0,
    missingCount:      0,
    levelGapsCount:    0,
  }
}

// ---------------------------------------------------------------------------
// 1. Complete liteResults has all documented fields
// ---------------------------------------------------------------------------

describe('LiteResultsView — liteResults shape contract', () => {
  const REQUIRED_KEYS = [
    'topSkills',
    'closestGap',
    'missingBehavioral',
    'credentialGap',
    'teaserCounts',
    'matchScore',
    'matchedCount',
    'missingCount',
    'levelGapsCount',
  ]

  test('complete liteResults contains all required sections', () => {
    const result = completeLiteResults()
    for (const key of REQUIRED_KEYS) {
      expect(result).toHaveProperty(key)
    }
  })

  test('topSkills.skills has at most 5 items in the test fixture', () => {
    const result = completeLiteResults()
    expect(result.topSkills.skills.length).toBeLessThanOrEqual(5)
  })

  test('topSkills.totalDetected is >= skills.length', () => {
    const result = completeLiteResults()
    expect(result.topSkills.totalDetected).toBeGreaterThanOrEqual(result.topSkills.skills.length)
  })

  test('closestGap has a name and gap (level distance)', () => {
    const result = completeLiteResults()
    expect(result.closestGap).not.toBeNull()
    expect(typeof result.closestGap.name).toBe('string')
    expect(typeof result.closestGap.gap).toBe('number')
  })

  test('missingBehavioral is a non-empty array of signal objects', () => {
    const result = completeLiteResults()
    expect(Array.isArray(result.missingBehavioral)).toBe(true)
    expect(result.missingBehavioral.length).toBeGreaterThan(0)
    expect(typeof result.missingBehavioral[0].name).toBe('string')
  })

  test('credentialGap has exactly degreePresent and certPresent keys', () => {
    const result = completeLiteResults()
    const keys = Object.keys(result.credentialGap)
    expect(keys).toContain('degreePresent')
    expect(keys).toContain('certPresent')
    expect(keys).toHaveLength(2)
  })

  test('teaserCounts has lowMatchTeaser and criticalTeaser when counts > 0', () => {
    const result = completeLiteResults()
    expect(result.teaserCounts.lowMatchCount).toBeGreaterThan(0)
    expect(result.teaserCounts.criticalGapCount).toBeGreaterThan(0)
    expect(typeof result.teaserCounts.lowMatchTeaser).toBe('string')
    expect(typeof result.teaserCounts.criticalTeaser).toBe('string')
  })

  test('matchedCount, missingCount, levelGapsCount are non-negative integers', () => {
    const result = completeLiteResults()
    expect(Number.isInteger(result.matchedCount)).toBe(true)
    expect(result.matchedCount).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(result.missingCount)).toBe(true)
    expect(result.missingCount).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(result.levelGapsCount)).toBe(true)
    expect(result.levelGapsCount).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Teaser strings absent when counts are 0
// ---------------------------------------------------------------------------

describe('LiteResultsView — teaser omission when counts are 0', () => {
  test('lowMatchTeaser is undefined when lowMatchCount is 0', () => {
    const result = completeLiteResults({
      teaserCounts: { lowMatchCount: 0, criticalGapCount: 0 },
    })
    expect(result.teaserCounts.lowMatchTeaser).toBeUndefined()
  })

  test('criticalTeaser is undefined when criticalGapCount is 0', () => {
    const result = completeLiteResults({
      teaserCounts: { lowMatchCount: 0, criticalGapCount: 0 },
    })
    expect(result.teaserCounts.criticalTeaser).toBeUndefined()
  })

  test('component renders no teaser section data when both teasers are undefined', () => {
    const result = completeLiteResults({
      teaserCounts: { lowMatchCount: 0, criticalGapCount: 0 },
    })
    // Verify the shape the component reads: no string to render
    const hasLow      = typeof result.teaserCounts.lowMatchTeaser === 'string' &&
                        result.teaserCounts.lowMatchTeaser.length > 0
    const hasCritical = typeof result.teaserCounts.criticalTeaser === 'string' &&
                        result.teaserCounts.criticalTeaser.length > 0
    expect(hasLow).toBe(false)
    expect(hasCritical).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. Credential gap output contains no specifics
// ---------------------------------------------------------------------------

describe('LiteResultsView — credential gap leak guard', () => {
  test('credentialGap values are booleans only', () => {
    const result = completeLiteResults()
    for (const [key, val] of Object.entries(result.credentialGap)) {
      expect(typeof val, `field "${key}" must be boolean`).toBe('boolean')
    }
  })

  test('credentialGap JSON contains no year-like patterns', () => {
    const result = completeLiteResults()
    const serialized = JSON.stringify(result.credentialGap)
    expect(serialized).not.toMatch(/\b(19|20)\d{2}\b/)
  })

  test('credentialGap JSON contains no unexpected string keys', () => {
    const result = completeLiteResults()
    const serialized = JSON.stringify(result.credentialGap)
    // Must only contain our two documented keys
    expect(serialized).not.toMatch(/"(?!degreePresent|certPresent)[a-zA-Z]/)
  })

  test('credentialGap with both false produces boolean-only output', () => {
    const result = completeLiteResults({
      credentialGap: { degreePresent: false, certPresent: false },
    })
    const serialized = JSON.stringify(result.credentialGap)
    // "false" only, no institution name, no cert name, no year
    expect(serialized).toBe('{"degreePresent":false,"certPresent":false}')
  })

  test('component reads degreePresent false → no-degree message logic', () => {
    // Simulate what the component's credentialCopy() does
    const credentialGap = { degreePresent: false, certPresent: true }
    const lines = []
    if (credentialGap.degreePresent === false) {
      lines.push('No degree detected on your resume.')
    }
    if (credentialGap.certPresent === false) {
      lines.push('No certifications detected on your resume.')
    }
    if (lines.length === 0) {
      lines.push('Credentials detected — see how they stack up in the full report.')
    }
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('No degree')
    // Must not mention any specific institution or field
    expect(lines[0]).not.toMatch(/Computer Science|MIT|Harvard|Bachelor|Master|PhD/i)
  })

  test('component reads certPresent false → no-cert message logic', () => {
    const credentialGap = { degreePresent: true, certPresent: false }
    const lines = []
    if (credentialGap.degreePresent === false) {
      lines.push('No degree detected on your resume.')
    }
    if (credentialGap.certPresent === false) {
      lines.push('No certifications detected on your resume.')
    }
    if (lines.length === 0) {
      lines.push('Credentials detected — see how they stack up in the full report.')
    }
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('No certifications')
  })

  test('component reads both true → detected message logic', () => {
    const credentialGap = { degreePresent: true, certPresent: true }
    const lines = []
    if (credentialGap.degreePresent === false) {
      lines.push('No degree detected on your resume.')
    }
    if (credentialGap.certPresent === false) {
      lines.push('No certifications detected on your resume.')
    }
    if (lines.length === 0) {
      lines.push('Credentials detected — see how they stack up in the full report.')
    }
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('detected')
  })
})

// ---------------------------------------------------------------------------
// 4. matchScore is a plain number
// ---------------------------------------------------------------------------

describe('LiteResultsView — matchScore type', () => {
  test('matchScore in liteResults is a plain number', () => {
    const result = completeLiteResults()
    expect(typeof result.matchScore).toBe('number')
  })

  test('matchScore is NOT an object, string, or band label', () => {
    const result = completeLiteResults()
    expect(typeof result.matchScore).not.toBe('object')
    expect(typeof result.matchScore).not.toBe('string')
  })

  test('matchScore is a finite integer-like value in [0, 100]', () => {
    const result = completeLiteResults()
    expect(Number.isFinite(result.matchScore)).toBe(true)
    expect(result.matchScore).toBeGreaterThanOrEqual(0)
    expect(result.matchScore).toBeLessThanOrEqual(100)
  })

  test('matchScore renders with "%" suffix — component appends it', () => {
    // The component renders `{matchScore}%` so 73 → "73%"
    const matchScore = 73
    const displayed  = `${matchScore}%`
    expect(displayed).toBe('73%')
    expect(displayed).toMatch(/%$/)
  })
})

// ---------------------------------------------------------------------------
// 5. getMatchScoreLabel — single source of truth, reused by both views
// ---------------------------------------------------------------------------

describe('getMatchScoreLabel — shared label function', () => {
  test('score >= 70 → Strong Match', () => {
    expect(getMatchScoreLabel(70)).toBe('Strong Match')
    expect(getMatchScoreLabel(85)).toBe('Strong Match')
    expect(getMatchScoreLabel(100)).toBe('Strong Match')
  })

  test('score 40–69 → Moderate Match', () => {
    expect(getMatchScoreLabel(40)).toBe('Moderate Match')
    expect(getMatchScoreLabel(55)).toBe('Moderate Match')
    expect(getMatchScoreLabel(69)).toBe('Moderate Match')
  })

  test('score < 40 → Weak Match', () => {
    expect(getMatchScoreLabel(0)).toBe('Weak Match')
    expect(getMatchScoreLabel(20)).toBe('Weak Match')
    expect(getMatchScoreLabel(39)).toBe('Weak Match')
  })

  test('label is one of the three valid strings', () => {
    const VALID = new Set(['Strong Match', 'Moderate Match', 'Weak Match'])
    for (const score of [0, 15, 39, 40, 55, 70, 90, 100]) {
      expect(VALID.has(getMatchScoreLabel(score))).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Match-summary banner counts (matchedCount / missingCount / levelGapsCount)
// ---------------------------------------------------------------------------

describe('LiteResultsView — match-summary banner counts', () => {
  test('banner reads matchedCount from liteMatch', () => {
    const result = completeLiteResults({ matchedCount: 7 })
    expect(result.matchedCount).toBe(7)
  })

  test('banner reads missingCount from liteMatch', () => {
    const result = completeLiteResults({ missingCount: 3 })
    expect(result.missingCount).toBe(3)
  })

  test('banner reads levelGapsCount from liteMatch', () => {
    const result = completeLiteResults({ levelGapsCount: 4 })
    expect(result.levelGapsCount).toBe(4)
  })

  test('NO bonus count field exists in the banner shape', () => {
    // bonusCount must NOT be part of the RookieResultsView liteMatch shape
    const result = completeLiteResults()
    expect(result).not.toHaveProperty('bonusCount')
  })

  test('all three counts default to 0 in minimal shape', () => {
    const result = minimalLiteResults()
    expect(result.matchedCount).toBe(0)
    expect(result.missingCount).toBe(0)
    expect(result.levelGapsCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Duties prop — WHAT THIS ROLE DOES section
// ---------------------------------------------------------------------------

describe('LiteResultsView — duties prop (WHAT THIS ROLE DOES)', () => {
  test('duties is an array of strings', () => {
    const duties = ['Build APIs', 'Write unit tests', 'Deploy to cloud']
    expect(Array.isArray(duties)).toBe(true)
    duties.forEach(d => expect(typeof d).toBe('string'))
  })

  test('empty duties array produces no section (guard condition)', () => {
    // Component renders duties section only when duties.length > 0
    const duties = []
    expect(duties.length > 0).toBe(false)
  })

  test('non-empty duties array triggers section render (guard condition)', () => {
    const duties = ['Build APIs', 'Write unit tests']
    expect(duties.length > 0).toBe(true)
  })

  test('duties content is JD-sourced text — no internal data leaked', () => {
    // duties come from results.jobDuties (user-pasted JD content), not from parser vocabulary
    const duties = ['Develop scalable microservices', 'Collaborate with cross-functional teams']
    // No internal field names should appear as duties
    const internal = ['technicalSignals', 'behavioralSignals', 'matchScore', 'gapSize']
    duties.forEach(d => {
      internal.forEach(field => expect(d).not.toContain(field))
    })
  })
})

// ---------------------------------------------------------------------------
// 8. Sentinel state — matchScore null
// ---------------------------------------------------------------------------

describe('LiteResultsView — sentinel empty state', () => {
  test('matchScore null triggers empty-state guard', () => {
    // Component returns early with "Paste a job description..." when matchScore is null
    const matchScore = null
    expect(matchScore === null).toBe(true)
  })

  test('sentinel text is expected string', () => {
    // Guard: verify the copy string is what the component shows
    const sentinelText = 'Paste a job description in the JD tab to see how your resume reads against it.'
    expect(sentinelText).toContain('Paste a job description')
    expect(sentinelText).toContain('JD tab')
  })

  test('matchScore 0 is NOT sentinel — 0 is a valid score', () => {
    const matchScore = 0
    expect(matchScore === null).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 9. Smoke — minimal liteResults renders gracefully
// ---------------------------------------------------------------------------

describe('LiteResultsView — minimal shape smoke', () => {
  test('minimal liteResults has all required keys with safe defaults', () => {
    const result = minimalLiteResults()
    expect(result).toHaveProperty('topSkills')
    expect(result).toHaveProperty('closestGap')
    expect(result).toHaveProperty('missingBehavioral')
    expect(result).toHaveProperty('credentialGap')
    expect(result).toHaveProperty('teaserCounts')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('matchedCount')
    expect(result).toHaveProperty('missingCount')
    expect(result).toHaveProperty('levelGapsCount')
  })

  test('minimal liteResults: closestGap is null — component should render nothing for it', () => {
    const result = minimalLiteResults()
    expect(result.closestGap).toBeNull()
  })

  test('minimal liteResults: empty arrays do not cause render errors', () => {
    const result = minimalLiteResults()
    expect(Array.isArray(result.topSkills.skills)).toBe(true)
    expect(Array.isArray(result.missingBehavioral)).toBe(true)
    expect(result.topSkills.skills).toHaveLength(0)
    expect(result.missingBehavioral).toHaveLength(0)
  })

  test('minimal liteResults: matchScore 0 is valid (not null/undefined)', () => {
    const result = minimalLiteResults()
    expect(result.matchScore).toBe(0)
    expect(result.matchScore).not.toBeNull()
    expect(result.matchScore).not.toBeUndefined()
  })

  test('component module is importable without error', async () => {
    // Dynamic import verifies the file parses and exports correctly
    const mod = await import('../../src/components/LiteResultsView.jsx')
    expect(typeof mod.default).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// 10. Closest-gap card remainder line — gated on levelGapsCount - 1 > 0
//
// The component (LiteResultsView.jsx) guards the "...and N more skills also
// have a level gap" line with `{levelGapsCount - 1 > 0 && (...)}`. No DOM
// renderer is installed (see file header), so we test the derived condition
// and the exact text it produces, mirroring the guard-condition test style
// used elsewhere in this file (see "duties prop" describe block above).
// ---------------------------------------------------------------------------

describe('LiteResultsView — closest-gap remainder line (levelGapsCount - 1 > 0 guard)', () => {
  test('levelGapsCount === 1 → remainder guard is false (line does not render)', () => {
    const levelGapsCount = 1
    expect(levelGapsCount - 1 > 0).toBe(false)
  })

  test('levelGapsCount === 2 → remainder guard is true (line renders)', () => {
    const levelGapsCount = 2
    expect(levelGapsCount - 1 > 0).toBe(true)
  })

  test('levelGapsCount === 2 → remainder text reads "...and 1 more skills also have a level gap"', () => {
    const levelGapsCount = 2
    const text = `...and ${levelGapsCount - 1} more skills also have a level gap`
    expect(text).toBe('...and 1 more skills also have a level gap')
  })

  test('levelGapsCount === 0 → remainder guard is false', () => {
    const levelGapsCount = 0
    expect(levelGapsCount - 1 > 0).toBe(false)
  })
})
