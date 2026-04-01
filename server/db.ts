import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, properties, pricingRules, events, calendarData, listingSuggestions, subscriptions,
  InsertUser, InsertProperty, InsertPricingRule, InsertEvent, InsertCalendarData, InsertListingSuggestion, InsertSubscription,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserSubscription(userId: number, tier: "free" | "pro" | "advanced") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ subscriptionTier: tier, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Properties ───────────────────────────────────────────────────────────────

export async function getPropertiesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(and(eq(properties.userId, userId), eq(properties.isActive, true)));
}

export async function getPropertyById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(and(eq(properties.id, id), eq(properties.userId, userId))).limit(1);
  return result[0];
}

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(properties).values(data);
  return result;
}

export async function updateProperty(id: number, userId: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(properties).set({ ...data, updatedAt: new Date() }).where(and(eq(properties.id, id), eq(properties.userId, userId)));
}

export async function deleteProperty(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(properties).set({ isActive: false, updatedAt: new Date() }).where(and(eq(properties.id, id), eq(properties.userId, userId)));
}

export async function countPropertiesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(properties).where(and(eq(properties.userId, userId), eq(properties.isActive, true)));
  return result.length;
}

// ─── Pricing Rules ────────────────────────────────────────────────────────────

export async function getPricingRuleByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricingRules).where(eq(pricingRules.propertyId, propertyId)).limit(1);
  return result[0];
}

export async function upsertPricingRule(data: InsertPricingRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getPricingRuleByPropertyId(data.propertyId);
  if (existing) {
    await db.update(pricingRules).set({ ...data, updatedAt: new Date() }).where(eq(pricingRules.propertyId, data.propertyId));
    return existing.id;
  } else {
    const [result] = await db.insert(pricingRules).values(data);
    return result.insertId;
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEventsByPropertyId(propertyId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(events.propertyId, propertyId)];
  if (startDate) conditions.push(gte(events.startDate, startDate));
  if (endDate) conditions.push(lte(events.endDate, endDate));
  return db.select().from(events).where(and(...conditions)).orderBy(events.startDate);
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(events).values(data);
  return result;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(events).set({ ...data, updatedAt: new Date() }).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(events).where(eq(events.id, id));
}

// ─── Calendar Data ────────────────────────────────────────────────────────────

export async function getCalendarDataByPropertyAndMonth(propertyId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  return db.select().from(calendarData).where(
    and(eq(calendarData.propertyId, propertyId), gte(calendarData.date, startDate), lte(calendarData.date, endDate))
  );
}

export async function upsertCalendarDay(data: InsertCalendarData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(calendarData)
    .where(and(eq(calendarData.propertyId, data.propertyId), eq(calendarData.date, data.date))).limit(1);
  if (existing.length > 0) {
    await db.update(calendarData).set({ ...data, updatedAt: new Date() })
      .where(and(eq(calendarData.propertyId, data.propertyId), eq(calendarData.date, data.date)));
  } else {
    await db.insert(calendarData).values(data);
  }
}

// ─── Listing Suggestions ──────────────────────────────────────────────────────

export async function getListingSuggestionsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listingSuggestions).where(eq(listingSuggestions.propertyId, propertyId)).orderBy(desc(listingSuggestions.createdAt)).limit(10);
}

export async function createListingSuggestion(data: InsertListingSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(listingSuggestions).values(data);
  return result;
}

export async function markSuggestionApplied(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(listingSuggestions).set({ isApplied: true }).where(eq(listingSuggestions.id, id));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}

export async function createOrUpdateSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSubscriptionByUserId(data.userId);
  if (existing) {
    await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.userId, data.userId));
  } else {
    await db.insert(subscriptions).values(data);
  }
}
