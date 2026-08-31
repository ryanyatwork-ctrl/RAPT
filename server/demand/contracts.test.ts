import { describe, expect, it } from "vitest";
import {
  parseDemandSignalCandidate,
  parseDemandSourceCandidate,
} from "./contracts";

const validSource = {
  name: "Example Official Calendar",
  canonicalUrl: "https://example.com/events",
  sourceType: "municipal" as const,
  authorityClass: "official_primary" as const,
  geographicScope: "Example City, ID",
  eventTypes: ["festival"],
  futureDatesVisible: true,
  availabilityStateVisible: false,
  estimatedTravelRelevance: 0.7,
  suggestedRefreshCadenceMinutes: 1440,
  confidence: 0.9,
  evidence: [
    {
      url: "https://example.com/events",
      note: "Official future event calendar",
    },
  ],
  collectionConstraints: null,
  recommendedStatus: "candidate" as const,
};

const validSignal = {
  title: "Example Future Expo",
  seriesIdentity: "example-future-expo",
  signalType: "expo_trade" as const,
  startDate: "2027-06-25T09:00:00.000Z",
  endDate: "2027-06-26T18:00:00.000Z",
  venue: "Example Fairgrounds",
  location: {
    city: "Example City",
    state: "ID",
    postalCode: "83800",
    country: "US",
    latitude: 47.7,
    longitude: -116.8,
  },
  expectedAttendance: 4000,
  participantTravelPropensity: 0.85,
  overnightLodgingPropensity: 0.8,
  confidence: 0.92,
  evidence: [
    {
      sourceName: "Example Organizer",
      url: "https://example.com/expo-2027",
      publishedOrUpdatedAt: "2026-08-31T12:00:00.000Z",
      note: "Organizer published next year's dates",
    },
  ],
  status: "candidate" as const,
};

describe("AI demand candidate contracts", () => {
  it("accepts a properly evidenced candidate source", () => {
    expect(parseDemandSourceCandidate(validSource)).toMatchObject(validSource);
  });

  it("rejects source candidates without evidence", () => {
    expect(() =>
      parseDemandSourceCandidate({ ...validSource, evidence: [] })
    ).toThrow();
  });

  it("accepts a properly evidenced future signal", () => {
    expect(parseDemandSignalCandidate(validSignal)).toMatchObject(validSignal);
  });

  it("rejects an event whose end is not after its start", () => {
    expect(() =>
      parseDemandSignalCandidate({
        ...validSignal,
        endDate: validSignal.startDate,
      })
    ).toThrow(/endDate must be after startDate/);
  });

  it("rejects AI attempts to approve its own candidate", () => {
    expect(() =>
      parseDemandSignalCandidate({
        ...validSignal,
        status: "approved",
      })
    ).toThrow();
  });

  it("rejects unauthorized pricing or approval fields instead of stripping them", () => {
    expect(() =>
      parseDemandSignalCandidate({
        ...validSignal,
        nightlyPrice: 425,
        approved: true,
      })
    ).toThrow();
  });

  it("rejects unknown fields nested inside evidence", () => {
    expect(() =>
      parseDemandSignalCandidate({
        ...validSignal,
        evidence: [
          {
            ...validSignal.evidence[0],
            authoritativePrice: 425,
          },
        ],
      })
    ).toThrow();
  });
});
