import { PricingRule, Event } from "../drizzle/schema";

export interface PricingInput {
  basePrice: number;
  date: Date;
  events: Event[];
  rules: PricingRule;
  /**
   * Reference "today" for time-based pricing (near-term discounts / far-out
   * premiums). Defaults to the current date; pass explicitly to keep results
   * deterministic in tests.
   */
  referenceDate?: Date;
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
    /** Conservative/Aggressive strategy dial. */
    strategy?: number;
    /** Near-term discount or far-out premium based on lead time. */
    timing?: number;
    /** Month-by-month seasonality curve adjustment. */
    monthly?: number;
  };
}

/** Pricing posture: how aggressively to price vs. the data-driven recommendation. */
export type PricingStrategy = "conservative" | "recommended" | "aggressive";

/** Whole-recommendation multiplier for each strategy (±8%). */
const STRATEGY_MULTIPLIERS: Record<PricingStrategy, number> = {
  conservative: 0.92,
  recommended: 1.0,
  aggressive: 1.08,
};

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

/** Whole days between two dates (b - a), ignoring time-of-day. */
function daysBetween(a: Date, b: Date): number {
  const ms = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86_400_000);
}

/**
 * Time-based (lead-time) adjustment. Soon-vacant dates get a near-term
 * discount to fill the calendar; far-out dates get a premium because demand
 * for prime future dates is inelastic. Returns 1.0 (no-op) when unconfigured.
 */
function getTimingMultiplier(
  date: Date,
  referenceDate: Date,
  rules: PricingRule
): { mult: number; reason: string | null } {
  const lead = daysBetween(referenceDate, date);
  if (lead < 0) return { mult: 1, reason: null };

  const nearTermDiscount = parseFloat(String(rules.nearTermDiscount ?? "0")) || 0;
  const nearTermDays = Number(rules.nearTermDays ?? 0) || 0;
  if (nearTermDiscount > 0 && nearTermDays > 0 && lead <= nearTermDays) {
    const mult = 1 - nearTermDiscount;
    return { mult, reason: `Near-term fill discount (-${Math.round(nearTermDiscount * 100)}%)` };
  }

  const farOutPremium = parseFloat(String(rules.farOutPremium ?? "0")) || 0;
  const farOutDays = Number(rules.farOutDays ?? 0) || 0;
  if (farOutPremium > 0 && farOutDays > 0 && lead >= farOutDays) {
    const mult = 1 + farOutPremium;
    return { mult, reason: `Far-out demand premium (+${Math.round(farOutPremium * 100)}%)` };
  }

  return { mult: 1, reason: null };
}

/**
 * Month-by-month seasonality curve. `monthlyAdjustJson` maps month number
 * (1-12) to a percentage adjustment (e.g. { "7": 20 } = +20% in July).
 * Lets hosts fine-tune one month without touching the others. No-op when unset.
 */
function getMonthlyMultiplier(
  date: Date,
  rules: PricingRule
): { mult: number; reason: string | null } {
  if (!rules.monthlyAdjustJson) return { mult: 1, reason: null };
  let curve: Record<string, number>;
  try {
    curve = JSON.parse(rules.monthlyAdjustJson) as Record<string, number>;
  } catch {
    return { mult: 1, reason: null };
  }
  const pct = Number(curve[String(date.getMonth() + 1)] ?? 0);
  if (!pct) return { mult: 1, reason: null };
  const sign = pct > 0 ? "+" : "";
  return { mult: 1 + pct / 100, reason: `Seasonal adjustment (${sign}${Math.round(pct)}%)` };
}

export function calculatePrice(input: PricingInput): PricingOutput {
  const { basePrice, date, events, rules } = input;
  const referenceDate = input.referenceDate ?? new Date();
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

  // Low demand fallback — only when no demand-driven factor applied above
  if (reasons.length === 0) {
    const mult = parseFloat(String(rules.lowDemandMultiplier || "0.90"));
    price *= mult;
    demandScore -= 0.5;
    reasons.push(`Standard weekday rate (${Math.round((mult - 1) * 100)}%)`);
  }

  // Month-by-month seasonality curve (fine-tunes a single month)
  const monthly = getMonthlyMultiplier(date, rules);
  if (monthly.mult !== 1) {
    price *= monthly.mult;
    multipliers.monthly = monthly.mult;
    demandScore += monthly.mult > 1 ? 0.5 : -0.5;
    if (monthly.reason) reasons.push(monthly.reason);
  }

  // Time-based (lead-time) adjustment: near-term fill discount / far-out premium
  const timing = getTimingMultiplier(date, referenceDate, rules);
  if (timing.mult !== 1) {
    price *= timing.mult;
    multipliers.timing = timing.mult;
    demandScore += timing.mult > 1 ? 0.5 : -0.5;
    if (timing.reason) reasons.push(timing.reason);
  }

  // Strategy dial (conservative / recommended / aggressive) scales the whole result
  const strategy = (rules.strategy as PricingStrategy) || "recommended";
  const strategyMult = STRATEGY_MULTIPLIERS[strategy] ?? 1;
  if (strategyMult !== 1) {
    price *= strategyMult;
    multipliers.strategy = strategyMult;
    const sign = strategyMult > 1 ? "+" : "";
    reasons.push(`${strategy[0].toUpperCase()}${strategy.slice(1)} strategy (${sign}${Math.round((strategyMult - 1) * 100)}%)`);
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
  rules: PricingRule,
  referenceDate?: Date
): Array<{ date: string } & PricingOutput> {
  const results = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const pricing = calculatePrice({ basePrice, date, events, rules, referenceDate });
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

// ─── Length-of-stay discounts ──────────────────────────────────────────────────

export interface StayDiscountResult {
  nights: number;
  discountPct: number; // 0-1
  multiplier: number; // 1 - discountPct
  label: string | null;
}

/**
 * Airbnb-style length-of-stay discount. Monthly stays (28+ nights) take the
 * monthly rate; weekly stays (7+ nights) take the weekly rate. Returns a no-op
 * (multiplier 1) when the relevant discount is unset.
 */
export function getStayDiscount(nights: number, rules: PricingRule): StayDiscountResult {
  const weekly = parseFloat(String(rules.weeklyDiscount ?? "0")) || 0;
  const monthly = parseFloat(String(rules.monthlyDiscount ?? "0")) || 0;
  let discountPct = 0;
  let label: string | null = null;
  if (monthly > 0 && nights >= 28) {
    discountPct = monthly;
    label = `Monthly stay discount (-${Math.round(monthly * 100)}%)`;
  } else if (weekly > 0 && nights >= 7) {
    discountPct = weekly;
    label = `Weekly stay discount (-${Math.round(weekly * 100)}%)`;
  }
  return { nights, discountPct, multiplier: 1 - discountPct, label };
}

// ─── Orphan / gap-night detection ──────────────────────────────────────────────

export interface GapNight {
  date: string;
  gapLength: number; // length of the contiguous vacant run this night belongs to
  originalPrice: number;
  suggestedPrice: number; // discounted price to encourage a fill
}

/**
 * Finds "orphan"/gap nights: short vacant runs wedged between bookings that are
 * too short to satisfy the minimum stay, so they tend to go unbooked. These get
 * a gap discount to make them attractive. No-op when the gap discount is unset.
 */
export function findGapNights(
  days: Array<{ date: string; suggestedPrice: number; isBooked?: boolean }>,
  rules: PricingRule
): GapNight[] {
  const gapDiscount = parseFloat(String(rules.orphanGapDiscount ?? "0")) || 0;
  const minStay = Number(rules.minStay ?? 1) || 1;
  if (gapDiscount <= 0 || minStay <= 1) return [];

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const gaps: GapNight[] = [];
  let i = 0;
  while (i < sorted.length) {
    if (sorted[i].isBooked) { i++; continue; }
    let j = i;
    while (j < sorted.length && !sorted[j].isBooked) j++;
    const runLen = j - i;
    const boundedLeft = i > 0 && !!sorted[i - 1].isBooked;
    const boundedRight = j < sorted.length && !!sorted[j].isBooked;
    // A short vacant stretch bounded by a booking on either side is an orphan gap
    if (runLen < minStay && (boundedLeft || boundedRight)) {
      for (let k = i; k < j; k++) {
        gaps.push({
          date: sorted[k].date,
          gapLength: runLen,
          originalPrice: sorted[k].suggestedPrice,
          suggestedPrice: Math.round(sorted[k].suggestedPrice * (1 - gapDiscount)),
        });
      }
    }
    i = j;
  }
  return gaps;
}

// ─── RAPT Revenue Score ─────────────────────────────────────────────────────────

const DEFAULT_OCCUPANCY: Record<string, number> = { high: 0.85, medium: 0.65, low: 0.40 };

export interface RevenueScoreDay {
  date: string;
  suggestedPrice: number;
  demandLevel: "high" | "medium" | "low";
  isBooked?: boolean;
  actualPrice?: number | null;
}

export interface RevenueScore {
  score: number; // 0-100
  rating: "excellent" | "good" | "fair" | "needs_attention";
  occupancyPace: number; // 0-100: actual vs expected occupancy
  priceRealization: number; // 0-100: actual vs suggested price on booked nights
  bookedNights: number;
  totalNights: number;
  bookedRevenue: number;
  potentialRevenue: number;
  summary: string;
}

/**
 * RAPT Revenue Score — a single 0-100 health number for a forward window.
 * With no external market feed, it benchmarks the listing against its own
 * data-driven potential: how well booking pace tracks expected occupancy
 * (60%) and how well realized prices track RAPT's suggestions (40%).
 */
export function calculateRevenueScore(
  days: RevenueScoreDay[],
  occupancyRates: Record<string, number> = DEFAULT_OCCUPANCY
): RevenueScore {
  const totalNights = days.length;
  if (totalNights === 0) {
    return {
      score: 0, rating: "needs_attention", occupancyPace: 0, priceRealization: 0,
      bookedNights: 0, totalNights: 0, bookedRevenue: 0, potentialRevenue: 0,
      summary: "No upcoming dates to evaluate yet.",
    };
  }

  let expectedBookedNights = 0;
  let bookedNights = 0;
  let bookedRevenue = 0;
  let potentialRevenue = 0;
  let realizationSum = 0;
  let realizationCount = 0;

  for (const d of days) {
    const expOcc = occupancyRates[d.demandLevel] ?? 0.55;
    expectedBookedNights += expOcc;
    potentialRevenue += d.suggestedPrice * expOcc;
    if (d.isBooked) {
      bookedNights += 1;
      const paid = Number(d.actualPrice ?? d.suggestedPrice);
      bookedRevenue += paid;
      if (d.suggestedPrice > 0) {
        realizationSum += paid / d.suggestedPrice;
        realizationCount += 1;
      }
    }
  }

  // Occupancy pace: booked vs expected, capped at 100 for the score
  const paceRatio = expectedBookedNights > 0 ? bookedNights / expectedBookedNights : 0;
  const occupancyPace = Math.round(Math.min(1, paceRatio) * 100);

  // Price realization: realized price vs suggestion (neutral 100 when no bookings yet)
  const realizationRatio = realizationCount > 0 ? realizationSum / realizationCount : 1;
  const priceRealization = Math.round(Math.min(1, realizationRatio) * 100);

  const score = Math.round(0.6 * occupancyPace + 0.4 * priceRealization);
  const rating: RevenueScore["rating"] =
    score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "needs_attention";

  const summary =
    rating === "excellent" ? "You're outpacing your expected revenue — pricing and demand are well aligned."
    : rating === "good" ? "Solid performance. Small pricing tweaks could capture a bit more."
    : rating === "fair" ? "Room to improve — review booking pace and pricing for soft dates."
    : "Booking pace is below potential. Consider near-term discounts or filling gap nights.";

  return {
    score,
    rating,
    occupancyPace,
    priceRealization,
    bookedNights,
    totalNights,
    bookedRevenue: Math.round(bookedRevenue),
    potentialRevenue: Math.round(potentialRevenue),
    summary,
  };
}

// ─── Performance analytics (from actuals) ───────────────────────────────────────

export interface PerformanceDay {
  date: string;
  isBooked?: boolean;
  actualPrice?: number | null;
  suggestedPrice?: number | null;
}

export interface PerformanceMetrics {
  nights: number;
  bookedNights: number;
  occupancyRate: number; // %
  adr: number; // average daily rate of booked nights
  revpar: number; // revenue per available night
  revenue: number;
}

/**
 * Computes the core hospitality KPIs from booked calendar nights:
 * Occupancy, ADR (avg daily rate), RevPAR (revenue per available night),
 * and total Revenue. Uses actualPrice where present, else the suggestion.
 */
export function calculatePerformance(days: PerformanceDay[]): PerformanceMetrics {
  const nights = days.length;
  let bookedNights = 0;
  let revenue = 0;
  for (const d of days) {
    if (d.isBooked) {
      bookedNights += 1;
      revenue += Number(d.actualPrice ?? d.suggestedPrice ?? 0);
    }
  }
  const occupancyRate = nights ? (bookedNights / nights) * 100 : 0;
  const adr = bookedNights ? revenue / bookedNights : 0;
  const revpar = nights ? revenue / nights : 0;
  return {
    nights,
    bookedNights,
    occupancyRate: Math.round(occupancyRate),
    adr: Math.round(adr),
    revpar: Math.round(revpar),
    revenue: Math.round(revenue),
  };
}
