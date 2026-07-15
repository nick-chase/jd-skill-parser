/**
 * AffiliateDisclosure — shared FTC-style disclosure sentence for affiliate links.
 *
 * Wording is scope-accurate to the number of affiliate links visible at the
 * call site: a single-link card ("Focus here first", "Closest gap") must not
 * claim "all links on this page" when there is only one link in that card.
 *
 * Props:
 *   count      number of affiliate links being disclosed in this context.
 *              1 → singular wording ("This link is an affiliate link").
 *              anything else (0, 2+, omitted) → plural/page-scope wording,
 *              matching the original copy this component was extracted from.
 *   as         tag to render — 'div' (default) or 'p', to match each call
 *              site's existing markup.
 *   className  Tailwind classes for the call site's existing look.
 *   style      inline style object for call sites still using inline styles.
 */
export default function AffiliateDisclosure({ count = 2, as: Tag = 'div', className = '', style }) {
  const text = count === 1
    ? 'This link is an affiliate link. If you enroll through it, we earn a small commission — it costs you nothing extra.'
    : 'All links on this page are affiliate links. If you enroll through our link, we earn a small commission — it costs you nothing extra.'

  return (
    <Tag className={className} style={style}>
      {text}
    </Tag>
  )
}
