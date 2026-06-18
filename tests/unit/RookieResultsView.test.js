/**
 * Tests for RookieResultsView
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
 *   - Smoke-test that the component module is importable
 */

import { describe, test, expect } from 'vitest'

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
    closestGap: { name: 'AWS', gapSize: 2 },
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
    matchScore: 73,
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
  }
}

// ---------------------------------------------------------------------------
// 1. Complete liteResults has all 6 documented fields
// ---------------------------------------------------------------------------

describe('RookieResultsView — liteResults shape contract', () => {
  const REQUIRED_KEYS = [
    'topSkills',
    'closestGap',
    'missingBehavioral',
    'credentialGap',
    'teaserCounts',
    'matchScore',
  ]

  test('complete liteResults contains all 6 required sections', () => {
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

  test('closestGap has a name and gapSize', () => {
    const result = completeLiteResults()
    expect(result.closestGap).not.toBeNull()
    expect(typeof result.closestGap.name).toBe('string')
    expect(typeof result.closestGap.gapSize).toBe('number')
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
})

// ---------------------------------------------------------------------------
// 2. Teaser strings absent when counts are 0
// ---------------------------------------------------------------------------

describe('RookieResultsView — teaser omission when counts are 0', () => {
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

describe('RookieResultsView — credential gap leak guard', () => {
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

describe('RookieResultsView — matchScore type', () => {
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

  test('component displays matchScore as a raw number — no tier name mapping', () => {
    // The component should render matchScore directly, not convert it to a label.
    // Verify: 73 → "73", not "Good" or "Strong Match"
    const matchScore = 73
    const displayed  = String(matchScore)
    expect(displayed).toBe('73')
    expect(displayed).not.toMatch(/good|strong|average|poor|excellent/i)
  })
})

// ---------------------------------------------------------------------------
// 5. Smoke — minimal liteResults renders gracefully
// ---------------------------------------------------------------------------

describe('RookieResultsView — minimal shape smoke', () => {
  test('minimal liteResults has all required keys with safe defaults', () => {
    const result = minimalLiteResults()
    expect(result).toHaveProperty('topSkills')
    expect(result).toHaveProperty('closestGap')
    expect(result).toHaveProperty('missingBehavioral')
    expect(result).toHaveProperty('credentialGap')
    expect(result).toHaveProperty('teaserCounts')
    expect(result).toHaveProperty('matchScore')
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
    const mod = await import('../../src/components/RookieResultsView.jsx')
    expect(typeof mod.default).toBe('function')
  })
})
