import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local against .env.example.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function saveResumeProfile(userId, parsedSkills, parsedSoftSkills, rawText) {
  if (!userId) return

  const { error } = await supabase
    .from('resume_profiles')
    .upsert({
      user_id: userId,
      raw_text: rawText ?? null,
      parsed_skills: parsedSkills,
      parsed_soft_skills: parsedSoftSkills,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

  if (error) console.error('Resume profile save error:', error.message)
}

export async function getUserPlanStatus(userId) {
  if (!userId) return false

  const { data, error } = await supabase
    .from('users')
    .select('is_paid')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Plan status fetch error:', error.message)
    return false
  }

  return data?.is_paid ?? false
}

export async function loadResumeProfile(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('resume_profiles')
    .select('parsed_skills, parsed_soft_skills, raw_text, updated_at')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, that's fine for new users
    console.error('Resume profile load error:', error.message)
  }

  return data ?? null
}
