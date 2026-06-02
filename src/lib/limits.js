import { supabase } from './supabase.js'

export const FREE_DAILY_LIMIT = 15

export function isPaid(user, planStatus) {
  return planStatus === true
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// Anonymous user — localStorage
export function getAnonParseCount() {
  const stored = localStorage.getItem('nat20_parse_date')
  const today = getTodayString()
  if (stored !== today) {
    localStorage.setItem('nat20_parse_date', today)
    localStorage.setItem('nat20_parse_count', '0')
    return 0
  }
  return parseInt(localStorage.getItem('nat20_parse_count') ?? '0', 10)
}

export function incrementAnonParseCount() {
  const count = getAnonParseCount()
  localStorage.setItem('nat20_parse_count', String(count + 1))
  return count + 1
}

// Signed-in free user — Supabase
export async function getSupabaseParseCount(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('daily_parse_count, parse_count_reset_at')
    .eq('id', userId)
    .single()

  if (error) return 0

  const today = getTodayString()
  const resetDate = data?.parse_count_reset_at?.split('T')[0]

  if (resetDate !== today) {
    await supabase
      .from('users')
      .update({
        daily_parse_count: 0,
        parse_count_reset_at: new Date().toISOString()
      })
      .eq('id', userId)
    return 0
  }

  return data?.daily_parse_count ?? 0
}

export async function incrementSupabaseParseCount(userId) {
  const current = await getSupabaseParseCount(userId)
  const newCount = current + 1
  await supabase
    .from('users')
    .update({ daily_parse_count: newCount })
    .eq('id', userId)
  return newCount
}

// Main helper — call before each JD parse
export async function checkAndIncrementParseCount(user, isPaidUser) {
  if (isPaidUser) return { allowed: true, remaining: null }

  let count
  if (user?.id) {
    count = await getSupabaseParseCount(user.id)
  } else {
    count = getAnonParseCount()
  }

  if (count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  if (user?.id) {
    await incrementSupabaseParseCount(user.id)
  } else {
    incrementAnonParseCount()
  }

  return { allowed: true, remaining: FREE_DAILY_LIMIT - count - 1 }
}
