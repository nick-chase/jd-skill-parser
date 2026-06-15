// AdSlot — renders affiliate resource for free users, or an "in development" placeholder.
// Paid users see nothing. Affiliate links take priority.

export default function AdSlot({ isPaid, skillId = null, resources = [] }) {
  if (isPaid) return null

  const affiliateResource = resources.find(
    r => r.skill_id === skillId && r.affiliate === true
  )

  if (affiliateResource) {
    return (
      <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 mt-4">
        <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
          <span>Recommended resource</span>
          <span className="text-slate-300">Affiliate link — supports Nat20</span>
        </div>
        <a
          href={affiliateResource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 group"
        >
          <div>
            <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition">
              {affiliateResource.title}
            </div>
            <div className="text-xs text-slate-400">{affiliateResource.platform}</div>
          </div>
          <span className="ml-auto text-xs text-indigo-500 group-hover:text-indigo-700">
            View →
          </span>
        </a>
      </div>
    )
  }

  return null
}
