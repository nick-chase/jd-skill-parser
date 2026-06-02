import { supabase } from './supabase.js'
import { analytics } from './analytics.js'

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

export async function getOrCreateUser(session) {
  if (!session?.user) return null

  const { id, email } = session.user

  // Detect new users: check existence before upsert so we fire Signup only once.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('users')
    .upsert({ id, email, updated_at: new Date().toISOString() },
             { onConflict: 'id' })

  if (error) console.error('User upsert error:', error.message)
  if (!existing) analytics.signup()

  return { id, email }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}
