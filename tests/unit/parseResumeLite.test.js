/**
 * Unit tests for parseResumeLite()
 *
 * Verifies output shape, field constraints, teaser behaviour, and
 * that all 4 resume fixtures parse without throwing.
 */

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseResumeLite } from '@core/parser/parseResumeLite.js'
import { parseJobDescription } from '../../src/jd-skill-parser.jsx'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const jdUrl      = new URL('../fixtures/sample-jd.txt',              import.meta.url)
const jdText     = readFileSync(jdUrl, 'utf-8')
const jdProfile  = parseJobDescription(jdText)

function loadResume(name) {
    const url = new URL(`../fixtures/resumes/${name}.txt`, import.meta.url)
    return readFileSync(url, 'utf-8')
}

const newGradText      = loadResume('new_grad')
const careerChangerText = loadResume('career_changer')
const hybridGradText   = loadResume('hybrid_grad')
const seniorDevText    = loadResume('senior_dev')

// ---------------------------------------------------------------------------
// 1. Return shape — exactly the documented fields, nothing extra
// ---------------------------------------------------------------------------

describe('parseResumeLite() — return shape', () => {
    const result = parseResumeLite(newGradText, jdProfile)

    const EXPECTED_KEYS = new Set([
        'topSkills',
        'closestGap',
        'missingBehavioral',
        'credentialGap',
        'teaserCounts',
        'matchScore',
    ])

    test('returns exactly the 6 documented top-level fields', () => {
        const keys = Object.keys(result)
        expect(keys).toHaveLength(EXPECTED_KEYS.size)
        for (const key of EXPECTED_KEYS) {
            expect(result).toHaveProperty(key)
        }
    })

    test('topSkills has skills array and totalDetected number', () => {
        expect(Array.isArray(result.topSkills.skills)).toBe(true)
        expect(typeof result.topSkills.totalDetected).toBe('number')
    })

    test('missingBehavioral is an array', () => {
        expect(Array.isArray(result.missingBehavioral)).toBe(true)
    })

    test('credentialGap has exactly degreePresent and certPresent', () => {
        const keys = Object.keys(result.credentialGap)
        expect(keys).toEqual(expect.arrayContaining(['degreePresent', 'certPresent']))
        expect(keys).toHaveLength(2)
    })

    test('teaserCounts has lowMatchCount and criticalGapCount as numbers', () => {
        expect(typeof result.teaserCounts.lowMatchCount).toBe('number')
        expect(typeof result.teaserCounts.criticalGapCount).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// 2. credentialGap must not leak specifics
// ---------------------------------------------------------------------------

describe('parseResumeLite() — credentialGap leak guard', () => {
    test('credentialGap contains only boolean values — no strings', () => {
        const result = parseResumeLite(newGradText, jdProfile)
        const { credentialGap } = result
        for (const [key, val] of Object.entries(credentialGap)) {
            expect(typeof val, `field "${key}" must be boolean`).toBe('boolean')
        }
    })

    test('stringify of credentialGap contains no degree field/institution/year text', () => {
        // Run against all 4 fixtures to widen the net
        const resumes = [newGradText, careerChangerText, hybridGradText, seniorDevText]
        for (const resumeText of resumes) {
            const result  = parseResumeLite(resumeText, jdProfile)
            const serialized = JSON.stringify(result.credentialGap)
            // No year-like strings (4-digit numbers)
            expect(serialized).not.toMatch(/\b(19|20)\d{2}\b/)
            // No institution-like strings (more than 2 words = likely an institution name)
            // Safest check: must only contain the two keys and boolean values
            expect(serialized).not.toMatch(/"(?!degreePresent|certPresent)[a-zA-Z]/)
        }
    })
})

// ---------------------------------------------------------------------------
// 3. topSkills capped at 5
// ---------------------------------------------------------------------------

describe('parseResumeLite() — topSkills cap', () => {
    test('topSkills.skills has at most 5 entries', () => {
        const resumes = [newGradText, careerChangerText, hybridGradText, seniorDevText]
        for (const resumeText of resumes) {
            const result = parseResumeLite(resumeText, jdProfile)
            expect(result.topSkills.skills.length).toBeLessThanOrEqual(5)
        }
    })

    test('totalDetected reflects full count, not capped count', () => {
        // senior_dev is most likely to have more than 5 skills
        const result = parseResumeLite(seniorDevText, jdProfile)
        expect(result.topSkills.totalDetected).toBeGreaterThanOrEqual(result.topSkills.skills.length)
    })
})

// ---------------------------------------------------------------------------
// 4. Teaser strings are undefined (not empty string) when count is 0
// ---------------------------------------------------------------------------

describe('parseResumeLite() — teaser string presence rules', () => {
    test('lowMatchTeaser is undefined when lowMatchCount is 0', () => {
        // Build a minimal JD with no skills so nothing can be a level-gap
        const emptyJD = { technicalSignals: [], behavioralSignals: [], jobDuties: [] }
        const result  = parseResumeLite(newGradText, emptyJD)
        if (result.teaserCounts.lowMatchCount === 0) {
            expect(result.teaserCounts.lowMatchTeaser).toBeUndefined()
        }
    })

    test('criticalTeaser is undefined when criticalGapCount is 0', () => {
        const emptyJD = { technicalSignals: [], behavioralSignals: [], jobDuties: [] }
        const result  = parseResumeLite(newGradText, emptyJD)
        if (result.teaserCounts.criticalGapCount === 0) {
            expect(result.teaserCounts.criticalTeaser).toBeUndefined()
        }
    })

    test('lowMatchTeaser is a non-empty string when lowMatchCount > 0', () => {
        const result = parseResumeLite(newGradText, jdProfile)
        if (result.teaserCounts.lowMatchCount > 0) {
            expect(typeof result.teaserCounts.lowMatchTeaser).toBe('string')
            expect(result.teaserCounts.lowMatchTeaser.length).toBeGreaterThan(0)
        }
    })

    test('criticalTeaser is a non-empty string when criticalGapCount > 0', () => {
        const result = parseResumeLite(newGradText, jdProfile)
        if (result.teaserCounts.criticalGapCount > 0) {
            expect(typeof result.teaserCounts.criticalTeaser).toBe('string')
            expect(result.teaserCounts.criticalTeaser.length).toBeGreaterThan(0)
        }
    })
})

// ---------------------------------------------------------------------------
// 5. matchScore is a number, not an object
// ---------------------------------------------------------------------------

describe('parseResumeLite() — matchScore type', () => {
    test('matchScore is a plain number', () => {
        const result = parseResumeLite(newGradText, jdProfile)
        expect(typeof result.matchScore).toBe('number')
    })

    test('matchScore is between 0 and 100', () => {
        const result = parseResumeLite(newGradText, jdProfile)
        expect(result.matchScore).toBeGreaterThanOrEqual(0)
        expect(result.matchScore).toBeLessThanOrEqual(100)
    })
})

// ---------------------------------------------------------------------------
// 6. All 4 fixtures run without throwing
// ---------------------------------------------------------------------------

describe('parseResumeLite() — fixture smoke tests', () => {
    const fixtures = [
        ['new_grad',       newGradText],
        ['career_changer', careerChangerText],
        ['hybrid_grad',    hybridGradText],
        ['senior_dev',     seniorDevText],
    ]

    for (const [name, resumeText] of fixtures) {
        test(`${name}: produces output without throwing`, () => {
            let result
            expect(() => { result = parseResumeLite(resumeText, jdProfile) }).not.toThrow()
            expect(result).toBeDefined()
            expect(typeof result.matchScore).toBe('number')
            expect(Array.isArray(result.topSkills.skills)).toBe(true)
        })
    }
})
