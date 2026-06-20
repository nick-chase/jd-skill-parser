import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { onAuthStateChange, signOut } from '../lib/auth.js'
import { redirectToPortal } from '../lib/stripe.js'
import { getUserPlanStatus, loadResumeProfile } from '../lib/supabase.js'
import SignInButton from '../components/SignInButton.jsx'
import StatBlock from '../components/StatBlock.jsx'
import AppFooter from '../components/AppFooter.jsx'

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

function deriveClass(skills) {
  if (!skills?.length) return 'Unranked'
  const counts = {}
  skills.forEach(s => {
    if ((s.level ?? 0) >= 3) counts[s.category] = (counts[s.category] ?? 0) + 1
  })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const map = {
    'Programming Language': 'Software Engineer',
    'ML / AI':              'ML Engineer',
    'Cloud / Infra':        'DevOps Engineer',
    'Database':             'Data Engineer',
    'Framework':            'Full-Stack Engineer',
    'Dev Tool':             'Engineering Generalist',
  }
  return map[top] ?? 'Software Engineer'
}

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [isPaid, setIsPaid] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [searchParams] = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      setUser(authUser)
      if (authUser) {
        const [planStatus, resumeProfile] = await Promise.all([
          getUserPlanStatus(authUser.id),
          loadResumeProfile(authUser.id),
        ])
        setIsPaid(planStatus)
        setProfile(resumeProfile)
      } else {
        setIsPaid(false)
        setProfile(null)
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

  const skills     = profile?.parsed_skills ?? []
  const softSkills = profile?.parsed_soft_skills ?? []
  const grouped    = skills.reduce((acc, skill) => {
    const cat = skill.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  return (
    <>
    <div className="max-w-4xl mx-auto py-8 space-y-6 px-4">

      {/* Back link */}
      <Link to="/app" className="text-xs text-slate-400 hover:underline">
        ← Back to parser
      </Link>

      {/* Internal tab nav */}
      <div className="flex gap-1 border-b border-slate-200">
        {['profile', 'account'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition
              ${activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab === 'profile' ? '⚔ Profile' : 'Account'}
          </button>
        ))}
      </div>

      {/* Upgrade success banner — shown once after returning from Stripe */}
      {justUpgraded && (
        <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 text-center">
          <div className="text-emerald-700 font-medium">
            ⚔️ Welcome to Pro! Your character sheet is unlocked.
          </div>
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && isPaid && (
        <div className="space-y-6">
          {/* Header */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs tracking-widest text-slate-400 uppercase mb-1">
                  Character Sheet
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {user.email.split('@')[0]}
                </div>
                <div className="text-sm text-indigo-600 font-medium mt-0.5">
                  {deriveClass(skills)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Last updated</div>
                <div className="text-xs text-slate-600">
                  {profile?.updated_at
                    ? new Date(profile.updated_at).toLocaleDateString()
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Skills by category */}
          {Object.keys(grouped).length > 0
            ? Object.entries(grouped).map(([category, categorySkills]) => (
                <div key={category}
                     className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                  <div className="text-xs tracking-widest text-slate-400 uppercase mb-4">
                    {category}
                  </div>
                  {categorySkills
                    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
                    .map(skill => (
                      <StatBlock key={skill.name} skill={skill} />
                    ))}
                </div>
              ))
            : (
              <div className="text-center py-12 text-slate-500">
                <div className="text-2xl mb-2">📜</div>
                <div className="font-medium">No skills on record yet</div>
                <div className="text-sm mt-1">
                  <Link to="/app" className="text-indigo-600 hover:underline">
                    Parse your resume
                  </Link>
                  {' '}to build your character sheet
                </div>
              </div>
            )}

          {/* Behavioral traits */}
          {softSkills.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
              <div className="text-xs tracking-widest text-slate-400 uppercase mb-4">
                Behavioral Traits
              </div>
              <div className="flex flex-wrap gap-2">
                {softSkills.map(trait => (
                  <span
                    key={trait.name}
                    className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    ✦ {trait.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account tab */}
      {activeTab === 'account' && (
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
                <div className="text-sm text-slate-500">
                  PDF upload, resume persistence, and no ads — all included.
                </div>
                <button
                  onClick={() => redirectToPortal(user.id)}
                  className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-700"
                >
                  Manage billing →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">Free Plan</div>
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
      )}
    </div>
    <AppFooter />
    </>
  )
}
