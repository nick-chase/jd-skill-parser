// Shared display constants — import from here, do not redefine

export const LEVEL_NAMES = ['—', 'Mentioned', 'Limited evidence', 'Supported', 'Strong evidence', 'Extensive evidence'];

export const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical'];

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
