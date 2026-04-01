import { stripe } from "./stripe";
import { updateUserStripeInfo, getUserByStripeCustomerId } from "./adminDb";
import { updateUserSubscription } from "./db";
import type { Request, Response } from "express";

/**
 * Handle Stripe webhook events
 * Webhook signature verification happens in Express middleware
 */
export async function handleStripeWebhook(event: any) {
  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  // Test events for webhook testing - return early
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, skipping processing");
    return { verified: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        return handleCheckoutSessionCompleted(event.data.object);

      case "customer.subscription.updated":
        return handleSubscriptionUpdated(event.data.object);

      case "customer.subscription.deleted":
        return handleSubscriptionDeleted(event.data.object);

      case "invoice.paid":
        return handleInvoicePaid(event.data.object);

      case "invoice.payment_failed":
        return handleInvoicePaymentFailed(event.data.object);

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        return { handled: false };
    }
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log(`[Stripe Webhook] Checkout session completed: ${session.id}`);

  const userId = parseInt(session.client_reference_id, 10);
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const tier = session.metadata?.tier || "pro";

  if (!userId || !customerId) {
    console.warn("[Stripe Webhook] Missing userId or customerId in session");
    return;
  }

  // Update user with Stripe IDs
  await updateUserStripeInfo(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePaymentStatus: "active",
  });

  // Update subscription tier in user table
  await updateUserSubscription(userId, tier as "free" | "pro" | "advanced");

  console.log(`[Stripe Webhook] User ${userId} upgraded to ${tier}`);
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log(`[Stripe Webhook] Subscription updated: ${subscription.id}`);

  const customerId = subscription.customer;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Map Stripe status to our internal status
  let paymentStatus: "active" | "past_due" | "cancelled" | "unpaid" | "trial" = "active";
  switch (subscription.status) {
    case "active":
      paymentStatus = "active";
      break;
    case "past_due":
      paymentStatus = "past_due";
      break;
    case "canceled":
      paymentStatus = "cancelled";
      break;
    case "unpaid":
      paymentStatus = "unpaid";
      break;
    case "trialing":
      paymentStatus = "trial";
      break;
  }

  await updateUserStripeInfo(user.id, {
    stripePaymentStatus: paymentStatus,
  });

  console.log(`[Stripe Webhook] User ${user.id} subscription status: ${paymentStatus}`);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log(`[Stripe Webhook] Subscription deleted: ${subscription.id}`);

  const customerId = subscription.customer;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Downgrade to free tier
  await updateUserStripeInfo(user.id, {
    stripePaymentStatus: "cancelled",
  });

  await updateUserSubscription(user.id, "free");

  console.log(`[Stripe Webhook] User ${user.id} downgraded to free tier`);
}

async function handleInvoicePaid(invoice: any) {
  console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`);

  const customerId = invoice.customer;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Ensure status is active when invoice is paid
  await updateUserStripeInfo(user.id, {
    stripePaymentStatus: "active",
  });

  console.log(`[Stripe Webhook] User ${user.id} payment received`);
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`);

  const customerId = invoice.customer;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Mark as past due
  await updateUserStripeInfo(user.id, {
    stripePaymentStatus: "past_due",
  });

  console.log(`[Stripe Webhook] User ${user.id} payment failed - marked past_due`);
}
