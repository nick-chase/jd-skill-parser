import { Link } from 'react-router-dom'

export default function UserMenu({ user }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 hidden sm:block">
        {user.email}
      </span>
      <Link
        to="/account"
        className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
      >
        Account
      </Link>
    </div>
  )
}
