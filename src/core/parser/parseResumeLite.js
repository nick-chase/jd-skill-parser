/**
 * parseResumeLite() — compressed-output orchestrator for the Lite (free) tier.
 *
 * COMPOSITION ONLY. Calls existing functions; no new scoring or parsing logic.
 * ANONYMOUS-SAFE. Zero Supabase imports, no auth, no localStorage writes.
 *
 * @param {string} resumeText  - Raw resume text
 * @returns {{
 *   topSkills:              { skills: object[], totalDetected: number },
 *   allBehavioralSignals:   { name: string, present: boolean }[],
 *   credentialGap:          { degreePresent: boolean, degreeLevel: string|null, certCount: number, certPresent: boolean },
 *   sectionsPresent:        string[],
 * }}
 *
 * computeLiteMatch() — computes JD-dependent gap fields at render time.
 *
 * @param {object} resumeData  - Output of parseResumeLite()
 * @param {object|null} jdProfile - Output of parseJobDescription() (may be null)
 * @returns {{
 *   matchScore:        number | null,
 *   closestGap:        object | null,
 *   missingSpread:      { skills: object[], totalMissing: number, moreCount: number } | null,
 *   missingBehavioral: object[],
 *   teaserCounts:      { lowMatchCount: number, criticalGapCount: number, lowMatchTeaser?: string, criticalTeaser?: string },
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

export function parseResumeLite(resumeText) {
    // 1. Full parse — existing logic, no reimplementation
    const resumeProfile = parseResume(resumeText)

    const { technicalSignals, behavioralSignals, degree } = resumeProfile

    // 2. topSkills — top 5 using parseResume()'s existing sort order (already sorted)
    const topSkills = {
        skills: technicalSignals.slice(0, 5),
        totalDetected: technicalSignals.length,
    }

    // 3. allBehavioralSignals — full registry set with present/absent per signal.
    //    Uses unique canonicals from soft-skills registry.
    //    No raw resume text leaked — only signal names and boolean presence flags.
    const detectedBehavioralNames = new Set(behavioralSignals.map(s => s.name))
    const allCanonicals = [...new Set(getSoftSkills().map(e => e.canonical))]
    const allBehavioralSignals = allCanonicals.map(name => ({
        name,
        present: detectedBehavioralNames.has(name),
    }))

    // 4. credentialGap — expanded: booleans + degreeLevel token + certCount.
    //    degreeLevel: short type token only (B.S., M.S., etc.) — never field/institution.
    //    certCount: number of skills detected from the certifications section.
    const certCount = technicalSignals.filter(s => s.level === 'certified').length
    const credentialGap = {
        degreePresent: Boolean(degree?.degreeLevel),
        degreeLevel:   degree?.degreeLevel ? (DEGREE_LEVEL_TOKEN[degree.degreeLevel] ?? null) : null,
        certCount,
        certPresent:   certCount > 0,
    }

    // 5. sectionsPresent — names of sections that had non-empty content.
    //    Derived from re-running extractResumeSections (same call parseResume makes internally).
    //    Returns section labels only — no content, no raw text.
    const sections = extractResumeSections(resumeText ?? '')
    const sectionsPresent = Object.entries(sections)
        .filter(([, content]) => content && content.trim().length > 0)
        .map(([key]) => SECTION_LABEL[key] ?? key)

    return {
        topSkills,
        allBehavioralSignals,
        credentialGap,
        sectionsPresent,
        // Internal signals needed by computeLiteMatch — not displayed directly
        _technicalSignals: technicalSignals,
        _behavioralSignals: behavioralSignals,
        _degree: degree,
    }
}

/**
 * computeLiteMatch — computes JD-dependent gap fields at render time.
 * Call this with the current jdProfile state, not at parse time.
 *
 * Returns a sentinel shape (matchScore: null) when jdProfile is absent or empty.
 */
export function computeLiteMatch(resumeData, jdProfile) {
    if (!jdProfile?.technicalSignals?.length) {
        return {
            matchScore:        null,
            closestGap:        null,
            missingSpread:     null,
            missingBehavioral: [],
            teaserCounts:      { lowMatchCount: 0, criticalGapCount: 0 },
        }
    }

    const technicalSignals  = resumeData?._technicalSignals  ?? []
    const behavioralSignals = resumeData?._behavioralSignals ?? []
    const degree            = resumeData?._degree            ?? null

    const jdSkills     = jdProfile.technicalSignals  ?? []
    const jdBehavioral = jdProfile.behavioralSignals ?? []

    // Gap analysis — existing functions
    const gapResult     = runGapAnalysis(jdSkills, technicalSignals)
    const behavioralGap = runBehavioralGap(jdBehavioral, behavioralSignals)

    // Match score — existing function
    // Reconstruct minimal resumeProfile shape that getDecision expects
    const resumeProfile = { technicalSignals, behavioralSignals, degree }
    const { matchScore } = getDecision(jdProfile, resumeProfile)

    // closestGap — first levelGap entry (smallest gap after sort by importance)
    const levelGaps  = gapResult?.levelGaps  ?? []
    const critical   = gapResult?.critical   ?? []
    const closestGap = levelGaps[0] ?? null

    // missingSpread — fallback for when there is no single level-gap skill to
    // anchor the "Closest gap" card (levelGaps.length === 0). Buckets missing
    // (critical) skills into three required-level tiers — low [L1-2], mid [L3],
    // high [L4-5] — mirroring the existing EVIDENCE_BANDS convention in
    // constants.js, which already treats L4-5 as one "Strong Evidence" band and
    // L3 as its own "Supported" band. Within each tier, picks the single skill
    // with the lowest jdOrder (earliest JD mention) — never importance — as the
    // representative. Tiers with zero missing skills are omitted (never
    // backfilled). Only computed when closestGap is null, since it is unused
    // otherwise.
    let missingSpread = null
    if (!closestGap && critical.length > 0) {
        const tiers = [
            { key: 'low',  levels: [1, 2] },
            { key: 'mid',  levels: [3] },
            { key: 'high', levels: [4, 5] },
        ]
        const shown = []
        for (const tier of tiers) {
            const candidates = critical.filter(s => tier.levels.includes(s.level))
            if (candidates.length === 0) continue
            const pick = candidates.reduce((lowest, s) =>
                (s.jdOrder ?? Infinity) < (lowest.jdOrder ?? Infinity) ? s : lowest
            )
            shown.push(pick)
        }
        missingSpread = {
            skills: shown,
            totalMissing: critical.length,
            moreCount: critical.length - shown.length,
        }
    }

    // missingBehavioral — present/absent only, no scoring
    const missingBehavioral = behavioralGap?.missing ?? []

    // teaserCounts — strings omitted (undefined) when count is 0
    const lowMatchCount    = levelGaps.length
    const criticalGapCount = critical.length
    const teaserCounts = {
        lowMatchCount,
        criticalGapCount,
        ...(lowMatchCount    > 0 && { lowMatchTeaser:  `${lowMatchCount} other skills match but score low` }),
        ...(criticalGapCount > 0 && { criticalTeaser:  `${criticalGapCount} skills missing from your resume` }),
    }

    return {
        matchScore,
        closestGap,
        missingSpread,
        missingBehavioral,
        teaserCounts,
        matchedCount:    (gapResult?.matched   ?? []).length,
        missingCount:    critical.length,
        levelGapsCount:  levelGaps.length,
    }
}
