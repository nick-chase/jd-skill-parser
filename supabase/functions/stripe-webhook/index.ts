import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'jsr:@supabase/server@^1'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

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

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = session.customer as string

        console.log('userId:', userId)
        console.log('customerId:', customerId)

        if (!userId) {
          console.error('No client_reference_id in session')
          break
        }

        const { data, error } = await supabaseAdmin
          .from('users')
          .update({
            is_paid: true,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()

        console.log('Update result:', JSON.stringify(data))
        console.error('[stripe-webhook] DB update error:', JSON.stringify(error))
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabaseAdmin
          .from('users')
          .update({
            is_paid: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId)

        console.log('Subscription cancelled for customer:', customerId)
        console.error('[stripe-webhook] DB cancel error:', JSON.stringify(error))
        break
      }
    }

    return Response.json({ received: true })
  })
}
