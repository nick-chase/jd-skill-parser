/**
 * LiteResultsView — free-tier (Lite) output panel.
 *
 * Renders a compressed-but-true version of the gap report.
 * Philosophy: generous-with-mystery. Show shape and existence.
 * Withhold only specifics. No blur, no locks, no fake walls.
 *
 * Props:
 *   resumeData {
 *     topSkills:        { skills: object[], totalDetected: number }
 *     credentialGap:    { degreePresent: boolean, certPresent: boolean }
 *     allBehavioralSignals: { name: string, present: boolean }[]
 *     sectionsPresent:  string[]
 *   }
 *   liteMatch {
 *     matchScore:        number | null   (null = JD not yet parsed — show empty state)
 *     topActionable:     { skills: object[] } | null
 *       — up to 3 skills, ranked by actionability (gap asc, importance desc,
 *         contextCount desc). Each skill: { sourceType: 'levelGap'|'critical',
 *         name, level, resumeLevel, gap, importance, confidence, source,
 *         durationMonths, contextCount }
 *     missingBehavioral: object[]
 *     teaserCounts:      { lowMatchCount: number, criticalGapCount: number,
 *                          lowMatchTeaser?: string, criticalTeaser?: string }
 *     remainingCounts:   { levelGapsRemaining?: number, criticalRemaining?: number }
 *       — true counts left over after the top-3, omitted (undefined) when zero
 *     matchedCount:      number
 *     missingCount:      number
 *     levelGapsCount:    number
 *   }
 *   duties  string[]   — JD duty bullets from results.jobDuties
 */

import {
  getMatchScoreLabel,
  LEVEL_NAMES,
  nameToResourceId,
  evidenceSummary,
} from '@utils/constants.js'
import { getAffiliateResources } from '@utils/affiliateLoader.js'
import ConfidenceDotInline from './ConfidenceDot.jsx'
import GapResourceLink from './GapResourceLink.jsx'
import { missingSuggestion, gapSuggestion } from './SkillRow.jsx'

// Compact evidence line for the closest-gap card — shared with GapAnalysisView
// (jd-skill-parser.jsx) via @utils/constants.js.
const closestGapEvidenceLine = evidenceSummary

// Level label lookup — mirrors resumeLabel/jdLabel derivation in GapAnalysisView (jd-skill-parser.jsx).
function levelLabel(level) {
  if (!level) return 'Not evidenced'
  return LEVEL_NAMES[level] ?? `L${level}`
}

export default function LiteResultsView({ resumeData, liteMatch, duties = [] }) {
  if (!resumeData) return null

  const {
    topSkills     = { skills: [], totalDetected: 0 },
    credentialGap = { degreePresent: true, certPresent: true },
  } = resumeData

  const {
    matchScore        = null,
    topActionable     = null,
    missingBehavioral = [],
    teaserCounts      = { lowMatchCount: 0, criticalGapCount: 0 },
    remainingCounts   = {},
    matchedCount      = 0,
    missingCount      = 0,
    levelGapsCount    = 0,
  } = liteMatch ?? {}

  // Single reconciled total for "skills in play for this JD comparison" —
  // every JD skill matched, level-gapped, or missing. Used for every count
  // shown on this screen so the top stats, remaining-count line, and CTA
  // copy never disagree with each other. Do NOT use topSkills.totalDetected
  // here — that's the JD-independent resume-only total (Resume tab only).
  const jdSkillTotal = matchedCount + missingCount + levelGapsCount
  const fixableCount = missingCount + levelGapsCount

  // Sentinel: JD not yet parsed — show empty state instead of stale/wrong data
  if (matchScore === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Paste a job description in the JD tab to see how your resume reads against it.
        </p>
      </div>
    )
  }

  const scoreLabel = getMatchScoreLabel(matchScore)
  const scoreColor = matchScore >= 70
    ? 'text-emerald-700'
    : matchScore >= 40
      ? 'text-amber-700'
      : 'text-red-700'

  // Credential gap copy — boolean-derived only, zero specifics
  function credentialCopy() {
    const lines = []
    if (credentialGap.degreePresent === false) {
      lines.push('No degree detected on your resume.')
    }
    if (credentialGap.certPresent === false) {
      lines.push('No certifications detected on your resume.')
    }
    if (lines.length === 0) {
      lines.push('Credentials detected — see how they stack up in the full report.')
    }
    return lines
  }

  const credLines = credentialCopy()
  const showCredSection = credentialGap.degreePresent === false ||
    credentialGap.certPresent === false ||
    (credentialGap.degreePresent === true && credentialGap.certPresent === true)

  return (
    <div className="space-y-6">

      {/* 1. Match-summary banner */}
      <div
        className="rounded-lg border border-slate-200 bg-white p-5"
        data-testid="match-score-section"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
          Match score
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <div
            className={`text-4xl font-bold ${scoreColor}`}
            data-testid="match-score-value"
          >
            {matchScore}%
          </div>
          <div
            className={`text-sm font-semibold ${scoreColor}`}
            data-testid="match-score-label"
          >
            {scoreLabel}
          </div>
        </div>
        <div
          className="flex flex-wrap gap-4 text-xs"
          data-testid="match-summary-counts"
        >
          <span>
            <span className="font-semibold uppercase tracking-wide text-slate-400">Matched </span>
            <span className="font-bold text-emerald-700" data-testid="matched-count">{matchedCount}</span>
          </span>
          <span>
            <span className="font-semibold uppercase tracking-wide text-slate-400">Missing </span>
            <span className="font-bold text-red-700" data-testid="missing-count">{missingCount}</span>
          </span>
          <span>
            <span className="font-semibold uppercase tracking-wide text-slate-400">Level Gaps </span>
            <span className="font-bold text-amber-700" data-testid="level-gaps-count">{levelGapsCount}</span>
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-3">
          Based on how your resume reads today — not your actual ability.
        </div>
      </div>

      {/* 2. What this role does */}
      {duties.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="job-duties-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            What this role does
          </div>
          <ul className="space-y-1">
            {duties.map((duty, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-slate-300 shrink-0 mt-0.5">·</span>
                <span>{duty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Most actionable skills — unified top-3, ranked by gap size, then
             JD importance, then existing resume context. Replaces the former
             separate "closest gap" / "requirement spread" cards. */}
      {topActionable && topActionable.skills.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-5"
          data-testid="top-actionable-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
            Most actionable skills
          </div>
          <div className="text-xs text-amber-700 mb-3">
            These are the skills where a resume edit would move the needle most.
          </div>
          <ul className="space-y-3">
            {topActionable.skills.map((skill, i) => {
              const isCritical = skill.sourceType === 'critical'
              const resource = getAffiliateResources(
                nameToResourceId(skill.name),
                skill.resumeLevel ?? 1,
                'tech',
                skill.name
              )[0] ?? null
              const suggestion = isCritical
                ? (skill.suggestion || missingSuggestion(skill.name))
                : (skill.suggestion || gapSuggestion(skill.name, skill.resumeLevel ?? 0, skill.level))
              return (
                <li
                  key={skill.name ?? i}
                  className="border-t border-amber-200 first:border-t-0 first:pt-0 pt-3"
                  data-testid="top-actionable-item"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                    <span className="text-xs text-amber-700 font-semibold">
                      {isCritical
                        ? 'Missing entirely'
                        : typeof skill.gap === 'number'
                          ? `${skill.gap} level${skill.gap !== 1 ? 's' : ''} away`
                          : 'Gap detected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                    <span>
                      You: {levelLabel(skill.resumeLevel)}
                      {!isCritical && ` (${closestGapEvidenceLine(skill)})`}
                    </span>
                    {skill.confidence && <ConfidenceDotInline confidence={skill.confidence} />}
                    <span>→ Role needs: {levelLabel(skill.level)}</span>
                  </div>
                  {suggestion && (
                    <div
                      className="text-xs text-amber-800 mt-1 flex gap-1 items-start"
                      data-testid="top-actionable-suggestion"
                    >
                      <span className="shrink-0 font-bold">→</span>
                      <span>{suggestion}</span>
                    </div>
                  )}
                  <GapResourceLink resource={resource} />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 4. Missing behavioral signals */}
      {missingBehavioral.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="missing-behavioral-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Behavioral signals not found
          </div>
          <ul className="space-y-1">
            {missingBehavioral.map((signal, i) => (
              <li key={signal.name ?? i} className="text-sm text-slate-600">
                {signal.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Credential gap */}
      {showCredSection && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="credential-gap-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Credentials
          </div>
          {credLines.map((line, i) => (
            <p key={i} className="text-sm text-slate-600">{line}</p>
          ))}
        </div>
      )}

      {/* 6. Teaser counts */}
      {(teaserCounts.lowMatchTeaser || teaserCounts.criticalTeaser) && (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-5 space-y-2"
          data-testid="teaser-counts-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            What else the full report shows
          </div>
          {teaserCounts.lowMatchTeaser && (
            <p className="text-sm text-slate-600" data-testid="low-match-teaser">
              {teaserCounts.lowMatchTeaser}
            </p>
          )}
          {teaserCounts.criticalTeaser && (
            <p className="text-sm text-red-600 font-medium" data-testid="critical-teaser">
              {teaserCounts.criticalTeaser}
            </p>
          )}
          {(remainingCounts.levelGapsRemaining || remainingCounts.criticalRemaining) && (
            <p className="text-sm text-slate-600" data-testid="remaining-actionable-teaser">
              {remainingCounts.levelGapsRemaining
                ? `${remainingCounts.levelGapsRemaining} more skill${remainingCounts.levelGapsRemaining !== 1 ? 's are' : ' is'} close to leveling up. `
                : ''}
              {remainingCounts.criticalRemaining
                ? `${remainingCounts.criticalRemaining} more ${remainingCounts.criticalRemaining !== 1 ? 'are' : 'is'} missing entirely.`
                : ''}
            </p>
          )}
        </div>
      )}

      {/* 7. Upgrade CTA */}
      <div
        className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 text-center"
        data-testid="upgrade-cta-section"
      >
        <p className="text-sm font-semibold text-indigo-900 mb-1">
          See the full picture — every skill gap, every level.
        </p>
        <p className="text-xs text-indigo-700 mb-4" data-testid="cta-body-copy">
          This role compares against {jdSkillTotal} skill{jdSkillTotal !== 1 ? 's' : ''} total
          ({matchedCount} matched, {missingCount} missing, {levelGapsCount} below the
          required level). The complete report shows evidence strength for all {jdSkillTotal},
          with full per-bullet detail on your top gaps, plus what to fix first for the
          {' '}{fixableCount} that {fixableCount !== 1 ? 'are' : 'is'} missing or under-leveled.
        </p>
        <a
          href="/pricing"
          className="inline-block px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {fixableCount > 3
            ? `See all ${fixableCount} fixable skills — with what to fix first`
            : 'See the full report — with what to fix first'}
        </a>
      </div>

    </div>
  )
}
