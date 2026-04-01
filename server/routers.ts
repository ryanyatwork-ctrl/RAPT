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
  getCalendarDataByPropertyAndMonth, upsertCalendarDay,
  getListingSuggestionsByPropertyId, createListingSuggestion, markSuggestionApplied,
  getSubscriptionByUserId, createOrUpdateSubscription,
  updateUserSubscription,
} from "./db";
import { generateMonthPricing, calculateRevenueForecast } from "./pricingEngine";
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
  })).mutation(async ({ ctx, input }) => {
    const { propertyId, peakMonths, ...rest } = input;
    const prop = await getPropertyById(propertyId, ctx.user.id);
    if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
    await upsertPricingRule({
      propertyId,
      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v !== undefined ? String(v) : undefined]).filter(([, v]) => v !== undefined)),
      ...(peakMonths ? { peakMonthsJson: JSON.stringify(peakMonths) } : {}),
    } as any);
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

    const prompt = `You are an expert Airbnb listing copywriter. Generate an optimized listing title and description for a short-term rental property.

Property Details:
- Name: ${prop.name}
- Location: ${prop.city || ''}, ${prop.state || ''} ${prop.country || 'US'}
- Type: ${prop.propertyType}
- Bedrooms: ${prop.bedrooms}, Bathrooms: ${prop.bathrooms}, Max Guests: ${prop.maxGuests}
- Description: ${prop.description || 'A comfortable rental property'}
- Features: ${input.propertyFeatures.join(', ') || 'standard amenities'}

Target Guest Type: ${input.guestType}
Upcoming Local Events: ${allEvents.length > 0 ? allEvents.join(', ') : 'general tourism'}

Requirements:
1. Title: 60-80 characters, catchy, include location and key appeal
2. Description: 150-200 words, highlight the property's unique value for the target guest, mention relevant local events/activities, use engaging language
3. Make it feel personal and inviting, not generic

Respond in JSON format:
{
  "title": "...",
  "description": "..."
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert short-term rental listing copywriter. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "listing_suggestion",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

    const parsed = JSON.parse(content) as { title: string; description: string };

    await createListingSuggestion({
      propertyId: input.propertyId,
      generatedTitle: parsed.title,
      generatedDescription: parsed.description,
      guestType: input.guestType,
      eventContextJson: JSON.stringify(allEvents),
    });

    return { title: parsed.title, description: parsed.description };
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
