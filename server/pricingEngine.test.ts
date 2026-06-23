import { describe, expect, it } from "vitest";
import {
  calculatePrice,
  generateMonthPricing,
  calculateRevenueForecast,
  calculateRevenueScore,
  calculatePerformance,
  getStayDiscount,
  findGapNights,
} from "./pricingEngine";
import type { PricingRule, Event } from "../drizzle/schema";

// Minimal mock pricing rule with all required fields
function mockRule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 1,
    propertyId: 1,
    weekendMultiplier: "1.30",
    holidayMultiplier: "1.45",
    highEventMultiplier: "1.35",
    mediumEventMultiplier: "1.15",
    lowDemandMultiplier: "0.90",
    peakSeasonMultiplier: "1.25",
    offSeasonMultiplier: "0.85",
    minPrice: null,
    maxPrice: null,
    peakMonthsJson: JSON.stringify([6, 7, 8]),
    strategy: "recommended",
    nearTermDiscount: "0.00",
    nearTermDays: 7,
    farOutPremium: "0.00",
    farOutDays: 90,
    monthlyAdjustJson: null,
    weeklyDiscount: "0.00",
    monthlyDiscount: "0.00",
    minStay: 1,
    orphanGapDiscount: "0.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    propertyId: 1,
    title: "Test Festival",
    description: null,
    source: "manual",
    category: "festival",
    startDate: new Date("2026-07-10"),
    endDate: new Date("2026-07-12"),
    demandImpact: "high",
    demandScore: "8.0",
    expectedAttendance: 5000,
    venue: "Test Venue",
    url: null,
    isRecurring: false,
    tagsJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generateMonthPricing", () => {
  it("generates one entry per day in the month", () => {
    const rule = mockRule();
    const result = generateMonthPricing(150, 2026, 3, [], rule);
    expect(result).toHaveLength(31); // March has 31 days
  });

  it("generates 28 entries for February 2026", () => {
    const rule = mockRule();
    const result = generateMonthPricing(150, 2026, 2, [], rule);
    expect(result).toHaveLength(28);
  });

  it("applies weekend multiplier on Saturday", () => {
    const rule = mockRule();
    // 2026-03-07 is a Saturday
    const result = generateMonthPricing(100, 2026, 3, [], rule);
    const saturday = result.find(d => d.date === "2026-03-07");
    expect(saturday).toBeDefined();
    expect(saturday!.suggestedPrice).toBeGreaterThan(100);
    expect(saturday!.reasons.some(r => r.toLowerCase().includes("weekend"))).toBe(true);
  });

  it("applies holiday multiplier on Independence Day", () => {
    const rule = mockRule();
    const result = generateMonthPricing(100, 2026, 7, [], rule);
    const july4 = result.find(d => d.date === "2026-07-04");
    expect(july4).toBeDefined();
    expect(july4!.reasons.some(r => r.toLowerCase().includes("independence"))).toBe(true);
    expect(july4!.suggestedPrice).toBeGreaterThan(100);
  });

  it("applies high event multiplier when high-impact event is present", () => {
    const rule = mockRule();
    const event = mockEvent({ demandImpact: "high" });
    const result = generateMonthPricing(100, 2026, 7, [event], rule);
    const eventDay = result.find(d => d.date === "2026-07-10");
    expect(eventDay).toBeDefined();
    expect(eventDay!.suggestedPrice).toBeGreaterThan(100);
    expect(eventDay!.reasons.some(r => r.toLowerCase().includes("test festival"))).toBe(true);
  });

  it("applies peak season multiplier during peak months", () => {
    const rule = mockRule({ peakMonthsJson: JSON.stringify([7]) });
    // July is a peak month, pick a regular weekday
    const result = generateMonthPricing(100, 2026, 7, [], rule);
    // 2026-07-06 is a Monday (not weekend, no holiday)
    const weekday = result.find(d => d.date === "2026-07-06");
    expect(weekday).toBeDefined();
    expect(weekday!.reasons.some(r => r.toLowerCase().includes("peak"))).toBe(true);
  });

  it("respects minPrice floor", () => {
    const rule = mockRule({ minPrice: "200", lowDemandMultiplier: "0.50" });
    const result = generateMonthPricing(100, 2026, 2, [], rule);
    result.forEach(d => {
      expect(d.suggestedPrice).toBeGreaterThanOrEqual(200);
    });
  });

  it("respects maxPrice ceiling", () => {
    const rule = mockRule({ maxPrice: "120", weekendMultiplier: "3.00", holidayMultiplier: "3.00" });
    const result = generateMonthPricing(100, 2026, 7, [], rule);
    result.forEach(d => {
      expect(d.suggestedPrice).toBeLessThanOrEqual(120);
    });
  });

  it("assigns demand levels correctly", () => {
    const rule = mockRule();
    const result = generateMonthPricing(100, 2026, 7, [], rule);
    result.forEach(d => {
      expect(["high", "medium", "low"]).toContain(d.demandLevel);
    });
  });

  it("each result has a date, price, score, level, and reasons", () => {
    const rule = mockRule();
    const result = generateMonthPricing(100, 2026, 4, [], rule);
    result.forEach(d => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.suggestedPrice).toBeGreaterThan(0);
      expect(d.demandScore).toBeGreaterThanOrEqual(0);
      expect(d.demandScore).toBeLessThanOrEqual(10);
      expect(Array.isArray(d.reasons)).toBe(true);
    });
  });
});

describe("calculateRevenueForecast", () => {
  it("returns current month forecast with projected and optimized values", () => {
    const rule = mockRule();
    const pricing = generateMonthPricing(150, 2026, 4, [], rule);
    const forecast = calculateRevenueForecast(pricing);
    expect(forecast.projected).toBeGreaterThan(0);
    expect(forecast.optimized).toBeGreaterThanOrEqual(forecast.projected);
    expect(forecast.occupancyRate).toBeGreaterThan(0);
    expect(forecast.occupancyRate).toBeLessThanOrEqual(100);
  });

  it("optimized revenue is higher than projected", () => {
    const rule = mockRule();
    const pricing = generateMonthPricing(100, 2026, 7, [], rule);
    const forecast = calculateRevenueForecast(pricing);
    expect(forecast.optimized).toBeGreaterThan(forecast.projected);
  });
});

describe("strategy dial", () => {
  it("aggressive strategy prices higher than conservative", () => {
    // 2026-03-09 is a Monday (no weekend/holiday/event)
    const date = new Date(2026, 2, 9);
    const events: Event[] = [];
    const cons = calculatePrice({ basePrice: 100, date, events, rules: mockRule({ strategy: "conservative" }) });
    const rec = calculatePrice({ basePrice: 100, date, events, rules: mockRule({ strategy: "recommended" }) });
    const agg = calculatePrice({ basePrice: 100, date, events, rules: mockRule({ strategy: "aggressive" }) });
    expect(cons.suggestedPrice).toBeLessThan(rec.suggestedPrice);
    expect(agg.suggestedPrice).toBeGreaterThan(rec.suggestedPrice);
    expect(agg.multipliers.strategy).toBeGreaterThan(1);
  });
});

describe("time-based pricing", () => {
  const ref = new Date(2026, 5, 1); // June 1, 2026

  it("applies a near-term discount to soon-vacant dates", () => {
    const rule = mockRule({ nearTermDiscount: "0.15", nearTermDays: 7 });
    const soon = new Date(2026, 5, 4); // 3 days out
    const out = calculatePrice({ basePrice: 100, date: soon, events: [], rules: rule, referenceDate: ref });
    const baseline = calculatePrice({ basePrice: 100, date: soon, events: [], rules: mockRule(), referenceDate: ref });
    expect(out.suggestedPrice).toBeLessThan(baseline.suggestedPrice);
    expect(out.reasons.some(r => r.toLowerCase().includes("near-term"))).toBe(true);
  });

  it("applies a far-out premium to distant dates", () => {
    const rule = mockRule({ farOutPremium: "0.20", farOutDays: 90 });
    const distant = new Date(2026, 9, 1); // ~122 days out
    const out = calculatePrice({ basePrice: 100, date: distant, events: [], rules: rule, referenceDate: ref });
    expect(out.multipliers.timing).toBeGreaterThan(1);
    expect(out.reasons.some(r => r.toLowerCase().includes("far-out"))).toBe(true);
  });
});

describe("monthly seasonality curve", () => {
  it("raises prices for a positively-adjusted month", () => {
    const rule = mockRule({ monthlyAdjustJson: JSON.stringify({ "3": 20 }) });
    const date = new Date(2026, 2, 9); // March, Monday
    const adjusted = calculatePrice({ basePrice: 100, date, events: [], rules: rule });
    const baseline = calculatePrice({ basePrice: 100, date, events: [], rules: mockRule() });
    expect(adjusted.suggestedPrice).toBeGreaterThan(baseline.suggestedPrice);
    expect(adjusted.multipliers.monthly).toBeCloseTo(1.2, 5);
  });
});

describe("getStayDiscount", () => {
  it("returns no discount for short stays", () => {
    const r = getStayDiscount(3, mockRule({ weeklyDiscount: "0.10", monthlyDiscount: "0.25" }));
    expect(r.discountPct).toBe(0);
    expect(r.label).toBeNull();
  });
  it("applies the weekly discount at 7+ nights", () => {
    const r = getStayDiscount(8, mockRule({ weeklyDiscount: "0.10", monthlyDiscount: "0.25" }));
    expect(r.discountPct).toBeCloseTo(0.10, 5);
    expect(r.multiplier).toBeCloseTo(0.90, 5);
  });
  it("applies the monthly discount at 28+ nights", () => {
    const r = getStayDiscount(30, mockRule({ weeklyDiscount: "0.10", monthlyDiscount: "0.25" }));
    expect(r.discountPct).toBeCloseTo(0.25, 5);
  });
});

describe("findGapNights", () => {
  const rule = mockRule({ minStay: 3, orphanGapDiscount: "0.15" });
  it("flags a short vacant run wedged between bookings", () => {
    const days = [
      { date: "2026-03-01", suggestedPrice: 100, isBooked: true },
      { date: "2026-03-02", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-03", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-04", suggestedPrice: 100, isBooked: true },
    ];
    const gaps = findGapNights(days, rule);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].suggestedPrice).toBe(85);
  });
  it("does not flag runs at least as long as the minimum stay", () => {
    const days = [
      { date: "2026-03-01", suggestedPrice: 100, isBooked: true },
      { date: "2026-03-02", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-03", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-04", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-05", suggestedPrice: 100, isBooked: true },
    ];
    expect(findGapNights(days, rule)).toHaveLength(0);
  });
  it("is a no-op when no gap discount is set", () => {
    const days = [
      { date: "2026-03-01", suggestedPrice: 100, isBooked: true },
      { date: "2026-03-02", suggestedPrice: 100, isBooked: false },
      { date: "2026-03-03", suggestedPrice: 100, isBooked: true },
    ];
    expect(findGapNights(days, mockRule())).toHaveLength(0);
  });
});

describe("calculateRevenueScore", () => {
  function days(n: number, level: "high" | "medium" | "low", bookedCount: number) {
    return Array.from({ length: n }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      suggestedPrice: 200,
      demandLevel: level,
      isBooked: i < bookedCount,
      actualPrice: i < bookedCount ? 200 : null,
    }));
  }

  it("returns a high score when booking pace meets expected occupancy", () => {
    // medium demand -> 65% expected occupancy; book 13/20 nights at suggested price
    const score = calculateRevenueScore(days(20, "medium", 13));
    expect(score.score).toBeGreaterThanOrEqual(85);
    expect(score.rating).toBe("excellent");
  });

  it("flags low pace as needs_attention", () => {
    const score = calculateRevenueScore(days(20, "medium", 2));
    expect(score.score).toBeLessThan(50);
    expect(score.rating).toBe("needs_attention");
  });

  it("handles an empty window gracefully", () => {
    const score = calculateRevenueScore([]);
    expect(score.score).toBe(0);
    expect(score.totalNights).toBe(0);
  });
});

describe("calculatePerformance", () => {
  it("computes occupancy, ADR, RevPAR, and revenue from actuals", () => {
    const days = [
      { date: "2026-03-01", isBooked: true, actualPrice: 200, suggestedPrice: 180 },
      { date: "2026-03-02", isBooked: true, actualPrice: 100, suggestedPrice: 120 },
      { date: "2026-03-03", isBooked: false, actualPrice: null, suggestedPrice: 150 },
      { date: "2026-03-04", isBooked: false, actualPrice: null, suggestedPrice: 150 },
    ];
    const perf = calculatePerformance(days);
    expect(perf.nights).toBe(4);
    expect(perf.bookedNights).toBe(2);
    expect(perf.occupancyRate).toBe(50);
    expect(perf.adr).toBe(150); // (200 + 100) / 2
    expect(perf.revpar).toBe(75); // 300 / 4
    expect(perf.revenue).toBe(300);
  });

  it("falls back to suggested price when actual is missing", () => {
    const days = [{ date: "2026-03-01", isBooked: true, actualPrice: null, suggestedPrice: 175 }];
    const perf = calculatePerformance(days);
    expect(perf.revenue).toBe(175);
    expect(perf.adr).toBe(175);
  });
});
