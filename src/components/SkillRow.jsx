/**
 * SkillRow — one row in the Missing Skills or Level Gaps panel.
 *
 * Props:
 *   skill      { name, category, level, importance, resumeLevel? }
 *   variant    'missing' | 'gap' | 'matched'
 *   isLast     boolean — omits bottom border on last row
 *   idx        row index — used for alternating background
 */

import ResourceLink from './ResourceLink.jsx'
import { getResources } from '@utils/resources.js'

function nameToResourceId(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[/\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const LEVEL_NAMES  = ['—', 'Mentioned', 'Limited evidence', 'Supported', 'Strong evidence', 'Extensive evidence']

const LEVEL_TIPS = [
  '',
  'L1 Mentioned — skill appears on resume with no supporting context.',
  'L2 Limited evidence — skill backed by coursework, short project, or brief mention.',
  'L3 Supported — skill backed by project work or internship context.',
  'L4 Strong evidence — skill backed by sustained job history or multiple contexts.',
  'L5 Extensive evidence — skill backed by multi-year professional history across roles.',
]

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
  if (resumeLevel <= 1) {
    return `Your resume lists ${name} but shows no context. ` +
      `If you have used it professionally or in a project, describe where, ` +
      `how long, and what you accomplished. If you are still learning, ` +
      `a documented hands-on project will build the evidence your resume needs.`
  }
  if (resumeLevel === 2) {
    return `You have some ${name} experience showing on your resume. ` +
      `Add a duration, a specific outcome, and a scale detail to push this higher.`
  }
  if (resumeLevel >= 3) {
    return `Your ${name} evidence is solid. ` +
      `Add an ownership or leadership signal — led, architected, owned — ` +
      `with a measurable outcome to close this gap.`
  }
  return `Add duration and a specific outcome to your ${name} experience to close the one-level gap.`
}

export default function SkillRow({ skill, variant, isLast, idx }) {
  const isOdd     = idx % 2 !== 0
  const isGap     = variant === 'gap'
  const isMissing = variant === 'missing'
  const isMatched = variant === 'matched'

  // TODO: Huntr placement at bottom of results page (Phase E)
  const skillLevel     = isMissing ? 1 : (skill.resumeLevel ?? 1)
  const showResources  = isMissing || (isGap && (skill.resumeLevel ?? 0) <= 2)
  const skillResources = showResources
    ? getResources(nameToResourceId(skill.name), skillLevel)
    : []

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

  const isLimitedEvidence =
    (isMatched && typeof skill.level === 'number' && skill.level <= 2) ||
    (isGap && typeof skill.resumeLevel === 'number' && skill.resumeLevel <= 2) ||
    skill.confidence === 'low'

  // Evidence explanation line — shown for matched and gap rows only
  const evidenceLine = (isMatched || isGap) && skill.confidence && skill.source
    ? isLimitedEvidence && skill.primarySignal
      ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap', marginTop: '3px' }}>
          <span style={{ fontSize: '11px', color: '#b45309', fontStyle: 'italic' }}>
            {skill.primarySignal}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {skill.source}
          </span>
        </div>
      )
      : (
        <div className="text-xs text-gray-400 mt-0.5">
          ({skill.confidence.toLowerCase()} confidence: {skill.source})
        </div>
      )
    : null

  // Level cell text
  let levelCell
  if (isMatched) {
    const resumeDisplay = skill.resumeLevel === 'certified'
      ? 'Certified'
      : `L${skill.resumeLevel} · ${LEVEL_NAMES[skill.resumeLevel]}`
    const tip = skill.resumeLevel === 'certified' ? '' : (LEVEL_TIPS[skill.resumeLevel] ?? '')
    levelCell = (
      <div style={{ fontSize: '12px', color: '#059669' }} title={tip || undefined}>
        Your {resumeDisplay}{confidenceSuffix}
        {evidenceLine}
        <span className="text-xs text-slate-400 block mt-0.5">resume evidence strength</span>
      </div>
    )
  } else if (isGap) {
    const tip = `${LEVEL_TIPS[skill.resumeLevel] ?? ''} → ${LEVEL_TIPS[skill.level] ?? ''}`.trim().replace(/^ → /, '')
    levelCell = (
      <div style={{ fontSize: '12px', color: '#d97706' }} title={tip || undefined}>
        Your L{skill.resumeLevel} → Need L{skill.level}{confidenceSuffix}
        {evidenceLine}
        <span className="text-xs text-slate-400 block mt-0.5">resume evidence strength</span>
      </div>
    )
  } else {
    const tip = LEVEL_TIPS[skill.level] ?? ''
    levelCell = (
      <div style={{ fontSize: '12px', color: '#475569' }} title={tip || undefined}>
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
          padding:    '0 16px 4px 16px',
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

      <ResourceLink resources={skillResources} />
    </div>
  )
}
