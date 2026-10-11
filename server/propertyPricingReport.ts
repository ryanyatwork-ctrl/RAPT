import type { Event, PricingRule } from "../drizzle/schema";
import { generateMonthPricing } from "./pricingEngine";
import { inspectRevenueDays } from "./revenueOpportunity";

export interface PricingReportCalendarDay {
  date: string;
  isBooked: boolean | null;
  actualPrice: string | null;
  updatedAt: Date;
}
export function buildPropertyPricingReport(input: {
  property: { id: number; name: string; city: string | null; state: string | null; basePrice: string };
  rules: PricingRule;
  events: Event[];
  calendar: PricingReportCalendarDay[];
  year: number;
  month: number;
  asOf: string; // YYYY-MM-DD in the property's local calendar
}) {
  const { property, rules, events, calendar, year, month, asOf } = input;
  const calendarByDate = new Map(calendar.map(day => [day.date, day]));
  const daily = generateMonthPricing(Number(property.basePrice), year, month, events, rules).map(day => {
    const observed = calendarByDate.get(day.date);
    const status = !observed || observed.isBooked === null ? "unknown" : observed.isBooked ? "booked" : "available";
    const daysUntilArrival = Math.round((Date.parse(day.date + "T00:00:00Z") - Date.parse(asOf + "T00:00:00Z")) / 86400000);
    const eventTitles = events.filter(event => {
      const start = new Date(event.startDate).toISOString().slice(0,10);
      const end = new Date(event.endDate).toISOString().slice(0,10);
      return start <= day.date && day.date <= end;
    }).map(event => event.title);
    return {
      ...day,
      availability: status,
      availabilitySource: observed ? "rapt_calendar" : "missing",
      calendarUpdatedAt: observed?.updatedAt.toISOString() ?? null,
      currentChannelRate: observed?.actualPrice === null || observed?.actualPrice === undefined ? null : Number(observed.actualPrice),
      eventTitles,
      daysUntilArrival,
    };
  });
  // Never infer availability from missing calendar rows. Findings only for explicitly available dates.
  const findings = inspectRevenueDays(daily.filter(day => day.availability === "available").map(day => ({
    date: day.date,
    suggestedPrice: day.suggestedPrice,
    booked: false,
    daysUntilArrival: day.daysUntilArrival,
    eventTitles: day.eventTitles,
  })));
  return {
    property: { id: property.id, name: property.name, city: property.city, state: property.state },
    period: { year, month, asOf },
    configuration: {
      basePrice: Number(property.basePrice),
      minPrice: rules.minPrice === null ? null : Number(rules.minPrice),
      maxPrice: rules.maxPrice === null ? null : Number(rules.maxPrice),
    },
    warning: "Read-only RAPT suggestions. Calendar data may not reflect channel availability; unknown dates must never be published automatically. Channel rate is RAPT-stored actualPrice, not a live OTA quote.",
    daily,
    findings,
  };
}
