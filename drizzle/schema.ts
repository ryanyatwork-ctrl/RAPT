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

/**
 * Billing / ownership boundary. A single account may own properties in any
 * number of cities, ZIP codes, states, or overlapping demand areas. Plan
 * limits are based on active property count, never geography count.
 */
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "advanced"]).default("free").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  stripePaymentStatus: mysqlEnum("stripePaymentStatus", ["active", "past_due", "cancelled", "unpaid", "trial"]).default("trial"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export const accountMemberships = mysqlTable("account_memberships", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  status: mysqlEnum("status", ["active", "invited", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountMembership = typeof accountMemberships.$inferSelect;
export type InsertAccountMembership = typeof accountMemberships.$inferInsert;

/** Portfolio is an organizational grouping, not a geographic market. */
export const portfolios = mysqlTable("portfolios", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  portfolioId: int("portfolioId"),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  addressLine1: varchar("addressLine1", { length: 255 }),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postalCode", { length: 32 }),
  country: varchar("country", { length: 100 }).default("US"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  timezone: varchar("timezone", { length: 100 }),
  locationPrecision: mysqlEnum("locationPrecision", ["exact", "postal_centroid", "city_centroid", "unknown"]).default("unknown"),
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

/** Reusable non-exclusive geographic areas. Properties may overlap many. */
export const marketAreas = mysqlTable("market_areas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  areaType: mysqlEnum("areaType", ["city", "metro", "region", "corridor", "venue_cluster", "custom"]).default("custom").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("US"),
  centroidLatitude: decimal("centroidLatitude", { precision: 10, scale: 7 }),
  centroidLongitude: decimal("centroidLongitude", { precision: 10, scale: 7 }),
  radiusMiles: decimal("radiusMiles", { precision: 8, scale: 2 }),
  boundaryJson: text("boundaryJson"),
  source: varchar("source", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketArea = typeof marketAreas.$inferSelect;
export type InsertMarketArea = typeof marketAreas.$inferInsert;

export const propertyMarketAreas = mysqlTable("property_market_areas", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  marketAreaId: int("marketAreaId").notNull(),
  relationshipType: mysqlEnum("relationshipType", ["primary", "overlap", "corridor", "discovered"]).default("discovered").notNull(),
  relevanceWeight: decimal("relevanceWeight", { precision: 5, scale: 4 }).default("1.0000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyMarketArea = typeof propertyMarketAreas.$inferSelect;
export type InsertPropertyMarketArea = typeof propertyMarketAreas.$inferInsert;

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

/** Legacy property-bound event table retained for compatibility. */
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

/** Shared public source registry. */
export const demandSources = mysqlTable("demand_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  canonicalUrl: varchar("canonicalUrl", { length: 1500 }).notNull(),
  sourceType: mysqlEnum("sourceType", [
    "university",
    "sports",
    "tournament_platform",
    "fairgrounds",
    "wedding_venue",
    "tourism",
    "municipal",
    "performing_arts",
    "conference",
    "corporate",
    "transportation",
    "emergency",
    "seasonal",
    "niche_community",
    "aggregator",
    "other",
  ]).default("other").notNull(),
  authorityClass: mysqlEnum("authorityClass", [
    "official_primary",
    "official_secondary",
    "venue_primary",
    "regional_tourism",
    "trusted_media",
    "aggregator",
    "social_public",
    "host_supplied",
  ]).default("aggregator").notNull(),
  geographicScope: varchar("geographicScope", { length: 500 }),
  eventTypesJson: text("eventTypesJson"),
  refreshCadenceMinutes: int("refreshCadenceMinutes"),
  collectorType: mysqlEnum("collectorType", ["api", "feed", "html", "availability", "llm_assisted", "manual", "other"]).default("html").notNull(),
  structuredFeedAvailable: boolean("structuredFeedAvailable").default(false).notNull(),
  confidenceBaseline: decimal("confidenceBaseline", { precision: 5, scale: 4 }).default("0.5000"),
  termsNotes: text("termsNotes"),
  lastSuccessfulFetch: timestamp("lastSuccessfulFetch"),
  lastChangedAt: timestamp("lastChangedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DemandSource = typeof demandSources.$inferSelect;
export type InsertDemandSource = typeof demandSources.$inferInsert;

/** A recurring series is separate from each dated occurrence. */
export const demandSignalSeries = mysqlTable("demand_signal_series", {
  id: int("id").autoincrement().primaryKey(),
  canonicalName: varchar("canonicalName", { length: 500 }).notNull(),
  signalType: varchar("signalType", { length: 100 }).notNull(),
  organizerName: varchar("organizerName", { length: 500 }),
  organizerUrl: varchar("organizerUrl", { length: 1500 }),
  defaultVenue: varchar("defaultVenue", { length: 500 }),
  recurrenceNotes: text("recurrenceNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DemandSignalSeries = typeof demandSignalSeries.$inferSelect;
export type InsertDemandSignalSeries = typeof demandSignalSeries.$inferInsert;

/** Shared forward-looking occurrence. Relevance is calculated per property. */
export const demandSignals = mysqlTable("demand_signals", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId"),
  seriesId: int("seriesId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  signalType: mysqlEnum("signalType", [
    "sports",
    "graduation",
    "wedding_private_event",
    "rodeo_fair",
    "festival",
    "music",
    "conference",
    "expo_trade",
    "hobby_competition",
    "corporate_project",
    "transportation",
    "displacement",
    "seasonal",
    "other",
  ]).default("other").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  venue: varchar("venue", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postalCode", { length: 32 }),
  country: varchar("country", { length: 100 }).default("US"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  footprintRadiusMiles: decimal("footprintRadiusMiles", { precision: 8, scale: 2 }),
  expectedAttendance: int("expectedAttendance"),
  travelPropensity: decimal("travelPropensity", { precision: 5, scale: 4 }),
  overnightLodgingPropensity: decimal("overnightLodgingPropensity", { precision: 5, scale: 4 }),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).default("0.5000"),
  provenanceJson: text("provenanceJson"),
  status: mysqlEnum("status", ["candidate", "validated", "approved", "rejected", "cancelled", "expired"]).default("candidate").notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DemandSignal = typeof demandSignals.$inferSelect;
export type InsertDemandSignal = typeof demandSignals.$inferInsert;

/** Persistent places/systems that guide discovery for a specific property. */
export const propertyDemandAnchors = mysqlTable("property_demand_anchors", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  anchorType: mysqlEnum("anchorType", [
    "university",
    "football_stadium",
    "sports_complex",
    "wedding_venue",
    "rodeo_fairground",
    "convention_center",
    "hospital",
    "employer_campus",
    "airport",
    "performing_arts",
    "recreation",
    "custom",
  ]).default("custom").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  address: varchar("address", { length: 750 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  driveMinutes: int("driveMinutes"),
  driveMiles: decimal("driveMiles", { precision: 8, scale: 2 }),
  sourceUrlsJson: text("sourceUrlsJson"),
  eventCategoriesJson: text("eventCategoriesJson"),
  userPriority: decimal("userPriority", { precision: 5, scale: 4 }).default("0.5000"),
  learnedAffinityScore: decimal("learnedAffinityScore", { precision: 5, scale: 4 }).default("0.0000"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyDemandAnchor = typeof propertyDemandAnchors.$inferSelect;
export type InsertPropertyDemandAnchor = typeof propertyDemandAnchors.$inferInsert;

/** Which shared sources a property should continue watching. */
export const propertyDemandSources = mysqlTable("property_demand_sources", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  sourceId: int("sourceId").notNull(),
  discoveryReason: text("discoveryReason"),
  priority: decimal("priority", { precision: 5, scale: 4 }).default("0.5000"),
  status: mysqlEnum("status", ["candidate", "validated", "active", "ignored"]).default("candidate").notNull(),
  refreshOverrideMinutes: int("refreshOverrideMinutes"),
  lastCheckedAt: timestamp("lastCheckedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyDemandSource = typeof propertyDemandSources.$inferSelect;
export type InsertPropertyDemandSource = typeof propertyDemandSources.$inferInsert;

/** Derived relevance. The same signal may be strong for one property and irrelevant for another. */
export const propertySignalRelevance = mysqlTable("property_signal_relevance", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  signalId: int("signalId").notNull(),
  distanceMiles: decimal("distanceMiles", { precision: 8, scale: 2 }),
  driveMinutes: int("driveMinutes"),
  driveMiles: decimal("driveMiles", { precision: 8, scale: 2 }),
  relevanceScore: decimal("relevanceScore", { precision: 5, scale: 4 }).notNull(),
  relevanceLevel: mysqlEnum("relevanceLevel", ["irrelevant", "weak", "moderate", "strong"]).notNull(),
  travelPropensityScore: decimal("travelPropensityScore", { precision: 5, scale: 4 }),
  propertyFitScore: decimal("propertyFitScore", { precision: 5, scale: 4 }),
  affinityBoost: decimal("affinityBoost", { precision: 5, scale: 4 }).default("0.0000"),
  observedResponseScore: decimal("observedResponseScore", { precision: 5, scale: 4 }).default("0.0000"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).default("0.5000"),
  explanationJson: text("explanationJson"),
  algorithmVersion: varchar("algorithmVersion", { length: 64 }).default("v1"),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertySignalRelevance = typeof propertySignalRelevance.$inferSelect;
export type InsertPropertySignalRelevance = typeof propertySignalRelevance.$inferInsert;

/** Private evidence about why a real stay occurred. */
export const propertySignalObservations = mysqlTable("property_signal_observations", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  signalId: int("signalId"),
  seriesId: int("seriesId"),
  reservationExternalId: varchar("reservationExternalId", { length: 255 }),
  observationType: mysqlEnum("observationType", ["guest_confirmed", "host_confirmed", "pms_inferred", "booking_overlap", "manual"]).default("manual").notNull(),
  strength: decimal("strength", { precision: 5, scale: 4 }).default("0.5000"),
  privateNotes: text("privateNotes"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertySignalObservation = typeof propertySignalObservations.$inferSelect;
export type InsertPropertySignalObservation = typeof propertySignalObservations.$inferInsert;

/** Learned calibration for a recurring series; never the primary discovery engine. */
export const propertySignalAffinity = mysqlTable("property_signal_affinity", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  seriesId: int("seriesId").notNull(),
  observedBookingCount: int("observedBookingCount").default(0).notNull(),
  confirmedAttributionCount: int("confirmedAttributionCount").default(0).notNull(),
  distinctYearsObserved: int("distinctYearsObserved").default(0).notNull(),
  affinityScore: decimal("affinityScore", { precision: 5, scale: 4 }).default("0.0000").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).default("0.0000").notNull(),
  lastObservedAt: timestamp("lastObservedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertySignalAffinity = typeof propertySignalAffinity.$inferSelect;
export type InsertPropertySignalAffinity = typeof propertySignalAffinity.$inferInsert;

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
