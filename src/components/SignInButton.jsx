import { signInWithGoogle } from '../lib/auth.js'

export default function SignInButton({ redirectPath, label = 'Sign in with Google' }) {
  return (
    <button
      onClick={() => signInWithGoogle(redirectPath)}
      className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
    >
      {label}
    </button>
  )
}
