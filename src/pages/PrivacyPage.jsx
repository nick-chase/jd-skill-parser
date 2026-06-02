import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <Link to="/" className="font-bold text-slate-800 text-lg">⚔ Nat20</Link>
        <Link to="/app" className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
          Try free
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mt-2">Effective June 2, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">What Nat20 is</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 is a skill-based resume and job description matching tool operated by Nick Chase
            (<a href="mailto:nick@nat20.app" className="text-indigo-600 hover:underline">nick@nat20.app</a>).
            We are not a staffing agency and do not share your data with employers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">What we collect</h2>
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <div>
              <p className="font-medium text-slate-700">Free users — no account required</p>
              <p className="mt-1">
                We collect nothing. Job descriptions and resume text you paste are processed
                entirely in your browser and are never sent to our servers. Results disappear
                when you close the tab.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Signed-in users (Google OAuth)</p>
              <p className="mt-1">
                When you sign in with Google we receive your email address, which we store
                to identify your account. We do not receive or store your Google password.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Pro subscribers</p>
              <p className="mt-1">
                Pro subscribers may save a parsed resume profile (skill names and proficiency
                levels — not your raw resume text) to their account so they don't have to
                re-paste on return visits. This data is stored in Supabase and can be deleted
                at any time by emailing us.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Billing</p>
              <p className="mt-1">
                Payments are processed by Stripe. We never see or store your full card number.
                Stripe stores payment data under their own privacy policy at stripe.com/privacy.
                We receive a Stripe customer ID that links your account to your subscription status.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Analytics</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We use <a href="https://plausible.io" className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">Plausible Analytics</a>,
            a privacy-respecting analytics tool that does not use cookies and does not collect
            personal data. Plausible only records page views and custom events (e.g., "parse completed")
            in aggregate. No individual user is tracked across sessions. No GDPR banner is required
            because no personal data is collected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Third-party services</h2>
          <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
            <li><span className="font-medium text-slate-700">Supabase</span> — database and authentication hosting (US)</li>
            <li><span className="font-medium text-slate-700">Stripe</span> — payment processing (US)</li>
            <li><span className="font-medium text-slate-700">Google OAuth</span> — sign-in only; we receive your email address</li>
            <li><span className="font-medium text-slate-700">Plausible</span> — cookieless, anonymous page analytics (EU)</li>
            <li><span className="font-medium text-slate-700">Vercel</span> — hosting and CDN (US)</li>
          </ul>
          <p className="text-sm text-slate-600 leading-relaxed">
            We do not sell, rent, or share your personal data with any other third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Data retention and deletion</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Free-user data: nothing is retained — there is nothing to delete.
            Signed-in users: your email address and subscription status are retained while
            your account is active. Pro users: your saved resume profile is retained until
            you request deletion. To delete your account and all associated data, email
            <a href="mailto:nick@nat20.app" className="text-indigo-600 hover:underline ml-1">nick@nat20.app</a>.
            We will process deletion requests within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Your rights</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You have the right to access, correct, or delete the personal data we hold about you.
            If you are in the EU or California, you also have the right to data portability and
            to object to processing. To exercise any of these rights, email
            <a href="mailto:nick@nat20.app" className="text-indigo-600 hover:underline ml-1">nick@nat20.app</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Changes to this policy</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We may update this policy as the product evolves. Material changes will be announced
            via email to signed-in users. Continued use of Nat20 after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Contact</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Questions about this policy?
            Email <a href="mailto:nick@nat20.app" className="text-indigo-600 hover:underline">nick@nat20.app</a>.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-400">⚔ Nat20 · Skill-based job matching, leveled.</div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/terms" className="hover:text-slate-600 transition">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-600 transition">Privacy</Link>
            <Link to="/pricing" className="hover:text-slate-600 transition">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
