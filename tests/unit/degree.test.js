import { describe, test, expect } from 'vitest'
import { extractDegree } from '@core/parser/parseResume.js'
import { extractJDDegree, computeDegreeFlag } from '../../src/jd-skill-parser.jsx'

// ---------------------------------------------------------------------------
// extractDegree — resume Education section
// ---------------------------------------------------------------------------

describe('extractDegree()', () => {
  test('detects BS with field from "B.S. Computer Science — State University, 2024"', () => {
    const result = extractDegree('B.S. Computer Science — State University, 2024')
    expect(result.degreeLevel).toBe(2)
    expect(result.field).toMatch(/Computer Science/i)
    expect(result.graduationYear).toBe(2024)
  })

  test('detects Bachelor\'s from "Bachelor\'s in Computer Science"', () => {
    const result = extractDegree("Bachelor's in Computer Science")
    expect(result.degreeLevel).toBe(2)
    expect(result.field).toMatch(/Computer Science/i)
  })

  test('detects Master\'s from "M.S. Data Science"', () => {
    const result = extractDegree('M.S. Data Science')
    expect(result.degreeLevel).toBe(3)
  })

  test('detects PhD from "Doctor of Philosophy in Machine Learning"', () => {
    const result = extractDegree('Doctor of Philosophy in Machine Learning')
    expect(result.degreeLevel).toBe(4)
  })

  test('detects Associate\'s', () => {
    const result = extractDegree("Associate's degree in Business")
    expect(result.degreeLevel).toBe(1)
  })

  test('returns null degreeLevel when no degree found', () => {
    const result = extractDegree('Some coursework and training')
    expect(result.degreeLevel).toBeNull()
  })

  test('returns all null on empty input', () => {
    const result = extractDegree('')
    expect(result.degreeLevel).toBeNull()
    expect(result.field).toBeNull()
    expect(result.institution).toBeNull()
    expect(result.graduationYear).toBeNull()
  })

  test('extracts graduation year from education block', () => {
    const result = extractDegree('B.A. English\nState College, 2022')
    expect(result.graduationYear).toBe(2022)
  })
})

// ---------------------------------------------------------------------------
// extractJDDegree — JD text
// ---------------------------------------------------------------------------

describe('extractJDDegree()', () => {
  test('detects "Bachelor\'s degree in Computer Science, Engineering, or a related field"', () => {
    const text = "Qualifications:\n  Bachelor's degree in Computer Science, Engineering, or a related field."
    const result = extractJDDegree(text)
    expect(result.requiredDegreeLevel).toBe(2)
    expect(result.preferredField).toMatch(/Computer Science/i)
  })

  test('detects "BACHELOR OF COMPUTER SCIENCE" (all caps)', () => {
    const result = extractJDDegree('Qualifications: BACHELOR OF COMPUTER SCIENCE')
    expect(result.requiredDegreeLevel).toBe(2)
  })

  test('detects Master\'s requirement', () => {
    const result = extractJDDegree("Required: Master's degree in a technical field")
    expect(result.requiredDegreeLevel).toBe(3)
  })

  test('returns null when no degree mentioned', () => {
    const result = extractJDDegree('5+ years of experience in software development')
    expect(result.requiredDegreeLevel).toBeNull()
  })

  test('returns not_stated status when JD has no degree', () => {
    const result = extractJDDegree('We value experience over credentials.')
    expect(result.requiredDegreeLevel).toBeNull()
  })

  test('handles null input', () => {
    const result = extractJDDegree(null)
    expect(result.requiredDegreeLevel).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeDegreeFlag
// ---------------------------------------------------------------------------

describe('computeDegreeFlag()', () => {
  test('returns not_stated when JD has no degree requirement', () => {
    const result = computeDegreeFlag({ degreeLevel: 2 }, { requiredDegreeLevel: null })
    expect(result.status).toBe('not_stated')
  })

  test('returns match when resume degree >= required', () => {
    const result = computeDegreeFlag(
      { degreeLevel: 2, field: 'Computer Science' },
      { requiredDegreeLevel: 2 }
    )
    expect(result.status).toBe('match')
    expect(result.required).toBe("Bachelor's")
    expect(result.found).toMatch(/Bachelor/)
  })

  test('master\'s satisfies bachelor\'s requirement', () => {
    const result = computeDegreeFlag(
      { degreeLevel: 3, field: null },
      { requiredDegreeLevel: 2 }
    )
    expect(result.status).toBe('match')
  })

  test('returns gap when resume has no degree but JD requires one', () => {
    const result = computeDegreeFlag(null, { requiredDegreeLevel: 2 })
    expect(result.status).toBe('gap')
    expect(result.found).toBeNull()
    expect(result.required).toBe("Bachelor's")
  })

  test('returns gap when resume degree is lower than required', () => {
    const result = computeDegreeFlag(
      { degreeLevel: 1 },
      { requiredDegreeLevel: 2 }
    )
    expect(result.status).toBe('gap')
    expect(result.found).toMatch(/Associate/)
  })

  test('handles null jdDegree gracefully', () => {
    const result = computeDegreeFlag({ degreeLevel: 2 }, null)
    expect(result.status).toBe('not_stated')
  })
})
