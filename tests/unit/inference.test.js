import { describe, test, expect } from 'vitest'
import {
  parseDateRange,
  classifyEvidenceType,
  classifyBloomLevel,
  scoreSkillEvidence,
} from '@core/parser/inference.js'

// ---------------------------------------------------------------------------
// B1 — parseDateRange
// ---------------------------------------------------------------------------

describe('parseDateRange()', () => {
  // Year-only ranges
  test('parses "2022–2024" (en dash) → 24 months', () => {
    expect(parseDateRange('2022–2024')).toBe(24)
  })

  test('parses "2022-2024" (hyphen) → 24 months', () => {
    expect(parseDateRange('2022-2024')).toBe(24)
  })

  test('parses "2020 - 2023" (spaced hyphen) → 36 months', () => {
    expect(parseDateRange('2020 - 2023')).toBe(36)
  })

  // Month + year ranges
  test('parses "March 2021 – June 2022" → 15 months', () => {
    expect(parseDateRange('March 2021 – June 2022')).toBe(15)
  })

  test('parses "Jan 2020 - Dec 2020" → 11 months', () => {
    expect(parseDateRange('Jan 2020 - Dec 2020')).toBe(11)
  })

  test('parses "May 2024 – Aug 2024" → 3 months', () => {
    expect(parseDateRange('May 2024 – Aug 2024')).toBe(3)
  })

  // Present / current
  test('parses "Jan 2023 – Present" → months from Jan 2023 to today (≥12)', () => {
    const result = parseDateRange('Jan 2023 – Present')
    expect(result).toBeGreaterThanOrEqual(12) // minimum as of 2024
    expect(result).toBeLessThan(120)           // sanity cap
  })

  test('parses "2023 to present" → months from Jan 2023 to today (≥12)', () => {
    const result = parseDateRange('2023 to present')
    expect(result).toBeGreaterThanOrEqual(12)
    expect(result).toBeLessThan(120)
  })

  test('parses "2022 – current" → months from Jan 2022 to today (≥24)', () => {
    const result = parseDateRange('2022 – current')
    expect(result).toBeGreaterThanOrEqual(24)
  })

  // Duration phrases already stated
  test('parses "6 months" → 6', () => {
    expect(parseDateRange('6 months')).toBe(6)
  })

  test('parses "3 months" → 3', () => {
    expect(parseDateRange('3 months')).toBe(3)
  })

  test('parses "1 year" → 12', () => {
    expect(parseDateRange('1 year')).toBe(12)
  })

  test('parses "2 years" → 24', () => {
    expect(parseDateRange('2 years')).toBe(24)
  })

  test('parses "2 years 3 months" → 27', () => {
    expect(parseDateRange('2 years 3 months')).toBe(27)
  })

  // Abbreviated months with trailing period (common in real resumes)
  test('parses "Aug. 2019 – Current" → >60 months (at least 5 years to 2026)', () => {
    const result = parseDateRange('Aug. 2019 – Current')
    expect(result).toBeGreaterThan(60)
    expect(result).toBeLessThan(120)
  })

  test('parses "Sep. 2015 – Aug. 2019" → ~47 months', () => {
    const result = parseDateRange('Sep. 2015 – Aug. 2019')
    expect(result).toBeGreaterThanOrEqual(44)
    expect(result).toBeLessThanOrEqual(50)
  })

  test('parses "Jan 2020 – current" (lowercase) → months from Jan 2020 to today (≥24)', () => {
    const result = parseDateRange('Jan 2020 – current')
    expect(result).toBeGreaterThanOrEqual(24)
    expect(result).toBeLessThan(120)
  })

  test('parses "August 2019 - Present" (full month name) → >60 months', () => {
    const result = parseDateRange('August 2019 - Present')
    expect(result).toBeGreaterThan(60)
    expect(result).toBeLessThan(120)
  })

  // Season recognition
  test('parses "Summer 2023" → 3 months (Jun–Aug)', () => {
    expect(parseDateRange('Summer 2023')).toBe(3)
  })

  test('parses "Fall 2023" → 4 months (Sep–Dec)', () => {
    expect(parseDateRange('Fall 2023')).toBe(4)
  })

  test('parses "Spring 2023" → 5 months (Jan–May)', () => {
    expect(parseDateRange('Spring 2023')).toBe(5)
  })

  test('parses "Winter 2023" → 3 months (Dec–Feb cross-year)', () => {
    expect(parseDateRange('Winter 2023')).toBe(3)
  })

  test('season recognition is case-insensitive: "summer 2024" → 3', () => {
    expect(parseDateRange('summer 2024')).toBe(3)
  })

  test('season recognition is case-insensitive: "FALL 2022" → 4', () => {
    expect(parseDateRange('FALL 2022')).toBe(4)
  })

  // Expected / Anticipated prefix
  test('strips "Expected" prefix and parses remaining date range', () => {
    // "Expected May 2026" is a single point, not a range → null (no duration computable)
    expect(parseDateRange('Expected May 2026')).toBeNull()
  })

  test('strips "Anticipated" prefix and parses remaining date range', () => {
    expect(parseDateRange('Anticipated May 2026')).toBeNull()
  })

  test('"Expected Jan 2023 – Present" strips prefix and computes months from Jan 2023', () => {
    const result = parseDateRange('Expected Jan 2023 – Present')
    expect(result).toBeGreaterThanOrEqual(12)
    expect(result).toBeLessThan(120)
  })

  // Bare 4-digit year
  test('returns null for bare year "2022" (no range, duration indeterminate)', () => {
    expect(parseDateRange('2022')).toBeNull()
  })

  test('returns null for bare year "2019" (no range, duration indeterminate)', () => {
    expect(parseDateRange('2019')).toBeNull()
  })

  // Unparseable
  test('returns null for empty string', () => {
    expect(parseDateRange('')).toBeNull()
  })

  test('returns null for unstructured prose', () => {
    expect(parseDateRange('various experience throughout career')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// B2 — classifyEvidenceType
// ---------------------------------------------------------------------------

describe('classifyEvidenceType()', () => {
  // Full-time job history → 1.0
  test('experience section + senior title → 1.0', () => {
    expect(classifyEvidenceType('experience', 'Senior Software Engineer')).toBe(1.0)
  })

  test('experience section + no title → 1.0', () => {
    expect(classifyEvidenceType('experience', '')).toBe(1.0)
  })

  // Contract / internship → 0.65
  test('experience + "intern" in title → 0.65', () => {
    expect(classifyEvidenceType('experience', 'Software Engineering Intern')).toBe(0.65)
  })

  test('experience + "contract" in title → 0.65', () => {
    expect(classifyEvidenceType('experience', 'Contract Developer')).toBe(0.65)
  })

  test('experience + "co-op" in title → 0.65', () => {
    expect(classifyEvidenceType('experience', 'Co-op Engineer')).toBe(0.65)
  })

  test('experience + "temp" in title → 0.65', () => {
    expect(classifyEvidenceType('experience', 'Temp Data Analyst')).toBe(0.65)
  })

  // Personal project — no measurable outcome → 0.30
  test('projects section, no outcome text → 0.30', () => {
    expect(classifyEvidenceType('projects', '')).toBe(0.30)
  })

  // Personal project — with measurable outcome → 0.50
  test('projects section, percentage outcome → 0.50', () => {
    expect(classifyEvidenceType('projects', '', 'Reduced load time by 40%')).toBe(0.50)
  })

  test('projects section, user count outcome → 0.50', () => {
    expect(classifyEvidenceType('projects', '', 'Deployed app used by 500+ users')).toBe(0.50)
  })

  test('projects section, impact verb + number → 0.50', () => {
    expect(classifyEvidenceType('projects', '', 'Improved throughput by 3x, serving 200 customers')).toBe(0.50)
  })

  // Academic / coursework → 0.4
  test('education section → 0.4', () => {
    expect(classifyEvidenceType('education', '')).toBe(0.4)
  })

  // Skills section only → 0.05
  test('skills section → 0.05', () => {
    expect(classifyEvidenceType('skills', '')).toBe(0.05)
  })

  test('summary section → 0.05', () => {
    expect(classifyEvidenceType('summary', '')).toBe(0.05)
  })

  // Bootcamp / verifiable cert → 0.55
  test('certifications section → 0.55', () => {
    expect(classifyEvidenceType('certifications', '')).toBe(0.55)
  })

  test('bootcamp section → 0.55', () => {
    expect(classifyEvidenceType('bootcamp', '')).toBe(0.55)
  })

  // Project with no outcome text → 0.30
  test('projects section, empty blockText → 0.30', () => {
    expect(classifyEvidenceType('projects', '', '')).toBe(0.30)
  })

  // Case-insensitive section names
  test('Experience (capitalised) → 1.0', () => {
    expect(classifyEvidenceType('Experience', 'Data Scientist')).toBe(1.0)
  })

  test('Projects (capitalised), no outcome text → 0.30', () => {
    expect(classifyEvidenceType('Projects', '')).toBe(0.30)
  })

  // Work history / employment variants
  test('"Work Experience" section → 1.0', () => {
    expect(classifyEvidenceType('Work Experience', 'IT Project Manager')).toBe(1.0)
  })

  test('"WORK EXPERIENCE" section → 1.0', () => {
    expect(classifyEvidenceType('WORK EXPERIENCE', '')).toBe(1.0)
  })

  test('"Work History" section → 1.0', () => {
    expect(classifyEvidenceType('Work History', 'Senior Analyst')).toBe(1.0)
  })

  test('"WORK HISTORY" section → 1.0', () => {
    expect(classifyEvidenceType('WORK HISTORY', '')).toBe(1.0)
  })

  test('"Employment" section → 1.0', () => {
    expect(classifyEvidenceType('Employment', '')).toBe(1.0)
  })

  test('"EMPLOYMENT" section → 1.0', () => {
    expect(classifyEvidenceType('EMPLOYMENT', '')).toBe(1.0)
  })

  test('"Work History" + intern title → 0.65', () => {
    expect(classifyEvidenceType('Work History', 'Software Engineering Intern')).toBe(0.65)
  })

  // HTML entity stripping
  test('section name with &nbsp; entity → treated as experience', () => {
    expect(classifyEvidenceType('Experience&nbsp;', '')).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// classifyBloomLevel
// ---------------------------------------------------------------------------

describe('classifyBloomLevel()', () => {
  test('Create verb "led" → 1.40', () => {
    expect(classifyBloomLevel('led the development of a new API')).toBe(1.40)
  })

  test('Create verb "architected" → 1.40', () => {
    expect(classifyBloomLevel('architected the microservices layer')).toBe(1.40)
  })

  test('Create verb "designed" → 1.40', () => {
    expect(classifyBloomLevel('designed the database schema')).toBe(1.40)
  })

  test('Create verb "owned" → 1.40', () => {
    expect(classifyBloomLevel('owned the full deployment pipeline')).toBe(1.40)
  })

  test('Evaluate verb "optimized" → 1.20', () => {
    expect(classifyBloomLevel('optimized query performance by 40%')).toBe(1.20)
  })

  test('Evaluate verb "validated" → 1.20', () => {
    expect(classifyBloomLevel('validated model outputs against ground truth')).toBe(1.20)
  })

  test('Analyze verb "debugged" → 1.10', () => {
    expect(classifyBloomLevel('debugged production memory leaks')).toBe(1.10)
  })

  test('Analyze verb "refactored" → 1.10', () => {
    expect(classifyBloomLevel('refactored the authentication module')).toBe(1.10)
  })

  test('Apply verb "built" → 1.00', () => {
    expect(classifyBloomLevel('built a REST API using FastAPI')).toBe(1.00)
  })

  test('Apply verb "implemented" → 1.00', () => {
    expect(classifyBloomLevel('implemented pagination and filtering')).toBe(1.00)
  })

  test('Understand verb "learned" → 0.70', () => {
    expect(classifyBloomLevel('learned React during coursework')).toBe(0.70)
  })

  test('Understand verb "familiar" → 0.70', () => {
    expect(classifyBloomLevel('familiar with Docker basics')).toBe(0.70)
  })

  test('Remember verb "listed" → 0.50', () => {
    expect(classifyBloomLevel('listed as a proficiency on resume')).toBe(0.50)
  })

  test('empty string → 1.00 (Apply default)', () => {
    expect(classifyBloomLevel('')).toBe(1.00)
  })

  test('null / undefined → 1.00 (Apply default)', () => {
    expect(classifyBloomLevel(null)).toBe(1.00)
    expect(classifyBloomLevel(undefined)).toBe(1.00)
  })

  test('unrecognised text → 1.00 (Apply default)', () => {
    expect(classifyBloomLevel('various contributions to the team')).toBe(1.00)
  })
})

// ---------------------------------------------------------------------------
// B3 — scoreSkillEvidence
// ---------------------------------------------------------------------------

describe('scoreSkillEvidence()', () => {
  // Example 2 from scoring-model.md — skills section only, no date
  // W=0.1 × M=0.4 (project col, unknown) = 0.04 × 1.0 = 0.04 → L1
  test('skills-section-only → score ≈ 0.04, L1 Awareness', () => {
    const result = scoreSkillEvidence([
      { wType: 0.1, durationMonths: null, sectionName: 'skills' },
    ])
    expect(result.score).toBeCloseTo(0.04, 2)
    expect(result.level).toBe('L1')
  })

  // Example 3 from scoring-model.md (uses TABLE values)
  // FT 3 yrs (36 mo): W=1.0 × M=1.3 = 1.30
  // Project no date: W=0.5 × M=0.4 = 0.20
  // Sum = 1.50 × M_rec(2) = 1.50 × 1.2 = 1.80 → L5
  test('FT 3-year job + project no date → score ≈ 1.80, L5 Expert', () => {
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 36, sectionName: 'experience' },
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(1.80, 2)
    expect(result.level).toBe('L5')
  })

  // Example 1 recalculated per TABLE (not the doc's worked example which has inconsistencies)
  // Internship 6 mo: W=0.7 × M=0.8 (job hist, 6–12mo) = 0.56
  // Project 3 mo:    W=0.5 × M=0.5 (project, <6mo) = 0.25
  // Skills mention:  W=0.1 × M=0.4 (project, unknown) = 0.04
  // Sum = 0.85 × M_rec(3) = 0.85 × 1.4 = 1.19 → L4
  test('internship + project + skills-mention → score ≈ 1.19, L4 Advanced', () => {
    const result = scoreSkillEvidence([
      { wType: 0.7, durationMonths: 6, sectionName: 'experience' },
      { wType: 0.5, durationMonths: 3, sectionName: 'projects' },
      { wType: 0.1, durationMonths: null, sectionName: 'skills' },
    ])
    expect(result.score).toBeCloseTo(1.19, 2)
    expect(result.level).toBe('L4')
  })

  // Duration modifier boundaries — job history column
  test('FT job unknown duration → M=0.5', () => {
    // W=1.0 × M=0.5 = 0.50 × 1.0 = 0.50 → L2
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: null, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(0.50, 2)
    expect(result.level).toBe('L2')
  })

  test('FT job <6 months → M=0.6', () => {
    // W=1.0 × M=0.6 = 0.60 × 1.0 = 0.60 → L3 (boundary is ≥0.60)
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 4, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(0.60, 2)
    expect(result.level).toBe('L3')
  })

  test('FT job 6–12 months → M=0.8', () => {
    // W=1.0 × M=0.8 = 0.80 × 1.0 = 0.80 → L3
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 9, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(0.80, 2)
    expect(result.level).toBe('L3')
  })

  test('FT job 1–2 years → M=1.0', () => {
    // W=1.0 × M=1.0 = 1.0 × 1.0 = 1.0 → L3 (boundary: <1.10)
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 18, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(1.0, 2)
    expect(result.level).toBe('L3')
  })

  test('FT job 2–4 years → M=1.3', () => {
    // W=1.0 × M=1.3 = 1.3 × 1.0 = 1.3 → L4
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 30, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(1.3, 2)
    expect(result.level).toBe('L4')
  })

  test('FT job 4+ years → M=1.5', () => {
    // W=1.0 × M=1.5 = 1.5 × 1.0 = 1.5 → L4
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 60, sectionName: 'experience' },
    ])
    expect(result.score).toBeCloseTo(1.5, 2)
    expect(result.level).toBe('L4')
  })

  // Duration modifier boundaries — project column
  test('project unknown duration → M=0.4', () => {
    // W=0.5 × M=0.4 = 0.20 × 1.0 = 0.20 → L1
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(0.20, 2)
    expect(result.level).toBe('L1')
  })

  test('project <6 months → M=0.5', () => {
    // E=0.5 × C=1.0 × D=0.5 = 0.25 × 1.0 = 0.25 → L2 (new threshold: ≥0.25)
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: 3, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(0.25, 2)
    expect(result.level).toBe('L2')
  })

  test('project 6–12 months → M=0.6', () => {
    // W=0.5 × M=0.6 = 0.30 × 1.0 = 0.30 → L2 (boundary: ≥0.30)
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: 8, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(0.30, 2)
    expect(result.level).toBe('L2')
  })

  test('project 1–2 years → M=0.7', () => {
    // W=0.5 × M=0.7 = 0.35 × 1.0 = 0.35 → L2
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: 18, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(0.35, 2)
    expect(result.level).toBe('L2')
  })

  // Recurrence multiplier
  test('1 instance → M_rec = 1.0 (no change)', () => {
    const single = scoreSkillEvidence([{ wType: 1.0, durationMonths: 12, sectionName: 'experience' }])
    const doubled = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 12, sectionName: 'experience' },
      { wType: 1.0, durationMonths: 12, sectionName: 'projects' },
    ])
    // 2-instance score should be (1.0 + 1.0×0.7) × 1.2 = ... actually test M_rec directly
    // 1-instance: W=1.0 × M=1.0 = 1.0 × M_rec(1)=1.0 → 1.0
    expect(single.score).toBeCloseTo(1.0, 2)
  })

  test('2 instances → M_rec = 1.2', () => {
    // W=0.5×M=0.4 = 0.20 (project unknown)
    // W=0.5×M=0.4 = 0.20 (project unknown)
    // sum=0.40 × 1.2 = 0.48 → L2
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
    ])
    expect(result.score).toBeCloseTo(0.48, 2)
  })

  test('3+ instances → M_rec = 1.4', () => {
    // 3 × (W=0.1 × M=0.4) = 3 × 0.04 = 0.12 × 1.4 = 0.168 → L1
    const result = scoreSkillEvidence([
      { wType: 0.1, durationMonths: null, sectionName: 'skills' },
      { wType: 0.1, durationMonths: null, sectionName: 'skills' },
      { wType: 0.1, durationMonths: null, sectionName: 'skills' },
    ])
    expect(result.score).toBeCloseTo(0.168, 3)
    expect(result.level).toBe('L1')
  })

  // Return shape
  test('returns score, level, confidence, primarySignal, suggestion', () => {
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 24, sectionName: 'experience' },
    ])
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('level')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('primarySignal')
    expect(result).toHaveProperty('suggestion')
    expect(typeof result.score).toBe('number')
    expect(typeof result.level).toBe('string')
    expect(['high', 'medium', 'low']).toContain(result.confidence)
    expect(typeof result.suggestion).toBe('string')
  })

  // Edge case — empty instances
  test('empty instances array → score 0, L1', () => {
    const result = scoreSkillEvidence([])
    expect(result.score).toBe(0)
    expect(result.level).toBe('L1')
  })

  // Bloom multiplier flows through scoring formula
  test('Create verb (C=1.40) raises score above default Apply (C=1.00)', () => {
    const withCreate = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 12, sectionName: 'experience', bulletText: 'led the team' },
    ])
    const withDefault = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 12, sectionName: 'experience' },
    ])
    expect(withCreate.score).toBeGreaterThan(withDefault.score)
  })

  test('Understand verb (C=0.70) lowers score below default Apply (C=1.00)', () => {
    const withUnderstand = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 12, sectionName: 'experience', bulletText: 'familiar with the technology' },
    ])
    const withDefault = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 12, sectionName: 'experience' },
    ])
    expect(withUnderstand.score).toBeLessThan(withDefault.score)
  })
})

// ---------------------------------------------------------------------------
// Confidence indicator
// ---------------------------------------------------------------------------

describe('scoreSkillEvidence() — confidence', () => {
  test('skills-section-only → low confidence', () => {
    const result = scoreSkillEvidence([
      { wType: 0.05, durationMonths: null, sectionName: 'skills' },
    ])
    expect(result.confidence).toBe('low')
    expect(result.level).toBe('L1')
  })

  test('3-year FT job + Create verb → high confidence', () => {
    const result = scoreSkillEvidence([
      { wType: 1.0, durationMonths: 36, sectionName: 'experience', bulletText: 'led the development' },
    ])
    expect(result.confidence).toBe('high')
    expect(['L4', 'L5']).toContain(result.level)
  })

  test('two instances, no duration → medium confidence', () => {
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
      { wType: 0.5, durationMonths: null, sectionName: 'projects' },
    ])
    expect(result.confidence).toBe('medium')
  })

  test('one project instance with duration and outcome verb → medium confidence', () => {
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: 6, sectionName: 'projects', bulletText: 'built a full-stack app' },
    ])
    expect(result.confidence).toBe('medium')
  })

  test('single short instance, no verbs → low confidence', () => {
    const result = scoreSkillEvidence([
      { wType: 0.5, durationMonths: 2, sectionName: 'projects' },
    ])
    expect(result.confidence).toBe('low')
  })

  test('empty instances → low confidence', () => {
    expect(scoreSkillEvidence([]).confidence).toBe('low')
  })
})
