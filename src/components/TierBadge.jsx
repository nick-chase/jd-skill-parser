/**
 * TierBadge — renders a pill showing the user's current tier.
 *
 * Props:
 *   isPaidStatus {boolean} — true = Pro user, false = Lite (free) user
 *
 * Visual style: amber pill matching the tier indicator in the header area of jd-skill-parser.jsx.
 */
export default function TierBadge({ isPaidStatus }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 tracking-wide">
      {isPaidStatus ? 'Pro' : 'Lite'}
    </span>
  )
}
