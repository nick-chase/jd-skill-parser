import { supabase } from './supabase.js'

export async function redirectToPortal(userId) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      console.error('No active session')
      return
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      }
    )

    const { url, error } = await response.json()

    if (error || !url) {
      console.error('Portal session error:', error ?? 'no URL returned')
      return
    }

    window.location.href = url

  } catch (err) {
    console.error('Failed to create portal session:', err)
  }
}

export async function redirectToCheckout(userId, userEmail) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      console.error('No active session — user must be signed in')
      return
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          userEmail,
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID
        })
      }
    )

    const { url, error } = await response.json()

    if (error || !url) {
      console.error('Checkout session error:', error ?? 'no URL returned')
      return
    }

    window.location.href = url

  } catch (err) {
    console.error('Failed to create checkout session:', err)
  }
}
