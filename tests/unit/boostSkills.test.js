import { describe, it, expect } from 'vitest'
import { getResumeBoostSkills, getMatchBoostSkills, nameToResourceId } from '../../src/utils/boostSkills.js'

describe('nameToResourceId', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(nameToResourceId('Machine Learning')).toBe('machine-learning')
  })

  it('removes dots (e.g. Node.js)', () => {
    expect(nameToResourceId('Node.js')).toBe('nodejs')
  })

  it('collapses multiple hyphens', () => {
    expect(nameToResourceId('C++')).toBe('c')
  })
})

describe('getResumeBoostSkills', () => {
  it('caps at 4 skills', () => {
    const skills = Array.from({ length: 6 }, (_, i) => ({ name: `Skill${i}`, resumeLevel: 1 }))
    expect(getResumeBoostSkills(skills)).toHaveLength(4)
  })

  it('excludes L3 and above', () => {
    const skills = [
      { name: 'Python', resumeLevel: 1 },
      { name: 'SQL', resumeLevel: 2 },
      { name: 'React', resumeLevel: 3 },
      { name: 'Docker', resumeLevel: 4 },
    ]
    const result = getResumeBoostSkills(skills)
    expect(result.map(s => s.name)).toEqual(['Python', 'SQL'])
  })

  it('sorts L1 before L2', () => {
    const skills = [
      { name: 'SQL', resumeLevel: 2 },
      { name: 'Python', resumeLevel: 1 },
    ]
    const result = getResumeBoostSkills(skills)
    expect(result[0].name).toBe('Python')
  })

  it('returns empty array for empty input', () => {
    expect(getResumeBoostSkills([])).toHaveLength(0)
  })

  it('returns empty array for null input', () => {
    expect(getResumeBoostSkills(null)).toHaveLength(0)
  })

  it('adds skillId to each result', () => {
    const skills = [{ name: 'Python', resumeLevel: 1 }]
    const result = getResumeBoostSkills(skills)
    expect(result[0].skillId).toBe('python')
  })

  it('uses .level as fallback when .resumeLevel is absent', () => {
    const skills = [
      { name: 'SQL', level: 2 },
      { name: 'React', level: 4 },
    ]
    const result = getResumeBoostSkills(skills)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('SQL')
  })
})

describe('getMatchBoostSkills', () => {
  it('applies priority caps and total cap of 6', () => {
    // importance >= 4 = required/critical (matches runGapAnalysis field)
    const critical = Array.from({ length: 4 }, (_, i) => ({ name: `Miss${i}`, resumeLevel: 0, importance: 5 }))
    const levelGaps = [
      ...Array.from({ length: 3 }, (_, i) => ({ name: `Gap${i}`, resumeLevel: 2, importance: 4 })),
      ...Array.from({ length: 2 }, (_, i) => ({ name: `Near${i}`, resumeLevel: 3, importance: 4 })),
    ]
    const result = getMatchBoostSkills({ critical, levelGaps })
    expect(result.length).toBeLessThanOrEqual(6)
    const p1 = result.filter(s => s.priority === 1)
    const p2 = result.filter(s => s.priority === 2)
    const p3 = result.filter(s => s.priority === 3)
    expect(p1.length).toBeLessThanOrEqual(3)
    expect(p2.length).toBeLessThanOrEqual(2)
    expect(p3.length).toBeLessThanOrEqual(1)
  })

  it('returns empty for strong resume (high levels, no critical missing)', () => {
    const levelGaps = [
      { name: 'Python', resumeLevel: 4, importance: 4 },
      { name: 'SQL', resumeLevel: 5, importance: 4 },
    ]
    expect(getMatchBoostSkills({ critical: [], levelGaps })).toHaveLength(0)
  })

  it('excludes levelGap skills with importance < 4', () => {
    const levelGaps = [
      { name: 'Python', resumeLevel: 1, importance: 3 },
      { name: 'SQL', resumeLevel: 2, importance: 2 },
    ]
    expect(getMatchBoostSkills({ critical: [], levelGaps })).toHaveLength(0)
  })

  it('returns empty for empty input', () => {
    expect(getMatchBoostSkills({ critical: [], levelGaps: [] })).toHaveLength(0)
  })

  it('adds skillId to each result', () => {
    const critical = [{ name: 'Python', resumeLevel: 0, importance: 5 }]
    const result = getMatchBoostSkills({ critical, levelGaps: [] })
    expect(result[0].skillId).toBe('python')
    expect(result[0].priority).toBe(1)
  })

  it('handles missing critical/levelGaps gracefully', () => {
    expect(() => getMatchBoostSkills({})).not.toThrow()
    expect(getMatchBoostSkills({})).toHaveLength(0)
  })
})
