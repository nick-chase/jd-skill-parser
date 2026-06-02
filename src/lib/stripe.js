export async function redirectToCheckout(userId, userEmail) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId,
          userEmail,
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID
        })
      }
    )

    const { url, error } = await response.json()

    if (error) {
      console.error('Checkout session error:', error)
      return
    }

    window.location.href = url

  } catch (err) {
    console.error('Failed to create checkout session:', err)
  }
}
