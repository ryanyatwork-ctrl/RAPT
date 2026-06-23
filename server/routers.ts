import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import {
  getPropertiesByUserId, getPropertyById, createProperty, updateProperty, deleteProperty, countPropertiesByUserId,
  getPricingRuleByPropertyId, upsertPricingRule,
  getEventsByPropertyId, createEvent, updateEvent, deleteEvent,
  getCalendarDataByPropertyAndMonth, getCalendarDataByPropertyAndRange, upsertCalendarDay,
  getListingSuggestionsByPropertyId, createListingSuggestion, markSuggestionApplied,
  getSubscriptionByUserId, createOrUpdateSubscription,
  updateUserSubscription,
} from "./db";
import {
  generateMonthPricing, calculateRevenueForecast,
  calculateRevenueScore, calculatePerformance, findGapNights,
} from "./pricingEngine";
import type { InsertPricingRule } from "../drizzle/schema";
import { adminRouter, stripeRouter } from "./adminRouters";
import { eventFetchRouter } from "./eventFetchRouter";

const TIER_LIMITS = {
  free: { maxProperties: 1, aiListings: false, automation: false },
  pro: { maxProperties: 10, aiListings: true, automation: false },
  advanced: { maxProperties: 999, aiListings: true, automation: true },
};

// ─── Property Router ──────────────────────────────────────────────────────────

const propertyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getPropertiesByUserId(ctx.user.id);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.id, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
    return prop;
  }),

  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(255),
    location: z.string().min(1),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional().default("US"),
    propertyType: z.enum(["cabin", "house", "condo", "apartment", "villa", "cottage", "other"]).default("house"),
    basePrice: z.number().positive(),
    bedrooms: z.number().int().min(1).optional().default(1),
    bathrooms: z.number().int().min(1).optional().default(1),
    maxGuests: z.number().int().min(1).optional().default(2),
    description: z.string().optional(),
    amenities: z.array(z.string()).optional().default([]),
  })).mutation(async ({ ctx, input }) => {
    const tier = ctx.user.subscriptionTier || "free";
    const limits = TIER_LIMITS[tier];
    const count = await countPropertiesByUserId(ctx.user.id);
    if (count >= limits.maxProperties) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your ${tier} plan allows up to ${limits.maxProperties} propert${limits.maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.`,
      });
    }
    const result = await createProperty({
      userId: ctx.user.id,
      name: input.name,
      location: input.location,
      city: input.city,
      state: input.state,
      country: input.country,
      propertyType: input.propertyType,
      basePrice: String(input.basePrice),
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      maxGuests: input.maxGuests,
      description: input.description,
      amenitiesJson: JSON.stringify(input.amenities),
    });
    // Create default pricing rules for the property
    const propId = result.insertId;
    await upsertPricingRule({ propertyId: propId, peakMonthsJson: JSON.stringify([6, 7, 8]) });
    return { id: propId };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().min(1).max(255).optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    propertyType: z.enum(["cabin", "house", "condo", "apartment", "villa", "cottage", "other"]).optional(),
    basePrice: z.number().positive().optional(),
    bedrooms: z.number().int().min(1).optional(),
    bathrooms: z.number().int().min(1).optional(),
    maxGuests: z.number().int().min(1).optional(),
    description: z.string().optional(),
    amenities: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { id, amenities, basePrice, ...rest } = input;
    await updateProperty(id, ctx.user.id, {
      ...rest,
      ...(basePrice !== undefined ? { basePrice: String(basePrice) } : {}),
      ...(amenities !== undefined ? { amenitiesJson: JSON.stringify(amenities) } : {}),
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await deleteProperty(input.id, ctx.user.id);
    return { success: true };
  }),
});

// ─── Pricing Router ───────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Builds per-day pricing across an arbitrary date range and merges in booking
 * actuals from the calendar (isBooked / actualPrice). Shared by the Revenue
 * Score, Performance, and gap-night endpoints.
 */
async function buildRangePricing(propertyId: number, userId: number, start: Date, end: Date) {
  const prop = await getPropertyById(propertyId, userId);
  if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
  const rules = await getPricingRuleByPropertyId(propertyId);
  if (!rules) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing rules found" });

  const startStr = fmtDate(start);
  const endStr = fmtDate(end);
  const eventsData = await getEventsByPropertyId(propertyId, start, end);
  const cal = await getCalendarDataByPropertyAndRange(propertyId, startStr, endStr);
  const calMap = new Map(cal.map(c => [c.date, c]));
  const basePrice = parseFloat(String(prop.basePrice));

  const days: Array<{
    date: string;
    suggestedPrice: number;
    demandLevel: "high" | "medium" | "low";
    isBooked: boolean;
    actualPrice: number | null;
  }> = [];

  let y = start.getFullYear();
  let m = start.getMonth() + 1;
  const endY = end.getFullYear();
  const endM = end.getMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    const monthPricing = generateMonthPricing(basePrice, y, m, eventsData, rules, start);
    for (const d of monthPricing) {
      if (d.date >= startStr && d.date <= endStr) {
        const c = calMap.get(d.date);
        days.push({
          date: d.date,
          suggestedPrice: d.suggestedPrice,
          demandLevel: d.demandLevel,
          isBooked: !!c?.isBooked,
          actualPrice: c?.actualPrice != null ? parseFloat(String(c.actualPrice)) : null,
        });
      }
    }
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return { prop, rules, days };
}

const pricingRouter = router({
  getRules: protectedProcedure.input(z.object({ propertyId: z.number() })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    return getPricingRuleByPropertyId(input.propertyId);
  }),

  updateRules: protectedProcedure.input(z.object({
    propertyId: z.number(),
    weekendMultiplier: z.number().min(0.5).max(3).optional(),
    holidayMultiplier: z.number().min(0.5).max(3).optional(),
    highEventMultiplier: z.number().min(0.5).max(3).optional(),
    mediumEventMultiplier: z.number().min(0.5).max(3).optional(),
    lowDemandMultiplier: z.number().min(0.5).max(1.5).optional(),
    peakSeasonMultiplier: z.number().min(0.5).max(3).optional(),
    offSeasonMultiplier: z.number().min(0.5).max(1.5).optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    peakMonths: z.array(z.number().int().min(1).max(12)).optional(),
    // Strategy + advanced (Wheelhouse-inspired) controls
    strategy: z.enum(["conservative", "recommended", "aggressive"]).optional(),
    nearTermDiscount: z.number().min(0).max(0.9).optional(),
    nearTermDays: z.number().int().min(0).max(60).optional(),
    farOutPremium: z.number().min(0).max(1).optional(),
    farOutDays: z.number().int().min(0).max(365).optional(),
    monthlyAdjust: z.record(z.string(), z.number()).optional(), // { "<month 1-12>": percent }
    weeklyDiscount: z.number().min(0).max(0.9).optional(),
    monthlyDiscount: z.number().min(0).max(0.9).optional(),
    minStay: z.number().int().min(1).max(30).optional(),
    orphanGapDiscount: z.number().min(0).max(0.9).optional(),
  })).mutation(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });

    const patch: InsertPricingRule = { propertyId: input.propertyId };

    // Decimal columns are stored as strings
    const decimalFields = [
      "weekendMultiplier", "holidayMultiplier", "highEventMultiplier", "mediumEventMultiplier",
      "lowDemandMultiplier", "peakSeasonMultiplier", "offSeasonMultiplier", "minPrice", "maxPrice",
      "nearTermDiscount", "farOutPremium", "weeklyDiscount", "monthlyDiscount", "orphanGapDiscount",
    ] as const;
    for (const f of decimalFields) {
      const v = input[f];
      if (v !== undefined) (patch as Record<string, unknown>)[f] = String(v);
    }
    // Integer columns
    for (const f of ["nearTermDays", "farOutDays", "minStay"] as const) {
      const v = input[f];
      if (v !== undefined) (patch as Record<string, unknown>)[f] = v;
    }
    if (input.strategy !== undefined) patch.strategy = input.strategy;
    if (input.peakMonths !== undefined) patch.peakMonthsJson = JSON.stringify(input.peakMonths);
    if (input.monthlyAdjust !== undefined) patch.monthlyAdjustJson = JSON.stringify(input.monthlyAdjust);

    await upsertPricingRule(patch);
    return { success: true };
  }),

  getMonthPricing: protectedProcedure.input(z.object({
    propertyId: z.number(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
  })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    const rules = await getPricingRuleByPropertyId(input.propertyId);
    if (!rules) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing rules found" });
    const eventsData = await getEventsByPropertyId(
      input.propertyId,
      new Date(input.year, input.month - 1, 1),
      new Date(input.year, input.month, 0)
    );
    const basePrice = parseFloat(String(prop.basePrice));
    const pricing = generateMonthPricing(basePrice, input.year, input.month, eventsData, rules);
    return pricing;
  }),

  getForecast: protectedProcedure.input(z.object({
    propertyId: z.number(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
  })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    const rules = await getPricingRuleByPropertyId(input.propertyId);
    if (!rules) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing rules found" });
    const eventsData = await getEventsByPropertyId(
      input.propertyId,
      new Date(input.year, input.month - 1, 1),
      new Date(input.year, input.month, 0)
    );
    const basePrice = parseFloat(String(prop.basePrice));
    const pricing = generateMonthPricing(basePrice, input.year, input.month, eventsData, rules);
    const forecast = calculateRevenueForecast(pricing);
    // Also compute 6-month rolling forecast
    const months = [];
    for (let i = 0; i < 6; i++) {
      let m = input.month + i;
      let y = input.year;
      if (m > 12) { m -= 12; y += 1; }
      const mPricing = generateMonthPricing(basePrice, y, m, eventsData, rules);
      const mForecast = calculateRevenueForecast(mPricing);
      months.push({ year: y, month: m, ...mForecast });
    }
    return { current: forecast, months };
  }),

  // RAPT Revenue Score — 0-100 health number over a forward window
  getRevenueScore: protectedProcedure.input(z.object({
    propertyId: z.number(),
    windowDays: z.number().int().min(7).max(365).optional().default(90),
  })).query(async ({ ctx, input }) => {
    const start = new Date();
    const end = new Date(start.getTime() + input.windowDays * 24 * 60 * 60 * 1000);
    const { days } = await buildRangePricing(input.propertyId, ctx.user.id, start, end);
    return calculateRevenueScore(days);
  }),

  // Historical performance KPIs (Occupancy, ADR, RevPAR, Revenue) from actuals
  getPerformance: protectedProcedure.input(z.object({
    propertyId: z.number(),
    months: z.number().int().min(1).max(12).optional().default(6),
  })).query(async ({ ctx, input }) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (input.months - 1), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // end of current month
    const { days } = await buildRangePricing(input.propertyId, ctx.user.id, start, end);

    const overall = calculatePerformance(days);
    // Per-month breakdown for charting
    const byMonth = new Map<string, typeof days>();
    for (const d of days) {
      const key = d.date.slice(0, 7); // YYYY-MM
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(d);
    }
    const monthly = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, mdays]) => ({ month: key, ...calculatePerformance(mdays) }));

    return { overall, monthly };
  }),

  // Orphan / gap-night opportunities for a given month
  getGapNights: protectedProcedure.input(z.object({
    propertyId: z.number(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
  })).query(async ({ ctx, input }) => {
    const start = new Date(input.year, input.month - 1, 1);
    const end = new Date(input.year, input.month, 0);
    const { rules, days } = await buildRangePricing(input.propertyId, ctx.user.id, start, end);
    return findGapNights(days, rules);
  }),
});

// ─── Events Router ────────────────────────────────────────────────────────────

const eventsRouter = router({
  list: protectedProcedure.input(z.object({
    propertyId: z.number(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    return getEventsByPropertyId(
      input.propertyId,
      input.startDate ? new Date(input.startDate) : undefined,
      input.endDate ? new Date(input.endDate) : undefined
    );
  }),

  create: protectedProcedure.input(z.object({
    propertyId: z.number(),
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    source: z.enum(["eventbrite", "facebook", "city_calendar", "sports", "festival", "conference", "manual", "other"]).default("manual"),
    category: z.enum(["sports", "music", "festival", "conference", "holiday", "local", "other"]).default("other"),
    startDate: z.string(),
    endDate: z.string(),
    demandImpact: z.enum(["high", "medium", "low"]).default("medium"),
    demandScore: z.number().min(1).max(10).optional(),
    expectedAttendance: z.number().int().optional(),
    venue: z.string().optional(),
    url: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
  })).mutation(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    const { tags, demandScore, ...rest } = input;
    await createEvent({
      ...rest,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      demandScore: demandScore ? String(demandScore) : "5.0",
      tagsJson: JSON.stringify(tags),
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    demandImpact: z.enum(["high", "medium", "low"]).optional(),
    demandScore: z.number().min(1).max(10).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { id, demandScore, startDate, endDate, ...rest } = input;
    await updateEvent(id, {
      ...rest,
      ...(demandScore !== undefined ? { demandScore: String(demandScore) } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await deleteEvent(input.id);
    return { success: true };
  }),
});

// ─── AI Listing Router ────────────────────────────────────────────────────────

const listingRouter = router({
  getSuggestions: protectedProcedure.input(z.object({ propertyId: z.number() })).query(async ({ ctx, input }) => {
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    return getListingSuggestionsByPropertyId(input.propertyId);
  }),

  generate: protectedProcedure.input(z.object({
    propertyId: z.number(),
    guestType: z.string().default("general"),
    focusEvents: z.array(z.string()).optional().default([]),
    propertyFeatures: z.array(z.string()).optional().default([]),
  })).mutation(async ({ ctx, input }) => {
    const tier = ctx.user.subscriptionTier || "free";
    if (tier === "free") {
      throw new TRPCError({ code: "FORBIDDEN", message: "AI listing optimization requires a Pro or Advanced subscription." });
    }
    const prop = await getPropertyById(input.propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });

    const upcomingEvents = await getEventsByPropertyId(
      input.propertyId,
      new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    const eventNames = upcomingEvents.slice(0, 5).map(e => e.title);
    const allEvents = [...input.focusEvents, ...eventNames].slice(0, 5);

    const season = (() => {
      const m = new Date().getMonth() + 1;
      if (m >= 3 && m <= 5) return "spring";
      if (m >= 6 && m <= 8) return "summer";
      if (m >= 9 && m <= 11) return "fall";
      return "winter";
    })();

    const prompt = `You are a world-class Airbnb listing copywriter. Your listings convert browsers into bookers by being specific, evocative, and tailored to the guest's motivation.

Property Details:
- Name: ${prop.name}
- Location: ${prop.city || ''}, ${prop.state || ''} ${prop.country || 'US'}
- Type: ${prop.propertyType || 'vacation rental'}
- Bedrooms: ${prop.bedrooms}, Bathrooms: ${prop.bathrooms}, Max Guests: ${prop.maxGuests}
- Standout Features: ${input.propertyFeatures.join(', ') || 'comfortable amenities'}
- Property Context: ${prop.description || ''}

Target Guest Profile: ${input.guestType}
Current Season: ${season}
Upcoming Local Events & Activities: ${allEvents.length > 0 ? allEvents.join(', ') : 'general tourism, outdoor activities, local dining'}

Generate a complete high-converting listing package with these exact fields:

title: Primary title (50–65 chars). Lead with the strongest hook — specific location + top feature or experience. Never use "cozy", "charming", "beautiful", "spacious", "stunning", or "perfect". Be concrete and vivid.

titleVariants: Exactly 3 alternative titles (each 50–65 chars) with distinct angles:
  [0] Event/activity-focused — reference a specific local event or activity from the list above
  [1] Amenity-focused — lead with the single best physical feature of the property
  [2] Area/vibe-focused — capture the neighborhood or region's character and lifestyle

hook: One sentence, 15–25 words. The single most compelling reason to book this property. Should make someone pause mid-scroll.

subtitle: 10–15 words pairing the property type with the local lifestyle or experience.

description: 3 paragraphs, 250–350 words total.
  Paragraph 1 (Arrival): Paint what guests experience the moment they arrive. Sensory details. Make them feel they're already there.
  Paragraph 2 (The Space): Tour the property's standout features as if guiding a guest through. Be specific — exact features, not vague praise.
  Paragraph 3 (The Area): Connect the location to the target guest's interests. Reference the upcoming events or seasonal activities. End with a soft call to action.

seoKeywords: 6–8 search terms guests would type to find this property. Mix location terms, amenity terms, and guest-type terms.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert short-term rental listing copywriter. Respond only with the requested JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "listing_package",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              titleVariants: { type: "array", items: { type: "string" } },
              hook: { type: "string" },
              subtitle: { type: "string" },
              description: { type: "string" },
              seoKeywords: { type: "array", items: { type: "string" } },
            },
            required: ["title", "titleVariants", "hook", "subtitle", "description", "seoKeywords"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

    const parsed = JSON.parse(content) as {
      title: string;
      titleVariants: string[];
      hook: string;
      subtitle: string;
      description: string;
      seoKeywords: string[];
    };

    await createListingSuggestion({
      propertyId: input.propertyId,
      generatedTitle: parsed.title,
      generatedDescription: parsed.description,
      guestType: input.guestType,
      eventContextJson: JSON.stringify(allEvents),
      titleVariantsJson: JSON.stringify(parsed.titleVariants),
      hook: parsed.hook,
      subtitle: parsed.subtitle,
      seoKeywordsJson: JSON.stringify(parsed.seoKeywords),
    });

    return {
      title: parsed.title,
      titleVariants: parsed.titleVariants,
      hook: parsed.hook,
      subtitle: parsed.subtitle,
      description: parsed.description,
      seoKeywords: parsed.seoKeywords,
    };
  }),

  markApplied: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await markSuggestionApplied(input.id);
    return { success: true };
  }),
});

// ─── Subscription Router ──────────────────────────────────────────────────────

const subscriptionRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getSubscriptionByUserId(ctx.user.id);
    return {
      tier: ctx.user.subscriptionTier || "free",
      subscription: sub || null,
      limits: TIER_LIMITS[ctx.user.subscriptionTier || "free"],
    };
  }),

  upgrade: protectedProcedure.input(z.object({
    tier: z.enum(["pro", "advanced"]),
  })).mutation(async ({ ctx, input }) => {
    const prices = { pro: "14.00", advanced: "29.00" };
    await createOrUpdateSubscription({
      userId: ctx.user.id,
      tier: input.tier,
      status: "active",
      pricePerMonth: prices[input.tier],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await updateUserSubscription(ctx.user.id, input.tier);
    return { success: true, tier: input.tier };
  }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    await createOrUpdateSubscription({
      userId: ctx.user.id,
      tier: "free",
      status: "cancelled",
    });
    await updateUserSubscription(ctx.user.id, "free");
    return { success: true };
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  property: propertyRouter,
  pricing: pricingRouter,
  events: eventsRouter,
  listing: listingRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  stripe: stripeRouter,
  eventFetch: eventFetchRouter,
});

export type AppRouter = typeof appRouter;
