import { describe, expect, it } from "vitest";
import { calculatePropertySignalRelevance } from "./relevance";

describe("property-specific forward demand relevance", () => {
  it("allows a brand-new future event to score strongly with zero historical response", () => {
    const result = calculatePropertySignalRelevance({
      signalType: "expo_trade",
      driveMinutes: 12,
      expectedAttendance: 4000,
      travelPropensity: 0.90,
      overnightLodgingPropensity: 0.88,
      confidence: 0.90,
      propertyFit: 0.90,
      transportationCorridorScore: 0.80,
      affinityScore: 0,
      observedResponseScore: 0,
    });

    expect(result.level).toBe("strong");
    expect(result.calibrationBoost).toBe(0);
    expect(result.forwardScore).toBeGreaterThanOrEqual(0.72);
  });

  it("scores the same signal differently for two properties based on drive-time relevance", () => {
    const common = {
      signalType: "sports" as const,
      expectedAttendance: 75000,
      travelPropensity: 0.95,
      overnightLodgingPropensity: 0.90,
      confidence: 0.95,
      propertyFit: 0.85,
      transportationCorridorScore: 0.80,
      affinityScore: 0,
      observedResponseScore: 0,
    };

    const nearby = calculatePropertySignalRelevance({ ...common, driveMinutes: 18 });
    const distant = calculatePropertySignalRelevance({ ...common, driveMinutes: 135 });

    expect(nearby.level).toBe("strong");
    expect(distant.score).toBeLessThan(nearby.score);
    expect(distant.level).not.toBe("strong");
  });

  it("uses prior confirmed booking response only as a bounded calibration boost", () => {
    const withoutHistory = calculatePropertySignalRelevance({
      signalType: "hobby_competition",
      driveMinutes: 25,
      expectedAttendance: 600,
      travelPropensity: 0.80,
      overnightLodgingPropensity: 0.82,
      confidence: 0.78,
      propertyFit: 0.90,
      transportationCorridorScore: 0.65,
    });

    const withHistory = calculatePropertySignalRelevance({
      signalType: "hobby_competition",
      driveMinutes: 25,
      expectedAttendance: 600,
      travelPropensity: 0.80,
      overnightLodgingPropensity: 0.82,
      confidence: 0.78,
      propertyFit: 0.90,
      transportationCorridorScore: 0.65,
      affinityScore: 0.95,
      observedResponseScore: 1,
    });

    expect(withHistory.score).toBeGreaterThan(withoutHistory.score);
    expect(withHistory.calibrationBoost).toBeLessThanOrEqual(0.15);
  });

  it("does not confuse a large local-attendance event with strong lodging demand", () => {
    const result = calculatePropertySignalRelevance({
      signalType: "festival",
      driveMinutes: 10,
      expectedAttendance: 20000,
      travelPropensity: 0.15,
      overnightLodgingPropensity: 0.10,
      confidence: 0.90,
      propertyFit: 0.50,
      transportationCorridorScore: 0.40,
    });

    expect(result.level).not.toBe("strong");
  });

  it("prevents historical affinity from making a geographically implausible signal strong", () => {
    const result = calculatePropertySignalRelevance({
      signalType: "graduation",
      driveMinutes: 180,
      expectedAttendance: 12000,
      travelPropensity: 0.95,
      overnightLodgingPropensity: 0.95,
      confidence: 0.95,
      propertyFit: 0.90,
      transportationCorridorScore: 0.30,
      affinityScore: 1,
      observedResponseScore: 1,
    });

    expect(result.level).not.toBe("strong");
    expect(result.score).toBeLessThanOrEqual(0.45);
  });
});
