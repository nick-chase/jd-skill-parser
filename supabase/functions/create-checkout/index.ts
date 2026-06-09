import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const { userId, userEmail, priceId } = await req.json()

    if (!userId || !userEmail || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, userEmail, priceId' }),
        { status: 400, headers: CORS }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/account?upgraded=true`,
      cancel_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/pricing`,
      client_reference_id: userId,
      customer_email: userEmail,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: CORS }
    )
  } catch (err) {
    console.error('[create-checkout] Stripe error:', {
      message: err instanceof Error ? err.message : String(err),
      userId,
      priceId,
      ts: new Date().toISOString()
    })
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: CORS }
    )
  }
})
