/**
 * parseResumeLite() — compressed-output orchestrator for the Rookie (free) tier.
 *
 * COMPOSITION ONLY. Calls existing functions; no new scoring or parsing logic.
 * ANONYMOUS-SAFE. Zero Supabase imports, no auth, no localStorage writes.
 *
 * @param {string} resumeText  - Raw resume text
 * @param {object} jdProfile   - Output of parseJobDescription()
 * @returns {{
 *   topSkills:          { skills: object[], totalDetected: number },
 *   closestGap:         object | null,
 *   missingBehavioral:  object[],
 *   credentialGap:      { degreePresent: boolean, certPresent: boolean },
 *   teaserCounts:       { lowMatchCount: number, criticalGapCount: number, lowMatchTeaser?: string, criticalTeaser?: string },
 *   matchScore:         number,
 * }}
 */

import { parseResume } from './parseResume.js'
import { getDecision } from './decision.js'
import { runGapAnalysis, runBehavioralGap } from './gap.js'

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

    // 7. credentialGap — booleans only, no specifics leaked
    const credentialGap = {
        degreePresent: Boolean(degree?.degreeLevel),
        certPresent:   technicalSignals.some(s => s.level === 'certified'),
    }

    // 8. teaserCounts — strings omitted (undefined) when count is 0
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
        credentialGap,
        teaserCounts,
        matchScore,
    }
}
