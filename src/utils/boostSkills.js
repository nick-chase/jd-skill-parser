/**
 * boostSkills.js — Smart affiliate placement helpers.
 *
 * Two exported functions determine which skills to surface in the two
 * BoostSection placement zones:
 *   - getResumeBoostSkills  → Zone 1 (Resume tab): weak-evidence skills
 *   - getMatchBoostSkills   → Zone 2 (Gap tab): prioritised skills to improve match
 *
 * Note: gap skills use `importance` (1–5) not `isRequired`.
 * importance >= 4 = Required/Critical.
 */

/**
 * Converts a skill display name to a resource lookup ID.
 * Matches the nameToResourceId logic in SkillRow.jsx and affiliateLoader.js.
 *
 * @param {string} name
 * @returns {string}
 */
export function nameToResourceId(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[/\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Returns up to 4 low-evidence skills from the user's resume for Zone 1.
 *
 * @param {Array} resumeSkills - Parsed resume skill objects (each has .name, .resumeLevel or .level)
 * @returns {Array} Up to 4 skills with resumeLevel <= 2, sorted L1 first
 */
export function getResumeBoostSkills(resumeSkills) {
  if (!Array.isArray(resumeSkills)) return []

  return resumeSkills
    .filter(s => {
      const lvl = s.resumeLevel ?? s.level ?? 0
      return typeof lvl === 'number' && lvl >= 1 && lvl <= 2
    })
    .sort((a, b) => {
      const la = a.resumeLevel ?? a.level ?? 0
      const lb = b.resumeLevel ?? b.level ?? 0
      return la - lb
    })
    .slice(0, 4)
    .map(s => ({
      name:          s.name,
      skillId:       nameToResourceId(s.name),
      resumeLevel:   s.resumeLevel ?? s.level ?? 1,
      primarySignal: s.primarySignal ?? null,
    }))
}

/**
 * Returns up to 6 prioritised skills for Zone 2 (gap analysis context).
 *
 * Priority 1: missing required skills (critical array) — max 3
 * Priority 2: level-gap skills with importance >= 4 and resumeLevel <= 2 — max 2
 * Priority 3: level-gap skills with importance >= 4 and resumeLevel === 3 — max 1
 *
 * Gap skills use `importance` (not `isRequired`). importance >= 4 = Required/Critical.
 *
 * @param {{ critical: Array, levelGaps: Array }} gapAnalysis
 * @returns {Array} Up to 6 skill objects with .priority and .skillId added
 */
export function getMatchBoostSkills({ critical = [], levelGaps = [] } = {}) {
  const result = []

  // Priority 1 — missing skills (up to 3)
  const p1 = critical.slice(0, 3).map(s => ({
    ...s,
    priority: 1,
    skillId:  nameToResourceId(s.name),
  }))
  result.push(...p1)

  // Priority 2 — level gaps: required/critical + weak evidence (resumeLevel <= 2)
  const p2 = levelGaps
    .filter(s => (s.importance ?? 0) >= 4 && (s.resumeLevel ?? 0) <= 2)
    .slice(0, 2)
    .map(s => ({
      ...s,
      priority: 2,
      skillId:  nameToResourceId(s.name),
    }))
  result.push(...p2)

  // Priority 3 — level gaps: required/critical + moderate evidence (resumeLevel === 3)
  const p3 = levelGaps
    .filter(s => (s.importance ?? 0) >= 4 && (s.resumeLevel ?? 0) === 3)
    .slice(0, 1)
    .map(s => ({
      ...s,
      priority: 3,
      skillId:  nameToResourceId(s.name),
    }))
  result.push(...p3)

  // Total cap: 6
  return result.slice(0, 6)
}
