/**
 * BoostSection — Smart affiliate placement component.
 *
 * Two zones:
 *   zone='resume'  → Zone 1: surfaces low-evidence skills from the user's resume
 *   zone='match'   → Zone 2: surfaces prioritised gap skills for the target role
 *
 * Props:
 *   skills    Array from getResumeBoostSkills or getMatchBoostSkills
 *   zone      'resume' | 'match'
 *   jobTitle  string | null — used in match zone header only
 */

import { getAffiliateResources } from '@utils/affiliateLoader.js'
import AffiliateDisclosure from './AffiliateDisclosure.jsx'

const LEVEL_NAMES = [
  '—',
  'Mentioned',
  'Limited evidence',
  'Supported',
  'Strong evidence',
  'Extensive evidence',
]

const PRIORITY_LABELS = {
  1: 'PRIORITY 1 — Fill these gaps',
  2: 'PRIORITY 2 — Strengthen weak evidence',
  3: 'PRIORITY 3 — Deepen strong evidence',
}

/**
 * Returns link className and badge element based on resource.industry_tags.
 * industry_tags may be an array or a string; handles both safely.
 * Defaults to indigo if undefined/null or no recognized tag.
 */
function getResourceDisplay(resource) {
  const tags = resource.industry_tags
  const tagList = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? [tags]
      : []

  if (tagList.includes('career')) {
    return {
      linkClass: 'text-sm text-emerald-600 hover:text-emerald-700 hover:underline',
      badge: (
        <span className="text-xs text-emerald-600 font-medium ml-1">CERT</span>
      ),
    }
  }
  if (tagList.includes('skill')) {
    return {
      linkClass: 'text-sm text-indigo-600 hover:text-indigo-700 hover:underline',
      badge: (
        <span className="text-xs text-indigo-500 font-medium ml-1">COURSE</span>
      ),
    }
  }
  return {
    linkClass: 'text-sm text-indigo-600 hover:underline',
    badge: null,
  }
}

export default function BoostSection({ skills, zone, jobTitle, isPaidUser = false }) {
  if (!isPaidUser) return null
  if (!skills || skills.length === 0) return null

  // Resolve resources for each skill, skip skills with no resources
  const enriched = skills
    .map(skill => ({
      skill,
      resources: getAffiliateResources(skill.skillId, skill.resumeLevel ?? 1, 'tech', skill.name),
    }))
    .filter(({ resources }) => resources.length > 0)

  if (enriched.length === 0) return null

  // Collect all resources across skills for FTC check
  const allResources = enriched.flatMap(({ resources }) => resources)
  const showFTC = allResources.length > 0

  if (zone === 'resume') {
    return (
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">
          BOOST YOUR EVIDENCE
        </div>
        <div className="text-xs text-slate-400 mb-3">
          These skills have weak or no evidence. A project or course raises your score.
        </div>

        {enriched.map(({ skill, resources }) => {
          const levelLabel = typeof skill.resumeLevel === 'number'
            ? `L${skill.resumeLevel} · ${LEVEL_NAMES[skill.resumeLevel] ?? ''}`
            : ''

          return (
            <div key={skill.name} className="mb-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                {levelLabel && (
                  <span className="text-xs text-slate-400">{levelLabel}</span>
                )}
              </div>
              {resources.map(r => {
                const { linkClass, badge } = getResourceDisplay(r)
                return (
                  <div key={r.url} className="flex items-center gap-1 mb-0.5">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {r.title}
                    </a>
                    {badge}
                  </div>
                )
              })}
            </div>
          )
        })}

        {showFTC && (
          <AffiliateDisclosure
            count={allResources.length}
            as="p"
            className="text-xs text-slate-400 italic mt-2"
          />
        )}
      </div>
    )
  }

  // zone === 'match'
  // Group by priority
  const byPriority = {}
  for (const item of enriched) {
    const p = item.skill.priority ?? 1
    if (!byPriority[p]) byPriority[p] = []
    byPriority[p].push(item)
  }
  const priorityKeys = Object.keys(byPriority).map(Number).sort()

  return (
    <div className="mt-6 pt-4 border-t border-slate-100">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">
        BOOST THESE SKILLS FOR THIS ROLE
        {jobTitle && (
          <span className="text-xs text-slate-400 ml-1 normal-case font-normal">
            for {jobTitle}
          </span>
        )}
      </div>

      {priorityKeys.map(p => (
        <div key={p}>
          <div className="text-xs font-semibold text-indigo-600 uppercase mt-3 mb-1">
            {PRIORITY_LABELS[p] ?? `PRIORITY ${p}`}
          </div>
          {byPriority[p].map(({ skill, resources }) => (
            <div key={skill.name} className="mb-3">
              <div className="text-sm font-medium text-slate-800 mb-1">{skill.name}</div>
              {resources.map(r => {
                const { linkClass, badge } = getResourceDisplay(r)
                return (
                  <div key={r.url} className="flex items-center gap-1 mb-0.5">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {r.title}
                    </a>
                    {badge}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}

      {showFTC && (
        <AffiliateDisclosure
          count={allResources.length}
          as="p"
          className="text-xs text-slate-400 italic mt-2"
        />
      )}
    </div>
  )
}
