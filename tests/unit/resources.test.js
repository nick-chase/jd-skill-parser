import { describe, test, expect } from 'vitest'
import { getResources } from '@utils/resources.js'
import { getAffiliateResources, loadAffiliates } from '@utils/affiliateLoader.js'

// ---------------------------------------------------------------------------
// resources.js thin wrapper — delegates to getAffiliateResources()
// ---------------------------------------------------------------------------

describe('getResources() thin wrapper', () => {
  test('returns same result as getAffiliateResources() for known skill', () => {
    const viaWrapper  = getResources('python', 2, 'tech')
    const viaAffiliate = getAffiliateResources('python', 2, 'tech')
    expect(viaWrapper).toEqual(viaAffiliate)
  })

  test('returns empty array for unknown skill', () => {
    expect(getResources('unknown-skill-xyz', 2)).toEqual([])
  })

  test('returns empty array for null/undefined skill', () => {
    expect(getResources(null, 2)).toEqual([])
    expect(getResources(undefined, 2)).toEqual([])
  })

  test('returns at most 3 results', () => {
    const results = getResources('python', 2)
    expect(results.length).toBeLessThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// getAffiliateResources() — affiliate plugin system
// ---------------------------------------------------------------------------

describe('getAffiliateResources()', () => {
  test('returns results for known skills', () => {
    const skills = ['python', 'sql', 'javascript', 'react', 'aws']
    for (const id of skills) {
      const results = getAffiliateResources(id, 1, 'tech')
      expect(results.length, `expected results for "${id}"`).toBeGreaterThan(0)
    }
  })

  test('returns empty array for unknown skill', () => {
    expect(getAffiliateResources('unknown-skill-xyz', 2)).toEqual([])
  })

  test('returns empty array for null/undefined skill', () => {
    expect(getAffiliateResources(null, 2)).toEqual([])
    expect(getAffiliateResources(undefined, 2)).toEqual([])
  })

  test('never returns more than 3 results', () => {
    const allSkills = [...new Set(loadAffiliates().map(r => r.skill_id))]
    for (const id of allSkills) {
      expect(getAffiliateResources(id, 1).length).toBeLessThanOrEqual(3)
    }
  })

  test('every returned entry has required fields', () => {
    const results = getAffiliateResources('python', 2, 'tech')
    for (const r of results) {
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('url')
      expect(r).toHaveProperty('platform')
    }
  })

  test('all returned URLs start with https', () => {
    const allSkills = [...new Set(loadAffiliates().map(r => r.skill_id))]
    for (const id of allSkills) {
      const results = getAffiliateResources(id, 1)
      for (const r of results) {
        expect(r.url, `${id}: url should start with https`).toMatch(/^https:\/\//)
      }
    }
  })

  test('no returned URL contains placeholder brackets', () => {
    const allSkills = [...new Set(loadAffiliates().map(r => r.skill_id))]
    for (const id of allSkills) {
      const results = getAffiliateResources(id, 3)
      for (const r of results) {
        expect(r.url, `${id}: placeholder URL leaked`).not.toMatch(/[\[\]]/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// loadAffiliates() — flat program list
// ---------------------------------------------------------------------------

describe('loadAffiliates()', () => {
  test('returns a non-empty array', () => {
    const all = loadAffiliates()
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBeGreaterThan(0)
  })

  test('every entry has skill_id, title, url, platform, program', () => {
    const all = loadAffiliates()
    for (const r of all) {
      expect(r).toHaveProperty('skill_id')
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('url')
      expect(r).toHaveProperty('platform')
      expect(r).toHaveProperty('program')
    }
  })
})
