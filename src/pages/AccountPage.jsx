import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { onAuthStateChange, signOut } from '../lib/auth.js'
import { redirectToPortal } from '../lib/stripe.js'
import { getUserPlanStatus } from '../lib/supabase.js'
import SignInButton from '../components/SignInButton.jsx'
import AppFooter from '../components/AppFooter.jsx'

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [isPaid, setIsPaid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      setUser(authUser)
      if (authUser) {
        const planStatus = await getUserPlanStatus(authUser.id)
        setIsPaid(planStatus)
      } else {
        setIsPaid(false)
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Re-fetch plan status immediately on return from Stripe — the webhook may have
  // just flipped is_paid and the cached value from onAuthStateChange would be stale.
  useEffect(() => {
    if (justUpgraded && user) {
      getUserPlanStatus(user.id).then(status => setIsPaid(status))
    }
  }, [justUpgraded, user])

  if (loading) {
    return (
      <>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-16 text-slate-400 text-sm">
            Loading...
          </div>
        </div>
        <AppFooter />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <div className="max-w-4xl mx-auto px-4">
          <div className="max-w-md mx-auto py-16 text-center space-y-4">
            <div className="text-2xl">🔐</div>
            <div className="font-medium text-slate-800">Sign in to view your account</div>
            <div className="text-sm text-slate-500">
              Save your resume profile and track your skill progress
            </div>
            <div className="flex justify-center pt-2">
              {paymentsEnabled && <SignInButton />}
            </div>
            <Link to="/app" className="block text-xs text-slate-400 hover:underline">
              ← Back to parser
            </Link>
          </div>
        </div>
        <AppFooter />
      </>
    )
  }

  return (
    <>
    <div className="max-w-4xl mx-auto py-8 space-y-6 px-4">

      {/* Back link */}
      <Link to="/app" className="text-xs text-slate-400 hover:underline">
        ← Back to parser
      </Link>

      {/* Upgrade success banner — shown once after returning from Stripe */}
      {justUpgraded && (
        <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 text-center">
          <div className="text-emerald-700 font-medium">
            Welcome to Pro! Your full report is now unlocked.
          </div>
        </div>
      )}

      {/* Account content */}
      <div className="space-y-6">

        {/* Identity */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="text-xs tracking-widest text-slate-400 uppercase mb-3">
            Account
          </div>
          <div className="text-sm font-medium text-slate-800">{user.email}</div>
        </div>

        {/* Plan status */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
          <div className="text-xs tracking-widest text-slate-400 uppercase">Plan</div>
          {isPaid ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-indigo-600">Pro Plan</span>
                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">
                  Active
                </span>
              </div>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>Full skill list with per-skill evidence detail</li>
                <li>Per-bullet fast fixes (BoostSection)</li>
                <li>Affiliate links and learning recommendations</li>
                <li>Priority cards with full context</li>
                <li>PDF resume upload</li>
                <li>Resume save / load — no re-paste</li>
              </ul>
              <button
                onClick={() => redirectToPortal(user.id)}
                className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-700"
              >
                Manage billing →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">Lite Plan</div>
              <div className="text-sm text-slate-500">
                Paste and parse — unlimited. Upgrade for PDF upload,
                saved profile, and no ads.
              </div>
              <Link to="/pricing">
                <button className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition">
                  Upgrade to Pro — $9.99/mo
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="text-xs tracking-widest text-slate-400 uppercase mb-3">
            Session
          </div>
          <button
            onClick={signOut}
            className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
    <AppFooter />
    </>
  )
}
