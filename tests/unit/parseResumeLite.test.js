/**
 * Unit tests for parseResumeLite() and computeLiteMatch()
 *
 * parseResumeLite() now takes only resumeText (no jdProfile).
 * JD-dependent gap fields are computed separately via computeLiteMatch().
 *
 * Verifies output shape, field constraints, and that all 4 resume fixtures
 * parse without throwing. Also verifies computeLiteMatch sentinel behavior.
 */

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseResumeLite, computeLiteMatch } from '@core/parser/parseResumeLite.js'
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
// 1. Return shape — exactly the documented public fields
// ---------------------------------------------------------------------------

describe('parseResumeLite() — return shape', () => {
    const result = parseResumeLite(newGradText)

    const EXPECTED_PUBLIC_KEYS = new Set([
        'topSkills',
        'allBehavioralSignals',
        'credentialGap',
        'sectionsPresent',
    ])

    test('returns the 4 documented public top-level fields', () => {
        for (const key of EXPECTED_PUBLIC_KEYS) {
            expect(result).toHaveProperty(key)
        }
    })

    test('does NOT return matchScore (moved to computeLiteMatch)', () => {
        expect(result).not.toHaveProperty('matchScore')
    })

    test('does NOT return closestGap (moved to computeLiteMatch)', () => {
        expect(result).not.toHaveProperty('closestGap')
    })

    test('does NOT return missingBehavioral (moved to computeLiteMatch)', () => {
        expect(result).not.toHaveProperty('missingBehavioral')
    })

    test('does NOT return teaserCounts (moved to computeLiteMatch)', () => {
        expect(result).not.toHaveProperty('teaserCounts')
    })

    test('topSkills has skills array and totalDetected number', () => {
        expect(Array.isArray(result.topSkills.skills)).toBe(true)
        expect(typeof result.topSkills.totalDetected).toBe('number')
    })

    test('credentialGap has degreePresent, degreeLevel, certCount, and certPresent', () => {
        const keys = Object.keys(result.credentialGap)
        expect(keys).toEqual(expect.arrayContaining(['degreePresent', 'degreeLevel', 'certCount', 'certPresent']))
        expect(keys).toHaveLength(4)
    })

    test('allBehavioralSignals is an array of { name, present } objects', () => {
        expect(Array.isArray(result.allBehavioralSignals)).toBe(true)
        if (result.allBehavioralSignals.length > 0) {
            const first = result.allBehavioralSignals[0]
            expect(typeof first.name).toBe('string')
            expect(typeof first.present).toBe('boolean')
        }
    })

    test('sectionsPresent is an array of strings', () => {
        expect(Array.isArray(result.sectionsPresent)).toBe(true)
        for (const s of result.sectionsPresent) {
            expect(typeof s).toBe('string')
        }
    })
})

// ---------------------------------------------------------------------------
// 2. credentialGap must not leak specifics
// ---------------------------------------------------------------------------

describe('parseResumeLite() — credentialGap leak guard', () => {
    test('credentialGap contains only boolean values for degreePresent and certPresent', () => {
        const result = parseResumeLite(newGradText)
        const { credentialGap } = result
        expect(typeof credentialGap.degreePresent).toBe('boolean')
        expect(typeof credentialGap.certPresent).toBe('boolean')
    })

    test('credentialGap.degreeLevel is null or a short type token (≤6 chars, no field/institution)', () => {
        const resumes = [newGradText, careerChangerText, hybridGradText, seniorDevText]
        for (const resumeText of resumes) {
            const result = parseResumeLite(resumeText)
            const { degreeLevel } = result.credentialGap
            if (degreeLevel !== null) {
                expect(typeof degreeLevel).toBe('string')
                expect(degreeLevel.length).toBeLessThanOrEqual(6)
                // Must not contain spaces (no "Computer Science", no institution words)
                expect(degreeLevel).not.toMatch(/\s/)
                // Must match known tokens only
                expect(degreeLevel).toMatch(/^(B\.S\.|M\.S\.|Ph\.D\.|A\.A\.)$/)
            } else {
                expect(degreeLevel).toBeNull()
            }
        }
    })

    test('credentialGap.certCount is a non-negative integer', () => {
        const result = parseResumeLite(newGradText)
        expect(typeof result.credentialGap.certCount).toBe('number')
        expect(result.credentialGap.certCount).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(result.credentialGap.certCount)).toBe(true)
    })

    test('credentialGap serialization contains no year-like patterns', () => {
        const resumes = [newGradText, careerChangerText, hybridGradText, seniorDevText]
        for (const resumeText of resumes) {
            const result  = parseResumeLite(resumeText)
            const serialized = JSON.stringify(result.credentialGap)
            expect(serialized).not.toMatch(/\b(19|20)\d{2}\b/)
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
            const result = parseResumeLite(resumeText)
            expect(result.topSkills.skills.length).toBeLessThanOrEqual(5)
        }
    })

    test('totalDetected reflects full count, not capped count', () => {
        // senior_dev is most likely to have more than 5 skills
        const result = parseResumeLite(seniorDevText)
        expect(result.topSkills.totalDetected).toBeGreaterThanOrEqual(result.topSkills.skills.length)
    })
})

// ---------------------------------------------------------------------------
// 4. All 4 fixtures run without throwing
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
            expect(() => { result = parseResumeLite(resumeText) }).not.toThrow()
            expect(result).toBeDefined()
            expect(Array.isArray(result.topSkills.skills)).toBe(true)
            expect(Array.isArray(result.allBehavioralSignals)).toBe(true)
            expect(Array.isArray(result.sectionsPresent)).toBe(true)
        })
    }
})

// ---------------------------------------------------------------------------
// 5. allBehavioralSignals — full registry set, no raw text leaked
// ---------------------------------------------------------------------------

describe('parseResumeLite() — allBehavioralSignals', () => {
    test('allBehavioralSignals entries have exactly name and present', () => {
        const result = parseResumeLite(newGradText)
        for (const entry of result.allBehavioralSignals) {
            const keys = Object.keys(entry)
            expect(keys).toEqual(expect.arrayContaining(['name', 'present']))
            expect(keys).toHaveLength(2)
            expect(typeof entry.name).toBe('string')
            expect(typeof entry.present).toBe('boolean')
        }
    })

    test('allBehavioralSignals contains no resume text content — only signal names', () => {
        const result = parseResumeLite(newGradText)
        for (const entry of result.allBehavioralSignals) {
            // Signal names are short canonical labels, not bullet text
            expect(entry.name.length).toBeLessThan(60)
            // No year-like patterns in signal names
            expect(entry.name).not.toMatch(/\b(19|20)\d{2}\b/)
        }
    })

    test('each canonical in the registry appears exactly once in allBehavioralSignals', () => {
        const result = parseResumeLite(newGradText)
        const names = result.allBehavioralSignals.map(e => e.name)
        const uniqueNames = new Set(names)
        expect(names.length).toBe(uniqueNames.size)
    })
})

// ---------------------------------------------------------------------------
// 6. sectionsPresent — labels only, no content
// ---------------------------------------------------------------------------

describe('parseResumeLite() — sectionsPresent', () => {
    test('sectionsPresent entries are non-empty strings without colons', () => {
        const result = parseResumeLite(seniorDevText)
        for (const s of result.sectionsPresent) {
            expect(typeof s).toBe('string')
            expect(s.length).toBeGreaterThan(0)
            expect(s).not.toContain(':')
        }
    })

    test('sectionsPresent contains known section labels only', () => {
        const KNOWN_LABELS = new Set(['Summary', 'Education', 'Skills', 'Projects', 'Experience', 'Certifications'])
        const result = parseResumeLite(seniorDevText)
        for (const s of result.sectionsPresent) {
            expect(KNOWN_LABELS.has(s)).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// 7. computeLiteMatch — sentinel shape when jdProfile is null/empty
// ---------------------------------------------------------------------------

describe('computeLiteMatch() — sentinel shape', () => {
    const resumeData = parseResumeLite(newGradText)

    test('returns matchScore: null when jdProfile is null', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(result.matchScore).toBeNull()
    })

    test('returns matchScore: null when jdProfile is undefined', () => {
        const result = computeLiteMatch(resumeData, undefined)
        expect(result.matchScore).toBeNull()
    })

    test('returns matchScore: null when jdProfile.technicalSignals is empty', () => {
        const emptyJD = { technicalSignals: [], behavioralSignals: [], jobDuties: [] }
        const result = computeLiteMatch(resumeData, emptyJD)
        expect(result.matchScore).toBeNull()
    })

    test('sentinel: topActionable is null when no jdProfile', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(result.topActionable).toBeNull()
    })

    test('sentinel: remainingCounts is empty object when no jdProfile', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(result.remainingCounts).toEqual({})
    })

    test('sentinel: missingBehavioral is empty array when no jdProfile', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(Array.isArray(result.missingBehavioral)).toBe(true)
        expect(result.missingBehavioral).toHaveLength(0)
    })

    test('sentinel: teaserCounts has zero counts when no jdProfile', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(result.teaserCounts.lowMatchCount).toBe(0)
        expect(result.teaserCounts.criticalGapCount).toBe(0)
    })

    test('matchScore is NOT 100 in sentinel shape (null, not a number)', () => {
        const result = computeLiteMatch(resumeData, null)
        expect(result.matchScore).not.toBe(100)
        expect(result.matchScore).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// 8. computeLiteMatch — real values when jdProfile is valid
// ---------------------------------------------------------------------------

describe('computeLiteMatch() — real values with valid jdProfile', () => {
    const resumeData = parseResumeLite(newGradText)
    const result = computeLiteMatch(resumeData, jdProfile)

    test('matchScore is a number (not null) when jdProfile has technicalSignals', () => {
        expect(result.matchScore).not.toBeNull()
        expect(typeof result.matchScore).toBe('number')
    })

    test('matchScore is between 0 and 100', () => {
        expect(result.matchScore).toBeGreaterThanOrEqual(0)
        expect(result.matchScore).toBeLessThanOrEqual(100)
    })

    test('missingBehavioral is an array', () => {
        expect(Array.isArray(result.missingBehavioral)).toBe(true)
    })

    test('teaserCounts has lowMatchCount and criticalGapCount as numbers', () => {
        expect(typeof result.teaserCounts.lowMatchCount).toBe('number')
        expect(typeof result.teaserCounts.criticalGapCount).toBe('number')
    })

    test('teaser strings are undefined (not empty string) when count is 0', () => {
        if (result.teaserCounts.lowMatchCount === 0) {
            expect(result.teaserCounts.lowMatchTeaser).toBeUndefined()
        }
        if (result.teaserCounts.criticalGapCount === 0) {
            expect(result.teaserCounts.criticalTeaser).toBeUndefined()
        }
    })

    test('teaser strings are non-empty strings when count > 0', () => {
        if (result.teaserCounts.lowMatchCount > 0) {
            expect(typeof result.teaserCounts.lowMatchTeaser).toBe('string')
            expect(result.teaserCounts.lowMatchTeaser.length).toBeGreaterThan(0)
        }
        if (result.teaserCounts.criticalGapCount > 0) {
            expect(typeof result.teaserCounts.criticalTeaser).toBe('string')
            expect(result.teaserCounts.criticalTeaser.length).toBeGreaterThan(0)
        }
    })
})

// ---------------------------------------------------------------------------
// 9. computeLiteMatch — all 4 fixtures with valid jdProfile
// ---------------------------------------------------------------------------

describe('computeLiteMatch() — fixture smoke tests', () => {
    const fixtures = [
        ['new_grad',       newGradText],
        ['career_changer', careerChangerText],
        ['hybrid_grad',    hybridGradText],
        ['senior_dev',     seniorDevText],
    ]

    for (const [name, resumeText] of fixtures) {
        test(`${name}: computeLiteMatch produces output without throwing`, () => {
            const resumeData = parseResumeLite(resumeText)
            let result
            expect(() => { result = computeLiteMatch(resumeData, jdProfile) }).not.toThrow()
            expect(result).toBeDefined()
            expect(typeof result.matchScore).toBe('number')
            expect(Array.isArray(result.missingBehavioral)).toBe(true)
        })
    }
})

// ---------------------------------------------------------------------------
// 10. computeLiteMatch — topActionable unified selection logic
//
// Candidate pool = levelGaps (have it, below required level) + critical
// (missing entirely). Ranked by: gap ascending, then importance descending,
// then contextCount descending (critical items treated as contextCount 0).
// To exercise this directly and deterministically, these tests use an empty
// resume (_technicalSignals: []) so every JD skill lands in `critical`, or a
// hand-built resumeData/jdProfile pair to produce controlled levelGaps.
// ---------------------------------------------------------------------------

describe('computeLiteMatch() — topActionable selection', () => {
    const emptyResumeData = { _technicalSignals: [], _behavioralSignals: [], _degree: null }

    test('returns at most 3 skills, ranked by gap ascending', () => {
        const testJdProfile = {
            technicalSignals: [
                { name: 'Skill-Low',  level: 2, importance: 3, jdOrder: 10 },
                { name: 'Skill-Mid',  level: 3, importance: 3, jdOrder: 20 },
                { name: 'Skill-High', level: 5, importance: 3, jdOrder: 30 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(emptyResumeData, testJdProfile)

        expect(result.topActionable).not.toBeNull()
        expect(result.topActionable.skills).toHaveLength(3)
        // All are critical (resume empty) — gap equals jdSkill.level, so
        // smallest required level ranks first (smaller implicit gap).
        expect(result.topActionable.skills.map(s => s.name)).toEqual([
            'Skill-Low', 'Skill-Mid', 'Skill-High',
        ])
        expect(result.topActionable.skills.every(s => s.sourceType === 'critical')).toBe(true)
    })

    test('returns fewer than 3 when the combined pool is smaller than 3', () => {
        const testJdProfile = {
            technicalSignals: [
                { name: 'Low-A', level: 1, importance: 3, jdOrder: 10 },
                { name: 'Low-B', level: 2, importance: 3, jdOrder: 20 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(emptyResumeData, testJdProfile)

        expect(result.topActionable.skills).toHaveLength(2)
    })

    test('levelGap beats critical at the same JD-required level (partial evidence beats zero)', () => {
        // Resume has PartialSkill at level 2; JD requires level 3 → gap 1.
        // MissingSkill is required at level 3 too but absent from resume → gap 3 (critical).
        const resumeData = {
            _technicalSignals: [
                { name: 'PartialSkill', level: 2, confidence: 'high', source: 'Experience', durationMonths: 6, contextCount: 1 },
            ],
            _behavioralSignals: [],
            _degree: null,
        }
        const testJdProfile = {
            technicalSignals: [
                { name: 'PartialSkill', level: 3, importance: 3, jdOrder: 10 },
                { name: 'MissingSkill', level: 3, importance: 3, jdOrder: 20 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(resumeData, testJdProfile)

        expect(result.topActionable.skills[0].name).toBe('PartialSkill')
        expect(result.topActionable.skills[0].sourceType).toBe('levelGap')
        expect(result.topActionable.skills[1].name).toBe('MissingSkill')
        expect(result.topActionable.skills[1].sourceType).toBe('critical')
    })

    test('within equal gap, higher importance ranks first', () => {
        const testJdProfile = {
            technicalSignals: [
                { name: 'LowImportance',  level: 3, importance: 2, jdOrder: 10 },
                { name: 'HighImportance', level: 3, importance: 5, jdOrder: 20 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(emptyResumeData, testJdProfile)

        expect(result.topActionable.skills.map(s => s.name)).toEqual([
            'HighImportance', 'LowImportance',
        ])
    })

    test('within equal gap and importance, higher contextCount ranks first', () => {
        const resumeData = {
            _technicalSignals: [
                { name: 'FewContexts',  level: 2, confidence: 'high', source: 'Experience', durationMonths: 3, contextCount: 1 },
                { name: 'ManyContexts', level: 2, confidence: 'high', source: 'Experience', durationMonths: 3, contextCount: 3 },
            ],
            _behavioralSignals: [],
            _degree: null,
        }
        const testJdProfile = {
            technicalSignals: [
                { name: 'FewContexts',  level: 4, importance: 3, jdOrder: 10 },
                { name: 'ManyContexts', level: 4, importance: 3, jdOrder: 20 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(resumeData, testJdProfile)

        expect(result.topActionable.skills.map(s => s.name)).toEqual([
            'ManyContexts', 'FewContexts',
        ])
    })

    test('deterministic — identical input produces identical output across calls', () => {
        const result1 = computeLiteMatch(parseResumeLite(newGradText), jdProfile)
        const result2 = computeLiteMatch(parseResumeLite(newGradText), jdProfile)
        expect(result1.topActionable.skills.map(s => s.name)).toEqual(
            result2.topActionable.skills.map(s => s.name)
        )
        expect(JSON.stringify(result1.topActionable)).toBe(JSON.stringify(result2.topActionable))
    })
})

// ---------------------------------------------------------------------------
// 11. computeLiteMatch — remainingCounts
// ---------------------------------------------------------------------------

describe('computeLiteMatch() — remainingCounts', () => {
    const emptyResumeData = { _technicalSignals: [], _behavioralSignals: [], _degree: null }

    test('high-remaining fixture: counts reflect pool size minus the top 3 shown', () => {
        const testJdProfile = {
            technicalSignals: [
                { name: 'A', level: 1, importance: 3, jdOrder: 10 },
                { name: 'B', level: 1, importance: 3, jdOrder: 20 },
                { name: 'C', level: 1, importance: 3, jdOrder: 30 },
                { name: 'D', level: 1, importance: 3, jdOrder: 40 },
                { name: 'E', level: 1, importance: 3, jdOrder: 50 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(emptyResumeData, testJdProfile)

        // All 5 are critical, gap ties → all same tier, 3 shown, 2 remain.
        expect(result.remainingCounts.criticalRemaining).toBe(2)
        expect(result.remainingCounts.levelGapsRemaining).toBeUndefined()
    })

    test('low/zero-remaining fixture: fields omitted (undefined) rather than 0', () => {
        const testJdProfile = {
            technicalSignals: [
                { name: 'Only-A', level: 1, importance: 3, jdOrder: 10 },
            ],
            behavioralSignals: [],
        }
        const result = computeLiteMatch(emptyResumeData, testJdProfile)

        expect(result.remainingCounts.criticalRemaining).toBeUndefined()
        expect(result.remainingCounts.levelGapsRemaining).toBeUndefined()
        expect(result.remainingCounts).toEqual({})
    })
})
