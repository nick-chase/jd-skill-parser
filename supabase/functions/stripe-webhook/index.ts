import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Use auto-injected SUPABASE_SERVICE_ROLE_KEY (not the custom SERVICE_ROLE_KEY).
// persistSession/autoRefreshToken false — correct for stateless edge functions.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } }
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Webhook Error', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id
    const rawCustomer = session.customer
    const customerId = typeof rawCustomer === 'string'
      ? rawCustomer
      : (rawCustomer as { id: string } | null)?.id ?? null

    console.log(`checkout.session.completed — userId: ${userId}, customerId: ${customerId}`)

    if (!userId) {
      console.error('checkout.session.completed: no client_reference_id in session')
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // First call: flip is_paid
    const { error: paidError } = await supabase
      .from('users')
      .update({ is_paid: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (paidError) {
      console.error('Failed to set is_paid:', paidError.message)
      return new Response('Database Error', { status: 500 })
    }

    // Second call: save stripe_customer_id (split to isolate failures)
    if (customerId) {
      const { error: customerError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      if (customerError) {
        console.error('Failed to save stripe_customer_id:', customerError.message)
        // Don't return 500 — is_paid is already set. Log and continue.
        // Stripe will not retry on success responses, so we handle this gracefully.
      } else {
        console.log(`stripe_customer_id saved: ${customerId} for user ${userId}`)
      }
    } else {
      console.warn(`No customerId in session for user ${userId} — stripe_customer_id not saved`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = subscription.customer

    console.log(`customer.subscription.deleted — customerId: ${customerId}`)

    const { error } = await supabase
      .from('users')
      .update({ is_paid: false, updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Failed to update user on cancel:', error.message)
      return new Response('Database Error', { status: 500 })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  })
})
