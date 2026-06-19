/**
 * RookieResumeView — free-tier resume detection panel.
 *
 * Shows what the parser detected on the user's resume.
 * Philosophy: factual, specific-signal-free, respectful.
 *
 * Product constraints:
 *   - Never show institution names, degree fields-of-study, cert titles,
 *     or employer names.
 *   - Never evaluate whether the resume is "good enough" for any role.
 *   - The respect test: a senior engineer or PhD candidate reading this
 *     should feel respected — not patronized.
 *
 * Props:
 *   liteResults {
 *     topSkills:           { skills: object[], totalDetected: number }
 *     allBehavioralSignals: { name: string, present: boolean }[]
 *     credentialGap:       { degreePresent: boolean, degreeLevel: string|null,
 *                            certCount: number, certPresent: boolean }
 *     sectionsPresent:     string[]
 *   }
 */

export default function RookieResumeView({ liteResults }) {
  if (!liteResults) return null

  const {
    topSkills            = { skills: [], totalDetected: 0 },
    allBehavioralSignals = [],
    credentialGap        = { degreePresent: false, degreeLevel: null, certCount: 0, certPresent: false },
    sectionsPresent      = [],
  } = liteResults

  function credentialSummary() {
    const parts = []

    if (credentialGap.degreePresent) {
      // Show type token only (e.g. "B.S.") — never field-of-study or institution
      const token = credentialGap.degreeLevel ?? 'Degree'
      parts.push(`${token} detected`)
    } else {
      parts.push('No degree detected')
    }

    if (credentialGap.certCount > 0) {
      parts.push(`${credentialGap.certCount} certification${credentialGap.certCount !== 1 ? 's' : ''} detected`)
    } else {
      parts.push('No certifications detected')
    }

    return parts.join(' · ')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="text-sm text-slate-600">
        Here&rsquo;s what we detected on your resume.
      </div>

      {/* Detected skills */}
      {topSkills.skills.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="resume-detected-skills"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Detected skills
          </div>
          <ul className="space-y-1">
            {topSkills.skills.slice(0, 5).map((skill, i) => (
              <li key={skill.name ?? i} className="text-sm text-slate-800 font-medium">
                {skill.name}
              </li>
            ))}
          </ul>
          {topSkills.totalDetected > 5 && (
            <div className="text-xs text-slate-400 mt-3">
              + {topSkills.totalDetected - 5} more detected
            </div>
          )}
        </div>
      )}

      {/* Behavioral signals */}
      {allBehavioralSignals.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="resume-behavioral-signals"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Behavioral signals
          </div>
          <ul className="space-y-1">
            {allBehavioralSignals.map((signal, i) => (
              <li
                key={signal.name ?? i}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={signal.present
                    ? 'text-emerald-600 font-semibold'
                    : 'text-slate-400'
                  }
                  aria-label={signal.present ? 'present' : 'not found'}
                >
                  {signal.present ? '●' : '○'}
                </span>
                <span className={signal.present ? 'text-slate-800' : 'text-slate-500'}>
                  {signal.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Credentials */}
      <div
        className="rounded-lg border border-slate-200 bg-white p-5"
        data-testid="resume-credentials"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Credentials
        </div>
        <p className="text-sm text-slate-700">
          {credentialSummary()}
        </p>
      </div>

      {/* Sections detected */}
      {sectionsPresent.length > 0 && (
        <div
          className="rounded-lg border border-slate-200 bg-white p-5"
          data-testid="resume-sections-present"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Sections detected
          </div>
          <p className="text-sm text-slate-700">
            {sectionsPresent.join(', ')}
          </p>
        </div>
      )}

      {/* Navigation hint */}
      <div
        className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-center"
        data-testid="resume-upgrade-hint"
      >
        <p className="text-sm text-indigo-800">
          See how this reads against a real job — open the Match tab.
        </p>
      </div>

    </div>
  )
}
