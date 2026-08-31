# Antigravity — Current RAPT / Getaway Execution Checkpoint

Updated: 2026-08-31

This file is the **start-here work queue** for Antigravity. Read it together with:

- `PORTFOLIO-MARKET-ARCHITECTURE.md`
- `FORWARD-DEMAND-FORECASTING-PRINCIPLE.md`
- `FORWARD-DEMAND-SOURCE-REGISTRY.md`
- `LONG-TAIL-NICHE-DEMAND-SOURCES.md`
- `PER-PROPERTY-AI-DEMAND-DISCOVERY.md`
- `GEMINI-OPAL-ANTIGRAVITY-HANDOFF.md`

Do not revert to a one-market-per-property or one-market-per-account model.

## Non-negotiable product rules

1. **RAPT is forward-first.** Discover future travel drivers before booking/search/occupancy history necessarily reacts.
2. Historical booking response is **calibration**, not the forecasting engine.
3. Every active property receives independent location-aware and niche-source discovery.
4. Portfolio is ownership/organization, **not geography**.
5. Subscription limits are based on **active property count only**, never ZIP/city/state/market count.
6. A shared future signal can be strong for Property A and irrelevant for Property B.
7. Gemini/Opal can propose candidate sources/signals but cannot approve signals, calculate authoritative prices, publish rates, or write OwnerRez/OTA inventory.
8. No paid signup, OwnerRez activation, external terms acceptance, DNS cutover, or live rate publication without explicit owner approval.

## Completed and merged to RAPT main

The forward-demand foundation was merged as PR #10, merge commit:

`ad21de53f3b608601373def58557848e464d50b8`

### Data model now defined in `drizzle/schema.ts`

Additive schema definitions exist for:

- `accounts`
- `account_memberships`
- `portfolios`
- normalized property address/postal/coordinates/timezone/location precision
- `market_areas`
- `property_market_areas`
- `demand_sources`
- `demand_signal_series`
- `demand_signals`
- `property_demand_anchors`
- `property_demand_sources`
- `property_signal_relevance`
- `property_signal_observations`
- `property_signal_affinity`

The legacy property-bound `events` table remains for compatibility.

**Important:** schema definitions are merged, but the database migration/backfill has NOT been generated or applied yet.

### Property-specific relevance engine

Implemented in:

`server/demand/relevance.ts`

Forward evidence dominates the score:

- geography / drive time
- out-of-area travel propensity
- overnight lodging propensity
- signal type
- magnitude
- property fit
- source confidence
- transportation-corridor relevance

Historical affinity + observed response are capped calibration boosts (maximum 15%).

Tests in:

`server/demand/relevance.test.ts`

They prove:

- a brand-new future event can score strong with zero booking history;
- the same event scores differently for two properties;
- historical response is bounded calibration;
- high attendance with low travel/lodging propensity is not automatically strong;
- historical affinity cannot make a geographically implausible event strong.

### Gemini / Opal validation boundary

Implemented in:

`server/demand/contracts.ts`

Use these Zod schemas as the canonical machine contract for AI-generated source/signal candidates. Candidate output requires evidence/provenance and remains status `candidate`.

Do not build a parallel incompatible JSON shape in Gemini or Opal.

## Current RAPT CI / deployment state

Application CI is healthy:

- tests: passing
- TypeScript check: passing
- production build: passing

The GitHub Vercel deployment job has been repaired to use the Vercel CLI rather than the removed `vercel/action` GitHub Action.

Deployment is currently blocked because the RAPT GitHub repository has no Actions secrets configured for:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The connected Vercel Belleville Systems team exists (`team_yMzMSPeN1dQKqTwvoufdJ6BL`), but **there is currently no RAPT project in that Vercel team**. Do not fabricate IDs or hide this failure. Decide with the owner whether RAPT should actually be created/linked in Vercel before configuring deployment secrets.

## Work package 1 — Generate and review the additive DB migration

Run locally from current RAPT `main` with the correct development database configuration.

1. `git pull`
2. `pnpm install --frozen-lockfile`
3. run the project-standard Drizzle generation flow (`pnpm db:push` currently combines generate + migrate; do NOT point this at production blindly)
4. Prefer generating migration SQL first and reviewing it before any live database migrate.
5. Preserve all existing numeric property IDs.
6. Do not drop or rename existing user/property/event data.

### Required backfill design

For each existing user:

- create one `account`;
- create an owner `account_membership`;
- create one default `portfolio`;
- attach existing properties to that default portfolio;
- retain existing `properties.userId` during transition so old code keeps working.

Do not make account ownership mandatory in runtime code until the backfill exists.

Return the generated migration SQL for review before production application.

## Work package 2 — Account authorization + plan limits

After migration/backfill is validated:

- introduce account-aware authorization helpers;
- prove cross-account property access is denied;
- preserve compatibility for the existing user ownership path during transition;
- enforce plan property limits at **active property count only**;
- no market/ZIP/state source-count limits.

Tests required:

- free account max 1 active property;
- pro max 10 active properties;
- disabled/inactive property does not consume a slot;
- properties across multiple states consume only one slot each;
- cross-account read/write is denied.

## Work package 3 — Candidate source + signal ingestion

Build server-layer functions/API for the schemas in `server/demand/contracts.ts`.

Requirements:

- validate every candidate through Zod;
- dedupe shared public sources;
- retain source provenance and retrieval/change timestamps;
- recurring series identity separate from dated occurrence;
- default candidate status only;
- no AI-driven approval;
- no private guest notes in shared signal/source records.

Add tests for malformed/unsourced AI output rejection.

## Work package 4 — Property source discovery

Implement the lifecycle defined in `PER-PROPERTY-AI-DEMAND-DISCOVERY.md`.

New active property should:

1. normalize/geocode location;
2. derive timezone;
3. discover obvious local demand anchors;
4. identify deterministic source families;
5. run AI-assisted niche-source discovery;
6. validate/promote useful sources;
7. scan 30/60/90/180/365-day horizons;
8. normalize/dedupe future signals;
9. calculate relevance independently for that property.

First acceptance fixtures should include:

- university graduation;
- major college football home game;
- nearby wedding venue / availability-state source;
- rodeo/fairgrounds event;
- niche hobby competition available only through a specialized organizer/platform;
- specialty expo/vendor event.

## Work package 5 — Pricing integration

Do not replace the current pricing engine in one jump.

Create a compatibility layer that supplies **approved, non-expired, property-relevant** forward signals to pricing.

Requirements:

- candidate/rejected/expired signals never affect price;
- `irrelevant` property relevance never affects price;
- strong/moderate/weak property relevance maps to explainable contribution policy;
- min/max caps remain authoritative;
- price reasons show the future signal and property-specific rationale;
- history remains calibration only;
- channel commissions/guest fees remain outside demand pricing.

## Work package 6 — GetawayNWA live quote UI

A branch has already been created in `ryanyatwork-ctrl/getawaynwa`:

`live-authoritative-quote-ui`

Current commit:

`214bff656fa84dea58ed4c62712cf4f18cb91adf`

The branch replaces the BookingDialog's local `quoteStay()` selected-stay calculation with `POST /api/travel/quote`.

Expected behavior:

- property + dates + guests trigger a live quote;
- exact authoritative nightly amounts are displayed;
- quote error blocks checkout;
- checkout still independently revalidates through `/api/checkout`;
- no browser-provided price is trusted;
- configured nightly range may remain only as a generic pre-date-selection hint.

Before merging:

1. wait for/check Vercel preview build;
2. run local production build/typecheck if available;
3. manually exercise Pea Ridge and Springdale date selection;
4. confirm quote failure blocks checkout;
5. confirm checkout total equals the freshly revalidated server total.

## Work package 7 — StayInCDA parity audit

After NWA is green, inspect the CDA booking UI for the same static-vs-live quote divergence.

Keep:

- truthful private upstairs guest-level classification;
- hosts onsite/downstairs;
- existing $300 deposit flow unless separately authorized to change it;
- booking subdomain architecture only; no DNS cutover yet.

## Gemini classic Gem — exact implementation target

Create/refresh a separate classic Gem named:

`RAPT Demand Analyst`

It must use the current code contract in `server/demand/contracts.ts` as its output schema.

Core instruction:

> Discover future travel-demand sources and candidate signals for the supplied property/location/date horizon. Prefer primary sources, retain evidence/provenance, estimate travel propensity separately from attendance, and output candidate data only. Never approve a signal, calculate an authoritative nightly price, or write any booking/pricing platform.

The existing marketing/GEO Gem remains separate.

## Opal — exact implementation target

Create a private workflow:

`RAPT Market Demand Packet`

Pipeline:

`property/location + horizon -> source-family selection -> niche source discovery -> evidence retrieval -> candidate normalization -> exact contracts.ts JSON -> review gate`

Opal must not become the persistent source of truth. RAPT stores validated sources/signals.

## Required handback after Antigravity execution

Return:

- repo + branch + commit for every change;
- exact migration SQL;
- tests/typecheck/build results;
- source/signal API examples;
- one sample candidate from a well-known event;
- one sample candidate from a niche specialized source;
- demonstration that the same shared event yields different property relevance;
- blockers needing credentials, payment, DNS, identity, tax/bank information, or external terms approval.
