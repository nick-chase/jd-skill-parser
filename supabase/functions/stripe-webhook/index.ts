import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'jsr:@supabase/server@^1'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRO_PRICE_ID = Deno.env.get('STRIPE_PRO_PRICE_ID')!
const SUPPORTER_PRICE_ID = Deno.env.get('STRIPE_SUPPORTER_PRICE_ID')!

function addTwelveMonths(unixSeconds: number): number {
  const d = new Date(unixSeconds * 1000)
  d.setUTCMonth(d.getUTCMonth() + 12)
  return Math.floor(d.getTime() / 1000)
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, { supabaseAdmin }) => {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      )
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`Event received: ${event.type} — ${event.id}`)

    // Dedupe first, before any handling. On unique violation (retry), return 200 immediately.
    const { error: dedupeError } = await supabaseAdmin
      .from('processed_stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      })

    if (dedupeError) {
      if (dedupeError.code === '23505') {
        console.log(`Event ${event.id} already processed — skipping (retry)`)
        return Response.json({ received: true })
      }
      console.error('[stripe-webhook] Dedupe insert error:', JSON.stringify(dedupeError))
      // Non-dedupe DB error — fall through and attempt processing anyway.
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as Stripe.Checkout.Session
        const userId = sessionObj.client_reference_id
        const customerId = sessionObj.customer as string

        console.log('userId:', userId)
        console.log('customerId:', customerId)

        if (!userId) {
          console.error('No client_reference_id in session')
          break
        }

        // Line items are not expanded by default on the session object — retrieve them explicitly.
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionObj.id, { limit: 1 })
        const priceId = lineItems.data[0]?.price?.id

        console.log('priceId:', priceId)

        if (priceId === PRO_PRICE_ID) {
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              is_paid: true,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()

          console.log('Pro update result:', JSON.stringify(data))
          if (error) console.error('[stripe-webhook] Pro DB update error:', JSON.stringify(error))
        } else if (priceId === SUPPORTER_PRICE_ID) {
          const subscriptionId = sessionObj.subscription as string
          if (!subscriptionId) {
            console.error('No subscription id on supporter checkout session')
            break
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const periodStart = subscription.current_period_start
          const cancelAt = addTwelveMonths(periodStart)

          await stripe.subscriptions.update(subscriptionId, { cancel_at: cancelAt })

          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              is_supporter: true,
              supporter_stripe_customer_id: customerId,
              supporter_term_started_at: new Date(periodStart * 1000).toISOString(),
              supporter_term_ends_at: new Date(cancelAt * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()

          console.log('Supporter update result:', JSON.stringify(data))
          if (error) console.error('[stripe-webhook] Supporter DB update error:', JSON.stringify(error))
        } else {
          console.error('[stripe-webhook] Unrecognized price ID on checkout session:', priceId)
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const tier = subscription.metadata?.tier

        if (tier === 'pro') {
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              is_paid: false,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customerId)

          console.log('Pro subscription cancelled for customer:', customerId)
          if (error) console.error('[stripe-webhook] Pro DB cancel error:', JSON.stringify(error))
        } else if (tier === 'supporter') {
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              is_supporter: false,
              updated_at: new Date().toISOString()
            })
            .eq('supporter_stripe_customer_id', customerId)

          console.log('Supporter subscription cancelled for customer:', customerId)
          if (error) console.error('[stripe-webhook] Supporter DB cancel error:', JSON.stringify(error))
        } else {
          console.error('[stripe-webhook] Unrecognized/missing tier metadata on subscription.deleted:', tier)
        }

        break
      }
    }

    return Response.json({ received: true })
  })
}
