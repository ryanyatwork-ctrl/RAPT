export type ForwardSignalType =
  | "sports"
  | "graduation"
  | "wedding_private_event"
  | "rodeo_fair"
  | "festival"
  | "music"
  | "conference"
  | "expo_trade"
  | "hobby_competition"
  | "corporate_project"
  | "transportation"
  | "displacement"
  | "seasonal"
  | "other";

export type RelevanceLevel = "irrelevant" | "weak" | "moderate" | "strong";

export interface PropertySignalRelevanceInput {
  signalType: ForwardSignalType;
  driveMinutes?: number | null;
  distanceMiles?: number | null;
  expectedAttendance?: number | null;
  travelPropensity: number;
  overnightLodgingPropensity: number;
  confidence: number;
  propertyFit?: number;
  transportationCorridorScore?: number;
  affinityScore?: number;
  observedResponseScore?: number;
}

export interface PropertySignalRelevanceResult {
  score: number;
  level: RelevanceLevel;
  forwardScore: number;
  calibrationBoost: number;
  components: {
    geography: number;
    travelPropensity: number;
    overnightLodgingPropensity: number;
    signalType: number;
    magnitude: number;
    propertyFit: number;
    confidence: number;
    transportationCorridor: number;
    affinity: number;
    observedResponse: number;
  };
  reasons: string[];
}

const SIGNAL_TYPE_WEIGHT: Record<ForwardSignalType, number> = {
  sports: 0.72,
  graduation: 0.95,
  wedding_private_event: 0.88,
  rodeo_fair: 0.82,
  festival: 0.68,
  music: 0.70,
  conference: 0.78,
  expo_trade: 0.82,
  hobby_competition: 0.86,
  corporate_project: 0.72,
  transportation: 0.55,
  displacement: 0.82,
  seasonal: 0.58,
  other: 0.50,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function geographyScore(driveMinutes?: number | null, distanceMiles?: number | null): number {
  if (driveMinutes != null && Number.isFinite(driveMinutes)) {
    if (driveMinutes <= 10) return 1;
    if (driveMinutes <= 20) return 0.92;
    if (driveMinutes <= 35) return 0.80;
    if (driveMinutes <= 60) return 0.58;
    if (driveMinutes <= 90) return 0.35;
    if (driveMinutes <= 150) return 0.12;
    return 0.03;
  }

  if (distanceMiles != null && Number.isFinite(distanceMiles)) {
    if (distanceMiles <= 3) return 1;
    if (distanceMiles <= 10) return 0.90;
    if (distanceMiles <= 20) return 0.75;
    if (distanceMiles <= 40) return 0.50;
    if (distanceMiles <= 75) return 0.25;
    if (distanceMiles <= 125) return 0.10;
    return 0.03;
  }

  // Unknown distance should not make a candidate irrelevant before routing is resolved.
  return 0.45;
}

function magnitudeScore(expectedAttendance?: number | null): number {
  if (expectedAttendance == null || !Number.isFinite(expectedAttendance) || expectedAttendance <= 0) {
    return 0.35;
  }

  // 100 attendees ~= 0, 100,000+ attendees ~= 1, logarithmically scaled.
  return clamp01((Math.log10(expectedAttendance) - 2) / 3);
}

function levelForScore(score: number): RelevanceLevel {
  if (score >= 0.72) return "strong";
  if (score >= 0.52) return "moderate";
  if (score >= 0.30) return "weak";
  return "irrelevant";
}

/**
 * Computes property-specific relevance for an already-discovered future signal.
 *
 * Forward-looking evidence intentionally dominates this calculation. Historical
 * affinity and observed booking response are bounded calibration boosts; they
 * can refine confidence but are not required for a new event to score strongly.
 */
export function calculatePropertySignalRelevance(
  input: PropertySignalRelevanceInput
): PropertySignalRelevanceResult {
  const geography = geographyScore(input.driveMinutes, input.distanceMiles);
  const travelPropensity = clamp01(input.travelPropensity);
  const overnightLodgingPropensity = clamp01(input.overnightLodgingPropensity);
  const signalType = SIGNAL_TYPE_WEIGHT[input.signalType] ?? SIGNAL_TYPE_WEIGHT.other;
  const magnitude = magnitudeScore(input.expectedAttendance);
  const propertyFit = clamp01(input.propertyFit ?? 0.65);
  const confidence = clamp01(input.confidence);
  const transportationCorridor = clamp01(input.transportationCorridorScore ?? 0.50);
  const affinity = clamp01(input.affinityScore ?? 0);
  const observedResponse = clamp01(input.observedResponseScore ?? 0);

  const forwardScore = clamp01(
    geography * 0.24 +
      travelPropensity * 0.20 +
      overnightLodgingPropensity * 0.18 +
      signalType * 0.08 +
      magnitude * 0.08 +
      propertyFit * 0.08 +
      confidence * 0.07 +
      transportationCorridor * 0.07
  );

  // History is deliberately capped at 15% so it calibrates forward intelligence
  // rather than becoming the primary demand engine.
  const calibrationBoost = Math.min(0.15, affinity * 0.06 + observedResponse * 0.09);

  // Very weak geography cannot be turned into a strong signal solely by history.
  const geographicCap = geography < 0.10 ? 0.45 : geography < 0.20 ? 0.62 : 1;
  const score = Math.min(geographicCap, clamp01(forwardScore + calibrationBoost));
  const rounded = Math.round(score * 10000) / 10000;
  const roundedForward = Math.round(forwardScore * 10000) / 10000;
  const roundedBoost = Math.round(calibrationBoost * 10000) / 10000;

  const reasons: string[] = [];
  if (geography >= 0.80) reasons.push("close drive-time proximity");
  else if (geography <= 0.20) reasons.push("weak geographic proximity");

  if (travelPropensity >= 0.75) reasons.push("high out-of-area travel propensity");
  if (overnightLodgingPropensity >= 0.75) reasons.push("high overnight lodging propensity");
  if (magnitude >= 0.65) reasons.push("large expected event magnitude");
  if (propertyFit >= 0.80) reasons.push("strong property/guest fit");
  if (confidence < 0.50) reasons.push("limited evidence confidence");
  if (affinity >= 0.60) reasons.push("recurring property-event affinity calibration");
  if (observedResponse >= 0.60) reasons.push("confirmed prior booking response calibration");

  return {
    score: rounded,
    level: levelForScore(rounded),
    forwardScore: roundedForward,
    calibrationBoost: roundedBoost,
    components: {
      geography,
      travelPropensity,
      overnightLodgingPropensity,
      signalType,
      magnitude,
      propertyFit,
      confidence,
      transportationCorridor,
      affinity,
      observedResponse,
    },
    reasons,
  };
}
