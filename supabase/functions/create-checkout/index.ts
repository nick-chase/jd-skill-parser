import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is required')

const STRIPE_PRO_PRICE_ID = Deno.env.get('STRIPE_PRO_PRICE_ID')
if (!STRIPE_PRO_PRICE_ID) throw new Error('STRIPE_PRO_PRICE_ID is required')

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const { userId, userEmail } = await req.json()

    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, userEmail' }),
        { status: 400, headers: CORS }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/account?upgraded=true`,
      cancel_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/pricing`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: { tier: 'pro' },
      subscription_data: { metadata: { tier: 'pro' } },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: CORS }
    )
  } catch (err) {
    console.error('[create-checkout] Stripe error:', {
      message: err instanceof Error ? err.message : String(err),
      userId,
      ts: new Date().toISOString()
    })
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: CORS }
    )
  }
})
