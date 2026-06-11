/**
 * resolveToCanonical.js — Alias-aware canonical skill ID resolver.
 *
 * Accepts a single skill name string (display name, alias, or slug) and
 * returns the canonical skill `id` from skills.json if an exact match is
 * found against the skill's own id or any of its aliases. Returns null if
 * no match.
 *
 * Rules:
 *  - Matches are exact (whole-string), not substring / partial
 *  - Case-insensitive by default; case-sensitive when skill.caseSensitive === true
 *  - Canonical id is checked first; alias loop runs if id does not match
 *  - No slugification or guardWord logic — clean id + alias lookup only
 */

import skillsData from '../../data/skills.json' with { type: 'json' }

const _skills = skillsData.skills

/**
 * Resolves a skill name to its canonical skill ID.
 *
 * @param {string} name - A skill canonical id, display name, alias, or any known variant
 * @returns {string|null} The canonical `id` from skills.json, or null if not found
 */
export function resolveToCanonical(name) {
  if (!name || typeof name !== 'string') return null

  const trimmed = name.trim()

  for (const skill of _skills) {
    const isCaseSensitive = skill.caseSensitive === true

    // Check the canonical id first — a canonical id is always a valid input
    const idMatched = isCaseSensitive
      ? skill.id === trimmed
      : skill.id.toLowerCase() === trimmed.toLowerCase()

    if (idMatched) return skill.id

    // Fall through to alias matching
    for (const alias of skill.aliases ?? []) {
      const matched = isCaseSensitive
        ? alias === trimmed
        : alias.toLowerCase() === trimmed.toLowerCase()

      if (matched) return skill.id
    }
  }

  return null
}
