import AffiliateDisclosure from './AffiliateDisclosure.jsx'

/**
 * ResourceLink — renders a small "Resources" block for a gap or missing skill.
 *
 * Props:
 *   resources  array of { title, url, platform, type, affiliate }
 *              pass an empty array or omit to render nothing
 */
export default function ResourceLink({ resources }) {
  if (!resources || resources.length === 0) return null

  const hasAffiliate = resources.some(r => r.affiliate)
  const affiliateCount = resources.filter(r => r.affiliate).length

  return (
    <div style={{ padding: '0 16px 8px 28px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginRight: '2px' }}>
          To improve:
        </span>
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize:        '11px',
              color:           r.affiliate ? '#7c3aed' : '#2563eb',
              textDecoration:  'none',
              backgroundColor: r.affiliate ? '#f5f3ff' : '#eff6ff',
              border:          `1px solid ${r.affiliate ? '#ddd6fe' : '#bfdbfe'}`,
              borderRadius:    '4px',
              padding:         '2px 7px',
            }}
          >
            {r.title}
            {r.platform && (
              <span style={{ marginLeft: '4px', opacity: 0.6 }}>· {r.platform}</span>
            )}
          </a>
        ))}
      </div>
      {hasAffiliate && (
        <AffiliateDisclosure
          count={affiliateCount}
          style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}
        />
      )}
    </div>
  )
}
