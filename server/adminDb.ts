import { eq } from "drizzle-orm";
import { users, subscriptions } from "../drizzle/schema";
import { getDb } from "./db";

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getUserWithSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return null;
  
  const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return { user: user[0], subscription: sub[0] || null };
}

export async function updateUserStripeInfo(userId: number, data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentStatus?: "active" | "past_due" | "cancelled" | "unpaid" | "trial";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  return result[0] || null;
}

export async function getAllUsersSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allUsers = await db.select().from(users).orderBy(users.createdAt);
  const allSubs = await db.select().from(subscriptions);
  
  return allUsers.map(user => {
    const sub = allSubs.find(s => s.userId === user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      stripePaymentStatus: user.stripePaymentStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
      subscription: sub || null,
    };
  });
}
