import { signOut } from '../lib/auth.js'

export default function UserMenu({ user }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">{user.email}</span>
      <button
        onClick={signOut}
        className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
      >
        Sign out
      </button>
    </div>
  )
}
