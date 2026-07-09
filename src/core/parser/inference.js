/**
 * Weighted evidence scoring — v2
 *
 * Exports:
 *   parseDateRange(text)                     → months (integer) | null
 *   classifyEvidenceType(section, roleTitle) → E weight
 *   classifyBloomLevel(bulletText)           → C multiplier
 *   scoreSkillEvidence(instances[])          → { score, level, confidence, primarySignal, suggestion }
 *
 * Formula: Skill Score = SUM(E × C × D) × R
 *   E = evidence type weight  C = Bloom complexity multiplier
 *   D = duration modifier     R = recurrence multiplier
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

function parseMonthYear(str) {
  // "Jan 2023", "January 2023", "Aug. 2019", "2023" (returns { year, month })
  const trimmed = str.trim()

  // Month + year: "Jan 2023", "March 2021", "Aug. 2019" (optional trailing period)
  const monthYear = trimmed.match(/^([A-Za-z]+)\.?\s+(\d{4})$/)
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase()]
    if (month !== undefined) return { year: parseInt(monthYear[2], 10), month }
  }

  // Year only: "2023"
  const yearOnly = trimmed.match(/^(\d{4})$/)
  if (yearOnly) return { year: parseInt(yearOnly[1], 10), month: 0 }

  return null
}

function monthsBetween(from, to) {
  return (to.year - from.year) * 12 + (to.month - from.month)
}

function todayYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

const PRESENT_RE = /\b(present|current|now)\b/i

// ---------------------------------------------------------------------------
// B1 — parseDateRange
// ---------------------------------------------------------------------------

/**
 * Parses a date range or duration phrase and returns the number of months.
 * Returns null if the text cannot be interpreted.
 *
 * NOTE: A future refactor should change the return shape to an object
 * { months, status, year? } so that callers can distinguish:
 *   - status: 'expected' (prefixed with Expected/Anticipated — not yet completed)
 *   - status: 'completed' (bare year with no range — year is known but duration is not)
 * That shape change requires updating all three call sites in parseResume.js:
 *   line 171 (extractDateFromTitleLine, pipe-part loop)
 *   line 188 (extractDateFromTitleLine, dateSubstrRE match)
 *   line 483 (extractSkillsFromExperience, separate date line)
 * Until that refactor lands, status is stripped/ignored and months (integer|null) is returned.
 */
export function parseDateRange(text) {
  if (!text || !text.trim()) return null

  const t = text.trim()

  // --- Season recognition (checked first — must precede generic patterns) ---
  // "Summer YYYY" → Jun–Aug = 3 months
  // "Fall YYYY"   → Sep–Dec = 4 months
  // "Spring YYYY" → Jan–May = 5 months
  // "Winter YYYY" → Dec–Feb = 3 months (cross-year)
  const seasonMatch = t.match(/^(Summer|Fall|Spring|Winter)\s+(\d{4})$/i)
  if (seasonMatch) {
    const season = seasonMatch[1].toLowerCase()
    if (season === 'summer') return 3   // Jun(6) – Aug(8): 3 months
    if (season === 'fall')   return 4   // Sep(9) – Dec(12): 4 months
    if (season === 'spring') return 5   // Jan(1) – May(5): 5 months
    if (season === 'winter') return 3   // Dec(12) – Feb(2): 3 months (cross-year)
  }

  // --- Expected / Anticipated prefix ---
  // Strip the prefix and parse the remaining date normally.
  // Status ('expected') is intentionally not returned here — the return shape is an integer.
  // See the refactor note in the JSDoc above for how to add status in a future pass.
  const expectedMatch = t.match(/^(?:Expected|Anticipated)\s+(.+)$/i)
  if (expectedMatch) {
    return parseDateRange(expectedMatch[1])
  }

  // --- Explicit duration phrases ---

  // "2 years 3 months" (combined)
  const yearsAndMonths = t.match(/(\d+)\s+years?\s+(\d+)\s+months?/i)
  if (yearsAndMonths) {
    return parseInt(yearsAndMonths[1], 10) * 12 + parseInt(yearsAndMonths[2], 10)
  }

  // "N years"
  const years = t.match(/^(\d+)\s+years?$/i)
  if (years) return parseInt(years[1], 10) * 12

  // "N months"
  const months = t.match(/^(\d+)\s+months?$/i)
  if (months) return parseInt(months[1], 10)

  // --- Date ranges (separator: —, –, -, to) ---
  // Split on em-dash, en-dash, hyphen surrounded by spaces, or " to "
  const SEP = /\s*(?:—|–|-(?=\s|[A-Za-z])|\bto\b|-(?=\d{4}))\s*/i
  const parts = t.split(SEP)

  if (parts.length === 2) {
    const [rawFrom, rawTo] = parts
    const isPresent = PRESENT_RE.test(rawTo)

    const from = parseMonthYear(rawFrom.trim())
    if (!from) return null

    const to = isPresent ? todayYearMonth() : parseMonthYear(rawTo.trim())
    if (!to) return null

    const diff = monthsBetween(from, to)
    return diff < 0 ? null : diff
  }

  // --- Single year followed by "present/current" without explicit separator ---
  // e.g., "2022 – current" already handled by SEP split; handle "2022 current"
  const yearPresent = t.match(/^(\d{4})\s+(present|current|now)$/i)
  if (yearPresent) {
    const from = { year: parseInt(yearPresent[1], 10), month: 0 }
    const to = todayYearMonth()
    const diff = monthsBetween(from, to)
    return diff < 0 ? null : diff
  }

  // --- Bare 4-digit year (e.g. "2022") ---
  // The year is known but no range is available; duration is indeterminate.
  // Returns null (no duration info). Status enrichment ('completed') requires a
  // shape change — see the refactor note in the JSDoc above.
  const bareYear = t.match(/^(\d{4})$/)
  if (bareYear) return null

  return null
}

// ---------------------------------------------------------------------------
// B2 — classifyEvidenceType
// ---------------------------------------------------------------------------

const CONTRACT_RE    = /\b(intern|internship|contract|contractor|temp|temporary|co-?op)\b/i
const HAS_OUTCOME_RE = /\d+%|\$[\d,]+|\b\d{2,}[+]?\s*(users|customers|clients|projects|applications|transactions|requests|employees|team members|servers|endpoints)\b|\b(increased|decreased|reduced|improved|saved|generated|grew|scaled)\b.*\d/i

/**
 * Returns the E weight for a resume evidence instance.
 * blockText is used for project outcome detection only.
 */
export function classifyEvidenceType(sectionName, roleTitle = '', blockText = '') {
  // Strip HTML entities (&nbsp; etc.) and normalise whitespace from copy-paste artefacts
  const raw = (sectionName || '').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/ /g, ' ')
  const section = raw.toLowerCase().trim().replace(/\s+/g, ' ')

  const isExperience = /^(experience|work experience|work history|employment)$/.test(section)
  const isProjects   = /^projects?$/.test(section)
  const isEducation  = /^education$/.test(section)
  const isCert       = /^(certifications?|bootcamp)$/.test(section)

  if (isExperience) return CONTRACT_RE.test(roleTitle) ? 0.65 : 1.0
  if (isProjects)   return HAS_OUTCOME_RE.test(blockText) ? 0.50 : 0.30
  if (isEducation)  return 0.4
  if (isCert)       return 0.55
  return 0.05
}

// ---------------------------------------------------------------------------
// classifyBloomLevel — Bloom Complexity Multiplier (C)
// ---------------------------------------------------------------------------

const BLOOM_LEVELS = [
  { multiplier: 1.40, pattern: /\b(led|lead|architected|designed|owned|spearheaded|founded|established|launched|manage|managed|direct|directed|champion|drive|define)\b/i },
  { multiplier: 1.20, pattern: /\b(reviewed|validated|optimized|optimize|evaluated|assessed|audited|improve|improved|enhance|enhanced|streamline|streamlined)\b/i },
  { multiplier: 1.10, pattern: /\b(analyzed|debugged|refactored|diagnosed|investigated)\b/i },
  { multiplier: 1.00, pattern: /\b(built|used|implemented|developed|deployed|configured|wrote|created)\b/i },
  { multiplier: 0.70, pattern: /\b(learned|studied|familiar|exposure|understanding|training|worked)\b/i },
  { multiplier: 0.50, pattern: /\b(listed|named)\b/i },
]

/**
 * Returns the Bloom complexity multiplier for the strongest action verb in a bullet.
 * Defaults to 1.00 (Apply level) when no verb is detected.
 */
export function classifyBloomLevel(bulletText) {
  if (!bulletText) return 1.0
  for (const { pattern, multiplier } of BLOOM_LEVELS) {
    if (pattern.test(bulletText)) return multiplier
  }
  return 1.0
}

function getBloomVerb(bulletText) {
  if (!bulletText) return null
  for (const { pattern } of BLOOM_LEVELS) {
    const m = bulletText.match(pattern)
    if (m) return m[0].toLowerCase()
  }
  return null
}

function buildPrimarySignal(primaryInst, primaryBloomC, instanceCount) {
  const { wType, durationMonths, bulletText } = primaryInst

  if (wType <= 0.05) return 'skills section only'

  if (wType >= 0.4 && durationMonths === null) return 'no duration detected'

  if (wType >= 0.4 && durationMonths < 6) {
    return `${durationMonths} month${durationMonths !== 1 ? 's' : ''} detected`
  }

  if (instanceCount === 1) return '1 context only'

  if (primaryBloomC < 1.0) {
    const verb = getBloomVerb(bulletText || '')
    if (verb) return `strongest verb: ${verb}`
    return 'weak action verbs'
  }

  if (durationMonths !== null) {
    const yrs = Math.floor(durationMonths / 12)
    if (yrs > 0) return `${yrs} yr${yrs !== 1 ? 's' : ''} detected`
    return `${durationMonths} month${durationMonths !== 1 ? 's' : ''} detected`
  }

  return `${instanceCount} context${instanceCount !== 1 ? 's' : ''}`
}

// ---------------------------------------------------------------------------
// B3 — scoreSkillEvidence
// ---------------------------------------------------------------------------

/**
 * Duration modifier lookup.
 * wType >= 0.6 → Job History column (full-time + internship); below → Project column.
 */
function getDurationModifier(wType, durationMonths) {
  const isJobHistory = wType >= 0.6

  if (durationMonths === null || durationMonths === undefined) {
    return isJobHistory ? 0.5 : 0.4
  }

  if (isJobHistory) {
    if (durationMonths < 6)  return 0.6
    if (durationMonths < 12) return 0.8
    if (durationMonths < 24) return 1.0
    if (durationMonths < 48) return 1.3
    return 1.5
  } else {
    // Project column (capped at 1–2 years = 0.7; no entry beyond that)
    if (durationMonths < 6)  return 0.5
    if (durationMonths < 12) return 0.6
    return 0.7
  }
}

const LEVEL_MAP = [
  { min: 1.80, level: 'L5', label: 'Extensive evidence' },
  { min: 1.10, level: 'L4', label: 'Strong evidence' },
  { min: 0.55, level: 'L3', label: 'Supported' },
  { min: 0.25, level: 'L2', label: 'Limited evidence' },
  { min: 0.00, level: 'L1', label: 'Mentioned' },
]

function mapLevel(score) {
  for (const entry of LEVEL_MAP) {
    if (score >= entry.min) return entry.level
  }
  return 'L1'
}

const SUGGESTIONS = {
  L1: 'Add this skill to a project or coursework section with a brief outcome to raise your score.',
  L2: 'Add duration and a measurable outcome to your project or coursework description.',
  L3: 'Add a second context (e.g., a work project or additional role) to demonstrate breadth.',
  L4: 'Show impact — add metrics or leadership language to your strongest evidence.',
  L5: 'Strong evidence. Focus on clarity and specific outcomes in your descriptions.',
}

// ---------------------------------------------------------------------------
// Confidence indicator
// ---------------------------------------------------------------------------

function computeConfidence(instances, bloomCs) {
  const count = instances.length
  if (count === 0) return 'low'

  const allSkillsSection = instances.every(i =>
    ['skills', 'summary'].includes((i.sectionName || '').toLowerCase())
  )
  if (allSkillsSection) return 'low'

  const avgC              = bloomCs.reduce((s, c) => s + c, 0) / bloomCs.length
  const hasLongDur        = instances.some(i => (i.durationMonths ?? 0) >= 12)
  const hasVeryLongFT     = instances.some(i => (i.wType ?? 0) >= 1.0 && (i.durationMonths ?? 0) >= 24)
  const hasMeaningfulDur  = instances.some(i => (i.durationMonths ?? 0) >= 6)
  const hasExplicitVerb   = instances.some(i => !!i.bulletText)

  // high: strong structural evidence (≥2 contexts or dominant FT role) + Bloom quality
  if ((count >= 2 || hasVeryLongFT) && hasLongDur && avgC >= 1.0) return 'high'

  // medium: one instance with meaningful duration (≥6 mo) and an explicit bullet
  if (count === 1 && hasMeaningfulDur && hasExplicitVerb) return 'medium'
  // medium: ≥2 instances regardless of duration
  if (count >= 2) return 'medium'

  return 'low'
}

// ---------------------------------------------------------------------------
// B3 — scoreSkillEvidence
// ---------------------------------------------------------------------------

/**
 * Scores an array of skill evidence instances.
 *
 * Each instance: { wType, durationMonths, sectionName, bulletText? }
 *
 * Returns: { score, level, confidence, primarySignal, suggestion }
 */
export function scoreSkillEvidence(instances) {
  if (!instances || instances.length === 0) {
    return { score: 0, level: 'L1', confidence: 'low', primarySignal: null, primarySection: null, suggestion: SUGGESTIONS.L1, limitingFactor: 'no_context' }
  }

  // Bloom multiplier per instance (C).
  // Use pre-computed per-bullet average (inst.bloomC) when available — this
  // prevents a high-Bloom verb in one bullet from inflating every skill in the
  // same block. Falls back to classifyBloomLevel(bulletText) for older callers
  // that do not supply bloomC, and to 1.0 when neither is present.
  const bloomCs = instances.map(inst =>
    inst.bloomC != null ? inst.bloomC : classifyBloomLevel(inst.bulletText || '')
  )

  // Effective E weight override — skills-section-only evidence (Bug #8).
  // classifyEvidenceType() returns 0.05 for 'skills' section instances, which
  // structurally floors the score at L1 (0.05 × 1.00 × 0.4 = 0.02) no matter
  // what. That floor is correct when the skills-list mention is one of
  // several contexts (it should stay a negligible nudge — other, demonstrated
  // evidence should dominate). It is wrong when the skills list is the ONLY
  // evidence for the skill: there is nothing to corroborate, but the skill was
  // still explicitly claimed, and that claim deserves more than L1 forever.
  // Gated on wType === 0.05 (classifyEvidenceType's actual current skills-section
  // constant) so the override only fires for the real skills-only case, not for
  // arbitrary test/caller-supplied weights, and every instance must be from the
  // skills section so mixed-context skills (skills + experience/projects/etc.)
  // are unaffected.
  const SKILLS_ONLY_E = 0.6
  const isSkillsSectionOnly = instances.every(
    inst => (inst.sectionName || '').toLowerCase() === 'skills' && inst.wType === 0.05
  )

  // Per-instance contribution: E × C × D
  const contributions = instances.map((inst, i) => {
    const effectiveWType = isSkillsSectionOnly ? SKILLS_ONLY_E : inst.wType
    const d = getDurationModifier(effectiveWType, inst.durationMonths)
    return { inst, bloomC: bloomCs[i], contribution: effectiveWType * bloomCs[i] * d }
  })

  const sum = contributions.reduce((acc, { contribution }) => acc + contribution, 0)

  const count = instances.length
  const mRecurrence = count >= 3 ? 1.4 : count === 2 ? 1.2 : 1.0

  const score      = parseFloat((sum * mRecurrence).toFixed(4))
  const level      = mapLevel(score)
  const confidence = computeConfidence(instances, bloomCs)

  // Step A — aggregate contributions by section
  const sectionTotals = new Map()
  for (const c of contributions) {
    const name = c.inst.sectionName
    sectionTotals.set(name, (sectionTotals.get(name) ?? 0) + c.contribution)
  }

  // Step B — pick the section with the highest aggregate sum
  let bestSection = null
  let bestTotal = -Infinity
  for (const [name, total] of sectionTotals) {
    if (total > bestTotal) { bestTotal = total; bestSection = name }
  }

  // Step C — within the winning section, pick the best individual instance
  const primaryEntry = contributions
    .filter(c => c.inst.sectionName === bestSection)
    .reduce((best, cur) => cur.contribution > best.contribution ? cur : best)

  const primary        = primaryEntry.inst
  const primarySection = primary.sectionName
  const primarySignal  = buildPrimarySignal(primary, primaryEntry.bloomC, count)

  // ---------------------------------------------------------------------------
  // Derive limitingFactor — priority order: no_context > no_duration > weak_verb
  //                                         > single_context > none
  // ---------------------------------------------------------------------------
  const maxE = Math.max(...contributions.map(({ inst }) => inst.wType))
  const avgC = bloomCs.reduce((s, c) => s + c, 0) / bloomCs.length
  const allUnknownDuration = contributions.every(({ inst }) => inst.durationMonths === null)
  const anyKnownDuration   = contributions.some(({ inst }) => inst.durationMonths !== null)

  let limitingFactor
  if (maxE <= 0.05) {
    limitingFactor = 'no_context'
  } else if (allUnknownDuration) {
    limitingFactor = 'no_duration'
  } else if (avgC <= 0.70 && anyKnownDuration) {
    limitingFactor = 'weak_verb'
  } else if (mRecurrence === 1.0) {
    limitingFactor = 'single_context'
  } else {
    limitingFactor = 'none'
  }

  // Certifications don't map to L1–L5 — you either hold the credential or you don't.
  const allFromCerts = instances.every(i => i.sectionName === 'certifications')
  if (allFromCerts) {
    return { score, level: 'certified', confidence: 'high', primarySignal: 'certifications', primarySection: 'certifications', suggestion: null, limitingFactor: 'none' }
  }

  return { score, level, confidence, primarySignal, primarySection, suggestion: SUGGESTIONS[level], limitingFactor, perSectionScores: Object.fromEntries(sectionTotals) }
}
