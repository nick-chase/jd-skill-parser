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
 *     closestGap:        object | null
 *     missingSpread:     { skills: object[], totalMissing: number, moreCount: number } | null
 *     missingBehavioral: object[]
 *     teaserCounts:      { lowMatchCount: number, criticalGapCount: number,
 *                          lowMatchTeaser?: string, criticalTeaser?: string }
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
    closestGap        = null,
    missingSpread     = null,
    missingBehavioral = [],
    teaserCounts      = { lowMatchCount: 0, criticalGapCount: 0 },
    matchedCount      = 0,
    missingCount      = 0,
    levelGapsCount    = 0,
  } = liteMatch ?? {}

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

      {/* 3. Closest gap */}
      {closestGap && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-5"
          data-testid="closest-gap-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
            Closest gap
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">{closestGap.name}</span>
            <span className="text-xs text-amber-700 font-semibold">
              {typeof closestGap.gap === 'number'
                ? `${closestGap.gap} level${closestGap.gap !== 1 ? 's' : ''} away`
                : 'Gap detected'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-700 mt-1">
            <span>You: {levelLabel(closestGap.resumeLevel)} ({closestGapEvidenceLine(closestGap)})</span>
            {closestGap.confidence && <ConfidenceDotInline confidence={closestGap.confidence} />}
            <span>→ Role needs: {levelLabel(closestGap.level)}</span>
          </div>
          <div className="text-xs text-amber-600 mt-1">
            This is the skill where a small resume edit would move the needle most.
          </div>
          {(() => {
            const resource = getAffiliateResources(
              nameToResourceId(closestGap.name),
              closestGap.resumeLevel ?? 1,
              'tech',
              closestGap.name
            )[0] ?? null
            return <GapResourceLink resource={resource} />
          })()}
        </div>
      )}

      {/* 3b. Requirement spread — fallback when no single level-gap skill exists to anchor
             the Closest gap card. Shows up to one missing skill per required-level tier
             (low/mid/high), picked by earliest JD mention (jdOrder), not importance. */}
      {!closestGap && missingSpread && missingSpread.skills.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-5"
          data-testid="requirement-spread-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
            Requirement spread
          </div>
          <div className="text-xs text-amber-700 mb-3">
            This role asks for skills across a range of levels. Here's part of what your resume doesn't show yet.
          </div>
          <ul className="space-y-1.5">
            {missingSpread.skills.map((skill, i) => (
              <li
                key={skill.name ?? i}
                className="flex items-center justify-between text-sm"
                data-testid="requirement-spread-item"
              >
                <span className="font-medium text-slate-800">{skill.name}</span>
                <span className="text-xs text-amber-700 font-semibold">
                  Role needs: {levelLabel(skill.level)}
                </span>
              </li>
            ))}
          </ul>
          {missingSpread.moreCount > 0 && (
            <div className="text-xs text-amber-600 mt-2" data-testid="requirement-spread-more">
              ...and {missingSpread.moreCount} more
            </div>
          )}
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
        <p className="text-xs text-indigo-700 mb-4">
          The complete report shows all {topSkills.totalDetected > 5
            ? topSkills.totalDetected
            : 'matched'} skills with per-bullet context, evidence strength, and
          what to add or reframe to close each gap before your next application.
        </p>
        <a
          href="/pricing"
          className="inline-block px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Get the full report — closer to your next offer
        </a>
      </div>

    </div>
  )
}
