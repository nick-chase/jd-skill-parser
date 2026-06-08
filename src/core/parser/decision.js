/**
 * Decision engine — gap analysis and match scoring.
 *
 * getDecision(jdProfile, resumeProfile)
 *   → { matchScore, isEntryLevel }
 *
 * The four-label output (apply / edits / build / redirect) has been removed.
 * matchScore is the primary output used by the UI.
 */

const REQUIRED_IMPORTANCE = 4
const CRITICAL_IMPORTANCE = 5

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a skill level value to a plain integer for numeric comparisons.
 * 'certified' maps to 5 (Expert — a certification implies top-tier knowledge).
 * Any other string is parsed as base-10 integer (falls back to 0).
 * Numbers are returned as-is. Null/undefined return 0.
 */
function normalizeLevel(level) {
  if (level === 'certified') return 5
  if (typeof level === 'string') return parseInt(level, 10) || 0
  if (typeof level === 'number') return level
  return 0
}

function isEntryLevelResume(resumeSkills) {
  if (!resumeSkills || resumeSkills.length === 0) return true
  const maxLevel = Math.max(...resumeSkills.map(s => normalizeLevel(s.level)))
  return maxLevel <= 2
}

function computeGap(jdSkills, resumeSkills, entryLevel = false) {
  const resumeMap = new Map(resumeSkills.map(s => [s.name, s]))

  const missing  = []  // required JD skills absent from resume
  const gapped   = []  // required JD skills present but below required level
  const matched  = []  // JD skills in resume at or above required level (any importance)

  for (const jd of jdSkills) {
    const resume = resumeMap.get(jd.name)
    const isRequired = jd.importance >= REQUIRED_IMPORTANCE
    const isCritical = jd.importance >= CRITICAL_IMPORTANCE

    if (!resume) {
      if (isRequired) {
        // Entry-level calibration: relax required (non-critical) missing → treat as gapped
        if (entryLevel && !isCritical) {
          gapped.push({ ...jd, resumeLevel: 0 })
        } else {
          missing.push(jd)
        }
      }
    } else if (normalizeLevel(resume.level) < normalizeLevel(jd.level)) {
      if (isRequired) {
        const gap = normalizeLevel(jd.level) - normalizeLevel(resume.level)
        // Entry-level calibration: relax required (non-critical) 1-level gap → treat as matched
        if (entryLevel && !isCritical && gap === 1) {
          matched.push({ ...jd, resumeLevel: resume.level })
        } else {
          gapped.push({ ...jd, resumeLevel: resume.level })
        }
      }
    } else {
      matched.push({ ...jd, resumeLevel: resume.level })
    }
  }

  const total = jdSkills.length
  const matchScore = total === 0 ? 100 : Math.round((matched.length / total) * 100)

  return { missing, gapped, matched, matchScore }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Computes match score and entry-level status for a candidate given a JD and resume.
 *
 * @param {object} jdProfile     - Output of parseJobDescription()
 * @param {object} resumeProfile - Output of parseResumeText()
 * @returns {{ matchScore: number, isEntryLevel: boolean }}
 */
export function getDecision(jdProfile, resumeProfile) {
  const jdSkills     = jdProfile?.technicalSignals     ?? []
  const resumeSkills = resumeProfile?.technicalSignals ?? []

  const entryLevel = isEntryLevelResume(resumeSkills)
  const gap = computeGap(jdSkills, resumeSkills, entryLevel)

  return {
    matchScore:   gap.matchScore,
    isEntryLevel: entryLevel,
  }
}
