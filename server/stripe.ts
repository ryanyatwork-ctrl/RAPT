import Stripe from "stripe";
import { ENV } from "./_core/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY before using billing operations.");
    }
    _stripe = new Stripe(ENV.stripeSecretKey);
  }
  return _stripe;
}

export const STRIPE_PRODUCTS = {
  PRO: {
    priceId: process.env.STRIPE_PRICE_PRO ?? "",
    name: "Pro",
    amount: 1400, // $14.00
    interval: "month",
  },
  ADVANCED: {
    priceId: process.env.STRIPE_PRICE_ADVANCED ?? "",
    name: "Advanced",
    amount: 2900, // $29.00
    interval: "month",
  },
};

export async function createCheckoutSession(
  userId: number,
  userEmail: string,
  userName: string | null,
  tier: "pro" | "advanced",
  origin: string
) {
  const product = STRIPE_PRODUCTS[tier.toUpperCase() as keyof typeof STRIPE_PRODUCTS];
  if (!product) throw new Error(`Invalid tier: ${tier}`);
  if (!product.priceId) {
    throw new Error(`Stripe price ID is not configured for ${tier}.`);
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName || "Unknown",
      tier,
    },
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${origin}/subscription?success=true`,
    cancel_url: `${origin}/subscription?cancelled=true`,
    allow_promotion_codes: true,
  });

  return session.url;
}

export async function getCustomerSubscriptions(customerId: string) {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    limit: 10,
  });
  return subscriptions.data;
}

export async function cancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.cancel(subscriptionId);
}

export async function getAllCustomers() {
  const customers = await getStripe().customers.list({
    limit: 100,
  });
  return customers.data;
}

export async function getCustomerById(customerId: string) {
  return getStripe().customers.retrieve(customerId);
}
