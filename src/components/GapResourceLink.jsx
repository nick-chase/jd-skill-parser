import AffiliateDisclosure from './AffiliateDisclosure.jsx'

/**
 * GapResourceLink — single-resource "learn this" link, used on the
 * closest-gap / focus-zone gap cards.
 * Shared by GapAnalysisView (jd-skill-parser.jsx) and LiteResultsView.
 *
 * Props:
 *   resource        { title, url, platform } | null — renders nothing when null
 *   showDisclosure  boolean, default true — set false when the parent section
 *                   already renders one consolidated AffiliateDisclosure for
 *                   the whole list of cards, to avoid repeating it per card.
 */
export default function GapResourceLink({ resource, showDisclosure = true }) {
  if (!resource) return null

  return (
    <div className="space-y-1">
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
      {showDisclosure && (
        <AffiliateDisclosure
          count={1}
          className="text-[10px] text-slate-400 mt-1"
        />
      )}
    </div>
  )
}
