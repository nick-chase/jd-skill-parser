/**
 * Resume parser — plain ES module, no JSX, no React.
 *
 * Exports:
 *   parseResume(text)              → { technicalSignals, behavioralSignals }
 *   extractBehavioralSignals(text) → Signal[] (also used by JD parser)
 *
 * Uses relative imports so it can be loaded by plain Node.js for batch/diagnostic
 * scripts without a Vite build step.
 */

import * as registry from '../registry.js'
import { parseDateRange, classifyEvidenceType, classifyBloomLevel, scoreSkillEvidence } from './inference.js'

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------
// Behavioral signals — present/absent scan; no L1-L5 scoring
// ---------------------------------------------------------------------------

export function extractBehavioralSignals(text) {
    if (!text || !text.trim()) return []

    const entries = registry.getSoftSkills()
    const found = new Map()
    const used = new Set()

    for (const { canonical, alias, category, guardWords } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?')
        let pattern
        try {
            pattern = isRegex
                ? new RegExp(alias, 'gi')
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi')
        } catch (err) {
            console.warn('[parseResume] skipped malformed skill entry:', err.message, '— check skills.json for invalid regex');
            continue;
        }

        let m
        while ((m = pattern.exec(text)) !== null) {
            let alreadyUsed = false
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (used.has(i)) { alreadyUsed = true; break }
            }
            if (alreadyUsed) continue
            if (guardWords?.length) {
                const wStart = Math.max(0, m.index - 150)
                const wEnd   = Math.min(text.length, m.index + m[0].length + 150)
                const win    = text.substring(wStart, wEnd).toLowerCase()
                if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue
            }
            for (let i = m.index; i < m.index + m[0].length; i++) used.add(i)

            if (!found.has(canonical)) {
                found.set(canonical, { name: canonical, category })
            }
        }
    }

    return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------------
// Section extraction
// ---------------------------------------------------------------------------

// All known aliases — used both to locate a section and to find where it ends.
const SECTION_ALIASES = {
    summary:        ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE', 'ABOUT ME', 'OVERVIEW'],
    experience:     ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'EMPLOYMENT', 'CAREER HISTORY', 'RELEVANT EXPERIENCE', 'RELATED EXPERIENCE', 'WORK HISTORY'],
    technicalSkills:['TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES', 'TOOLS & TECHNOLOGIES', 'COMPETENCIES', 'TECHNICAL EXPERTISE', 'PROGRAMMING LANGUAGES', 'CORE COMPETENCIES', 'AREAS OF EXPERTISE'],
    projects:       ['PROJECTS', 'PERSONAL PROJECTS', 'SIDE PROJECTS', 'PORTFOLIO', 'ACADEMIC PROJECTS'],
    education:      ['EDUCATION', 'ACADEMIC BACKGROUND', 'EDUCATIONAL BACKGROUND', 'DEGREES'],
    certifications: ['CERTIFICATIONS', 'CERTIFICATES', 'LICENSES', 'CREDENTIALS', 'ADDITIONAL INFORMATION'],
}

// Flat list of every known header — used to detect section boundaries.
const ALL_KNOWN_HEADERS = Object.values(SECTION_ALIASES).flat()

// extractSection requires the header to appear at the start of a line (ignoring
// leading whitespace) so "experience" mid-sentence doesn't match "Experience" header.
function extractSection(text, sectionName) {
    const re = new RegExp(`(?:^|\\n)[\\t ]*${escapeRegex(sectionName)}[\\t ]*(?:\\r?\\n|$)`, 'i')
    const match = re.exec(text)
    if (!match) return ''

    const startIdx = match.index + match[0].length

    const upperText = text.toUpperCase()
    let endIdx = text.length
    for (const header of ALL_KNOWN_HEADERS) {
        if (header.toUpperCase() === sectionName.toUpperCase()) continue
        const headerRe = new RegExp(`(?:^|\\n)[\\t ]*${escapeRegex(header)}[\\t ]*(?:\\r?\\n|$)`, 'i')
        const m = headerRe.exec(text.substring(startIdx))
        if (m) {
            const idx = startIdx + m.index
            if (idx < endIdx) endIdx = idx
        }
    }

    return text.substring(startIdx, endIdx).trim()
}

// Try each alias in order; return the first non-empty result.
function extractSectionWithAliases(text, aliases) {
    for (const alias of aliases) {
        const result = extractSection(text, alias)
        if (result && result.trim().length > 0) return result
    }
    return ''
}

function extractResumeSections(text) {
    return {
        summary:         extractSectionWithAliases(text, SECTION_ALIASES.summary),
        education:       extractSectionWithAliases(text, SECTION_ALIASES.education),
        technicalSkills: extractSectionWithAliases(text, SECTION_ALIASES.technicalSkills),
        projects:        extractSectionWithAliases(text, SECTION_ALIASES.projects),
        experience:      extractSectionWithAliases(text, SECTION_ALIASES.experience),
        additionalInfo:  extractSectionWithAliases(text, SECTION_ALIASES.certifications),
    }
}

// ---------------------------------------------------------------------------
// Skill matching helpers
// ---------------------------------------------------------------------------

function matchSkillsInText(text) {
    const matches = []
    if (!text) return matches
    const entries = registry.getAllSkillEntries()
    const used = new Set()
    for (const { canonical, alias, category, guardWords, caseSensitive } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?')
        const flags = caseSensitive ? 'g' : 'gi'
        let pattern
        if (alias.toLowerCase().includes('c#')) {
            pattern = new RegExp(escapeRegex(alias), flags)
        } else {
            pattern = isRegex
                ? new RegExp(alias, flags)
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, flags)
        }
        let m
        while ((m = pattern.exec(text)) !== null) {
            let alreadyUsed = false
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (used.has(i)) { alreadyUsed = true; break }
            }
            if (alreadyUsed) continue
            if (guardWords?.length) {
                const wStart = Math.max(0, m.index - 150)
                const wEnd   = Math.min(text.length, m.index + m[0].length + 150)
                const win    = text.substring(wStart, wEnd).toLowerCase()
                if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue
            }
            for (let i = m.index; i < m.index + m[0].length; i++) used.add(i)
            matches.push({ canonical, category })
        }
    }
    return matches
}

function extractDateFromTitleLine(titleLine) {
    const parts = titleLine.split('|')
    for (const part of parts.slice(1)) {
        const months = parseDateRange(part.trim())
        if (months !== null) return months
    }
    return null
}

// ---------------------------------------------------------------------------
// Per-section evidence extractors
// ---------------------------------------------------------------------------

function extractSkillsFromSummary(text) {
    return matchSkillsInText(text).map(({ canonical, category }) => ({
        canonical, category,
        wType: classifyEvidenceType('summary', ''),
        durationMonths: null,
        sectionName: 'summary',
    }))
}

function extractSkillsFromTechnicalSection(text) {
    return matchSkillsInText(text).map(({ canonical, category }) => ({
        canonical, category,
        wType: classifyEvidenceType('skills', ''),
        durationMonths: null,
        sectionName: 'skills',
    }))
}

function extractSkillsFromEducation(text) {
    return matchSkillsInText(text).map(({ canonical, category }) => ({
        canonical, category,
        wType: classifyEvidenceType('education', ''),
        durationMonths: null,
        sectionName: 'education',
    }))
}

// ---------------------------------------------------------------------------
// Per-bullet Bloom scoring helpers
// ---------------------------------------------------------------------------

/**
 * Splits a block of text into individual bullet lines.
 * Recognises lines starting with common bullet markers (-, •, *, –, —)
 * or any non-empty line. Returns an array of non-empty trimmed strings.
 */
function splitIntoBulletLines(blockText) {
    if (!blockText) return []
    return blockText.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
}

/**
 * Averages the Bloom multiplier across bullet lines that mention skillName.
 * If no line mentions the skill, falls back to averaging across ALL lines.
 * This prevents a high-Bloom verb in one bullet from inflating every skill
 * in the same block.
 *
 * @param {string} skillName   - canonical skill name (case-insensitive match)
 * @param {string[]} bulletLines - array of individual bullet line strings
 * @returns {number} averaged Bloom multiplier (1.0 default when empty)
 */
function averageBloomForSkill(skillName, bulletLines) {
    if (!bulletLines || bulletLines.length === 0) return 1.0
    const needle = skillName.toLowerCase()
    const matchingLines = bulletLines.filter(l => l.toLowerCase().includes(needle))
    const targetLines = matchingLines.length > 0 ? matchingLines : bulletLines
    const sum = targetLines.reduce((acc, l) => acc + classifyBloomLevel(l), 0)
    return sum / targetLines.length
}

function extractSkillsFromProjects(text) {
    const wType = classifyEvidenceType('projects', '', text)
    const bulletLines = splitIntoBulletLines(text)
    return matchSkillsInText(text).map(({ canonical, category }) => ({
        canonical, category,
        wType,
        durationMonths: null,
        sectionName: 'projects',
        bulletText: text,
        bloomC: averageBloomForSkill(canonical, bulletLines),
    }))
}

// Matches the last uppercase acronym in parentheses immediately before a comma or year.
// e.g. "(ISC)² Certified Secure Software Lifecycle (CSSLP), 2022" → "CSSLP"
const CERT_ACRONYM_RE = /\(([A-Z][A-Z0-9\-]+)\)(?:,|\s*\d{4})/

function matchCertificationLine(line) {
    const acronymMatch = CERT_ACRONYM_RE.exec(line)
    if (acronymMatch) {
        const acronymHits = matchSkillsInText(acronymMatch[1])
        if (acronymHits.length > 0) return acronymHits
    }
    return matchSkillsInText(line)
}

// GROUP 2 FIX — Determine whether a certifications section line is a description
// bullet or pure-issuer/date/metadata line (as opposed to a cert name line).
// We exclude:
//   - Bullet-marker lines (-, •, *, etc.)
//   - Digit-starting description lines (e.g. "8-course program covering...")
//   - Date lines: "Issued April 2024", "Valid through ...", "Expires ..."
//   - Credential ID lines
//   - Pipe-separated metadata lines
//   - PURE issuer-only lines: the issuer name alone on a line (e.g. "Coursera",
//     "The Linux Foundation"). Lines like "freeCodeCamp — JavaScript Cert" contain
//     a cert name after " — " and MUST NOT be excluded.
// NOTE: We do NOT filter on "starts with lowercase" because some legitimate cert
// issuers (freeCodeCamp, edX) use lowercase-starting brand names.
function isCertDescriptionLine(trimmedLine) {
    // Bullet markers (-, •, *, but NOT – which is en-dash sometimes used in cert names)
    if (/^[-•\*‣◦→]/.test(trimmedLine)) return true
    // Digit-starting lines are description prose (e.g. "8-course program covering SQL, R")
    // Distinguish from year-only lines — those would be caught by "Issued" pattern
    if (/^\d/.test(trimmedLine) && !/^\d{4}\s*$/.test(trimmedLine)) return true
    // Date-only lines: "Issued ...", "Valid through ...", "Expires ..."
    if (/^(Issued|Valid through|Expires?|Renewed?|Completed)\b/i.test(trimmedLine)) return true
    // Credential ID lines
    if (/^Credential (ID|#)/i.test(trimmedLine)) return true
    // Pipe-separated metadata lines (e.g. "Credential ID: X  |  Issued: Y  |  Valid through: Z")
    if (/\bIssued\b.*\||\|\s*\bIssued\b/i.test(trimmedLine)) return true
    // Pure issuer-only lines: a known issuer name with NO cert-content after it.
    // Lines like "freeCodeCamp — JavaScript Cert" have " — CertName" after the issuer and PASS.
    // Only pure-issuer lines (e.g. "Coursera" alone) are filtered.
    const PURE_ISSUER_RE = /^(Coursera|edX|Udemy|LinkedIn Learning|Pluralsight|The Linux Foundation|Pearson VUE|SANS Institute|CompTIA|PMI|ISC2|ISACA)(\s*[,|]\s*\S.*)?$/i
    if (PURE_ISSUER_RE.test(trimmedLine) && !/—|–/.test(trimmedLine)) return true
    return false
}

function extractSkillsFromCertifications(text) {
    if (!text) return []
    const wType = classifyEvidenceType('certifications', '')
    const instances = []
    for (const line of text.split('\n')) {
        const trimmed = line.trim().replace(/&nbsp;/g, ' ').trim()
        if (!trimmed) continue
        // GROUP 2 FIX — Skip description/metadata lines; only process cert name lines.
        if (isCertDescriptionLine(trimmed)) continue
        for (const { canonical, category } of matchCertificationLine(trimmed)) {
            instances.push({ canonical, category, wType, durationMonths: null, sectionName: 'certifications' })
        }
    }
    return instances
}

const MONTH_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\.?\s/i
const YEAR_PATTERN  = /^\d{4}/

// GROUP 1 FIX — Strip trailing parenthetical duration suffix before parsing.
// e.g. "February 2019 – March 2022 (3 years, 1 month)" → "February 2019 – March 2022"
// The calculated duration from the date range is the source of truth.
function stripParentheticalSuffix(text) {
    return text.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function isDateLine(trimmedLine) {
    return MONTH_PATTERN.test(trimmedLine) || YEAR_PATTERN.test(trimmedLine)
}

function isBlankLine(trimmedLine) {
    return !trimmedLine
}

// Checks whether a line is likely a section header (all-caps or known section keywords).
// Used to stop lookahead when we've left the block header area.
function isSectionHeaderLine(trimmedLine) {
    return /^[A-Z][A-Z\s&]+$/.test(trimmedLine) && trimmedLine.length > 4
}

// GROUP 1 FIX — Find the index (relative to titleIdx) of the first date line
// within maxLookAhead lines. Returns -1 if not found.
// Stops early on blank lines or section headers to avoid false positives.
function findDateLineIndex(lines, titleIdx, maxLookAhead = 3) {
    for (let offset = 1; offset <= maxLookAhead; offset++) {
        const idx = titleIdx + offset
        if (idx >= lines.length) break
        const trimmed = lines[idx].trim()
        if (isBlankLine(trimmed)) break
        if (isSectionHeaderLine(trimmed)) break
        if (isDateLine(trimmed)) return idx
    }
    return -1
}

// Returns true if a line looks like a "Company Name — Location" line.
// These lines should NOT be treated as block title lines, as they are
// the second line of a 3-line header (title / company / date).
// Pattern: contains em-dash (—) or en-dash (–) followed by a city/state,
// OR contains a comma followed by a 2-letter state code.
function isCompanyLocationLine(trimmedLine) {
    // Contains em-dash or en-dash with surrounding whitespace (location separator)
    if (/\s[—–]\s/.test(trimmedLine)) return true
    // Ends with City, ST pattern (2-letter state code)
    if (/,\s*[A-Z]{2}\s*$/.test(trimmedLine)) return true
    return false
}

function splitExperienceBlocks(text) {
    const lines = text.split('\n')
    const blockStarts = []

    // Pattern B (extended): non-date title line followed by a date line within 3 lines.
    // Handles 3-line formats like:
    //   Software Engineer II        ← title (titleIdx)
    //   Northbridge Logistics — NJ  ← company (intermediate, not date)
    //   February 2019 – March 2022  ← date (titleIdx + 2)
    //
    // Guard: skip company/location lines so "Aegis Financial Services — Jersey City, NJ"
    // doesn't create a duplicate block start alongside "Senior Software Engineer".
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        if (isDateLine(line)) continue
        if (line.length <= 5) continue
        if (isCompanyLocationLine(line)) continue  // skip company/location lines

        const dateIdx = findDateLineIndex(lines, i, 3)
        if (dateIdx !== -1 && !blockStarts.includes(i)) {
            blockStarts.push(i)
        }
    }

    // Pattern A: pipe-delimited title lines (existing behaviour)
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('|') && !blockStarts.includes(i)) {
            blockStarts.push(i)
        }
    }

    blockStarts.sort((a, b) => a - b)

    if (blockStarts.length === 0) return [text]

    return blockStarts.map((start, idx) => {
        const end = blockStarts[idx + 1] ?? lines.length
        return lines.slice(start, end).join('\n')
    })
}

function extractSkillsFromExperience(text) {
    const instances = []
    if (!text) return instances

    const jobBlocks = splitExperienceBlocks(text)

    for (const block of jobBlocks) {
        const blockLines = block.split('\n')
        const titleLine = blockLines[0]
        const roleTitle = titleLine.split('|')[0].split(',')[0].trim()

        // GROUP 1 FIX — Search up to 4 lines ahead (increased from 3) to find the date line.
        // Strip parenthetical suffix like "(3 years, 1 month)" before parsing.
        let durationMonths = extractDateFromTitleLine(titleLine)
        if (durationMonths === null) {
            const dateIdx = findDateLineIndex(blockLines, 0, 4)
            if (dateIdx !== -1) {
                const rawDateLine = blockLines[dateIdx].trim()
                const cleanedDateLine = stripParentheticalSuffix(rawDateLine)
                durationMonths = parseDateRange(cleanedDateLine)
            }
        }

        const wType = classifyEvidenceType('experience', roleTitle)
        const bulletLines = splitIntoBulletLines(block)

        for (const { canonical, category } of matchSkillsInText(block)) {
            instances.push({
                canonical, category, wType, durationMonths, sectionName: 'experience',
                bulletText: block,
                bloomC: averageBloomForSkill(canonical, bulletLines),
            })
        }
    }
    return instances
}

const SECTION_SOURCE_LABEL = {
    experience:     'Experience',
    projects:       'Projects',
    education:      'Education',
    skills:         'Technical Skills',
    summary:        'Summary',
    certifications: 'Certifications',
}

// ---------------------------------------------------------------------------
// Degree extraction
// ---------------------------------------------------------------------------

const RESUME_DEGREE_LEVELS = [
    { level: 4, re: /\b(ph\.?d\.?|doctor(?:ate|al)?|d\.?sc\.?)\b/i },
    { level: 3, re: /\b(master'?s?|m\.?s\.?(?!\s*shift)|m\.?a\.?\b|m\.?eng\.?|m\.?b\.?a\.?|msc)\b/i },
    { level: 2, re: /\b(bachelor'?s?|b\.?s\.?\b|b\.?a\.?\b|b\.?eng\.?|b\.?sc\.?)\b/i },
    { level: 1, re: /\b(associate'?s?|a\.?s\.?\b|a\.?a\.?\b)\b/i },
]

// GROUP 3.1 FIX — Strip degree-type prefix from field string.
// "Arts in Data Science" → "Data Science"
// "Science in Cybersecurity" → "Cybersecurity"
const FIELD_PREFIXES_RE = /^(?:Arts in|Science in|Engineering in|Business Administration in|Fine Arts in|Philosophy in|Applied Science in|Applied Arts in)\s+/i

function stripFieldPrefix(raw) {
    if (!raw) return raw
    return raw.replace(FIELD_PREFIXES_RE, '').trim()
}

function extractDegreeField(line) {
    // "degree in X", "Bachelor's in X", "Bachelor of X", "B.S. in X"
    // "Master of Science in X" — captures everything after the final "in"
    let m = line.match(/\b(?:degree\s+(?:in|of)|bachelor'?s?\s+(?:in|of)|master'?s?\s+(?:in|of)|b\.?s\.?\s+in|m\.?s\.?\s+in)\s+([A-Za-z][A-Za-z\s,&\/]+?)(?=\s*(?:–|—|-{1,2}|,\s|\(|\bfrom\b|\bat\b|\d{4})|\s*$)/i)
    if (m) return stripFieldPrefix(m[1].trim().replace(/\s+/g, ' '))

    // "Master of Science in X" and similar long-form patterns not caught above
    m = line.match(/\bMaster\s+of\s+(?:Science|Arts|Engineering|Business Administration|Fine Arts|Philosophy)\s+in\s+([A-Za-z][A-Za-z\s,&\/]+?)(?=\s*(?:–|—|-{1,2}|,\s|\(|\bfrom\b|\bat\b|\d{4})|\s*$)/i)
    if (m) return stripFieldPrefix(m[1].trim().replace(/\s+/g, ' '))

    m = line.match(/\bBachelor\s+of\s+(?:Science|Arts|Engineering|Business Administration|Fine Arts|Philosophy)\s+in\s+([A-Za-z][A-Za-z\s,&\/]+?)(?=\s*(?:–|—|-{1,2}|,\s|\(|\bfrom\b|\bat\b|\d{4})|\s*$)/i)
    if (m) return stripFieldPrefix(m[1].trim().replace(/\s+/g, ' '))

    // "B.S. Computer Science" — field immediately after abbreviation, stopped by separator or year
    m = line.match(/\b(?:B\.S|B\.A|M\.S|M\.A|B\.Eng|M\.Eng|M\.B\.A|B\.Sc|M\.Sc)\.?\s+([A-Z][A-Za-z][A-Za-z\s&,]+?)(?=\s*(?:–|—|-{1,2}|\bfrom\b|\bat\b|\d{4})|\s*$)/i)
    if (m) {
        const candidate = m[1].trim().replace(/\s+/g, ' ')
        if (candidate.length <= 60) return stripFieldPrefix(candidate)
    }

    return null
}

// GROUP 3.2 FIX — Detect institution names on a following line.
// Looks for: University, College, Institute, School, Academy, Polytechnic, Conservatory
// OR: a 3–5 capital-letter acronym in parens like (NJIT) or (MIT).
// Strips parenthetical acronym aliases from the institution name.
const INSTITUTION_KEYWORDS_RE = /\b(University|College|Institute|School|Academy|Polytechnic|Conservatory)\b/i
const INSTITUTION_ACRONYM_RE  = /\(([A-Z]{2,5})\)/

function extractInstitutionFromLine(line) {
    const trimmed = line.trim()
    if (!trimmed) return null
    // Must contain institution keyword OR acronym-in-parens
    if (!INSTITUTION_KEYWORDS_RE.test(trimmed) && !INSTITUTION_ACRONYM_RE.test(trimmed)) return null
    // Strip parenthetical acronym alias: "New Jersey Institute of Technology (NJIT)" → "New Jersey Institute of Technology"
    // Also strip location suffix after em-dash or en-dash: "Rutgers University–New Brunswick — New Brunswick, NJ" → keep name
    // We want everything before a " —" location separator or after the initial institution name
    let inst = trimmed
        .replace(INSTITUTION_ACRONYM_RE, '')  // remove (ACRONYM)
        .trim()
    // Strip trailing location after ` — City, ST` or ` | City` patterns
    inst = inst.replace(/\s*(?:—|-{2}|\|)\s+[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}.*$/, '').trim()
    // Clean up trailing punctuation
    inst = inst.replace(/[,\s]+$/, '').trim()
    if (inst.length < 3) return null
    return inst
}

// GROUP 3.3 FIX — Extract graduation year from lines following a degree match.
// The graduation year is the LAST 4-digit year found in the lookahead range.
// inProgress triggers on: "Expected [year]", "– Present", "In Progress",
// "currently", "pursuing", "enrolled".
function extractGraduationYearFromBlock(lines, startIdx, maxLook = 4) {
    let year = null
    let inProgress = false
    for (let offset = 0; offset <= maxLook; offset++) {
        const idx = startIdx + offset
        if (idx >= lines.length) break
        const trimmed = lines[idx].trim()
        if (!trimmed) continue
        // Stop at next degree-level match (new degree block)
        if (offset > 0) {
            let isNewDegree = false
            for (const { re } of RESUME_DEGREE_LEVELS) {
                if (re.test(trimmed)) { isNewDegree = true; break }
            }
            if (isNewDegree) break
        }
        // "Expected" anywhere on the line (before or after year — handles "May 2028 (Expected)")
        if (/\bExpected\b/i.test(trimmed)) {
            inProgress = true
            // fall through — year extracted below by generic year scan
        }
        // "– Present" / "- Present" / "to Present" — currently enrolled
        if (/(?:–|-|to)\s*Present\b/i.test(trimmed)) {
            inProgress = true
            // still fall through to pick up any year on the same line
        }
        // "In Progress", "currently", "pursuing", "enrolled" — explicit in-progress phrases
        if (/\bin\s+progress\b|\bcurrently\b|\bpursuing\b|\benrolled\b/i.test(trimmed)) {
            inProgress = true
        }
        // All 4-digit years in this line; keep updating to get the LAST one
        const yearMatches = [...trimmed.matchAll(/\b(20\d{2}|19[89]\d)\b/g)]
        for (const ym of yearMatches) {
            year = parseInt(ym[1])
        }
    }
    return { year, inProgress }
}

export function extractDegree(educationText) {
    if (!educationText || !educationText.trim()) {
        return { degreeLevel: null, field: null, institution: null, graduationYear: null }
    }

    const lines = educationText.split('\n')

    // GROUP 3.3 FIX — Process degrees in order, finding the HIGHEST-level degree.
    // For each degree match, look up to 4 following lines for institution and year.
    let bestDegreeLevel = null
    let bestField       = null
    let bestInstitution = null
    let bestYear        = null
    let bestInProgress  = false

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (!trimmed) continue

        let matchedLevel = null
        for (const { level, re } of RESUME_DEGREE_LEVELS) {
            if (re.test(trimmed)) {
                matchedLevel = level
                break
            }
        }
        if (matchedLevel === null) continue

        // Only update if this degree is higher level (or first found)
        if (bestDegreeLevel !== null && matchedLevel < bestDegreeLevel) continue

        const field = extractDegreeField(trimmed)

        // GROUP 3.2 FIX — Look for institution in the following 1-2 lines
        let institution = null
        for (let offset = 1; offset <= 2; offset++) {
            const idx = i + offset
            if (idx >= lines.length) break
            const candidate = extractInstitutionFromLine(lines[idx])
            if (candidate) { institution = candidate; break }
        }

        // GROUP 3.3 FIX — Extract graduation year from the block following this degree
        const { year, inProgress } = extractGraduationYearFromBlock(lines, i, 4)

        bestDegreeLevel = matchedLevel
        bestField       = field
        bestInstitution = institution
        bestYear        = year
        bestInProgress  = inProgress
    }

    const result = {
        degreeLevel:      bestDegreeLevel,
        field:            bestField,
        institution:      bestInstitution,
        graduationYear:   bestYear,
    }
    if (bestInProgress) result.graduationStatus = 'in_progress'
    return result
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseResume(text) {
    if (!text || !text.trim()) return { technicalSignals: [], behavioralSignals: [], degree: null }

    const sections = extractResumeSections(text)

    const allInstances = [
        ...extractSkillsFromSummary(sections.summary),
        ...extractSkillsFromEducation(sections.education),
        ...extractSkillsFromTechnicalSection(sections.technicalSkills),
        ...extractSkillsFromProjects(sections.projects),
        ...extractSkillsFromExperience(sections.experience),
        ...extractSkillsFromCertifications(sections.additionalInfo),
    ]

    const skillMap = new Map()

    for (const { canonical, category, wType, durationMonths, sectionName, bulletText } of allInstances) {
        if (!skillMap.has(canonical)) {
            skillMap.set(canonical, { category, instances: [] })
        }
        const entry = skillMap.get(canonical)
        const duplicate = entry.instances.some(
            i => i.sectionName === sectionName && i.wType === wType && i.durationMonths === durationMonths
        )
        if (!duplicate) {
            entry.instances.push({ wType, durationMonths, sectionName, bulletText })
        }
    }

    const technicalSignals = [...skillMap.entries()].map(([name, { category, instances }]) => {
        const { score, level: levelStr, confidence, primarySignal, primarySection, suggestion, limitingFactor } = scoreSkillEvidence(instances)
        const level = levelStr === 'certified' ? 'certified' : parseInt(levelStr.slice(1), 10)
        const source = SECTION_SOURCE_LABEL[primarySection] ?? primarySection
        const durationMonths = instances.reduce((max, i) =>
            (i.durationMonths != null && (max == null || i.durationMonths > max)) ? i.durationMonths : max
        , null)
        return { name, category, level, score, confidence, source, primarySignal, suggestion, limitingFactor, durationMonths, contextCount: instances.length }
    }).sort((a, b) => {
        const aLvl = a.level === 'certified' ? -1 : a.level
        const bLvl = b.level === 'certified' ? -1 : b.level
        if (bLvl !== aLvl) return bLvl - aLvl
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name)
    })

    return {
        technicalSignals,
        behavioralSignals: extractBehavioralSignals(text),
        degree: extractDegree(sections.education),
    }
}
