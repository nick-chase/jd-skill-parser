import { describe, it, expect } from 'vitest'

describe('Supabase client', () => {
  it('initializes without throwing', async () => {
    // Dynamic import so missing env vars fail the test cleanly
    const { supabase } = await import('../../src/lib/supabase.js')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
