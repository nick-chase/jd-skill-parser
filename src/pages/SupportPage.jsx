import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChange } from '../lib/auth.js'
import { redirectToSupporterCheckout } from '../lib/stripe.js'
import { getSupporterStatus } from '../lib/supabase.js'
import SignInButton from '../components/SignInButton.jsx'
import AppFooter from '../components/AppFooter.jsx'

function formatDate(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return null
  }
}

export default function SupportPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [isSupporter, setIsSupporter] = useState(false)
  const [termEndsAt, setTermEndsAt] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      setUser(authUser)
      if (authUser) {
        const status = await getSupporterStatus(authUser.id)
        setIsSupporter(status.isSupporter)
        setTermEndsAt(status.termEndsAt)
      } else {
        setIsSupporter(false)
        setTermEndsAt(null)
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSupport() {
    if (!user) return
    setCheckoutLoading(true)
    await redirectToSupporterCheckout(user.id, user.email)
    setCheckoutLoading(false)
  }

  const explanation = (
    <div className="space-y-4 text-sm text-slate-600">
      <p>
        Supporting Nat20 is <span className="font-semibold text-slate-800">$5/month for 12 months</span>,
        then it ends automatically — no cancellation needed, no renewal. That's around $60 total
        if you stay the whole term, and nothing further after that.
      </p>
      <p>
        This doesn't unlock anything. No extra features, no higher limits. If you want the full
        report, that's Pro. Supporting is for people who don't need more from the app, but want
        the thing to stick around.
      </p>
      <p>
        Nat20's skill library covers tech roles today — software, ML, data. Expanding beyond that
        means real work: gathering role data, validating skill vocabularies, testing against
        actual job descriptions in a new domain. Supporting is what makes that time possible.
      </p>
    </div>
  )

  if (loading) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center py-16 text-slate-400 text-sm">
            Loading...
          </div>
        </div>
        <AppFooter />
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link to="/app" className="text-xs text-slate-400 hover:underline">
          ← Back to parser
        </Link>

        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-slate-800">Support Nat20</div>
          <div className="text-slate-500 text-sm">Keep the project running</div>
        </div>

        <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-6">
          {/* Logged out */}
          {!user && (
            <>
              {explanation}
              <div className="flex flex-col items-center gap-2 pt-2">
                <SignInButton redirectPath="/support" label="Sign in to support" />
              </div>
            </>
          )}

          {/* Signed in, already a supporter */}
          {user && isSupporter && (
            <div className="space-y-4 text-center">
              <div className="text-lg font-semibold text-emerald-700">
                Thank you for supporting Nat20.
              </div>
              {formatDate(termEndsAt) && (
                <div className="text-sm text-slate-500">
                  Your support term runs through {formatDate(termEndsAt)}.
                </div>
              )}
              <div className="text-xs text-slate-400 pt-2">
                Need to stop early? Email{' '}
                <a href="mailto:nick@nat20app.com" className="hover:underline">
                  nick@nat20app.com
                </a>{' '}
                and I'll cancel any future payments.
              </div>
            </div>
          )}

          {/* Signed in, not a supporter (Lite or Pro) */}
          {user && !isSupporter && (
            <>
              {explanation}
              <div className="flex flex-col items-center gap-2 pt-2">
                <button
                  onClick={handleSupport}
                  disabled={checkoutLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition"
                >
                  {checkoutLoading ? 'Redirecting to Stripe...' : 'Become a supporter — $5/mo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <AppFooter />
    </>
  )
}
