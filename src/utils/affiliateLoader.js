/**
 * affiliateLoader.js — Plugin-based affiliate resource loader.
 *
 * Adding a new affiliate program:
 *   1. Drop a JSON file in data/affiliates/ with shape: { program, entries: [...] }
 *   2. Add one static import line below
 *   3. Add the imported module to the PROGRAMS array
 *
 * Each entry needs: skill_id, title, url, platform, industry_tags
 */

import udemy           from '@data/affiliates/udemy.json'
import datacamp        from '@data/affiliates/datacamp.json'
import coursera        from '@data/affiliates/coursera.json'
import grammarly       from '@data/affiliates/grammarly.json'
import linkedinLearning from '@data/affiliates/linkedin-learning.json'
import huntr           from '@data/affiliates/huntr.json'

import { resolveToCanonical } from './resolveToCanonical.js'

const PROGRAMS = [udemy, datacamp, coursera, grammarly, linkedinLearning, huntr]

/**
 * Flattens all program entries into a single array.
 * Programs with empty entries arrays are silently skipped.
 */
export function loadAffiliates() {
  const flat = []
  for (const prog of PROGRAMS) {
    for (const entry of prog.entries ?? []) {
      flat.push({ ...entry, program: prog.program })
    }
  }
  return flat
}

/**
 * Returns up to 3 resources for a given skill.
 * Filters by industryTag if provided (default: 'tech').
 * Returns [] when no match — never throws.
 *
 * When rawName is provided, resolveToCanonical() is tried first so that
 * alias names (e.g. "LLMs") resolve to the correct skill_id in the affiliate
 * data (e.g. "large-language-models") even when the pre-slugified skillId
 * would not match.
 *
 * @param {string} skillId    - Pre-slugified skill ID (nameToResourceId output)
 * @param {number} level      - unused for filtering, reserved for future use
 * @param {string} industryTag - default 'tech'
 * @param {string|null} rawName - Optional original display name; used for alias resolution
 */
export function getAffiliateResources(skillId, level = 1, industryTag = 'tech', rawName = null) {
  if (!skillId && !rawName) return []
  try {
    const resolvedId = (rawName && resolveToCanonical(rawName)) ?? skillId
    return loadAffiliates()
      .filter(r => {
        const skillOk = r.skill_id === resolvedId
        const tagOk   = !r.industry_tags || r.industry_tags.includes(industryTag)
        return skillOk && tagOk
      })
      .slice(0, 3)
  } catch {
    return []
  }
}
