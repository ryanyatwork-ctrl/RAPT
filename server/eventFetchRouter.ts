import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getPropertyById } from "./db";
import { fetchAllEvents, convertToInsertEvent, fetchTicketmasterEvents } from "./eventApis";
import { createEvent } from "./db";
import { invokeLLM } from "./_core/llm";

export const eventFetchRouter = router({
  /**
   * Fetch events from external APIs by property zip code
   * Deduplicates and stores in database
   */
  fetchByZipCode: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        zipCode: z.string().min(5).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the property
      const property = await getPropertyById(input.propertyId, ctx.user.id);
      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      try {
        // Fetch events from all sources
        const apiEvents = await fetchAllEvents(input.zipCode);

        if (apiEvents.length === 0) {
          return {
            success: true,
            imported: 0,
            message: "No events found for this zip code",
          };
        }

        // Convert and store each event
        let importedCount = 0;
        for (const apiEvent of apiEvents) {
          try {
            const insertEvent = convertToInsertEvent(input.propertyId, apiEvent);
            await createEvent(insertEvent);
            importedCount++;
          } catch (error) {
            console.error("[Event Fetch] Error storing event:", error);
            // Continue with next event on error
          }
        }

        return {
          success: true,
          imported: importedCount,
          total: apiEvents.length,
          message: `Imported ${importedCount} of ${apiEvents.length} events`,
        };
      } catch (error) {
        console.error("[Event Fetch] Error fetching events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch events from external sources",
        });
      }
    }),

  /**
   * Use AI to discover likely local events based on property location and season.
   * Generates plausible recurring/seasonal events from model knowledge — not real-time verified.
   * Useful when Ticketmaster has no coverage for a zip code.
   */
  discoverWithAI: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const property = await getPropertyById(input.propertyId, ctx.user.id);
      if (!property) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
      }

      const location = [property.city, property.state, property.country || "US"].filter(Boolean).join(", ");
      const m = new Date().getMonth() + 1;
      const season = m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "fall" : "winter";
      const year = new Date().getFullYear();

      const prompt = `You are a local events expert. Generate a list of 10–15 realistic events and activities that commonly occur in or near ${location} over the next 90 days (starting ${new Date().toISOString().split("T")[0]}, during ${season} ${year}).

Focus on events that are:
- Annually recurring (festivals, races, fairs, markets, holiday events)
- Seasonally typical for this region in ${season}
- Relevant to short-term rental guests (draws people to the area)
- Drawn from your knowledge of the specific location

For each event provide:
- title: Event name (be specific, use real event names if you know them)
- description: 1–2 sentence description
- category: one of "sports", "music", "festival", "conference", "holiday", "local", "other"
- demandImpact: one of "high", "medium", "low" (based on how much it drives lodging demand)
- startDate: ISO date string (YYYY-MM-DD), estimate if exact date unknown
- endDate: ISO date string (YYYY-MM-DD)
- estimatedAttendance: integer estimate (null if unknown)

Return only events you have reasonable confidence occur in this area. Do not invent events with no basis.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a local events and tourism expert. Respond only with the requested JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_events",
            strict: true,
            schema: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      demandImpact: { type: "string" },
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      estimatedAttendance: { type: ["integer", "null"] },
                    },
                    required: ["title", "description", "category", "demandImpact", "startDate", "endDate", "estimatedAttendance"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["events"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI event discovery failed" });
      }

      type AiEvent = {
        title: string;
        description: string;
        category: string;
        demandImpact: string;
        startDate: string;
        endDate: string;
        estimatedAttendance: number | null;
      };
      const parsed = JSON.parse(content) as { events: AiEvent[] };

      const validCategories = new Set(["sports", "music", "festival", "conference", "holiday", "local", "other"]);
      const validImpacts = new Set(["high", "medium", "low"]);

      let imported = 0;
      for (const ev of parsed.events) {
        try {
          const start = new Date(ev.startDate);
          const end = new Date(ev.endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

          const category = validCategories.has(ev.category) ? ev.category as "sports" | "music" | "festival" | "conference" | "holiday" | "local" | "other" : "other";
          const demandImpact = validImpacts.has(ev.demandImpact) ? ev.demandImpact as "high" | "medium" | "low" : "medium";

          await createEvent({
            propertyId: input.propertyId,
            title: ev.title,
            description: ev.description || null,
            source: "other",
            category,
            startDate: start,
            endDate: end,
            demandImpact,
            demandScore: demandImpact === "high" ? "8.0" : demandImpact === "medium" ? "5.0" : "2.0",
            expectedAttendance: ev.estimatedAttendance || null,
            venue: null,
            url: null,
            isRecurring: true,
            tagsJson: JSON.stringify(["ai-discovered"]),
          });
          imported++;
        } catch (err) {
          console.error("[discoverWithAI] Error storing event:", err);
        }
      }

      return {
        success: true,
        imported,
        total: parsed.events.length,
        message: `AI discovered ${imported} events for ${location}`,
      };
    }),

  /**
   * Fetch only from Ticketmaster (most reliable)
   */
  fetchTicketmaster: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        zipCode: z.string().min(5).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const property = await getPropertyById(input.propertyId, ctx.user.id);
      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      try {
        const events = await fetchTicketmasterEvents(input.zipCode);

        if (events.length === 0) {
          return {
            success: true,
            imported: 0,
            message: "No Ticketmaster events found for this zip code",
          };
        }

        let importedCount = 0;
        for (const apiEvent of events) {
          try {
            const insertEvent = convertToInsertEvent(input.propertyId, apiEvent);
            await createEvent(insertEvent);
            importedCount++;
          } catch (error) {
            console.error("[Ticketmaster] Error storing event:", error);
          }
        }

        return {
          success: true,
          imported: importedCount,
          total: events.length,
          message: `Imported ${importedCount} Ticketmaster events`,
        };
      } catch (error) {
        console.error("[Ticketmaster] Error fetching events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Ticketmaster events",
        });
      }
    }),
});
