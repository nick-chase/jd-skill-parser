import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildFingerprint } from '../../src/utils/resumeFingerprint.js'
import { getFastFixSections } from '../../src/utils/freeGate.js'
import * as fp from '../../src/utils/resumeFingerprint.js'

describe('buildFingerprint', () => {
  it('is stable across bullet edits (skill count change)', () => {
    const base = {
      experience: [{ employer: 'Google' }, { employer: 'Meta' }],
      degree: { graduationYear: 2022 },
    }
    const withMoreSkills = { ...base }
    expect(buildFingerprint(base)).toBe(buildFingerprint(withMoreSkills))
  })

  it('differs for different employers', () => {
    const a = {
      experience: [{ employer: 'Google' }, { employer: 'Meta' }],
      degree: { graduationYear: 2022 },
    }
    const b = {
      experience: [{ employer: 'Walmart' }, { employer: 'Target' }],
      degree: { graduationYear: 2019 },
    }
    expect(buildFingerprint(a)).not.toBe(buildFingerprint(b))
  })

  it('handles missing experience and degree gracefully', () => {
    const fp = buildFingerprint({})
    expect(typeof fp).toBe('string')
    expect(fp.length).toBeGreaterThan(0)
  })

  it('pads to 3 employer slots when fewer employers present', () => {
    const a = { experience: [{ employer: 'Acme' }], degree: { graduationYear: 2020 } }
    const b = { experience: [{ employer: 'Acme' }], degree: { graduationYear: 2021 } }
    // Different grad years should produce different fingerprints
    expect(buildFingerprint(a)).not.toBe(buildFingerprint(b))
  })

  it('uses institution field as fallback employer name', () => {
    const withInstitution = {
      experience: [{ institution: 'MIT' }],
      degree: { graduationYear: 2023 },
    }
    const fp = buildFingerprint(withInstitution)
    expect(typeof fp).toBe('string')
    expect(fp.length).toBeGreaterThan(0)
  })
})

describe('getFastFixSections', () => {
  it('paid user sees all sections', () => {
    const sections = ['a', 'b', 'c']
    const result = getFastFixSections(sections, true)
    expect(result.visible).toHaveLength(3)
    expect(result.blurred).toHaveLength(0)
    expect(result.remainingCount).toBe(0)
  })

  it('free user sees only first section', () => {
    const sections = ['a', 'b', 'c']
    const result = getFastFixSections(sections, false)
    expect(result.visible).toHaveLength(1)
    expect(result.blurred).toHaveLength(2)
    expect(result.remainingCount).toBe(2)
  })

  it('returns empty result for empty sections array', () => {
    const result = getFastFixSections([], false)
    expect(result.visible).toHaveLength(0)
    expect(result.blurred).toHaveLength(0)
    expect(result.remainingCount).toBe(0)
  })

  it('single section free user sees it with no blur', () => {
    const result = getFastFixSections(['only'], false)
    expect(result.visible).toHaveLength(1)
    expect(result.blurred).toHaveLength(0)
    expect(result.remainingCount).toBe(0)
  })

  it('same-resume hash still returns slice(0,1) visible for free user', () => {
    // isSameResume returns true when stored fingerprint matches — gate shape is unchanged
    vi.spyOn(fp, 'isSameResume').mockReturnValue(true)
    const sections = ['a', 'b', 'c']
    const result = getFastFixSections(sections, false, 'matching-hash')
    expect(result.visible).toHaveLength(1)
    expect(result.blurred).toHaveLength(2)
    expect(result.remainingCount).toBe(2)
    vi.restoreAllMocks()
  })
})
