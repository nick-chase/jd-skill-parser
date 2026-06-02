import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChange } from '../lib/auth.js'

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((user) => {
      if (user) {
        navigate('/app')
      } else {
        setChecking(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  if (checking) return null

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="font-bold text-slate-800 text-lg">⚔ Nat20</div>
        <div className="flex items-center gap-4">
          <Link to="/pricing"
                className="text-sm text-slate-500 hover:text-slate-700 transition">
            Pricing
          </Link>
          <Link to="/app"
                className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                           text-white rounded-lg font-medium transition">
            Try free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-block text-xs font-medium px-3 py-1 bg-indigo-50
                        text-indigo-600 rounded-full border border-indigo-200">
          Free to try — no account required
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          See exactly how your resume<br />
          <span className="text-indigo-600">stacks up against any job</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Paste a job description and your resume. Nat20 maps the skill gaps,
          levels your proficiency, and shows you what to fix — in seconds.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link to="/app"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700
                           text-white font-medium rounded-lg transition shadow-sm">
            Start parsing free →
          </Link>
          <Link to="/pricing"
                className="px-8 py-3 border border-slate-300 hover:bg-slate-50
                           text-slate-700 font-medium rounded-lg transition">
            See pricing
          </Link>
        </div>
        <p className="text-xs text-slate-400">
          15 free parses/day · No credit card required · Upgrade anytime
        </p>
      </section>

      {/* Demo placeholder */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-slate-50
                        aspect-video flex items-center justify-center shadow-sm">
          <div className="text-center space-y-3">
            <div className="text-4xl">⚔️</div>
            <div className="text-slate-400 text-sm font-medium">
              Demo video coming soon
            </div>
            <Link to="/app"
                  className="inline-block text-sm text-indigo-600 hover:underline">
              Try it live instead →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
            What Nat20 shows you
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Skill gap map',
                body: 'See which skills the JD requires, which you have, and exactly how far apart they are — by level, not just presence.'
              },
              {
                icon: '⚔️',
                title: 'Character sheet',
                body: 'Your resume becomes a leveled stat block — skill proficiency mapped by category, evidence, and context. See where you stand at a glance, not just what keywords you have.'
              },
              {
                icon: '📋',
                title: 'What the role actually does',
                body: "Job duties extracted as plain text — not scored, not summarized. See what you'd actually be doing day to day."
              }
            ].map(f => (
              <div key={f.title} className="space-y-3">
                <div className="text-3xl">{f.icon}</div>
                <div className="font-semibold text-slate-800">{f.title}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
          Simple pricing
        </h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">

          {/* Free */}
          <div className="border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <div className="font-bold text-slate-800">Free</div>
              <div className="text-3xl font-bold text-slate-800 mt-1">$0</div>
              <div className="text-sm text-slate-400">forever</div>
            </div>
            <ul className="space-y-2">
              {[
                '15 JD parses per day',
                'Unlimited resume parses',
                'Full gap map every time',
                'No account required',
                'Ad-supported (upgrade to remove)',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/app"
                  className="block text-center py-2.5 border border-slate-300
                             rounded-lg text-sm font-medium hover:bg-slate-50 transition">
              Start free
            </Link>
          </div>

          {/* Pro */}
          <div className="border-2 border-indigo-500 rounded-xl p-6 space-y-4
                          relative overflow-hidden">
            <div className="absolute top-3 right-3 text-xs px-2 py-0.5
                            bg-indigo-600 text-white rounded-full">
              Pro
            </div>
            <div>
              <div className="font-bold text-slate-800">Pro</div>
              <div className="text-3xl font-bold text-slate-800 mt-1">$9.99</div>
              <div className="text-sm text-slate-400">per month</div>
            </div>
            <ul className="space-y-2">
              {[
                'Unlimited JD parses',
                'PDF resume upload',
                'Resume profile saved',
                'Character sheet + XP tracking',
                'No ads',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-indigo-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/pricing"
                  className="block text-center py-2.5 bg-indigo-600 hover:bg-indigo-700
                             text-white rounded-lg text-sm font-medium transition">
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-t border-slate-100 py-20">
        <div className="max-w-2xl mx-auto px-6 space-y-8">
          <h2 className="text-2xl font-bold text-slate-800 text-center">
            Frequently asked
          </h2>
          {[
            {
              q: 'Does this actually work for non-tech jobs?',
              a: 'Right now Nat20 is optimized for Software Engineering, ML/AI, and Data Science roles. Finance and other industries are planned for later this year.'
            },
            {
              q: 'Is my resume data stored?',
              a: "Free users: nothing is stored — results disappear when you close the tab. Pro users: your parsed resume profile is saved so you don't have to re-paste on return visits."
            },
            {
              q: 'How is this different from other resume tools?',
              a: "Most resume scanners give you a keyword match score and a list of missing words. Nat20 gives you a skill proficiency map — it tells you not just what's missing, but how far behind you are and what to do about it. And at $9.99/mo, it's a fraction of the cost of premium alternatives."
            },
            {
              q: 'What does the character sheet do?',
              a: "Pro users get a D&D-style stat block showing their skill levels across categories — like an XP bar for your career. It tracks how your skills grow across job searches."
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancel from the billing portal and you keep Pro access until the end of your billing period. No questions asked.'
            },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-2">
              <div className="font-semibold text-slate-800">{q}</div>
              <div className="text-sm text-slate-500 leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-400">
            ⚔ Nat20 · Skill-based job matching, leveled.
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/pricing" className="hover:text-slate-600 transition">Pricing</Link>
            <Link to="/app" className="hover:text-slate-600 transition">App</Link>
            <Link to="/privacy" className="hover:text-slate-600 transition">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-600 transition">Terms</Link>
            <a href="mailto:nick@nat20app.com"
               className="hover:text-slate-600 transition">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
