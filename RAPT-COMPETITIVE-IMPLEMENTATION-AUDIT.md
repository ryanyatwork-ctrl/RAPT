# RAPT competitive audit — implementation plan (2026-10-11)

## Verified from source
- `server/pricingEngine.ts`: deterministic rate calculation; weekend, holidays, event tiers, season, min/max; explanatory reasons.
- `server/demand/relevance.ts`: property-specific future-event signal relevance.
- `server/integrations/ownerrez.ts`: dry-run-first spot-rate publishing, gated by explicit enablement, credentials, and property mapping. Production readiness not verified.
- `server/publicPricingApi.ts`: authenticated public pricing endpoint.
- `server/pricingEngine.test.ts`: unit tests exist; current CI status not verified.
- `calculateRevenueForecast` uses a hard-coded 12% 'optimized' uplift; this is **not observed or experimentally validated revenue improvement**. Do not present it as achieved uplift.

## First implementation
`server/revenueOpportunity.ts` is a deterministic, read-only opportunity detector. It flags invalid nightly rates, near-term occupancy pacing gaps, and event overlaps on available dates. It deliberately makes no rate changes and requires real pacing inputs. Tests are included.

## Priority 1 — pricing pipeline verification
- Trace ingest -> deduplication -> property relevance -> price -> quote -> channel publish.
- Confirm production environment, actual connected channels, freshness timestamps, idempotency, overrides, and error/retry logging.
- Run dry-run against the three owned properties, compare every night and the published calendar before any live write.
- Fail closed on invalid price/date, stale source data, or unmapped property.

## Priority 2 — autonomous revenue analyst
- Connect real reservations and booking-pace snapshots to `inspectRevenueDays`.
- Persist findings with property ID, source timestamps, evidence, decision status, reviewer and run ID.
- Schedule daily analysis and deduplicate repeated findings. Add review/approve/reject UI.
- Separate recommendation approval from authorization to publish rates. No unattended publishing initially.

## Priority 3 — prove competitive advantage
- Compare RAPT against PriceLabs Athena, Beyond, Wheelhouse and AirDNA by verified features and documented price-change explanations.
- Use Coeur d'Alene, Pea Ridge and Springdale as separate holdout/backtest cases.
- Compare event lead time, property-specific relevance, net owner revenue, occupancy, ADR, forecast calibration, false positives and manual minutes saved.
- Do not claim RAPT is first/best or that competitor features are absent without evidence.

## Priority 4 — production safeguards
- Tenant authorization, secrets isolation, rate limits, cost budgets, audit trail, rollback, alerts, idempotent scheduled jobs and dry-run/approval gates.
- Require tests, typecheck, build and production smoke checks before release.

## Current limits
This PR does not connect to production databases, schedule jobs, publish rates, change pricing rules, or establish competitor superiority. It is a safe first executable slice. 
