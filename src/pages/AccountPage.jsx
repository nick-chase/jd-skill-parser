import { signOut } from '../lib/auth.js'
import SignInButton from '../components/SignInButton.jsx'

export default function AccountPage({ user, isPaid }) {

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="text-2xl">🔐</div>
        <div className="font-medium text-slate-800">Sign in to manage your account</div>
        <div className="text-sm text-slate-500">
          Save your resume profile and track your skill progress
        </div>
        <div className="flex justify-center pt-2">
          <SignInButton />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">

      {/* Identity block */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-1">
        <div className="text-xs tracking-widest text-slate-400 uppercase mb-3">Account</div>
        <div className="text-sm font-medium text-slate-800">{user.email}</div>
        <div className="text-xs text-slate-400">
          Member since {new Date(user.created_at ?? Date.now()).toLocaleDateString()}
        </div>
      </div>

      {/* Plan status block */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
        <div className="text-xs tracking-widest text-slate-400 uppercase">Plan</div>

        {isPaid ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-indigo-600">Pro Plan</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">Active</span>
            </div>
            <div className="text-sm text-slate-500">
              PDF upload, resume persistence, and no ads — all included.
            </div>
            <button
              disabled
              className="text-xs text-slate-400 underline cursor-not-allowed"
            >
              Manage billing (coming soon)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700">Free Plan</div>
            <div className="text-sm text-slate-500">
              Paste and parse — unlimited. Upgrade for PDF upload,
              saved resume profile, and no ads.
            </div>
            <button
              disabled
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium opacity-60 cursor-not-allowed"
              title="Stripe integration coming in Phase D"
            >
              Upgrade to Pro — $4.99/mo
            </button>
            <div className="text-xs text-center text-slate-400">
              Payment coming soon
            </div>
          </div>
        )}
      </div>

      {/* Sign out block */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="text-xs tracking-widest text-slate-400 uppercase mb-3">Session</div>
        <button
          onClick={signOut}
          className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-700"
        >
          Sign out
        </button>
      </div>

    </div>
  )
}
