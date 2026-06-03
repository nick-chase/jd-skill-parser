import { describe, test, expect } from 'vitest'
import { parseResume } from '@core/parser/parseResume.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildResume(certsSection) {
    return `PROFESSIONAL EXPERIENCE\nSoftware Engineer, Acme Corp\n2020 - 2022\nBuilt things.\n\nCERTIFICATIONS\n${certsSection}`
}

function findSkill(signals, name) {
    return signals.find(s => s.name === name)
}

// ---------------------------------------------------------------------------
// Acronym extraction — (ACRONYM), YEAR format
// ---------------------------------------------------------------------------

describe('cert section — acronym extraction', () => {
    test('PMI Project Management Professional (PMP), 2020 → surfaces PMP at E=0.55', () => {
        const text = buildResume('PMI Project Management Professional (PMP), 2020')
        const { technicalSignals } = parseResume(text)
        const pmp = findSkill(technicalSignals, 'PMP')
        expect(pmp).toBeDefined()
        expect(pmp.source).toBe('Certifications')
        // E=0.55 × C=1.0 × D=0.4 (null duration) → score 0.22, L2
        expect(pmp.score).toBeCloseTo(0.22, 2)
    })

    test('(ISC)² Certified Secure Software Lifecycle (CSSLP), 2022 → surfaces CSSLP', () => {
        const text = buildResume('(ISC)² Certified Secure Software Lifecycle (CSSLP), 2022')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'CSSLP')).toBeDefined()
    })

    test('AWS Certified Solutions Architect (SAA-C03), 2023 → surfaces AWS Certified Solutions Architect', () => {
        const text = buildResume('AWS Certified Solutions Architect (SAA-C03), 2023')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'AWS Certified Solutions Architect')).toBeDefined()
    })

    test('Certified Kubernetes Administrator (CKA), 2022 → surfaces CKA', () => {
        const text = buildResume('Certified Kubernetes Administrator (CKA), 2022')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'CKA')).toBeDefined()
    })
})

// ---------------------------------------------------------------------------
// Full-line fallback — certs without acronym parentheses
// ---------------------------------------------------------------------------

describe('cert section — full-line fallback', () => {
    test('CompTIA Security+, 2020 → surfaces CompTIA Security+', () => {
        const text = buildResume('CompTIA Security+, 2020')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'CompTIA Security+')).toBeDefined()
    })

    test('CISSP — full line without parens → surfaces CISSP', () => {
        const text = buildResume('CISSP, 2021')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'CISSP')).toBeDefined()
    })

    test('Scrum Master, 2019 → surfaces CSM', () => {
        const text = buildResume('Scrum Master, 2019')
        const { technicalSignals } = parseResume(text)
        expect(findSkill(technicalSignals, 'CSM')).toBeDefined()
    })
})

// ---------------------------------------------------------------------------
// Evidence weight
// ---------------------------------------------------------------------------

describe('cert section — evidence weight', () => {
    test('all cert skills carry sectionName=certifications', () => {
        // We verify via source label mapping
        const text = buildResume('Project Management Professional (PMP), 2020')
        const { technicalSignals } = parseResume(text)
        const pmp = findSkill(technicalSignals, 'PMP')
        expect(pmp?.source).toBe('Certifications')
    })

    test('cert score is lower than same skill in full-time experience', () => {
        const certResume = buildResume('Project Management Professional (PMP), 2020')
        const expResume = `PROFESSIONAL EXPERIENCE\nProject Manager, Acme Corp | 2019 - 2022\nLed PMP projects.\n`
        const { technicalSignals: certSignals } = parseResume(certResume)
        const { technicalSignals: expSignals } = parseResume(expResume)
        const certPmp = findSkill(certSignals, 'PMP')
        const expPmp  = findSkill(expSignals,  'PMP')
        expect(certPmp?.score).toBeLessThan(expPmp?.score ?? Infinity)
    })
})
