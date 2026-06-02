import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const priceId = import.meta.env.VITE_STRIPE_PRICE_ID

if (!stripePublishableKey) {
  console.warn('Missing VITE_STRIPE_PUBLISHABLE_KEY')
}

let stripePromise = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

export async function redirectToCheckout(userId, userEmail) {
  const stripe = await getStripe()

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/account?upgraded=true`,
    cancelUrl: `${window.location.origin}/pricing`,
    clientReferenceId: userId,
    customerEmail: userEmail,
  })

  if (error) {
    console.error('Stripe Checkout error:', error.message)
  }
}
