/**
 * parseResumeLite() — compressed-output orchestrator for the Rookie (free) tier.
 *
 * COMPOSITION ONLY. Calls existing functions; no new scoring or parsing logic.
 * ANONYMOUS-SAFE. Zero Supabase imports, no auth, no localStorage writes.
 *
 * @param {string} resumeText  - Raw resume text
 * @param {object} jdProfile   - Output of parseJobDescription()
 * @returns {{
 *   topSkills:              { skills: object[], totalDetected: number },
 *   closestGap:             object | null,
 *   missingBehavioral:      object[],
 *   allBehavioralSignals:   { name: string, present: boolean }[],
 *   credentialGap:          { degreePresent: boolean, degreeLevel: string|null, certCount: number, certPresent: boolean },
 *   sectionsPresent:        string[],
 *   teaserCounts:           { lowMatchCount: number, criticalGapCount: number, lowMatchTeaser?: string, criticalTeaser?: string },
 *   matchScore:             number,
 * }}
 */

import { parseResume, extractResumeSections } from './parseResume.js'
import { getDecision } from './decision.js'
import { runGapAnalysis, runBehavioralGap } from './gap.js'
import { getSoftSkills } from '../../core/registry.js'

// Numeric degreeLevel from extractDegree → short abbreviation token.
// Never includes field of study, institution, or year.
const DEGREE_LEVEL_TOKEN = {
    4: 'Ph.D.',
    3: 'M.S.',
    2: 'B.S.',
    1: 'A.A.',
}

// Internal section keys from extractResumeSections → human-readable labels
const SECTION_LABEL = {
    summary:         'Summary',
    education:       'Education',
    technicalSkills: 'Skills',
    projects:        'Projects',
    experience:      'Experience',
    additionalInfo:  'Certifications',
}

export function parseResumeLite(resumeText, jdProfile) {
    // 1. Full parse — existing logic, no reimplementation
    const resumeProfile = parseResume(resumeText)

    const { technicalSignals, behavioralSignals, degree } = resumeProfile
    const jdSkills      = jdProfile?.technicalSignals    ?? []
    const jdBehavioral  = jdProfile?.behavioralSignals   ?? []

    // 2. Gap analysis — existing functions
    const gapResult       = runGapAnalysis(jdSkills, technicalSignals)
    const behavioralGap   = runBehavioralGap(jdBehavioral, behavioralSignals)

    // 3. Match score — existing function
    const { matchScore } = getDecision(jdProfile, resumeProfile)

    // 4. topSkills — top 5 using parseResume()'s existing sort order (already sorted)
    const topSkills = {
        skills: technicalSignals.slice(0, 5),
        totalDetected: technicalSignals.length,
    }

    // 5. closestGap — first levelGap entry (smallest gap after sort by importance)
    const levelGaps  = gapResult?.levelGaps  ?? []
    const critical   = gapResult?.critical   ?? []
    const closestGap = levelGaps[0] ?? null

    // 6. missingBehavioral — present/absent only, no scoring
    const missingBehavioral = behavioralGap?.missing ?? []

    // 7. allBehavioralSignals — full registry set with present/absent per signal.
    //    Uses unique canonicals from soft-skills registry.
    //    No raw resume text leaked — only signal names and boolean presence flags.
    const detectedBehavioralNames = new Set(behavioralSignals.map(s => s.name))
    const allCanonicals = [...new Set(getSoftSkills().map(e => e.canonical))]
    const allBehavioralSignals = allCanonicals.map(name => ({
        name,
        present: detectedBehavioralNames.has(name),
    }))

    // 8. credentialGap — expanded: booleans + degreeLevel token + certCount.
    //    degreeLevel: short type token only (B.S., M.S., etc.) — never field/institution.
    //    certCount: number of skills detected from the certifications section.
    const certCount = technicalSignals.filter(s => s.level === 'certified').length
    const credentialGap = {
        degreePresent: Boolean(degree?.degreeLevel),
        degreeLevel:   degree?.degreeLevel ? (DEGREE_LEVEL_TOKEN[degree.degreeLevel] ?? null) : null,
        certCount,
        certPresent:   certCount > 0,
    }

    // 9. sectionsPresent — names of sections that had non-empty content.
    //    Derived from re-running extractResumeSections (same call parseResume makes internally).
    //    Returns section labels only — no content, no raw text.
    const sections = extractResumeSections(resumeText ?? '')
    const sectionsPresent = Object.entries(sections)
        .filter(([, content]) => content && content.trim().length > 0)
        .map(([key]) => SECTION_LABEL[key] ?? key)

    // 10. teaserCounts — strings omitted (undefined) when count is 0
    const lowMatchCount    = levelGaps.length
    const criticalGapCount = critical.length
    const teaserCounts = {
        lowMatchCount,
        criticalGapCount,
        ...(lowMatchCount    > 0 && { lowMatchTeaser:  `${lowMatchCount} other skills match but score low` }),
        ...(criticalGapCount > 0 && { criticalTeaser:  `${criticalGapCount} skills missing from your resume` }),
    }

    return {
        topSkills,
        closestGap,
        missingBehavioral,
        allBehavioralSignals,
        credentialGap,
        sectionsPresent,
        teaserCounts,
        matchScore,
    }
}
