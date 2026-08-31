import {
  parseDemandSignalCandidate,
  parseDemandSourceCandidate,
  type DemandSignalCandidate,
  type DemandSourceCandidate,
} from "./contracts";

const TRACKING_QUERY_PREFIXES = ["utm_", "mc_", "ga_"];
const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "ref",
  "referrer",
  "source",
]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize public URLs for source identity without destroying meaningful query
 * parameters. Tracking/referral parameters are removed and the remaining query
 * parameters are sorted so the same public source is not stored repeatedly.
 */
export function canonicalizeDemandSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  const retained: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    const isTracking =
      TRACKING_QUERY_KEYS.has(lowerKey) ||
      TRACKING_QUERY_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));
    if (!isTracking) retained.push([key, value]);
  });

  retained.sort(([aKey, aValue], [bKey, bValue]) =>
    aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
  );
  url.search = "";
  retained.forEach(([key, value]) => url.searchParams.append(key, value));

  // Treat /events and /events/ as the same source while preserving root '/'.
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");

  return url.toString();
}

export function demandSourceIdentityKey(candidate: DemandSourceCandidate): string {
  return canonicalizeDemandSourceUrl(candidate.canonicalUrl);
}

function signalLocationIdentity(candidate: DemandSignalCandidate): string {
  if (candidate.location.latitude != null && candidate.location.longitude != null) {
    // Five decimals is enough to keep a venue identity stable without implying
    // survey-grade precision from geocoded public event data.
    return `${candidate.location.latitude.toFixed(5)},${candidate.location.longitude.toFixed(5)}`;
  }

  return [
    candidate.venue,
    candidate.location.city,
    candidate.location.state,
    candidate.location.postalCode,
    candidate.location.country,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join("|");
}

/**
 * Identity is occurrence-based: the recurring series (when known), start date,
 * and venue/location identify one dated occurrence. Different years remain
 * separate occurrences while still being linkable through seriesIdentity.
 */
export function demandSignalIdentityKey(candidate: DemandSignalCandidate): string {
  const seriesOrTitle = normalizeText(candidate.seriesIdentity || candidate.title);
  const start = new Date(candidate.startDate).toISOString();
  const end = new Date(candidate.endDate).toISOString();
  return [seriesOrTitle, start, end, signalLocationIdentity(candidate)].join("::");
}

function uniqueSourceEvidence(
  evidence: DemandSourceCandidate["evidence"]
): DemandSourceCandidate["evidence"] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${canonicalizeDemandSourceUrl(item.url)}::${normalizeText(item.note)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSignalEvidence(
  evidence: DemandSignalCandidate["evidence"]
): DemandSignalCandidate["evidence"] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${normalizeText(item.sourceName)}::${canonicalizeDemandSourceUrl(item.url)}::${normalizeText(item.note)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validates first, then deduplicates by canonical source URL. When multiple AI
 * passes find the same source, retain the highest-confidence representation and
 * combine unique evidence rather than multiplying sources.
 */
export function dedupeDemandSourceCandidates(inputs: unknown[]): DemandSourceCandidate[] {
  const byIdentity = new Map<string, DemandSourceCandidate>();

  for (const input of inputs) {
    const parsed = parseDemandSourceCandidate(input);
    const normalized: DemandSourceCandidate = {
      ...parsed,
      canonicalUrl: canonicalizeDemandSourceUrl(parsed.canonicalUrl),
      evidence: uniqueSourceEvidence(parsed.evidence),
    };
    const identity = demandSourceIdentityKey(normalized);
    const existing = byIdentity.get(identity);

    if (!existing) {
      byIdentity.set(identity, normalized);
      continue;
    }

    const preferred = normalized.confidence > existing.confidence ? normalized : existing;
    const other = preferred === normalized ? existing : normalized;
    byIdentity.set(identity, {
      ...preferred,
      confidence: Math.max(existing.confidence, normalized.confidence),
      estimatedTravelRelevance: Math.max(
        existing.estimatedTravelRelevance,
        normalized.estimatedTravelRelevance
      ),
      futureDatesVisible: existing.futureDatesVisible || normalized.futureDatesVisible,
      availabilityStateVisible:
        existing.availabilityStateVisible || normalized.availabilityStateVisible,
      eventTypes: Array.from(new Set([...existing.eventTypes, ...normalized.eventTypes])),
      evidence: uniqueSourceEvidence([...preferred.evidence, ...other.evidence]),
    });
  }

  return Array.from(byIdentity.values());
}

/**
 * Validates first, then reconciles duplicate mentions of the same dated event.
 * Evidence is combined, while conservative machine-safe aggregation keeps the
 * strongest verified magnitude/travel indication for later review.
 */
export function dedupeDemandSignalCandidates(inputs: unknown[]): DemandSignalCandidate[] {
  const byIdentity = new Map<string, DemandSignalCandidate>();

  for (const input of inputs) {
    const parsed = parseDemandSignalCandidate(input);
    const identity = demandSignalIdentityKey(parsed);
    const existing = byIdentity.get(identity);

    if (!existing) {
      byIdentity.set(identity, {
        ...parsed,
        evidence: uniqueSignalEvidence(parsed.evidence),
      });
      continue;
    }

    const preferred = parsed.confidence > existing.confidence ? parsed : existing;
    const other = preferred === parsed ? existing : parsed;
    const expectedAttendance = Math.max(
      existing.expectedAttendance ?? 0,
      parsed.expectedAttendance ?? 0
    );

    byIdentity.set(identity, {
      ...preferred,
      expectedAttendance: expectedAttendance > 0 ? expectedAttendance : null,
      participantTravelPropensity: Math.max(
        existing.participantTravelPropensity,
        parsed.participantTravelPropensity
      ),
      overnightLodgingPropensity: Math.max(
        existing.overnightLodgingPropensity,
        parsed.overnightLodgingPropensity
      ),
      confidence: Math.max(existing.confidence, parsed.confidence),
      evidence: uniqueSignalEvidence([...preferred.evidence, ...other.evidence]),
    });
  }

  return Array.from(byIdentity.values());
}
