import { describe, expect, it } from "vitest";
import { buildPropertyPricingReport } from "./propertyPricingReport";
import type { Event, PricingRule } from "../drizzle/schema";
const rules = {
  weekendMultiplier:"1.30", holidayMultiplier:"1.45", highEventMultiplier:"1.35",
  mediumEventMultiplier:"1.15", lowDemandMultiplier:"0.90", peakSeasonMultiplier:"1.25",
  offSeasonMultiplier:"0.85", minPrice:"100", maxPrice:"400", peakMonthsJson:"[6,7,8]"
} as PricingRule;
const base = {
  property:{ id:1,name:"Test CDA",city:"Coeur d'Alene",state:"ID",basePrice:"150" },
  rules, events:[] as Event[], year:2026,month:10,asOf:"2026-10-11",
};
describe("buildPropertyPricingReport", () => {
  it("does not invent availability when calendar is missing", () => {
    const result=buildPropertyPricingReport({...base,calendar:[]});
    expect(result.daily.every(day=>day.availability==="unknown")).toBe(true);
    expect(result.findings).toEqual([]);
  });
  it("reports stored current rate and a safe recommendation separately", () => {
    const result=buildPropertyPricingReport({...base,calendar:[{
      date:"2026-10-20",isBooked:false,actualPrice:"175",updatedAt:new Date("2026-10-11T10:00:00Z")
    }]});
    const day=result.daily.find(day=>day.date==="2026-10-20")!;
    expect(day.availability).toBe("available");
    expect(day.currentChannelRate).toBe(175);
    expect(day.suggestedPrice).toBeGreaterThanOrEqual(100);
  });
  it("does not produce findings on booked nights", () => {
    const result=buildPropertyPricingReport({...base,calendar:[{
      date:"2026-10-20",isBooked:true,actualPrice:"175",updatedAt:new Date()
    }]});
    expect(result.findings).toEqual([]);
  });
});