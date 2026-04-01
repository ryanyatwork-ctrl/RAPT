import { PricingRule, Event } from "../drizzle/schema";

export interface PricingInput {
  basePrice: number;
  date: Date;
  events: Event[];
  rules: PricingRule;
}

export interface PricingOutput {
  suggestedPrice: number;
  demandScore: number;
  demandLevel: "high" | "medium" | "low";
  reasons: string[];
  multipliers: {
    weekend?: number;
    holiday?: number;
    event?: number;
    season?: number;
  };
}

const US_HOLIDAYS_2025_2026: Record<string, string> = {
  "2025-01-01": "New Year's Day",
  "2025-01-20": "Martin Luther King Jr. Day",
  "2025-02-17": "Presidents' Day",
  "2025-05-26": "Memorial Day",
  "2025-07-04": "Independence Day",
  "2025-09-01": "Labor Day",
  "2025-11-27": "Thanksgiving",
  "2025-11-28": "Black Friday",
  "2025-12-24": "Christmas Eve",
  "2025-12-25": "Christmas Day",
  "2025-12-31": "New Year's Eve",
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-05-25": "Memorial Day",
  "2026-07-04": "Independence Day",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-11-27": "Black Friday",
  "2026-12-24": "Christmas Eve",
  "2026-12-25": "Christmas Day",
  "2026-12-31": "New Year's Eve",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
}

function getHoliday(date: Date): string | null {
  return US_HOLIDAYS_2025_2026[formatDate(date)] || null;
}

function isPeakSeason(date: Date, peakMonths: number[]): boolean {
  return peakMonths.includes(date.getMonth() + 1);
}

function isOffSeason(date: Date, peakMonths: number[]): boolean {
  const month = date.getMonth() + 1;
  // Off season is typically Nov-Feb for most markets (excluding holidays)
  const offMonths = [1, 2, 11];
  return offMonths.includes(month) && !peakMonths.includes(month);
}

function getEventsForDate(date: Date, events: Event[]): Event[] {
  const dateStr = formatDate(date);
  return events.filter(e => {
    const start = formatDate(new Date(e.startDate));
    const end = formatDate(new Date(e.endDate));
    return dateStr >= start && dateStr <= end;
  });
}

export function calculatePrice(input: PricingInput): PricingOutput {
  const { basePrice, date, events, rules } = input;
  const reasons: string[] = [];
  const multipliers: PricingOutput["multipliers"] = {};
  let price = basePrice;
  let demandScore = 5.0;

  const peakMonths = rules.peakMonthsJson
    ? JSON.parse(rules.peakMonthsJson) as number[]
    : [6, 7, 8];

  // Weekend multiplier
  if (isWeekend(date)) {
    const mult = parseFloat(String(rules.weekendMultiplier || "1.30"));
    price *= mult;
    multipliers.weekend = mult;
    demandScore += 1.5;
    reasons.push(`Weekend pricing (+${Math.round((mult - 1) * 100)}%)`);
  }

  // Holiday multiplier
  const holiday = getHoliday(date);
  if (holiday) {
    const mult = parseFloat(String(rules.holidayMultiplier || "1.45"));
    price *= mult;
    multipliers.holiday = mult;
    demandScore += 2.0;
    reasons.push(`Holiday: ${holiday} (+${Math.round((mult - 1) * 100)}%)`);
  }

  // Event multiplier
  const dateEvents = getEventsForDate(date, events);
  if (dateEvents.length > 0) {
    const highEvents = dateEvents.filter(e => e.demandImpact === "high");
    const medEvents = dateEvents.filter(e => e.demandImpact === "medium");

    if (highEvents.length > 0) {
      const mult = parseFloat(String(rules.highEventMultiplier || "1.35"));
      price *= mult;
      multipliers.event = mult;
      demandScore += 2.5;
      reasons.push(`High-demand event: ${highEvents[0].title} (+${Math.round((mult - 1) * 100)}%)`);
    } else if (medEvents.length > 0) {
      const mult = parseFloat(String(rules.mediumEventMultiplier || "1.15"));
      price *= mult;
      multipliers.event = mult;
      demandScore += 1.0;
      reasons.push(`Local event: ${medEvents[0].title} (+${Math.round((mult - 1) * 100)}%)`);
    }

    if (dateEvents.length > 1) {
      reasons.push(`+${dateEvents.length - 1} more event(s) nearby`);
    }
  }

  // Seasonality
  if (isPeakSeason(date, peakMonths)) {
    const mult = parseFloat(String(rules.peakSeasonMultiplier || "1.25"));
    price *= mult;
    multipliers.season = mult;
    demandScore += 1.0;
    reasons.push(`Peak season (+${Math.round((mult - 1) * 100)}%)`);
  } else if (isOffSeason(date, peakMonths)) {
    const mult = parseFloat(String(rules.offSeasonMultiplier || "0.85"));
    price *= mult;
    multipliers.season = mult;
    demandScore -= 1.0;
    reasons.push(`Off-season discount (${Math.round((mult - 1) * 100)}%)`);
  }

  // Low demand fallback
  if (reasons.length === 0) {
    const mult = parseFloat(String(rules.lowDemandMultiplier || "0.90"));
    price *= mult;
    demandScore -= 0.5;
    reasons.push(`Standard weekday rate (${Math.round((mult - 1) * 100)}%)`);
  }

  // Apply min/max caps
  const minPrice = rules.minPrice ? parseFloat(String(rules.minPrice)) : basePrice * 0.5;
  const maxPrice = rules.maxPrice ? parseFloat(String(rules.maxPrice)) : basePrice * 4;
  price = Math.max(minPrice, Math.min(maxPrice, price));

  // Clamp demand score
  demandScore = Math.max(1, Math.min(10, demandScore));

  const demandLevel: "high" | "medium" | "low" =
    demandScore >= 7.5 ? "high" : demandScore >= 5 ? "medium" : "low";

  return {
    suggestedPrice: Math.round(price),
    demandScore: Math.round(demandScore * 10) / 10,
    demandLevel,
    reasons,
    multipliers,
  };
}

export function generateMonthPricing(
  basePrice: number,
  year: number,
  month: number,
  events: Event[],
  rules: PricingRule
): Array<{ date: string } & PricingOutput> {
  const results = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const pricing = calculatePrice({ basePrice, date, events, rules });
    results.push({ date: formatDate(date), ...pricing });
  }

  return results;
}

export function calculateRevenueForecast(
  monthPricing: Array<{ suggestedPrice: number; demandLevel: string }>,
  occupancyRates: Record<string, number> = { high: 0.85, medium: 0.65, low: 0.40 }
): { projected: number; optimized: number; occupancyRate: number } {
  let projected = 0;
  let totalOccupancy = 0;

  for (const day of monthPricing) {
    const rate = occupancyRates[day.demandLevel] || 0.55;
    projected += day.suggestedPrice * rate;
    totalOccupancy += rate;
  }

  const avgOccupancy = totalOccupancy / monthPricing.length;
  const optimized = projected * 1.12; // 12% uplift from optimization

  return {
    projected: Math.round(projected),
    optimized: Math.round(optimized),
    occupancyRate: Math.round(avgOccupancy * 100),
  };
}
