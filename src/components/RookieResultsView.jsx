/**
 * RookieResultsView — free-tier (Rookie) output panel.
 *
 * Renders a compressed-but-true version of the gap report.
 * Philosophy: generous-with-mystery. Show shape and existence.
 * Withhold only specifics. No blur, no locks, no fake walls.
 *
 * Props:
 *   liteResults {
 *     topSkills:        { skills: object[], totalDetected: number }
 *     closestGap:       object | null
 *     missingBehavioral: object[]
 *     credentialGap:    { degreePresent: boolean, certPresent: boolean }
 *     teaserCounts:     { lowMatchCount: number, criticalGapCount: number,
 *                         lowMatchTeaser?: string, criticalTeaser?: string }
 *     matchScore:       number
 *   }
 */

const LEVEL_NAMES = {
  1: 'Awareness',
  2: 'Limited',
  3: 'Supported',
  4: 'Strong',
  5: 'Expert',
}

export default function RookieResultsView({ liteResults }) {
  if (!liteResults) return null

  const {
    topSkills       = { skills: [], totalDetected: 0 },
    closestGap      = null,
    missingBehavioral = [],
    credentialGap   = { degreePresent: true, certPresent: true },
    teaserCounts    = { lowMatchCount: 0, criticalGapCount: 0 },
    matchScore      = 0,
  } = liteResults

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

      {/* 1. Match score */}
      <div
        className="rounded-lg border border-slate-200 bg-white p-5"
        data-testid="match-score-section"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
          Match score
        </div>
        <div className="text-4xl font-bold text-slate-900" data-testid="match-score-value">
          {matchScore}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Based on how your resume reads today — not your actual ability.
        </div>
      </div>

      {/* 2. Top skills */}
      {topSkills.skills.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="top-skills-section"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Your strongest signals
          </div>
          <ul className="space-y-2">
            {topSkills.skills.slice(0, 5).map((skill, i) => (
              <li
                key={skill.name ?? i}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-slate-800">{skill.name}</span>
                <span className="text-xs text-emerald-600 font-semibold">
                  L{skill.level} · {LEVEL_NAMES[skill.level] ?? ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-slate-400 mt-3">
            {topSkills.skills.length} of {topSkills.totalDetected} detected
          </div>
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
              {typeof closestGap.gapSize === 'number'
                ? `${closestGap.gapSize} level${closestGap.gapSize !== 1 ? 's' : ''} away`
                : 'Gap detected'}
            </span>
          </div>
          <div className="text-xs text-amber-600 mt-1">
            This is the skill where a small resume edit would move the needle most.
          </div>
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
