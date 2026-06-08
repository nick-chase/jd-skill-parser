import { describe, test, expect } from 'vitest'
import resourceData from '@data/resources.json'
import { getResources } from '@utils/resources.js'

const { resources } = resourceData

// ---------------------------------------------------------------------------
// B9 — data/resources.json schema
// ---------------------------------------------------------------------------

describe('resources.json — structure', () => {
  test('has a resources object', () => {
    expect(resources).toBeDefined()
    expect(typeof resources).toBe('object')
  })

  test('has at least 20 skill entries', () => {
    expect(Object.keys(resources).length).toBeGreaterThanOrEqual(20)
  })

  test('every entry is a non-empty array', () => {
    for (const [id, list] of Object.entries(resources)) {
      expect(Array.isArray(list), `${id} should be an array`).toBe(true)
      expect(list.length, `${id} should have at least one resource`).toBeGreaterThan(0)
    }
  })

  test('every resource has required fields', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        expect(r, `${id} resource missing title`).toHaveProperty('title')
        expect(r, `${id} resource missing url`).toHaveProperty('url')
        expect(r, `${id} resource missing platform`).toHaveProperty('platform')
        expect(r, `${id} resource missing type`).toHaveProperty('type')
        expect(r, `${id} resource missing affiliate`).toHaveProperty('affiliate')
      }
    }
  })

  test('affiliate flag is a boolean on every resource', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        expect(typeof r.affiliate, `${id} affiliate must be boolean`).toBe('boolean')
      }
    }
  })

  test('non-affiliate urls are https', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        if (!r.affiliate) {
          expect(r.url, `${id} free url should start with https`).toMatch(/^https:\/\//)
        }
      }
    }
  })

  test('all type values are "free" or "paid"', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        expect(['free', 'paid']).toContain(r.type)
      }
    }
  })
})

describe('resources.json — coverage for top gap skills', () => {
  const REQUIRED = [
    'python', 'javascript', 'typescript', 'sql', 'react',
    'aws', 'docker', 'kubernetes', 'git', 'nodejs',
    'postgresql', 'machine-learning', 'tensorflow', 'pytorch',
    'ci-cd', 'linux', 'rest-api', 'graphql',
    'java', 'microsoft-excel',
  ]

  for (const id of REQUIRED) {
    test(`has resources for "${id}"`, () => {
      expect(resources[id]).toBeDefined()
      expect(resources[id].length).toBeGreaterThan(0)
    })
  }
})

describe('resources.json — affiliate entries', () => {
  const AFFILIATE_SKILLS = ['python', 'sql', 'javascript', 'typescript', 'react', 'aws', 'docker', 'git', 'java', 'microsoft-excel']

  for (const id of AFFILIATE_SKILLS) {
    test(`"${id}" has at least one affiliate entry`, () => {
      const list = resources[id] ?? []
      expect(list.some(r => r.affiliate)).toBe(true)
    })

    test(`"${id}" has at least one free entry`, () => {
      const list = resources[id] ?? []
      expect(list.some(r => !r.affiliate)).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// getResources() utility
// ---------------------------------------------------------------------------

describe('getResources()', () => {
  test('returns up to 3 results for python at level 2', () => {
    const results = getResources('python', 2)
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  test('free resources come before paid/affiliate', () => {
    const results = getResources('python', 2)
    const firstAffiliate = results.findIndex(r => r.affiliate)
    if (firstAffiliate === -1) return
    const lastFree = results.map(r => !r.affiliate).lastIndexOf(true)
    expect(lastFree).toBeLessThan(firstAffiliate)
  })

  test('returns empty array for unknown skill', () => {
    expect(getResources('unknown-skill-xyz', 2)).toEqual([])
  })

  test('level filter excludes resources outside range', () => {
    // Level 5 user should not see level_max=3 resources
    const results = getResources('python', 5)
    for (const r of results) {
      if (r.level_max != null) {
        expect(r.level_max).toBeGreaterThanOrEqual(5)
      }
    }
  })

  test('returns empty array for null/undefined skill', () => {
    expect(getResources(null, 2)).toEqual([])
    expect(getResources(undefined, 2)).toEqual([])
  })

  test('affiliate entries have placeholder URLs', () => {
    const pythonResources = resources['python'] ?? []
    const affiliateOnes   = pythonResources.filter(r => r.affiliate)
    for (const r of affiliateOnes) {
      expect(r.url).toBe('[UDEMY_AFFILIATE_URL]')
    }
  })

  test('filters out entries with placeholder URLs (brackets)', () => {
    // getResources() must never return a resource whose URL contains [ or ]
    // This ensures unreplaced affiliate placeholders like [UDEMY_AFFILIATE_URL]
    // are not rendered as live broken links.
    for (const skillId of Object.keys(resources)) {
      const results = getResources(skillId, 3)
      for (const r of results) {
        expect(r.url, `${skillId}: placeholder URL leaked through getResources`).not.toMatch(/[\[\]]/)
      }
    }
  })
})
