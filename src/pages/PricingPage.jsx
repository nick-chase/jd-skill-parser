import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { redirectToCheckout } from '../lib/stripe.js'
import { onAuthStateChange } from '../lib/auth.js'

export default function PricingPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((authUser) => {
      setUser(authUser)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleUpgrade() {
    if (!user) {
      window.location.href = '/account'
      return
    }
    setLoading(true)
    await redirectToCheckout(user.id, user.email)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4 space-y-8">
      <Link to="/" className="text-xs text-slate-400 hover:underline">
        ← Back to parser
      </Link>

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-3xl font-bold text-slate-800">Upgrade to Pro</div>
        <div className="text-slate-500">Unlock your full character sheet</div>
      </div>

      {/* Pricing card */}
      <div className="border border-indigo-200 rounded-xl p-8 bg-white shadow-sm space-y-6">

        {/* Price */}
        <div className="text-center">
          <span className="text-4xl font-bold text-slate-800">$9.99</span>
          <span className="text-slate-400">/month</span>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {[
            'Unlimited JD parses (free: 15/day)',
            'PDF resume upload',
            'Resume profile saved — no re-paste',
            'Character sheet — skill XP bars + class',
            'No ads',
          ].map(feature => (
            <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="text-indigo-500 font-bold">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition"
        >
          {loading ? 'Redirecting to Stripe...' : 'Upgrade Now'}
        </button>

        {!user && (
          <p className="text-xs text-center text-slate-400">
            You'll be asked to sign in first
          </p>
        )}

        <p className="text-xs text-center text-slate-400">
          Cancel anytime. No contracts.
        </p>
      </div>

      {/* Free tier reminder */}
      <div className="text-center text-sm text-slate-400">
        Free tier: unlimited resume parses + 15 JD parses/day — always free
      </div>
    </div>
  )
}
