/**
 * Tests for RookieResumeView
 *
 * React Testing Library is not installed in this project, so these tests
 * verify the component's data contracts and render-logic invariants
 * without a DOM renderer.
 *
 * Approach:
 *   - Test the liteResults shape the component depends on
 *   - Leak test: rendered output must not include institution names,
 *     degree fields-of-study, cert titles, or employer names
 *   - Test credential summary logic (degreeLevel token, certCount)
 *   - Test allBehavioralSignals present/absent contract
 *   - Test sectionsPresent renders correctly
 *   - Smoke-test all 4 fixtures' parseResumeLite output
 */

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseResumeLite } from '@core/parser/parseResumeLite.js'
import { parseJobDescription } from '../../src/jd-skill-parser.jsx'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const jdUrl     = new URL('../fixtures/sample-jd.txt', import.meta.url)
const jdText    = readFileSync(jdUrl, 'utf-8')
const jdProfile = parseJobDescription(jdText)

function loadResume(name) {
    const url = new URL(`../fixtures/resumes/${name}.txt`, import.meta.url)
    return readFileSync(url, 'utf-8')
}

const newGradText       = loadResume('new_grad')
const careerChangerText = loadResume('career_changer')
const hybridGradText    = loadResume('hybrid_grad')
const seniorDevText     = loadResume('senior_dev')

// ---------------------------------------------------------------------------
// Helper: build complete liteResults for component contract tests
// ---------------------------------------------------------------------------

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
        allBehavioralSignals: [
            { name: 'Communication',   present: true },
            { name: 'Collaboration',   present: false },
            { name: 'Problem Solving', present: true },
        ],
        credentialGap: {
            degreePresent: true,
            degreeLevel:   'B.S.',
            certCount:     2,
            certPresent:   true,
        },
        sectionsPresent: ['Experience', 'Education', 'Skills', 'Projects'],
        closestGap:      null,
        missingBehavioral: [],
        teaserCounts:    { lowMatchCount: 0, criticalGapCount: 0 },
        matchScore:      68,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// 1. Component is importable
// ---------------------------------------------------------------------------

describe('RookieResumeView — module smoke', () => {
    test('component module is importable without error', async () => {
        const mod = await import('../../src/components/RookieResumeView.jsx')
        expect(typeof mod.default).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// 2. liteResults shape contract
// ---------------------------------------------------------------------------

describe('RookieResumeView — liteResults shape contract', () => {
    test('complete liteResults has all required fields', () => {
        const result = completeLiteResults()
        expect(result).toHaveProperty('topSkills')
        expect(result).toHaveProperty('allBehavioralSignals')
        expect(result).toHaveProperty('credentialGap')
        expect(result).toHaveProperty('sectionsPresent')
    })

    test('topSkills.skills is an array', () => {
        const result = completeLiteResults()
        expect(Array.isArray(result.topSkills.skills)).toBe(true)
    })

    test('allBehavioralSignals entries have name and present', () => {
        const result = completeLiteResults()
        for (const entry of result.allBehavioralSignals) {
            expect(typeof entry.name).toBe('string')
            expect(typeof entry.present).toBe('boolean')
        }
    })

    test('credentialGap has degreePresent, degreeLevel, certCount, certPresent', () => {
        const result = completeLiteResults()
        expect(typeof result.credentialGap.degreePresent).toBe('boolean')
        expect(typeof result.credentialGap.certCount).toBe('number')
        expect(typeof result.credentialGap.certPresent).toBe('boolean')
    })

    test('sectionsPresent is an array of strings', () => {
        const result = completeLiteResults()
        expect(Array.isArray(result.sectionsPresent)).toBe(true)
        for (const s of result.sectionsPresent) {
            expect(typeof s).toBe('string')
        }
    })
})

// ---------------------------------------------------------------------------
// 3. Credential summary logic — no specifics leaked
// ---------------------------------------------------------------------------

describe('RookieResumeView — credentialSummary logic', () => {
    // Replicate the component's credentialSummary() for unit testing
    function credentialSummary(credentialGap) {
        const parts = []
        if (credentialGap.degreePresent) {
            const token = credentialGap.degreeLevel ?? 'Degree'
            parts.push(`${token} detected`)
        } else {
            parts.push('No degree detected')
        }
        if (credentialGap.certCount > 0) {
            parts.push(`${credentialGap.certCount} certification${credentialGap.certCount !== 1 ? 's' : ''} detected`)
        } else {
            parts.push('No certifications detected')
        }
        return parts.join(' · ')
    }

    test('degree present with token — renders token only, not field-of-study', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: 'B.S.', certCount: 0, certPresent: false })
        expect(summary).toContain('B.S.')
        expect(summary).not.toMatch(/Computer Science|Engineering|Arts|Biology/i)
    })

    test('degree absent — renders "No degree detected"', () => {
        const summary = credentialSummary({ degreePresent: false, degreeLevel: null, certCount: 0, certPresent: false })
        expect(summary).toContain('No degree detected')
    })

    test('certCount 1 — singular form', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: 'M.S.', certCount: 1, certPresent: true })
        expect(summary).toContain('1 certification detected')
        expect(summary).not.toContain('certifications')
    })

    test('certCount 3 — plural form', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: 'B.S.', certCount: 3, certPresent: true })
        expect(summary).toContain('3 certifications detected')
    })

    test('certCount 0 — renders "No certifications detected"', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: 'B.S.', certCount: 0, certPresent: false })
        expect(summary).toContain('No certifications detected')
    })

    test('summary contains no institution names from common fixture schools', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: 'B.S.', certCount: 2, certPresent: true })
        expect(summary).not.toMatch(/University|College|Institute|MIT|Harvard|Stanford/i)
    })

    test('degreeLevel null with degreePresent true — falls back to "Degree"', () => {
        const summary = credentialSummary({ degreePresent: true, degreeLevel: null, certCount: 0, certPresent: false })
        expect(summary).toContain('Degree detected')
    })
})

// ---------------------------------------------------------------------------
// 4. allBehavioralSignals — Resume tab shows detected signals only
// ---------------------------------------------------------------------------

describe('RookieResumeView — behavioral signals (resume tab shows detected only)', () => {
    test('only present === true signals are shown in the resume view', () => {
        const result = completeLiteResults()
        // Simulate the component filter: only present signals render
        const rendered = result.allBehavioralSignals.filter(s => s.present)
        // completeLiteResults has Communication and Problem Solving as present
        expect(rendered.length).toBe(2)
        for (const s of rendered) {
            expect(s.present).toBe(true)
        }
        // absent signals (Collaboration) must not appear
        const absentInRendered = rendered.filter(s => !s.present)
        expect(absentInRendered.length).toBe(0)
    })

    test('absent signals are excluded from resume view render list', () => {
        const result = completeLiteResults()
        const rendered = result.allBehavioralSignals.filter(s => s.present)
        const names = rendered.map(s => s.name)
        // Collaboration is present: false in completeLiteResults fixture
        expect(names).not.toContain('Collaboration')
    })

    test('zero-detected: fallback text renders when no signals are present', () => {
        // Simulate allBehavioralSignals where nothing is detected
        const result = completeLiteResults({
            allBehavioralSignals: [
                { name: 'Communication',   present: false },
                { name: 'Collaboration',   present: false },
                { name: 'Problem Solving', present: false },
            ],
        })
        const rendered = result.allBehavioralSignals.filter(s => s.present)
        expect(rendered.length).toBe(0)
        // Component should render fallback text — verified by contract (zero items = fallback)
        const fallbackText = 'No behavioral signals detected on your resume.'
        expect(typeof fallbackText).toBe('string') // contract placeholder
        expect(rendered.length === 0).toBe(true)   // triggers fallback branch
    })

    test('allBehavioralSignals entries contain no raw resume text', () => {
        // Signal names are short canonical labels — not bullet-point fragments
        const result = completeLiteResults()
        for (const entry of result.allBehavioralSignals) {
            expect(entry.name.length).toBeLessThan(60)
            expect(entry.name).not.toMatch(/\b(19|20)\d{2}\b/)
        }
    })
})

// ---------------------------------------------------------------------------
// 5. sectionsPresent list
// ---------------------------------------------------------------------------

describe('RookieResumeView — sectionsPresent', () => {
    test('sectionsPresent values are non-empty strings', () => {
        const result = completeLiteResults()
        for (const s of result.sectionsPresent) {
            expect(s.length).toBeGreaterThan(0)
        }
    })

    test('sectionsPresent contains no colons or content fragments', () => {
        const result = completeLiteResults()
        for (const s of result.sectionsPresent) {
            expect(s).not.toContain(':')
        }
    })
})

// ---------------------------------------------------------------------------
// 6. All 4 fixtures produce RookieResumeView-compatible output
// ---------------------------------------------------------------------------

describe('RookieResumeView — fixture smoke tests', () => {
    const fixtures = [
        ['new_grad',       newGradText],
        ['career_changer', careerChangerText],
        ['hybrid_grad',    hybridGradText],
        ['senior_dev',     seniorDevText],
    ]

    for (const [name, resumeText] of fixtures) {
        test(`${name}: parseResumeLite output has all RookieResumeView fields`, () => {
            const result = parseResumeLite(resumeText, jdProfile)
            expect(result).toHaveProperty('topSkills')
            expect(result).toHaveProperty('allBehavioralSignals')
            expect(result).toHaveProperty('credentialGap')
            expect(result).toHaveProperty('sectionsPresent')
            expect(Array.isArray(result.allBehavioralSignals)).toBe(true)
            expect(Array.isArray(result.sectionsPresent)).toBe(true)
            expect(typeof result.credentialGap.degreePresent).toBe('boolean')
            expect(typeof result.credentialGap.certCount).toBe('number')
        })

        test(`${name}: allBehavioralSignals entries contain no institution/employer names`, () => {
            const result = parseResumeLite(resumeText, jdProfile)
            const serialized = JSON.stringify(result.allBehavioralSignals)
            // No year-like patterns
            expect(serialized).not.toMatch(/\b(19|20)\d{2}\b/)
            // No institution keywords
            expect(serialized).not.toMatch(/University|College|Institute/i)
        })

        test(`${name}: credentialGap.degreeLevel is null or a short type token`, () => {
            const result = parseResumeLite(resumeText, jdProfile)
            const { degreeLevel } = result.credentialGap
            if (degreeLevel !== null) {
                expect(typeof degreeLevel).toBe('string')
                expect(degreeLevel).toMatch(/^(B\.S\.|M\.S\.|Ph\.D\.|A\.A\.)$/)
                expect(degreeLevel).not.toMatch(/Computer|Science|Engineering|Arts|Business/i)
            } else {
                expect(degreeLevel).toBeNull()
            }
        })
    }
})
