// AdSlot — renders affiliate resource or EthicalAds unit for free users.
// Paid users see nothing. Affiliate links take priority over ads.

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

  return (
    <div className="mt-4">
      <div className="text-xs text-slate-300 text-right mb-1">
        Ad — free tier
      </div>
      <div
        className="border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-slate-400 text-xs"
        data-ea-publisher="nat20"
        data-ea-type="text"
      >
        {/* EthicalAds unit loads here post-launch */}
        <span className="text-slate-300">Sponsored — ethicalads.io</span>
      </div>
    </div>
  )
}
