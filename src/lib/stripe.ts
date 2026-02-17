import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

if (!stripePublishableKey) {
  console.warn('⚠️ Stripe publishable key not found. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file');
}

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe instance (singleton pattern)
 */
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

/**
 * Create a checkout session
 * This should be called from your backend/serverless function
 */
export async function createCheckoutSession(items: any[]) {
  // TODO: Call your backend endpoint to create a Stripe checkout session
  // Example:
  // const response = await fetch('/api/create-checkout-session', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ items }),
  // });
  // return response.json();

  throw new Error('createCheckoutSession not implemented yet. You need to create a backend endpoint.');
}

/**
 * Create a payment intent
 * This should also be called from your backend
 */
export async function createPaymentIntent(amount: number) {
  // TODO: Call your backend endpoint to create a Stripe payment intent
  throw new Error('createPaymentIntent not implemented yet. You need to create a backend endpoint.');
}
