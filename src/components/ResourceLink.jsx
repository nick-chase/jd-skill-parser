/**
 * ResourceLink — renders a small "Resources" block for a gap or missing skill.
 *
 * Props:
 *   resources  array of { title, url, platform, type, affiliate }
 *              pass an empty array or omit to render nothing
 */
export default function ResourceLink({ resources }) {
  if (!resources || resources.length === 0) return null

  return (
    <div style={{
      padding:    '0 16px 8px 28px',
      display:    'flex',
      flexWrap:   'wrap',
      gap:        '6px',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginRight: '2px' }}>
        Resources:
      </span>
      {resources.map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize:        '11px',
            color:           '#2563eb',
            textDecoration:  'none',
            backgroundColor: '#eff6ff',
            border:          '1px solid #bfdbfe',
            borderRadius:    '4px',
            padding:         '2px 7px',
          }}
        >
          {r.title}
        </a>
      ))}
      {/* affiliate disclosure goes here */}
    </div>
  )
}
