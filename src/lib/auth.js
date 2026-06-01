import { supabase } from './supabase.js'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  if (error) console.error('Sign in error:', error.message)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Sign out error:', error.message)
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}
