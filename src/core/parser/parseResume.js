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
import { parseDateRange, classifyEvidenceType, scoreSkillEvidence } from './inference.js'

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
        } catch { continue }

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
    experience:     ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'EMPLOYMENT', 'CAREER HISTORY'],
    technicalSkills:['TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES', 'TOOLS & TECHNOLOGIES', 'COMPETENCIES', 'TECHNICAL EXPERTISE'],
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

function extractSkillsFromProjects(text) {
    return matchSkillsInText(text).map(({ canonical, category }) => ({
        canonical, category,
        wType: classifyEvidenceType('projects', ''),
        durationMonths: null,
        sectionName: 'projects',
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

function extractSkillsFromCertifications(text) {
    if (!text) return []
    const wType = classifyEvidenceType('certifications', '')
    const instances = []
    for (const line of text.split('\n')) {
        const trimmed = line.trim().replace(/&nbsp;/g, ' ').trim()
        if (!trimmed) continue
        for (const { canonical, category } of matchCertificationLine(trimmed)) {
            instances.push({ canonical, category, wType, durationMonths: null, sectionName: 'certifications' })
        }
    }
    return instances
}

const MONTH_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\.?\s/i
const YEAR_PATTERN  = /^\d{4}/

function splitExperienceBlocks(text) {
    const lines = text.split('\n')
    const blockStarts = []

    // Pattern B: non-date line immediately followed by a date line
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim()
        const next = lines[i + 1].trim()
        if (!line) continue
        const nextIsDate = MONTH_PATTERN.test(next) || YEAR_PATTERN.test(next)
        const lineIsDate = MONTH_PATTERN.test(line) || YEAR_PATTERN.test(line)
        if (nextIsDate && !lineIsDate && line.length > 5) {
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
        const titleLine = block.split('\n')[0]
        const roleTitle = titleLine.split('|')[0].split(',')[0].trim()
        const durationMonths = parseDateRange(block.split('\n').slice(0, 3).find(l => MONTH_PATTERN.test(l.trim()) || YEAR_PATTERN.test(l.trim()))?.trim() ?? '') ?? extractDateFromTitleLine(titleLine)
        const wType = classifyEvidenceType('experience', roleTitle)

        for (const { canonical, category } of matchSkillsInText(block)) {
            instances.push({ canonical, category, wType, durationMonths, sectionName: 'experience', bulletText: block })
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
// Main export
// ---------------------------------------------------------------------------

export function parseResume(text) {
    if (!text || !text.trim()) return { technicalSignals: [], behavioralSignals: [] }

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
        const { score, level: levelStr, confidence, primarySignal, suggestion } = scoreSkillEvidence(instances)
        const level = levelStr === 'certified' ? 'certified' : parseInt(levelStr.slice(1), 10)
        const source = SECTION_SOURCE_LABEL[primarySignal] ?? primarySignal
        return { name, category, level, score, confidence, source, suggestion }
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
    }
}
