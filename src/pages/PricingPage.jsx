import { Link } from 'react-router-dom'

export default function PricingPage() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="text-2xl">⚔️</div>
      <div className="text-xl font-bold text-slate-800">Upgrade to Pro</div>
      <div className="text-sm text-slate-500">
        PDF upload, saved resume profile, and no ads — $4.99/mo.
      </div>
      <div className="text-xs text-slate-400">
        Payment coming soon.
      </div>
      <Link
        to="/"
        className="inline-block text-sm text-indigo-600 hover:underline"
      >
        ← Back to parser
      </Link>
    </div>
  )
}
