/**
 * affiliateLoader.js — Plugin-based affiliate resource loader.
 *
 * Adding a new affiliate program:
 *   1. Drop a JSON file in data/affiliates/ following the schema in _schema.json
 *   2. Add one static import line below
 *   3. Add the imported module to the PROGRAMS array
 *
 * _schema.json is documentation only and is NOT imported here.
 *
 * All imports are static so Vite can resolve them at build time.
 */

// Static imports — Vite resolves these at build time
import udemy          from '@data/affiliates/udemy.json'
import datacamp       from '@data/affiliates/datacamp.json'
import coursera       from '@data/affiliates/coursera.json'
import grammarly      from '@data/affiliates/grammarly.json'
import linkedinLearning from '@data/affiliates/linkedin-learning.json'
import huntr          from '@data/affiliates/huntr.json'

/** All registered affiliate programs. Add new imports to this array. */
const PROGRAMS = [
  udemy,
  datacamp,
  coursera,
  grammarly,
  linkedinLearning,
  huntr,
]

/**
 * Returns all enabled programs with their resources flattened into a unified
 * array. Each resource carries the program-level metadata needed for display.
 *
 * @returns {Array} Flat array of resource objects, each with:
 *   skill_id, title, url, level_min, level_max, type, industry_tags,
 *   program, priority, ftc_disclosure
 */
export function loadAffiliates() {
  const flat = []
  for (const prog of PROGRAMS) {
    if (!prog.enabled) continue
    for (const resource of prog.resources ?? []) {
      flat.push({
        ...resource,
        program:         prog.program,
        priority:        prog.priority,
        ftc_disclosure:  prog.ftc_disclosure,
      })
    }
  }
  return flat
}

/**
 * Returns up to 3 affiliate resources for a given skill, level, and industry.
 * Results are sorted by priority ascending (lower number = shown first).
 * Returns an empty array when no matches are found — never throws.
 *
 * @param {string} skillId      - Must match a skill_id in an affiliate JSON file
 * @param {number} level        - User's current proficiency level (1–5)
 * @param {string} industryTag  - Filter by industry tag (default: 'tech')
 * @returns {Array}             - Up to 3 resource objects; [] if no match
 */
export function getAffiliateResources(skillId, level = 1, industryTag = 'tech') {
  if (!skillId) return []

  try {
    const all = loadAffiliates()
    const filtered = all.filter(r => {
      const skillOk   = r.skill_id === skillId
      const levelOk   = (r.level_min == null || level >= r.level_min) &&
                        (r.level_max == null || level <= r.level_max)
      const tagOk     = !r.industry_tags || r.industry_tags.includes(industryTag)
      return skillOk && levelOk && tagOk
    })

    // Sort by priority ascending (lower priority number = shown first)
    filtered.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

    return filtered.slice(0, 3)
  } catch {
    return []
  }
}

/**
 * Returns true if any resource in the provided array has ftc_disclosure: true.
 * Use this to decide whether to render the FTC disclosure line in the UI.
 *
 * @param {Array} resources - Array of resource objects from getAffiliateResources()
 * @returns {boolean}
 */
export function requiresFTCDisclosure(resources) {
  if (!Array.isArray(resources)) return false
  return resources.some(r => r.ftc_disclosure === true)
}
