import { describe, test, expect } from 'vitest'
import resourceData from '../../data/resources.json'

const { resources } = resourceData

// ---------------------------------------------------------------------------
// B9 — data/resources.json schema
// ---------------------------------------------------------------------------

describe('resources.json — structure', () => {
  test('has a resources object', () => {
    expect(resources).toBeDefined()
    expect(typeof resources).toBe('object')
  })

  test('has at least 18 skill entries', () => {
    expect(Object.keys(resources).length).toBeGreaterThanOrEqual(18)
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

  test('all affiliate flags are false (no live affiliate links yet)', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        expect(r.affiliate, `${id} should have affiliate=false`).toBe(false)
      }
    }
  })

  test('all urls are https', () => {
    for (const [id, list] of Object.entries(resources)) {
      for (const r of list) {
        expect(r.url, `${id} url should start with https`).toMatch(/^https:\/\//)
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
  ]

  for (const id of REQUIRED) {
    test(`has resources for "${id}"`, () => {
      expect(resources[id]).toBeDefined()
      expect(resources[id].length).toBeGreaterThan(0)
    })
  }
})
