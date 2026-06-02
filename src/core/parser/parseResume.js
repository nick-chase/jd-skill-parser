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

const RESUME_SECTION_HEADERS = [
    'PROFESSIONAL SUMMARY',
    'EDUCATION',
    'TECHNICAL SKILLS',
    'PROJECTS',
    'PROFESSIONAL EXPERIENCE',
    'ADDITIONAL INFORMATION',
    'CERTIFICATIONS',
    'SKILLS',
    'EXPERIENCE',
    'WORK EXPERIENCE',
]

function extractSection(text, sectionName) {
    const upperText = text.toUpperCase()
    const startIdx = upperText.indexOf(sectionName.toUpperCase())
    if (startIdx === -1) return ''

    let endIdx = text.length
    for (const header of RESUME_SECTION_HEADERS) {
        if (header === sectionName.toUpperCase()) continue
        const idx = upperText.indexOf(header, startIdx + sectionName.length)
        if (idx !== -1 && idx < endIdx) endIdx = idx
    }

    return text.substring(startIdx + sectionName.length, endIdx).trim()
}

function extractResumeSections(text) {
    return {
        summary:        extractSection(text, 'PROFESSIONAL SUMMARY'),
        education:      extractSection(text, 'EDUCATION'),
        technicalSkills: extractSection(text, 'TECHNICAL SKILLS'),
        projects:       extractSection(text, 'PROJECTS'),
        experience:     extractSection(text, 'PROFESSIONAL EXPERIENCE'),
        additionalInfo: extractSection(text, 'ADDITIONAL INFORMATION'),
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
    for (const { canonical, alias, category, guardWords } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?')
        let pattern
        if (alias.toLowerCase().includes('c#')) {
            pattern = new RegExp(escapeRegex(alias), 'gi')
        } else {
            pattern = isRegex
                ? new RegExp(alias, 'gi')
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi')
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

const TECH_ROLE_KEYWORDS = [
    'engineer', 'developer', 'programmer', 'analyst',
    'data', 'software', 'machine learning', 'ai', 'ml',
    'architect', 'devops', 'backend', 'frontend', 'fullstack',
]

function isTechRole(jobTitle) {
    const lower = jobTitle.toLowerCase()
    return TECH_ROLE_KEYWORDS.some(kw => lower.includes(kw))
}

function extractSkillsFromExperience(text) {
    const instances = []
    if (!text) return instances

    const jobBlocks = text.split(/\n(?=[A-Z][a-z].*\|)/)

    for (const block of jobBlocks) {
        const titleLine = block.split('\n')[0]
        if (!isTechRole(titleLine)) continue

        const roleTitle = titleLine.split('|')[0].trim()
        const durationMonths = extractDateFromTitleLine(titleLine)
        const wType = classifyEvidenceType('experience', roleTitle)

        for (const { canonical, category } of matchSkillsInText(block)) {
            instances.push({ canonical, category, wType, durationMonths, sectionName: 'experience' })
        }
    }
    return instances
}

const SECTION_SOURCE_LABEL = {
    experience: 'Experience',
    projects:   'Projects',
    education:  'Education',
    skills:     'Technical Skills',
    summary:    'Summary',
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseResume(text) {
    if (!text || !text.trim()) return { technicalSignals: [], behavioralSignals: [] }

    const sections = extractResumeSections(text)

    const allInstances = [
        ...extractSkillsFromEducation(sections.education),
        ...extractSkillsFromTechnicalSection(sections.technicalSkills),
        ...extractSkillsFromProjects(sections.projects),
        ...extractSkillsFromExperience(sections.experience),
    ]

    const skillMap = new Map()

    for (const { canonical, category, wType, durationMonths, sectionName } of allInstances) {
        if (!skillMap.has(canonical)) {
            skillMap.set(canonical, { category, instances: [] })
        }
        const entry = skillMap.get(canonical)
        const duplicate = entry.instances.some(
            i => i.sectionName === sectionName && i.wType === wType && i.durationMonths === durationMonths
        )
        if (!duplicate) {
            entry.instances.push({ wType, durationMonths, sectionName })
        }
    }

    const technicalSignals = [...skillMap.entries()].map(([name, { category, instances }]) => {
        const { score, level: levelStr, confidence, primarySignal, suggestion } = scoreSkillEvidence(instances)
        const level = parseInt(levelStr.slice(1), 10)
        const source = SECTION_SOURCE_LABEL[primarySignal] ?? primarySignal
        return { name, category, level, score, confidence, source, suggestion }
    }).sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name)
    })

    return {
        technicalSignals,
        behavioralSignals: extractBehavioralSignals(text),
    }
}
