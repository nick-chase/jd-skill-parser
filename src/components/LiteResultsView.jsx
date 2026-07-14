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
 *     missingBehavioral: object[]
 *     teaserCounts:      { lowMatchCount: number, criticalGapCount: number,
 *                          lowMatchTeaser?: string, criticalTeaser?: string }
 *     matchedCount:      number
 *     missingCount:      number
 *     levelGapsCount:    number
 *   }
 *   duties  string[]   — JD duty bullets from results.jobDuties
 */

import { getMatchScoreLabel, LEVEL_NAMES, EVIDENCE_BANDS } from '../jd-skill-parser.jsx'
import { getAffiliateResources } from '@utils/affiliateLoader.js'
import { nameToResourceId } from '@utils/constants.js'
import AffiliateDisclosure from './AffiliateDisclosure.jsx'

// Compact duration formatter — mirrors formatDuration() in jd-skill-parser.jsx.
// Not imported directly since that function is module-private there.
function formatDurationCompact(months) {
  if (months == null) return null
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  if (yrs >= 1 && mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`
  if (yrs >= 1) return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo`
  return `${months} mo`
}

// Compact evidence line for the closest-gap card — mirrors evidenceSummary()
// in jd-skill-parser.jsx, scaled to Lite's single-card visual weight.
function closestGapEvidenceLine(skill) {
  if (skill.source === 'Technical Skills' || skill.source === 'Summary') {
    return 'listed only'
  }
  const parts = []
  const dur = formatDurationCompact(skill.durationMonths)
  parts.push(dur ?? 'no duration stated')
  const count = skill.contextCount ?? 1
  if (count >= 3) parts.push('3+ contexts')
  else if (count >= 2) parts.push('2 contexts')
  return parts.join(' · ')
}

// Small confidence indicator dot — mirrors ConfidenceDot in jd-skill-parser.jsx.
function ConfidenceDotInline({ confidence }) {
  const color = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#94a3b8'
  return <span style={{ color, fontSize: '10px', marginLeft: '4px', lineHeight: 1 }}>●</span>
}

// Level label lookup — mirrors resumeLabel/jdLabel derivation in GapAnalysisView (jd-skill-parser.jsx).
function levelLabel(level) {
  if (!level) return 'Not evidenced'
  return LEVEL_NAMES[level] ?? `L${level}`
}

// Maps a resume evidence level to its strength band label — reuses Pro's EVIDENCE_BANDS
// so Lite and Pro agree on what "Limited" vs "Strong" evidence means.
function evidenceBandLabel(level) {
  if (!level) return 'No evidence'
  const band = EVIDENCE_BANDS.find(b => b.levels.includes(level))
  return band ? band.label : `L${level}`
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
            <span>You: {levelLabel(closestGap.resumeLevel)}</span>
            {closestGap.confidence && <ConfidenceDotInline confidence={closestGap.confidence} />}
            <span>→ Role needs: {levelLabel(closestGap.level)}</span>
          </div>
          <div className="text-xs text-amber-700 mt-1">
            {closestGapEvidenceLine(closestGap)} reads as {evidenceBandLabel(closestGap.resumeLevel)}
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
            if (!resource) return null
            return (
              <>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs mt-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition"
                >
                  <span>📚</span>
                  <span className="font-medium">{resource.title}</span>
                  <span className="text-[10px] text-indigo-400 ml-auto">
                    {resource.platform} · affiliate
                  </span>
                </a>
                <AffiliateDisclosure
                  count={1}
                  className="text-[10px] text-slate-400 mt-1"
                />
              </>
            )
          })()}
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
