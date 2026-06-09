import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
)

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
    const { userId } = await req.json()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.stripe_customer_id) {
      console.error('[create-portal-session] No customer found:', {
        userId,
        supabaseError: userError?.message ?? 'missing stripe_customer_id',
        ts: new Date().toISOString()
      })
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found' }),
        { status: 400, headers: CORS }
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${Deno.env.get('SITE_URL') ?? 'https://jd-skill-parser.vercel.app'}/account`,
    })

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: CORS }
    )
  } catch (err) {
    console.error('[create-portal-session] Error:', {
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
