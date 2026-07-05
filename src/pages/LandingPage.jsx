import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChange } from '../lib/auth.js'
import TierBadge from '../components/TierBadge.jsx'

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((user) => {
      if (paymentsEnabled && user) {
        navigate('/app')
      } else {
        setChecking(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  if (paymentsEnabled && checking) return null

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-lg">⚔ Nat20</span>
          <TierBadge isPaidStatus={false} />
        </div>
        <div className="flex items-center gap-4">
          <Link to="/app"
                className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                           text-white rounded-lg font-medium transition">
            Try free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          Mind the gap between<br />
          <span className="text-indigo-600">your resume and the role.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Paste a job description and your resume. Nat20 maps how strongly your
          resume backs up each required skill — not just which keywords are
          missing, but how well your resume communicates what you know. Nat20
          helps you close the gap between your work and how your resume describes it.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link to="/app"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700
                           text-white font-medium rounded-lg transition shadow-sm">
            Start parsing →
          </Link>
        </div>
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
                body: 'See which skills the JD requires and how strongly your resume backs each one up — by evidence strength, not just keyword presence.'
              },
              {
                icon: '⚔️',
                title: 'Full skill detail',
                body: 'A visual breakdown of how your resume communicates each skill — grouped by category, scored by evidence. Not a mastery rating. A read on how your resume reads.'
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
              q: 'Who is this for?',
              a: "Right now, Nat20 is built for tech roles — Software Engineering, ML/AI, and Data Science. Within that scope: early-career job seekers — students, bootcamp grads, new grads — who need to turn a skills list into evidence-backed bullets. And experienced professionals or career changers who have done the work but need to reframe how their resume describes it. The gap looks different depending on where you are. The tool reads the same signal either way."
            },
            {
              q: 'Is my resume data stored?',
              a: "Free users: your results are held in your browser's session storage — they survive a page refresh but clear when you close the tab or restart your browser. Nothing is saved to a server. Pro users: on top of that, your parsed resume profile is saved server-side, so it auto-loads on return — even after closing the tab, restarting your browser, or switching devices."
            },
            {
              q: 'How is this different from other resume tools?',
              a: "Most resume scanners give you a keyword match score and a list of missing words. Nat20 gives you a skill proficiency map — it shows not just what's missing, but how the evidence on your resume lines up against what the role requires. And at $9.99/mo, it's a fraction of the cost of premium alternatives."
            },
            {
              q: 'What does the full skill detail show?',
              a: "Pro users get a visual breakdown of how strongly their resume backs up each skill — grouped by category, based on where skills appear, how long, and what context. It is not a mastery score. It is a read on how your resume communicates each skill."
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
            ⚔ Nat20 · Know your stats before you apply.
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/app" className="hover:text-slate-600 transition">App</Link>
            <Link to="/privacy" className="hover:text-slate-600 transition">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-600 transition">Terms</Link>
            <a href="mailto:devteam@nat20app.com"
               className="hover:text-slate-600 transition">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
