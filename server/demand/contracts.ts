import { z } from "zod";

export const demandSourceCandidateSchema = z.object({
  name: z.string().min(1),
  canonicalUrl: z.string().url(),
  sourceType: z.enum([
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
  ]),
  authorityClass: z.enum([
    "official_primary",
    "official_secondary",
    "venue_primary",
    "regional_tourism",
    "trusted_media",
    "aggregator",
    "social_public",
    "host_supplied",
  ]),
  geographicScope: z.string().min(1),
  eventTypes: z.array(z.string().min(1)).default([]),
  futureDatesVisible: z.boolean(),
  availabilityStateVisible: z.boolean().default(false),
  estimatedTravelRelevance: z.number().min(0).max(1),
  suggestedRefreshCadenceMinutes: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    url: z.string().url(),
    note: z.string().min(1),
  })).min(1),
  collectionConstraints: z.string().nullable().default(null),
  recommendedStatus: z.literal("candidate").default("candidate"),
});

export const demandSignalCandidateSchema = z.object({
  title: z.string().min(1),
  seriesIdentity: z.string().nullable().default(null),
  signalType: z.enum([
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
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  venue: z.string().nullable().default(null),
  location: z.object({
    city: z.string().nullable().default(null),
    state: z.string().nullable().default(null),
    postalCode: z.string().nullable().default(null),
    country: z.string().default("US"),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
  }),
  expectedAttendance: z.number().int().nonnegative().nullable().default(null),
  participantTravelPropensity: z.number().min(0).max(1),
  overnightLodgingPropensity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    sourceName: z.string().min(1),
    url: z.string().url(),
    publishedOrUpdatedAt: z.string().datetime().nullable().default(null),
    note: z.string().min(1),
  })).min(1),
  status: z.literal("candidate").default("candidate"),
});

export type DemandSourceCandidate = z.infer<typeof demandSourceCandidateSchema>;
export type DemandSignalCandidate = z.infer<typeof demandSignalCandidateSchema>;

/**
 * Strict parsing boundary for Gemini/Opal/LLM output. AI may propose sources and
 * future signals, but invalid or unsourced output never enters the pricing path.
 */
export function parseDemandSourceCandidate(input: unknown): DemandSourceCandidate {
  return demandSourceCandidateSchema.parse(input);
}

export function parseDemandSignalCandidate(input: unknown): DemandSignalCandidate {
  return demandSignalCandidateSchema.parse(input);
}
