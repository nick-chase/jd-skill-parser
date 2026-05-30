/**
 * Weighted evidence scoring — see docs/scoring-model.md
 *
 * Exports:
 *   parseDateRange(text)          → months (integer) | null
 *   classifyEvidenceType(section, roleTitle) → W_type weight
 *   scoreSkillEvidence(instances[])          → { score, level, primarySignal, suggestion }
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
  // "Jan 2023", "January 2023", "2023" (returns { year, month })
  const trimmed = str.trim()

  // Month + year: "Jan 2023", "March 2021"
  const monthYear = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/)
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
 */
export function parseDateRange(text) {
  if (!text || !text.trim()) return null

  const t = text.trim()

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

  // --- Date ranges (separator: –, -, to) ---
  // Split on en-dash, hyphen surrounded by spaces, or " to "
  const SEP = /\s*(?:–|-(?=\s|[A-Za-z])|\bto\b|-(?=\d{4}))\s*/i
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

  return null
}

// ---------------------------------------------------------------------------
// B2 — classifyEvidenceType
// ---------------------------------------------------------------------------

const CONTRACT_RE = /\b(intern|internship|contract|contractor|temp|temporary|co-?op)\b/i

/**
 * Returns the W_type weight for a resume evidence instance.
 */
export function classifyEvidenceType(sectionName, roleTitle = '') {
  const section = (sectionName || '').toLowerCase().trim()

  switch (section) {
    case 'experience':
      return CONTRACT_RE.test(roleTitle) ? 0.7 : 1.0
    case 'projects':
      return 0.5
    case 'education':
      return 0.4
    case 'skills':
    case 'summary':
    default:
      return 0.1
  }
}

// ---------------------------------------------------------------------------
// B3 — scoreSkillEvidence
// ---------------------------------------------------------------------------

/**
 * Duration modifier lookup per scoring-model.md.
 * wType >= 0.7 → Job History column; wType < 0.7 → Project column.
 */
function getDurationModifier(wType, durationMonths) {
  const isJobHistory = wType >= 0.7

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
  { min: 1.80, level: 'L5', label: 'Expert' },
  { min: 1.10, level: 'L4', label: 'Advanced' },
  { min: 0.60, level: 'L3', label: 'Intermediate' },
  { min: 0.30, level: 'L2', label: 'Novice' },
  { min: 0.00, level: 'L1', label: 'Awareness' },
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

/**
 * Scores an array of skill evidence instances.
 *
 * Each instance: { wType: number, durationMonths: number|null, sectionName: string }
 *
 * Returns: { score, level, primarySignal, suggestion }
 */
export function scoreSkillEvidence(instances) {
  if (!instances || instances.length === 0) {
    return { score: 0, level: 'L1', primarySignal: null, suggestion: SUGGESTIONS.L1 }
  }

  // Compute per-instance contribution
  const contributions = instances.map(inst => {
    const m = getDurationModifier(inst.wType, inst.durationMonths)
    return { inst, contribution: inst.wType * m }
  })

  // Sum contributions
  const sum = contributions.reduce((acc, { contribution }) => acc + contribution, 0)

  // Recurrence multiplier
  const count = instances.length
  const mRecurrence = count >= 3 ? 1.4 : count === 2 ? 1.2 : 1.0

  const score = parseFloat((sum * mRecurrence).toFixed(4))
  const level = mapLevel(score)

  // Primary signal = instance with highest individual contribution
  const primary = contributions.reduce((best, cur) =>
    cur.contribution > best.contribution ? cur : best
  ).inst
  const primarySignal = primary.sectionName

  return { score, level, primarySignal, suggestion: SUGGESTIONS[level] }
}
