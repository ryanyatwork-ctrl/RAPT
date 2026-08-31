import { describe, expect, it } from "vitest";
import {
  canonicalizeDemandSourceUrl,
  dedupeDemandSignalCandidates,
  dedupeDemandSourceCandidates,
  demandSignalIdentityKey,
} from "./ingestion";

const sourceBase = {
  name: "Official Event Calendar",
  canonicalUrl: "https://Example.com/events/?utm_source=newsletter",
  sourceType: "municipal" as const,
  authorityClass: "official_primary" as const,
  geographicScope: "Example City, ID",
  eventTypes: ["festival"],
  futureDatesVisible: true,
  availabilityStateVisible: false,
  estimatedTravelRelevance: 0.65,
  suggestedRefreshCadenceMinutes: 1440,
  confidence: 0.8,
  evidence: [
    {
      url: "https://example.com/events/?utm_source=newsletter",
      note: "Official calendar",
    },
  ],
  collectionConstraints: null,
  recommendedStatus: "candidate" as const,
};

const signalBase = {
  title: "2027 Example Nationals",
  seriesIdentity: "Example Nationals",
  signalType: "hobby_competition" as const,
  startDate: "2027-06-25T09:00:00.000Z",
  endDate: "2027-06-27T18:00:00.000Z",
  venue: "Example Raceway",
  location: {
    city: "Example City",
    state: "ID",
    postalCode: "83800",
    country: "US",
    latitude: 47.70001,
    longitude: -116.80001,
  },
  expectedAttendance: 500,
  participantTravelPropensity: 0.9,
  overnightLodgingPropensity: 0.85,
  confidence: 0.8,
  evidence: [
    {
      sourceName: "Race Organizer",
      url: "https://racing.example.com/nationals?utm_campaign=summer",
      publishedOrUpdatedAt: "2026-08-31T12:00:00.000Z",
      note: "Organizer schedule",
    },
  ],
  status: "candidate" as const,
};

describe("demand candidate ingestion", () => {
  it("canonicalizes source URLs while preserving meaningful query parameters", () => {
    expect(
      canonicalizeDemandSourceUrl(
        "https://EXAMPLE.com/events/?utm_source=x&year=2027&fbclid=abc"
      )
    ).toBe("https://example.com/events?year=2027");
  });

  it("deduplicates the same source found through tracking variants", () => {
    const candidates = dedupeDemandSourceCandidates([
      sourceBase,
      {
        ...sourceBase,
        canonicalUrl: "https://example.com/events",
        confidence: 0.95,
        eventTypes: ["festival", "sports"],
        evidence: [
          {
            url: "https://example.com/events?ref=partner",
            note: "Second discovery pass",
          },
        ],
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].confidence).toBe(0.95);
    expect(candidates[0].eventTypes).toEqual(
      expect.arrayContaining(["festival", "sports"])
    );
    expect(candidates[0].evidence).toHaveLength(2);
  });

  it("reconciles duplicate mentions of one dated occurrence", () => {
    const candidates = dedupeDemandSignalCandidates([
      signalBase,
      {
        ...signalBase,
        title: "Example Nationals 2027",
        expectedAttendance: 650,
        confidence: 0.92,
        evidence: [
          {
            sourceName: "Venue",
            url: "https://venue.example.com/calendar/nationals",
            publishedOrUpdatedAt: null,
            note: "Venue confirms dates",
          },
        ],
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].expectedAttendance).toBe(650);
    expect(candidates[0].confidence).toBe(0.92);
    expect(candidates[0].evidence).toHaveLength(2);
  });

  it("keeps different years of a recurring series as separate occurrences", () => {
    const nextYear = {
      ...signalBase,
      title: "2028 Example Nationals",
      startDate: "2028-06-23T09:00:00.000Z",
      endDate: "2028-06-25T18:00:00.000Z",
    };

    expect(demandSignalIdentityKey(signalBase)).not.toBe(
      demandSignalIdentityKey(nextYear)
    );
    expect(dedupeDemandSignalCandidates([signalBase, nextYear])).toHaveLength(2);
  });

  it("does not collapse simultaneous events at different venues", () => {
    const otherVenue = {
      ...signalBase,
      venue: "Other Raceway",
      location: {
        ...signalBase.location,
        latitude: 47.90001,
        longitude: -116.50001,
      },
    };

    expect(dedupeDemandSignalCandidates([signalBase, otherVenue])).toHaveLength(2);
  });

  it("validates before deduplication and rejects unauthorized AI fields", () => {
    expect(() =>
      dedupeDemandSignalCandidates([
        {
          ...signalBase,
          approved: true,
          nightlyPrice: 500,
        },
      ])
    ).toThrow();
  });
});
