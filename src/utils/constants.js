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

// Level-gap remediation copy — single source of truth for both tiers.
// evidence: { durationMonths, contextCount } — actual evidence facts already
// computed by the inference layer. Copy must cite these numbers, never a
// generic "no context" phrase when evidence exists.
// Used by GapAnalysisView (jd-skill-parser.jsx), SkillRow.jsx, and LiteResultsView.
export function gapSuggestion(name, resumeLevel, requiredLevel, evidence = {}) {
  const { durationMonths, contextCount } = evidence;
  const dur   = formatDuration(durationMonths);
  const count = contextCount ?? 1;

  // State 4 — real evidence (Supported+) but still below the level this role wants.
  if (resumeLevel >= 3) {
    return `Your ${name} evidence is solid, but this role wants deeper experience than ` +
      `your resume currently shows. If you have more depth — ownership, scale, or a ` +
      `longer timeline — add it.`;
  }

  // State 3 — multiple contexts already on the resume.
  if (count >= 2) {
    return `Your resume shows ${name} in ${count} places. ` +
      `Add what you built and a measurable outcome in at least one of them to strengthen this evidence.`;
  }

  // State 2 — a duration is known for a single context.
  if (dur) {
    return `Your resume shows ${dur} of ${name} experience in one place. ` +
      `Say where it was used and what you accomplished to strengthen this evidence.`;
  }

  // State 1 — no duration, no additional context: skills-list mention only.
  return `Your resume lists ${name} in your skills list and nowhere else. ` +
    `Add a bullet under a job or project describing how you used it and for how long.`;
}

// Returns true when the evidence gate for showing a course/affiliate link is
// met: L1-L2 with no meaningful duration or multi-context evidence yet
// (skills-list-only / coursework-only / no-duration). Once duration and/or
// multiple contexts exist, the honest fix is editing existing resume content,
// not learning something new — so links are suppressed.
// Does not apply to the Missing-from-Resume path (missingSuggestion) — that
// path always shows links regardless of this gate.
export function shouldShowGapResource(skill) {
  const resumeLevel = skill.resumeLevel ?? 0;
  if (resumeLevel > 2) return false;
  const hasDuration = skill.durationMonths != null;
  const hasMultiContext = (skill.contextCount ?? 1) >= 2;
  return !hasDuration && !hasMultiContext;
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
