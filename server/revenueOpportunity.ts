/**
 * RAPT revenue-opportunity checks. Pure, deterministic, read-only analysis.
 * No publishing, no credentials, and no external API calls.
 */
export interface RevenueDay {
  date: string; // YYYY-MM-DD
  suggestedPrice: number;
  booked: boolean;
  daysUntilArrival: number;
  occupancyPace?: number; // 0..1, comparable date-window occupancy
  targetPace?: number; // 0..1, owner's expected pace
  eventTitles?: string[];
}
export interface RevenueFinding {
  date: string;
  type: "underperforming" | "high_demand" | "invalid_rate";
  severity: "info" | "warning";
  explanation: string;
  suggestedAction: "review_price" | "review_event_premium" | "fix_input";
  evidence: Record<string, number | string>;
}
export function inspectRevenueDays(days: RevenueDay[]): RevenueFinding[] {
  const findings: RevenueFinding[] = [];
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
    if (!Number.isFinite(day.suggestedPrice) || day.suggestedPrice <= 0) {
      findings.push({ date: day.date, type: "invalid_rate", severity: "warning",
        explanation: "Nightly rate is missing or invalid; do not publish.",
        suggestedAction: "fix_input", evidence: { suggestedPrice: String(day.suggestedPrice) } });
      continue;
    }
    if (day.booked || day.daysUntilArrival < 0) continue;
    const validPace = day.occupancyPace !== undefined && day.targetPace !== undefined &&
      Number.isFinite(day.occupancyPace) && Number.isFinite(day.targetPace) &&
      day.occupancyPace >= 0 && day.occupancyPace <= 1 &&
      day.targetPace >= 0 && day.targetPace <= 1;
    if (validPace && day.daysUntilArrival <= 30 && day.occupancyPace! + 0.15 < day.targetPace!) {
      findings.push({ date: day.date, type: "underperforming", severity: "warning",
        explanation: "Comparable occupancy pace trails the owner's target by more than 15 percentage points.",
        suggestedAction: "review_price",
        evidence: { occupancyPace: day.occupancyPace!, targetPace: day.targetPace!, daysUntilArrival: day.daysUntilArrival } });
    }
    if ((day.eventTitles?.length ?? 0) > 0 && day.daysUntilArrival <= 90) {
      findings.push({ date: day.date, type: "high_demand", severity: "info",
        explanation: "A future event overlaps an available night; verify property-specific relevance and rate.",
        suggestedAction: "review_event_premium",
        evidence: { eventCount: day.eventTitles!.length, daysUntilArrival: day.daysUntilArrival } });
    }
  }
  return findings.sort((a,b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}
