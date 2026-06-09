import { getAffiliateResources } from '@utils/affiliateLoader.js'

// Deprecated — use getAffiliateResources() from affiliateLoader.js directly.
// TODO: remove this file in Phase F cleanup.
export function getResources(skillId, level, industryTag) {
  return getAffiliateResources(skillId, level, industryTag)
}
