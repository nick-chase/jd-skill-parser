// Shared display constants — import from here, do not redefine

export const LEVEL_NAMES = ['—', 'Mentioned', 'Limited evidence', 'Supported', 'Strong evidence', 'Extensive evidence'];

export const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical'];

/** Single source of truth for evidence level → strength band. Used by GapAnalysisView and LiteResultsView. */
export const EVIDENCE_BANDS = [
  { key: 'strong',    label: 'Strong Evidence',  levels: [4, 5], color: 'text-emerald-700' },
  { key: 'supported', label: 'Supported',         levels: [3],    color: 'text-blue-700'   },
  { key: 'limited',   label: 'Limited Evidence',  levels: [2],    color: 'text-amber-700'  },
  { key: 'mentioned', label: 'Mentioned',         levels: [1],    color: 'text-slate-400'  },
];

/** Single source of truth for matchScore → label. Used by GapAnalysisView and LiteResultsView. */
export function getMatchScoreLabel(score) {
  if (score >= 70) return 'Strong Match';
  if (score >= 40) return 'Moderate Match';
  return 'Weak Match';
}

// Compact duration formatter — shared by GapAnalysisView (jd-skill-parser.jsx) and LiteResultsView.
export function formatDuration(months) {
  if (months == null) return null;
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  if (yrs >= 1 && mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`;
  if (yrs >= 1) return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo`;
  return `${months} mo`;
}

// Compact evidence line ("2 mo · 2 contexts" / "listed only") — shared by GapAnalysisView
// (jd-skill-parser.jsx) and LiteResultsView.
export function evidenceSummary(skill) {
  const isListedOnly = skill.source === 'Technical Skills' || skill.source === 'Summary';
  if (isListedOnly) return 'listed only';
  const parts = [];
  const dur = formatDuration(skill.durationMonths);
  parts.push(dur ?? 'no duration stated');
  const count = skill.contextCount ?? 1;
  if (count >= 3) parts.push('3+ contexts');
  else if (count >= 2) parts.push('2 contexts');
  return parts.join(' · ');
}

// Canonical skill-name → resource-id slug converter.
// Single source of truth — used by jd-skill-parser.jsx and SkillRow.jsx.
export function nameToResourceId(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[/\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
