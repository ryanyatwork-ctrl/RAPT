import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getAllUsersSummary, getUserWithSubscription, updateUserStripeInfo } from "./adminDb";
import { stripe, createCheckoutSession, cancelSubscription } from "./stripe";
import { updateUserSubscription } from "./db";

/**
 * Admin-only procedure that checks if user is the owner (admin)
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

// ─── Admin Router ──────────────────────────────────────────────────────────
export const adminRouter = router({
  /**
   * Get all users with their subscription status
   */
  listUsers: adminProcedure.query(async () => {
    return getAllUsersSummary();
  }),

  /**
   * Get detailed info for a specific user
   */
  getUser: adminProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    return getUserWithSubscription(input.userId);
  }),

  /**
   * Cancel a user's subscription
   */
  cancelUserSubscription: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const user = await getUserWithSubscription(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (!user.user.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User has no active Stripe subscription",
        });
      }

      // Cancel the Stripe subscription
      await cancelSubscription(user.user.stripeSubscriptionId);

      // Update local DB
      await updateUserStripeInfo(input.userId, {
        stripePaymentStatus: "cancelled",
      });

      await updateUserSubscription(input.userId, "free");

      return { success: true, message: "Subscription cancelled" };
    }),

  /**
   * Manually update a user's payment status (for testing/admin override)
   */
  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "past_due", "cancelled", "unpaid", "trial"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateUserStripeInfo(input.userId, {
        stripePaymentStatus: input.status,
      });
      return { success: true };
    }),
});

// ─── Stripe Router ────────────────────────────────────────────────────────
export const stripeRouter = router({
  /**
   * Create a checkout session for subscription upgrade
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["pro", "advanced"]),
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const checkoutUrl = await createCheckoutSession(
        ctx.user.id,
        ctx.user.email || "",
        ctx.user.name || null,
        input.tier,
        input.origin
      );

      if (!checkoutUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }

      return { checkoutUrl };
    }),

  /**
   * Get current user's Stripe subscription info
   */
  getSubscriptionInfo: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.stripeSubscriptionId) {
      return null;
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(ctx.user.stripeSubscriptionId) as any;
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_period_start || 0) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
        items: subscription.items.data.map((item: any) => ({
          priceId: item.price.id,
          amount: item.price.unit_amount,
          currency: item.price.currency,
          interval: item.price.recurring?.interval,
        })),
      };
    } catch (error) {
      console.error("[Stripe] Error retrieving subscription:", error);
      return null;
    }
  }),
});
