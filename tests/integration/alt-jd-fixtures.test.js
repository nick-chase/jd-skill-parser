/**
 * Alt JD Fixtures — integration tests for the 3 additional fixture JDs
 * in tests/fixtures/ (alt_1-jd.txt, alt-2-jd.txt, alt-3-jd.txt).
 *
 * Same structure as jd-test-bank.test.js. Loads from tests/fixtures/ rather
 * than jd_test_bank/.
 */

import { describe, test, beforeAll, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  parseJobDescription,
  parseJobMeta,
} from '../../src/jd-skill-parser.jsx'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const loadFixture = (filename) =>
  readFileSync(resolve(__dirname, '../fixtures', filename), 'utf-8')

const TEST_CASES = [
  {
    file:           'alt_1-jd.txt',
    label:          'TCS QA Engineer (Java / Selenium)',
    minSkills:      3,
    assertJobType:  true,
    jobType:        'Full-time',
    expectedSkills: ['Java', 'Object-Oriented Programming', 'Regression Testing'],
  },
  {
    file:           'alt-2-jd.txt',
    label:          'MS Shift QA Engineer',
    minSkills:      3,
    assertJobType:  true,
    jobType:        'Full-time',
    expectedSkills: ['Python', 'Java', 'C#'],
  },
  {
    file:           'alt-3-jd.txt',
    label:          'First Fed Software Developer',
    minSkills:      5,
    assertJobType:  true,
    jobType:        'Full-time',
    // SQL blocked by guardWords: ["nosql"] — JD lists "(SQL, NoSQL)" together
    // React/Angular patterns require lookahead (e.g. "React.js") — plain list form not matched
    expectedSkills: ['Python', 'JavaScript', 'AWS', 'Azure', 'Agile / Scrum'],
  },
]

describe.each(TEST_CASES)(
  'Alt JD fixtures: $label',
  ({ file, minSkills, assertJobType, jobType, expectedSkills }) => {
    let text
    let jdSkills
    let meta

    beforeAll(() => {
      text     = loadFixture(file)
      jdSkills = parseJobDescription(text).technicalSignals
      meta     = parseJobMeta(text)
    })

    test(`parseJobDescription returns at least ${minSkills} skills`, () => {
      expect(Array.isArray(jdSkills)).toBe(true)
      expect(jdSkills.length).toBeGreaterThanOrEqual(minSkills)
    })

    test('every skill has name, category, level (number), importance (number)', () => {
      for (const skill of jdSkills) {
        expect(skill).toHaveProperty('name')
        expect(skill).toHaveProperty('category')
        expect(typeof skill.level).toBe('number')
        expect(typeof skill.importance).toBe('number')
      }
    })

    test('parseJobMeta returns a non-null object', () => {
      expect(meta).toBeTruthy()
      expect(typeof meta).toBe('object')
    })

    test.skipIf(!assertJobType)(`jobType is '${jobType ?? 'null'}'`, () => {
      expect(meta.jobType).toBe(jobType)
    })

    test.skipIf(expectedSkills.length === 0)('extracts expected skills', () => {
      const names = jdSkills.map((s) => s.name)
      for (const expected of expectedSkills) {
        expect(names).toContain(expected)
      }
    })
  }
)
