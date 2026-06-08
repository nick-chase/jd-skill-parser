import resourceData from '@data/resources.json'

// TODO: Grammarly trigger on low-Bloom verb skills (Phase E)

const RESOURCE_MAP = resourceData.resources

/**
 * Returns up to 3 resources for a skill, filtered by level and industry tag.
 * Free resources are returned before paid/affiliate resources.
 *
 * @param {string} skillId     - Matches keys in data/resources.json (e.g. "python")
 * @param {number} level       - User's current proficiency level (1–5)
 * @param {string} industryTag - Filter by industry (default: 'tech')
 * @returns {Array}            - Up to 3 resource objects; empty array if no match
 */
export function getResources(skillId, level = 1, industryTag = 'tech') {
    const entries = RESOURCE_MAP[skillId]
    if (!entries || entries.length === 0) return []

    const filtered = entries.filter(r => {
        const levelOk = (r.level_min == null || level >= r.level_min) &&
                        (r.level_max == null || level <= r.level_max)
        const tagOk   = !r.industry_tags || r.industry_tags.includes(industryTag)
        return levelOk && tagOk
    })

    // Free resources first, then paid/affiliate
    const sorted = [
        ...filtered.filter(r => !r.affiliate),
        ...filtered.filter(r => r.affiliate),
    ]

    return sorted.slice(0, 3)
}
