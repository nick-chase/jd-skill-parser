import { signInWithGoogle } from '../lib/auth.js'

export default function SignInButton() {
  return (
    <button
      onClick={signInWithGoogle}
      className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
    >
      Sign in with Google
    </button>
  )
}
