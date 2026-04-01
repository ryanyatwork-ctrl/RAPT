import axios from "axios";
import type { InsertEvent } from "../drizzle/schema";

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY || "";
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || "";

export interface EventApiResult {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  category: "sports" | "music" | "festival" | "conference" | "holiday" | "local" | "other";
  demandImpact: "high" | "medium" | "low";
  venue?: string;
  url?: string;
  source: "eventbrite" | "ticketmaster"; // Maps to "eventbrite" or "festival" in DB
  expectedAttendance?: number;
}

/**
 * Fetch events from Eventbrite by zip code
 * Returns events within 50 miles of the zip code
 */
export async function fetchEventbriteEvents(zipCode: string): Promise<EventApiResult[]> {
  if (!EVENTBRITE_API_KEY) {
    console.warn("[Eventbrite] API key not configured");
    return [];
  }

  try {
    // Eventbrite API requires coordinates, so we'd need a geocoding service
    // For now, return empty - in production, integrate with Google Geocoding API
    console.log(`[Eventbrite] Would fetch events for zip code: ${zipCode}`);
    return [];
  } catch (error) {
    console.error("[Eventbrite] Error fetching events:", error);
    return [];
  }
}

/**
 * Fetch events from Ticketmaster by zip code
 * Returns events within 100 miles of the zip code
 */
export async function fetchTicketmasterEvents(zipCode: string): Promise<EventApiResult[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn("[Ticketmaster] API key not configured");
    return [];
  }

  try {
    const response = await axios.get("https://app.ticketmaster.com/discovery/v2/events.json", {
      params: {
        apikey: TICKETMASTER_API_KEY,
        postalCode: zipCode,
        countryCode: "US",
        radius: 100,
        unit: "miles",
        size: 50,
      },
    });

    const events = response.data._embedded?.events || [];

    return events.map((event: any) => {
      const startDate = new Date(event.dates?.start?.dateTime || event.dates?.start?.localDate);
      const endDate = new Date(event.dates?.end?.dateTime || event.dates?.end?.localDate);

      // Determine category from classifications
      let category: EventApiResult["category"] = "other";
      if (event.classifications?.[0]) {
        const segment = event.classifications[0].segment?.name?.toLowerCase() || "";
        const genre = event.classifications[0].genre?.name?.toLowerCase() || "";
        
        if (segment.includes("sports") || genre.includes("sports")) category = "sports";
        else if (segment.includes("music") || genre.includes("music")) category = "music";
        else if (segment.includes("festival")) category = "festival";
        else if (segment.includes("conference")) category = "conference";
      }

      // Estimate demand impact based on event type and size
      let demandImpact: EventApiResult["demandImpact"] = "medium";
      if (category === "sports" || category === "music" || category === "festival") {
        demandImpact = "high";
      }

      return {
        title: event.name,
        description: event.description,
        startDate,
        endDate,
        category,
        demandImpact,
        venue: event._embedded?.venues?.[0]?.name,
        url: event.url,
        source: "ticketmaster",
        expectedAttendance: undefined, // Ticketmaster doesn't provide attendance
      };
    });
  } catch (error) {
    console.error("[Ticketmaster] Error fetching events:", error);
    return [];
  }
}

/**
 * Fetch events from both sources and deduplicate
 */
export async function fetchAllEvents(zipCode: string): Promise<EventApiResult[]> {
  const [eventbriteEvents, ticketmasterEvents] = await Promise.all([
    fetchEventbriteEvents(zipCode),
    fetchTicketmasterEvents(zipCode),
  ]);

  const allEvents = [...eventbriteEvents, ...ticketmasterEvents];

  // Deduplicate by title and date similarity
  const seen = new Set<string>();
  const deduped: EventApiResult[] = [];

  for (const event of allEvents) {
    const key = `${event.title.toLowerCase().trim()}-${event.startDate.toISOString().split("T")[0]}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(event);
    }
  }

  return deduped;
}

/**
 * Convert EventApiResult to InsertEvent for database storage
 */
export function convertToInsertEvent(
  propertyId: number,
  apiEvent: EventApiResult
): InsertEvent {
  return {
    propertyId,
    title: apiEvent.title,
    description: apiEvent.description || null,
    source: apiEvent.source === "eventbrite" ? "eventbrite" : "festival",
    category: apiEvent.category,
    startDate: apiEvent.startDate,
    endDate: apiEvent.endDate,
    demandImpact: apiEvent.demandImpact,
    demandScore: apiEvent.demandImpact === "high" ? "8.0" : apiEvent.demandImpact === "medium" ? "5.0" : "2.0",
    expectedAttendance: apiEvent.expectedAttendance || null,
    venue: apiEvent.venue || null,
    url: apiEvent.url || null,
    isRecurring: false,
    tagsJson: JSON.stringify(["auto-fetched"]),
  };
}
