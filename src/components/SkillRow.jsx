/**
 * SkillRow — one row in the Missing Skills or Level Gaps panel.
 *
 * Props:
 *   skill      { name, category, level, importance, resumeLevel? }
 *   variant    'missing' | 'gap' | 'matched'
 *   isLast     boolean — omits bottom border on last row
 *   idx        row index — used for alternating background
 */

const LEVEL_NAMES  = ['—', 'Awareness', 'Novice', 'Intermediate', 'Advanced', 'Expert']

const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical']

const IMPORTANCE_STYLES = {
  5: { bg: '#fff1f2', text: '#be123c',  border: '#fda4af' },
  4: { bg: '#fffbeb', text: '#92400e',  border: '#fcd34d' },
  3: { bg: '#eff6ff', text: '#1e40af',  border: '#bfdbfe' },
  2: { bg: '#f8fafc', text: '#475569',  border: '#cbd5e1' },
  1: { bg: '#f8fafc', text: '#94a3b8',  border: '#e2e8f0' },
}

function ImportanceBadge({ importance }) {
  const style = IMPORTANCE_STYLES[importance] ?? IMPORTANCE_STYLES[1]
  return (
    <span style={{
      fontSize:        '11px',
      padding:         '2px 8px',
      borderRadius:    '4px',
      border:          `1px solid ${style.border}`,
      backgroundColor: style.bg,
      color:           style.text,
      fontWeight:      '600',
    }}>
      {IMPORTANCE_NAMES[importance] ?? '—'}
    </span>
  )
}

// Generate a specific action string for a missing skill.
function missingSuggestion(name) {
  return `Build a project or complete a course using ${name} and add it to your Projects section with a clear outcome.`
}

// Generate a specific action string for a level-gap skill.
function gapSuggestion(name, resumeLevel, requiredLevel) {
  if (resumeLevel === 0) {
    return `Add ${name} to a project or experience description so it appears with real context, not just in your skills list.`
  }
  if (requiredLevel - resumeLevel >= 2) {
    return `Your ${name} evidence is at ${LEVEL_NAMES[resumeLevel]} — the role expects ${LEVEL_NAMES[requiredLevel]}. Use ${name} in a 3+ month project and document the outcome.`
  }
  return `Add duration and a specific outcome to your ${name} experience to close the one-level gap.`
}

export default function SkillRow({ skill, variant, isLast, idx }) {
  const isOdd     = idx % 2 !== 0
  const isGap     = variant === 'gap'
  const isMissing = variant === 'missing'
  const isMatched = variant === 'matched'

  // Row-level background tints
  const rowBg = isOdd
    ? (isMissing ? '#fff5f5' : isGap ? '#fffbeb' : '#f0fdf4')
    : 'white'

  const suggestion = isMissing
    ? missingSuggestion(skill.name)
    : isGap
      ? gapSuggestion(skill.name, skill.resumeLevel ?? 0, skill.level)
      : null

  const confidenceSuffix = skill.confidence
    ? <span style={{ color: '#94a3b8', fontWeight: '400' }}> ({skill.confidence} confidence)</span>
    : null

  // Level cell text
  let levelCell
  if (isMatched) {
    levelCell = (
      <div style={{ fontSize: '12px', color: '#059669' }}>
        Your L{skill.resumeLevel} · {LEVEL_NAMES[skill.resumeLevel]}{confidenceSuffix}
      </div>
    )
  } else if (isGap) {
    levelCell = (
      <div style={{ fontSize: '12px', color: '#d97706' }}>
        Your L{skill.resumeLevel} → Need L{skill.level}{confidenceSuffix}
      </div>
    )
  } else {
    levelCell = (
      <div style={{ fontSize: '12px', color: '#475569' }}>
        Required: L{skill.level}
      </div>
    )
  }

  return (
    <div
      style={{
        borderBottom:    isLast ? 'none' : '1px solid #f1f5f9',
        backgroundColor: rowBg,
      }}
    >
      {/* Main data row */}
      <div style={{
        padding:             '8px 16px',
        display:             'grid',
        gridTemplateColumns: '140px 1fr 160px 110px',
        gap:                 '8px',
        alignItems:          'center',
      }}>
        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>
          {skill.name}
        </div>
        <div style={{ fontSize: '12px', color: '#475569' }}>
          {skill.category}
        </div>
        {levelCell}
        <div>
          <ImportanceBadge importance={skill.importance} />
        </div>
      </div>

      {/* Suggestion line — missing and gap rows only */}
      {suggestion && (
        <div style={{
          padding:    '0 16px 8px 16px',
          fontSize:   '11px',
          color:      isGap ? '#92400e' : '#991b1b',
          lineHeight: '1.5',
          display:    'flex',
          gap:        '6px',
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0, fontWeight: '700' }}>→</span>
          <span>{suggestion}</span>
        </div>
      )}
    </div>
  )
}
