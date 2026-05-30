/**
 * DecisionCard — renders the top-level hiring decision on the Match tab.
 *
 * Props:
 *   decisionResult  { decision, rationale, actions, matchScore }
 *                   from getDecision() in src/lib/parser/decision.js
 */

const DECISION_CONFIG = {
  apply: {
    label:      'Apply Now',
    bg:         '#f0fdf4',
    border:     '#86efac',
    badgeBg:    '#059669',
    badgeText:  '#ffffff',
    textColor:  '#14532d',
    accentColor:'#059669',
  },
  edits: {
    label:      'Apply With Edits',
    bg:         '#fffbeb',
    border:     '#fcd34d',
    badgeBg:    '#d97706',
    badgeText:  '#ffffff',
    textColor:  '#78350f',
    accentColor:'#d97706',
  },
  build: {
    label:      'Build Skill First',
    bg:         '#fff1f2',
    border:     '#fda4af',
    badgeBg:    '#dc2626',
    badgeText:  '#ffffff',
    textColor:  '#881337',
    accentColor:'#dc2626',
  },
  redirect: {
    label:      'Consider Adjacent Role',
    bg:         '#faf5ff',
    border:     '#d8b4fe',
    badgeBg:    '#7c3aed',
    badgeText:  '#ffffff',
    textColor:  '#3b0764',
    accentColor:'#7c3aed',
  },
}

export default function DecisionCard({ decisionResult }) {
  if (!decisionResult) return null

  const { decision, rationale, actions, matchScore } = decisionResult
  const cfg = DECISION_CONFIG[decision] ?? DECISION_CONFIG.edits

  return (
    <div
      style={{
        backgroundColor: cfg.bg,
        border:          `1px solid ${cfg.border}`,
        borderRadius:    '10px',
        padding:         '20px 24px',
        display:         'flex',
        flexDirection:   'column',
        gap:             '14px',
      }}
    >
      {/* Header row: badge + match score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span
          style={{
            display:         'inline-block',
            backgroundColor: cfg.badgeBg,
            color:           cfg.badgeText,
            fontWeight:      '700',
            fontSize:        '13px',
            letterSpacing:   '0.03em',
            padding:         '5px 14px',
            borderRadius:    '20px',
          }}
        >
          {cfg.label}
        </span>
        <span style={{ fontSize: '13px', color: cfg.textColor, fontWeight: '500' }}>
          {matchScore}% skills matched
        </span>
      </div>

      {/* Rationale */}
      <p style={{ fontSize: '14px', color: cfg.textColor, lineHeight: '1.6', margin: 0 }}>
        {rationale}
      </p>

      {/* Action items */}
      {actions.length > 0 && (
        <div>
          <div
            style={{
              fontSize:      '11px',
              fontWeight:    '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color:         cfg.accentColor,
              marginBottom:  '8px',
            }}
          >
            Next steps
          </div>
          <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {actions.map((action, i) => (
              <li key={i} style={{ fontSize: '13px', color: cfg.textColor, lineHeight: '1.5' }}>
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
