import { describe, expect, it } from "vitest";
import { inspectRevenueDays } from "./revenueOpportunity";
describe("inspectRevenueDays", () => {
  it("flags lagging pace on available near-term dates", () => {
    const result = inspectRevenueDays([{ date:"2026-10-20", suggestedPrice:180, booked:false, daysUntilArrival:9, occupancyPace:0.3, targetPace:0.6 }]);
    expect(result.map(x=>x.type)).toEqual(["underperforming"]);
  });
  it("never suggests changing booked nights", () => {
    expect(inspectRevenueDays([{ date:"2026-10-20", suggestedPrice:180, booked:true, daysUntilArrival:9, occupancyPace:0.1, targetPace:0.8, eventTitles:["Fair"] }])).toEqual([]);
  });
  it("detects invalid rates before recommending a premium", () => {
    expect(inspectRevenueDays([{ date:"2026-10-20", suggestedPrice:0, booked:false, daysUntilArrival:9, eventTitles:["Fair"] }]).map(x=>x.type)).toEqual(["invalid_rate"]);
  });
  it("surfaces future events without inventing price uplift", () => {
    const result=inspectRevenueDays([{ date:"2026-11-01", suggestedPrice:180, booked:false, daysUntilArrival:21, eventTitles:["Convention"] }]);
    expect(result[0].suggestedAction).toBe("review_event_premium");
    expect(result[0].evidence.eventCount).toBe(1);
  });
  it("ignores stale and unavailable dates", () => {
    expect(inspectRevenueDays([{ date:"2026-10-01", suggestedPrice:180, booked:false, daysUntilArrival:-10, eventTitles:["Old fair"] }])).toEqual([]);
  });
});