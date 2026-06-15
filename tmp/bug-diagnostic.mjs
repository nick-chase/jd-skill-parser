// Throwaway diagnostic script — gitignored, never commit.
// Writes observations to tmp/bug-diagnostic-output.txt.
// Uses the real parser path (parseResume.js uses relative imports, runs in plain Node).

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseResume, extractAllDegrees } from '../src/core/parser/parseResume.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lines = []
const out = (s = '') => lines.push(s)

// ---------------------------------------------------------------------------
// Load fixture
// ---------------------------------------------------------------------------
const resumeText = readFileSync(resolve(__dirname, '../tests/fixtures/nick_text.txt'), 'utf8')

// ---------------------------------------------------------------------------
// Replicate section splitter (exact logic from parseResume.js — read-only)
// ---------------------------------------------------------------------------
const SECTION_ALIASES = {
    summary:        ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE', 'ABOUT ME', 'OVERVIEW'],
    experience:     ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'EMPLOYMENT', 'CAREER HISTORY', 'RELEVANT EXPERIENCE', 'RELATED EXPERIENCE', 'WORK HISTORY'],
    technicalSkills:['TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES', 'TOOLS & TECHNOLOGIES', 'COMPETENCIES', 'TECHNICAL EXPERTISE', 'PROGRAMMING LANGUAGES', 'CORE COMPETENCIES', 'AREAS OF EXPERTISE'],
    projects:       ['PROJECTS', 'PERSONAL PROJECTS', 'SIDE PROJECTS', 'PORTFOLIO', 'ACADEMIC PROJECTS'],
    education:      ['EDUCATION', 'ACADEMIC BACKGROUND', 'EDUCATIONAL BACKGROUND', 'DEGREES'],
    certifications: ['CERTIFICATIONS', 'CERTIFICATES', 'LICENSES', 'CREDENTIALS', 'ADDITIONAL INFORMATION'],
}
const ALL_KNOWN_HEADERS = Object.values(SECTION_ALIASES).flat()

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function extractSection(text, sectionName) {
    const re = new RegExp(`(?:^|\\n)[\\t ]*${escRe(sectionName)}[\\t ]*(?:\\r?\\n|$)`, 'i')
    const match = re.exec(text)
    if (!match) return ''
    const startIdx = match.index + match[0].length
    let endIdx = text.length
    for (const header of ALL_KNOWN_HEADERS) {
        if (header.toUpperCase() === sectionName.toUpperCase()) continue
        const headerRe = new RegExp(`(?:^|\\n)[\\t ]*${escRe(header)}[\\t ]*(?:\\r?\\n|$)`, 'i')
        const m = headerRe.exec(text.substring(startIdx))
        if (m) {
            const idx = startIdx + m.index
            if (idx < endIdx) endIdx = idx
        }
    }
    return text.substring(startIdx, endIdx).trim()
}

function extractSectionWithAliases(text, aliases) {
    for (const alias of aliases) {
        const result = extractSection(text, alias)
        if (result && result.trim().length > 0) return result
    }
    return ''
}

const sections = {
    summary:         extractSectionWithAliases(resumeText, SECTION_ALIASES.summary),
    education:       extractSectionWithAliases(resumeText, SECTION_ALIASES.education),
    technicalSkills: extractSectionWithAliases(resumeText, SECTION_ALIASES.technicalSkills),
    projects:        extractSectionWithAliases(resumeText, SECTION_ALIASES.projects),
    experience:      extractSectionWithAliases(resumeText, SECTION_ALIASES.experience),
    certifications:  extractSectionWithAliases(resumeText, SECTION_ALIASES.certifications),
}

// ---------------------------------------------------------------------------
// OBSERVATION 1 — Section boundaries
// ---------------------------------------------------------------------------
out('='.repeat(70))
out('OBSERVATION 1 — Section boundaries')
out('='.repeat(70))

for (const [name, text] of Object.entries(sections)) {
    out(`\n--- ${name.toUpperCase()} ---`)
    if (!text) {
        out('  (not detected)')
        continue
    }
    out(`  Length: ${text.length} chars`)
    out(`  FIRST 100: ${JSON.stringify(text.slice(0, 100))}`)
    out(`  LAST  100: ${JSON.stringify(text.slice(-100))}`)
}

// ---------------------------------------------------------------------------
// OBSERVATION 2 — "AI" / "Artificial Intelligence" matches
// ---------------------------------------------------------------------------
out('\n' + '='.repeat(70))
out('OBSERVATION 2 — AI / Artificial Intelligence matches')
out('='.repeat(70))

const parseResult = parseResume(resumeText)
const aiSignals = parseResult.technicalSignals.filter(s =>
    /artificial intelligence|^ai$/i.test(s.name)
)

out(`\nFrom technicalSignals: ${aiSignals.length} AI-related skill(s) detected`)
for (const sig of aiSignals) {
    out(`  name="${sig.name}" source="${sig.source}" level=${sig.level} confidence=${sig.confidence} contextCount=${sig.contextCount}`)
}

// Raw text scan — find every occurrence with context
out('\nRaw text occurrences (AI / artificial intelligence):')
const aiRe = /\bartificial intelligence\b|\bai\b/gi
let m
let matchCount = 0
while ((m = aiRe.exec(resumeText)) !== null) {
    matchCount++
    const start = Math.max(0, m.index - 40)
    const end   = Math.min(resumeText.length, m.index + m[0].length + 40)
    const ctx   = resumeText.substring(start, end).replace(/\n/g, '↵')

    // Determine which section this position falls in
    let inSection = 'unknown'
    for (const [name, text] of Object.entries(sections)) {
        if (!text) continue
        // Find position of this section in the full resume text
        for (const alias of SECTION_ALIASES[name] ?? []) {
            const headerRe = new RegExp(`(?:^|\\n)[\\t ]*${escRe(alias)}[\\t ]*(?:\\r?\\n|$)`, 'i')
            const hm = headerRe.exec(resumeText)
            if (!hm) continue
            const secStart = hm.index + hm[0].length
            const secEnd   = secStart + text.length + 50  // approx
            if (m.index >= secStart && m.index <= secEnd) {
                inSection = name
                break
            }
        }
        if (inSection !== 'unknown') break
    }

    out(`  [${matchCount}] matched="${m[0]}" section="${inSection}" ctx: ...${ctx}...`)
}
if (matchCount === 0) out('  (none found)')

// ---------------------------------------------------------------------------
// OBSERVATION 3 — Degree year extraction for B.S. Software Development
// ---------------------------------------------------------------------------
out('\n' + '='.repeat(70))
out('OBSERVATION 3 — Degree year extraction (B.S. Software Development)')
out('='.repeat(70))

const educationText = sections.education
out(`\nRaw education section text:\n${educationText}\n`)

const allDegrees = extractAllDegrees(educationText)
out(`extractAllDegrees() returned ${allDegrees.length} degree(s):`)
for (const d of allDegrees) {
    out(`  ${JSON.stringify(d)}`)
}

// Find the BS Software Dev block and trace year tokens manually
const eduLines = educationText.split('\n')
let bsStartIdx = -1
for (let i = 0; i < eduLines.length; i++) {
    if (/software development|software engineering/i.test(eduLines[i]) && /b\.?s\.?|bachelor/i.test(eduLines[i])) {
        bsStartIdx = i
        break
    }
    // Also check: degree keyword on one line, field on next
    if (/b\.?s\.?|bachelor/i.test(eduLines[i])) {
        for (let j = i; j < Math.min(i + 3, eduLines.length); j++) {
            if (/software development|software engineering/i.test(eduLines[j])) {
                bsStartIdx = i
                break
            }
        }
    }
    if (bsStartIdx !== -1) break
}

if (bsStartIdx === -1) {
    out('\n  Could not locate B.S. Software Development block — printing full education lines with indices:')
    eduLines.forEach((l, i) => out(`  [${i}] ${l}`))
} else {
    out(`\nB.S. block starts at education line index ${bsStartIdx}: "${eduLines[bsStartIdx]}"`)
    out('Lines passed to extractGraduationYearFromBlock (up to maxLook=4 ahead):')
    const maxLook = 4
    for (let offset = 0; offset <= maxLook; offset++) {
        const idx = bsStartIdx + offset
        if (idx >= eduLines.length) break
        out(`  [${offset}] "${eduLines[idx]}"`)
    }
    out('\nYear tokens (20xx / 19[89]x) in each line, in order:')
    const yearRe = /\b(20\d{2}|19[89]\d)\b/g
    for (let offset = 0; offset <= maxLook; offset++) {
        const idx = bsStartIdx + offset
        if (idx >= eduLines.length) break
        const lineText = eduLines[idx]
        const tokens = [...lineText.matchAll(yearRe)].map(ym => ym[1])
        out(`  [${offset}] "${lineText.trim()}" → years: [${tokens.join(', ')}]`)
    }
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const outputPath = resolve(__dirname, 'bug-diagnostic-output.txt')
writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8')
console.log(`Written to ${outputPath}`)
