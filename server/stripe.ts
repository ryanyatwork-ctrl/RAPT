import Stripe from "stripe";
import { ENV } from "./_core/env";

export const stripe = new Stripe(ENV.stripeSecretKey);
// Note: Using default API version from Stripe SDK

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
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
  });
  return subscriptions.data;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function getAllCustomers() {
  const customers = await stripe.customers.list({
    limit: 100,
  });
  return customers.data;
}

export async function getCustomerById(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  return customer;
}
