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
 *   topActionable:     { skills: object[] } | null,
 *   missingBehavioral: object[],
 *   teaserCounts:      { lowMatchCount: number, criticalGapCount: number, lowMatchTeaser?: string, criticalTeaser?: string },
 *   remainingCounts:   { levelGapsRemaining?: number, criticalRemaining?: number },
 *   matchedCount:      number,
 *   missingCount:      number,
 *   levelGapsCount:    number,
 * }}
 *
 * topActionable.skills — up to 3 entries, ranked by actionability (smaller
 * level gap first, then higher JD importance, then more existing resume
 * context). Each entry carries { sourceType: 'levelGap' | 'critical',
 * name, level, resumeLevel, gap, importance, confidence, source,
 * durationMonths, contextCount }. Deterministic — same input always
 * produces the same 3 skills in the same order.
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
            topActionable:     null,
            missingBehavioral: [],
            teaserCounts:      { lowMatchCount: 0, criticalGapCount: 0 },
            remainingCounts:   {},
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

    const levelGaps = gapResult?.levelGaps ?? []
    const critical  = gapResult?.critical  ?? []

    // topActionable — unified top-3 "most actionable skills" selection.
    // Candidate pool = levelGaps (have it, below required level) + critical
    // (missing entirely). matched/bonus are excluded — matched is already
    // met, bonus is resume-only and not JD-relevant.
    //
    // Ranking priority (stable multi-key sort):
    //   1. gap ascending          — smaller gap = closer to done = more actionable
    //   2. importance descending  — JD-required ranks above nice-to-have
    //   3. contextCount descending — some existing evidence beats zero context
    //      (critical items have no resume evidence, so contextCount is
    //      treated as 0 for them)
    const pool = [
        ...levelGaps.map(s => ({
            ...s,
            sourceType:    'levelGap',
            confidence:    s.confidence     ?? null,
            source:        s.source         ?? null,
            durationMonths: s.durationMonths ?? null,
            contextCount:  s.contextCount   ?? 0,
        })),
        ...critical.map(s => ({
            ...s,
            sourceType:    'critical',
            resumeLevel:   0,
            confidence:    null,
            source:        null,
            durationMonths: null,
            contextCount:  0,
        })),
    ]

    pool.sort((a, b) => {
        if (a.gap !== b.gap) return a.gap - b.gap
        if (a.importance !== b.importance) return b.importance - a.importance
        return (b.contextCount ?? 0) - (a.contextCount ?? 0)
    })

    const topActionableSkills = pool.slice(0, 3)
    const topActionable = { skills: topActionableSkills }

    // remainingCounts — true remaining pool minus what's shown in the top 3,
    // split by type. Undefined (not 0) when nothing remains of that type, so
    // the display layer can omit rather than render an odd "0 more" sentence.
    const shownLevelGaps = topActionableSkills.filter(s => s.sourceType === 'levelGap').length
    const shownCritical  = topActionableSkills.filter(s => s.sourceType === 'critical').length
    const levelGapsRemaining = levelGaps.length - shownLevelGaps
    const criticalRemaining  = critical.length  - shownCritical
    const remainingCounts = {
        ...(levelGapsRemaining > 0 && { levelGapsRemaining }),
        ...(criticalRemaining  > 0 && { criticalRemaining }),
    }

    // missingBehavioral — present/absent only, no scoring
    const missingBehavioral = behavioralGap?.missing ?? []

    // teaserCounts — strings omitted (undefined) when count is 0
    const lowMatchCount    = levelGaps.length
    const criticalGapCount = critical.length
    const teaserCounts = {
        lowMatchCount,
        criticalGapCount,
        ...(lowMatchCount    > 0 && { lowMatchTeaser:  `${lowMatchCount} other skill${lowMatchCount !== 1 ? 's' : ''} ${lowMatchCount !== 1 ? 'match' : 'matches'}, but your resume doesn't show enough evidence yet` }),
        ...(criticalGapCount > 0 && { criticalTeaser:  `${criticalGapCount} skill${criticalGapCount !== 1 ? 's' : ''} the JD asks for ${criticalGapCount !== 1 ? "aren't" : "isn't"} on your resume at all` }),
    }

    return {
        matchScore,
        topActionable,
        missingBehavioral,
        teaserCounts,
        remainingCounts,
        matchedCount:    (gapResult?.matched   ?? []).length,
        missingCount:    critical.length,
        levelGapsCount:  levelGaps.length,
    }
}
