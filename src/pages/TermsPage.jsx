import { Link } from 'react-router-dom'

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="text-sm text-slate-400 mt-2">Effective June 2, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">1. The service</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 is a browser-based tool that parses job descriptions and resumes to produce
            a skill gap map. It is operated by The team at Nat20 ("we", "us"). By using Nat20 you agree
            to these terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">2. Free tier</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            The free tier allows up to 15 job description parses per day with no account required.
            Resume parsing is unlimited. Free-tier results are not saved — they disappear when you
            close the tab. The free tier is ad-supported. We reserve the right to adjust free-tier
            limits with reasonable notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">3. Pro subscription</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Pro costs $9.99 per month (USD), billed monthly through Stripe. Pro includes unlimited
            JD parses, PDF resume upload, saved resume profile, and no ads.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your subscription renews automatically on your billing date each month. You may cancel
            at any time from the billing portal in your account settings. Cancellation takes effect
            at the end of the current billing period — you retain Pro access until then.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            We do not offer refunds for partial billing periods. If you believe you were charged
            in error, contact <a href="mailto:devteam@nat20app.com" className="text-indigo-600 hover:underline">devteam@nat20app.com</a> within
            14 days and we will review it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">4. Your content</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You own your resume content and any job descriptions you paste. By using Nat20 you
            grant us a limited license to process that content locally in your browser (free tier)
            or on our servers (Pro saved profile) solely to provide the service. We do not use your
            resume content to train models or for any purpose other than returning results to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">5. Acceptable use</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You may not use Nat20 to build a competing product, scrape the service programmatically,
            resell access, or circumvent usage limits. One account per person. Accounts found to be
            sharing access or abusing free-tier limits may be suspended without refund.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">6. Accuracy disclaimer</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 uses a rule-based parser against a curated skill dictionary. Results are
            informational only. We do not guarantee that the skill gap map accurately reflects
            how a recruiter or hiring manager would evaluate your resume. Do not rely solely on
            Nat20 output to make employment decisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">7. Disclaimer of warranties</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nat20 is provided "as is" without warranties of any kind, express or implied.
            We do not warrant that the service will be uninterrupted, error-free, or that
            defects will be corrected. Your use of the service is at your own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">8. Limitation of liability</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To the maximum extent permitted by law, Nat20 and its operator shall not be liable
            for any indirect, incidental, special, or consequential damages arising from your use
            of the service. Our total liability for any claim shall not exceed the amount you paid
            us in the 30 days preceding the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">9. Changes to these terms</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We may update these terms as the product evolves. Material changes will be communicated
            via email to signed-in users at least 7 days before taking effect. Continued use of
            Nat20 after that date constitutes acceptance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">10. Governing law</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            These terms are governed by the laws of the State of New Jersey, United States,
            without regard to conflict of law provisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Contact</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Questions about these terms?
            Email <a href="mailto:devteam@nat20app.com" className="text-indigo-600 hover:underline">devteam@nat20app.com</a>.
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
