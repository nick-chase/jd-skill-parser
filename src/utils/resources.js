import resourceData from '@data/resources.json'
import { getAffiliateResources } from '@utils/affiliateLoader.js'

// TODO: Grammarly trigger on low-Bloom verb skills (Phase E)

const RESOURCE_MAP = resourceData.resources

/**
 * @deprecated Use getAffiliateResources() from affiliateLoader.js for new code.
 *
 * Returns up to 3 resources for a skill, filtered by level and industry tag.
 * Free resources from resources.json come first, followed by any matching
 * affiliate resources from the affiliate plugin system.
 *
 * Kept for backward compatibility — SkillRow.jsx and legacy callers may still
 * use this signature. New callers should use getAffiliateResources() directly.
 *
 * @param {string} skillId     - Matches keys in data/resources.json (e.g. "python")
 * @param {number} level       - User's current proficiency level (1–5)
 * @param {string} industryTag - Filter by industry (default: 'tech')
 * @returns {Array}            - Up to 3 resource objects; empty array if no match
 */
export function getResources(skillId, level = 1, industryTag = 'tech') {
    const entries = RESOURCE_MAP[skillId]

    // Gather free resources from legacy resources.json
    const legacyFree = []
    const legacyPaid = []
    if (entries && entries.length > 0) {
        const filtered = entries.filter(r => {
            const levelOk = (r.level_min == null || level >= r.level_min) &&
                            (r.level_max == null || level <= r.level_max)
            const tagOk   = !r.industry_tags || r.industry_tags.includes(industryTag)
            return levelOk && tagOk
        })
        for (const r of filtered) {
            if (r.affiliate) legacyPaid.push(r)
            else legacyFree.push(r)
        }
    }

    // Gather affiliate resources from the plugin system
    // Map affiliate resources to the shape ResourceLink expects
    const affiliateResources = getAffiliateResources(skillId, level, industryTag)
        .map(r => ({
            title:        r.title,
            url:          r.url,
            platform:     r.program,
            type:         r.type,
            affiliate:    true,
            level_min:    r.level_min,
            level_max:    r.level_max,
            industry_tags: r.industry_tags,
        }))

    // Free first, then affiliate (legacy paid suppressed when affiliate present)
    const sorted = affiliateResources.length > 0
        ? [...legacyFree, ...affiliateResources]
        : [...legacyFree, ...legacyPaid]

    return sorted.slice(0, 3)
}
