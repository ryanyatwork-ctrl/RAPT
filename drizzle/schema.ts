import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "advanced"]).default("free").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  stripePaymentStatus: mysqlEnum("stripePaymentStatus", ["active", "past_due", "cancelled", "unpaid", "trial"]).default("trial"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("US"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  propertyType: mysqlEnum("propertyType", ["cabin", "house", "condo", "apartment", "villa", "cottage", "other"]).default("house").notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  bedrooms: int("bedrooms").default(1),
  bathrooms: int("bathrooms").default(1),
  maxGuests: int("maxGuests").default(2),
  isActive: boolean("isActive").default(true).notNull(),
  airbnbListingId: varchar("airbnbListingId", { length: 100 }),
  description: text("description"),
  amenitiesJson: text("amenitiesJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export const pricingRules = mysqlTable("pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  weekendMultiplier: decimal("weekendMultiplier", { precision: 4, scale: 2 }).default("1.30"),
  holidayMultiplier: decimal("holidayMultiplier", { precision: 4, scale: 2 }).default("1.45"),
  highEventMultiplier: decimal("highEventMultiplier", { precision: 4, scale: 2 }).default("1.35"),
  mediumEventMultiplier: decimal("mediumEventMultiplier", { precision: 4, scale: 2 }).default("1.15"),
  lowDemandMultiplier: decimal("lowDemandMultiplier", { precision: 4, scale: 2 }).default("0.90"),
  peakSeasonMultiplier: decimal("peakSeasonMultiplier", { precision: 4, scale: 2 }).default("1.25"),
  offSeasonMultiplier: decimal("offSeasonMultiplier", { precision: 4, scale: 2 }).default("0.85"),
  minPrice: decimal("minPrice", { precision: 10, scale: 2 }),
  maxPrice: decimal("maxPrice", { precision: 10, scale: 2 }),
  peakMonthsJson: text("peakMonthsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  source: mysqlEnum("source", ["eventbrite", "facebook", "city_calendar", "sports", "festival", "conference", "manual", "other"]).default("manual").notNull(),
  category: mysqlEnum("category", ["sports", "music", "festival", "conference", "holiday", "local", "other"]).default("other").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  demandImpact: mysqlEnum("demandImpact", ["high", "medium", "low"]).default("medium").notNull(),
  demandScore: decimal("demandScore", { precision: 4, scale: 2 }).default("5.0"),
  expectedAttendance: int("expectedAttendance"),
  venue: varchar("venue", { length: 500 }),
  url: varchar("url", { length: 1000 }),
  isRecurring: boolean("isRecurring").default(false),
  tagsJson: text("tagsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export const calendarData = mysqlTable("calendar_data", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  suggestedPrice: decimal("suggestedPrice", { precision: 10, scale: 2 }),
  demandScore: decimal("demandScore", { precision: 4, scale: 2 }),
  demandLevel: mysqlEnum("demandLevel", ["high", "medium", "low"]).default("medium"),
  isBooked: boolean("isBooked").default(false),
  actualPrice: decimal("actualPrice", { precision: 10, scale: 2 }),
  priceReasonsJson: text("priceReasonsJson"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarData = typeof calendarData.$inferSelect;
export type InsertCalendarData = typeof calendarData.$inferInsert;

export const listingSuggestions = mysqlTable("listing_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  generatedTitle: text("generatedTitle"),
  generatedDescription: text("generatedDescription"),
  guestType: varchar("guestType", { length: 100 }),
  eventContextJson: text("eventContextJson"),
  isApplied: boolean("isApplied").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ListingSuggestion = typeof listingSuggestions.$inferSelect;
export type InsertListingSuggestion = typeof listingSuggestions.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tier: mysqlEnum("tier", ["free", "pro", "advanced"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "trial"]).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
