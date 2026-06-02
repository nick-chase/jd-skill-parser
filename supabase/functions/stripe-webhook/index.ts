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
    // customer can be a string ID or an expanded object depending on Stripe SDK version
    const rawCustomer = session.customer
    const customerId = typeof rawCustomer === 'string'
      ? rawCustomer
      : (rawCustomer as { id: string } | null)?.id ?? null

    if (userId) {
      const { error } = await supabase
        .from('users')
        .update({
          is_paid: true,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to update user:', error.message)
        return new Response('Database Error', { status: 500 })
      }
    } else {
      console.error('checkout.session.completed: no client_reference_id in session')
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = subscription.customer

    const { error } = await supabase
      .from('users')
      .update({
        is_paid: false,
        updated_at: new Date().toISOString()
      })
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
