import { describe, expect, it } from "vitest";
import { generateMonthPricing, calculateRevenueForecast } from "./pricingEngine";
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
