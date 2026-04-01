import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getPropertyById } from "./db";
import { fetchAllEvents, convertToInsertEvent, fetchTicketmasterEvents } from "./eventApis";
import { createEvent } from "./db";

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
