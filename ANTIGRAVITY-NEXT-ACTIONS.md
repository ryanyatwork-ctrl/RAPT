# Antigravity — Current RAPT / Getaway Execution Checkpoint

Updated: 2026-08-31

This file is the **start-here work queue** for Antigravity. Do not redo completed work. Read it together with:

- `PORTFOLIO-MARKET-ARCHITECTURE.md`
- `FORWARD-DEMAND-FORECASTING-PRINCIPLE.md`
- `FORWARD-DEMAND-SOURCE-REGISTRY.md`
- `LONG-TAIL-NICHE-DEMAND-SOURCES.md`
- `PER-PROPERTY-AI-DEMAND-DISCOVERY.md`
- `GEMINI-OPAL-ANTIGRAVITY-HANDOFF.md`

## Non-negotiable product rules

1. **RAPT is forward-first.** Discover future travel drivers before booking/search/occupancy history necessarily reacts.
2. Historical booking response is **calibration**, not the forecasting engine.
3. Every active property receives independent location-aware and niche-source discovery.
4. Portfolio is ownership/organization, **not geography**.
5. Subscription limits are based on **active property count only**, never ZIP/city/state/market count.
6. A shared future signal can be strong for Property A and irrelevant for Property B.
7. Gemini/Opal can propose candidate sources/signals but cannot approve signals, calculate authoritative prices, publish rates, or write OwnerRez/OTA inventory.
8. No paid signup, OwnerRez activation, external terms acceptance, DNS cutover, or live rate publication without explicit owner approval.

# Completed — do not repeat

## RAPT forward-demand foundation

Merged PR #10:

`ad21de53f3b608601373def58557848e464d50b8`

`drizzle/schema.ts` now contains additive definitions for:

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

The legacy `properties.userId` and property-bound `events` model remain for transitional compatibility. Existing numeric property IDs have not been changed.

**Database migration/backfill has NOT been generated or applied yet.**

## Forward-first property relevance

Implemented:

- `server/demand/relevance.ts`
- `server/demand/relevance.test.ts`

Forward evidence dominates:

- geography / drive time
- out-of-area travel propensity
- overnight lodging propensity
- signal type
- magnitude
- property fit
- source confidence
- transportation-corridor relevance

Historical affinity + observed booking response are bounded calibration only, capped at 15% total boost.

Tests prove:

- a brand-new future event can score strong with zero historical bookings;
- the same shared event scores differently for different properties;
- high attendance alone is not sufficient lodging demand;
- history cannot make a geographically implausible event strong.

## Gemini / Opal machine boundary

Merged PR #11:

`c1cd7c08ff8f25dbe18e9a80787d604d1fcdb5fd`

Implemented:

- `server/demand/contracts.ts`
- `server/demand/contracts.test.ts`

Requirements enforced in code:

- evidence/provenance required;
- candidate-only AI output;
- strict schemas reject unknown fields;
- invalid date windows rejected;
- AI attempts to include approval or authoritative pricing fields are rejected, not silently stripped.

Gemini and Opal must use these contracts rather than inventing a parallel JSON format.

## Candidate identity / deduplication

Merged PR #12:

`4f4c5375a41cda51a27afe37f747c4bdd1fe58c2`

Implemented:

- `server/demand/ingestion.ts`
- `server/demand/ingestion.test.ts`

Behavior:

- strict validation before ingestion processing;
- canonical public-source URLs;
- tracking/referral parameter removal;
- duplicate source reconciliation;
- recurring series identity separated from dated occurrence identity;
- duplicate mentions from organizer / venue / tourism / registration sources reconcile into one event candidate with combined evidence;
- different years and different venues remain separate occurrences;
- unauthorized AI pricing/approval fields fail before deduplication.

CI after the compatibility fix:

- tests: passing
- TypeScript: passing
- production build: passing

## GetawayNWA authoritative guest quote — LIVE

Repo: `ryanyatwork-ctrl/getawaynwa`

Merged main commit:

`77f4f6e63aea03a295245947783d93d6bf3d526f`

Production Vercel deployment:

`dpl_8j7LwjhoWfAaMBoCDpTb82s97qkG`

The booking dialog now:

- POSTs selected property/dates/guests to `/api/travel/quote`;
- displays exact authoritative nightly amounts;
- identifies RAPT pricing authority when active;
- blocks checkout if live quote generation fails;
- never trusts a browser-supplied price;
- still lets `/api/checkout` independently revalidate immediately before Stripe.

Do not restore client `quoteStay()` as the selected-stay price authority.

## StayInCDA machine quote parity — LIVE

Repo: `ryanyatwork-ctrl/stayincda`

Merged main commit:

`09cd664838fe57f72ab1188b30d1a4e9cd4e09c4`

Production Vercel deployment:

`dpl_57d24x1TtBtCaHYUDSf7LiyxhjCf`

The CDA guest UI was already based on the live availability/RAPT snapshot. The machine-facing `/api/travel/quote` was corrected to include the same extra-guest fees in the stay total.

Keep unchanged unless separately authorized:

- private upstairs guest-level classification;
- hosts onsite/downstairs;
- existing refundable booking deposit flow;
- booking subdomain architecture only; no DNS cutover yet.

# Current RAPT deployment blocker

Application CI is healthy. GitHub production deployment cannot run because the RAPT repository has no Actions secrets configured for:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The Belleville Systems Vercel team is:

`team_yMzMSPeN1dQKqTwvoufdJ6BL`

There is currently **no RAPT project in that connected Vercel team**. Do not fabricate a project ID or mask the deploy failure. Creation/linking of a real RAPT Vercel project and secret setup requires an authenticated environment that can perform those actions.

# Next work package 1 — Generate migration SQL, REVIEW ONLY

This is the first Antigravity task that requires the local repo/toolchain.

From current RAPT `main`:

1. `git pull`
2. `pnpm install --frozen-lockfile`
3. generate Drizzle migration SQL from the current schema **without applying it to production**;
4. return the complete generated SQL for review;
5. do not run migration against any live database until explicitly approved after review.

The current package command `pnpm db:push` combines generation + migration, so do not blindly use it against a configured production `DATABASE_URL`. Use the Drizzle generation step separately or an isolated development database.

### Required backfill design

For every existing user:

- create one `account`;
- create owner `account_membership`;
- create one default `portfolio`;
- associate existing properties with that default portfolio;
- preserve every existing numeric property ID;
- retain `properties.userId` during transition.

No destructive drop/rename of existing user/property/event data.

# Next work package 2 — Account authorization and plan limits

After migration/backfill is reviewed and safely applied:

- add account-aware authorization helpers;
- preserve transitional user ownership until all callers move over;
- deny cross-account reads/writes;
- enforce tier property limits by **active property count only**.

The legacy helper already counts only `isActive = true`; preserve this semantic.

Tests required:

- free: max 1 active property;
- pro: max 10 active properties;
- inactive property does not consume a slot;
- properties across multiple states consume one slot each, not geography slots;
- cross-account access denied.

# Next work package 3 — Persistent source/signal ingestion

Build the database-backed layer on top of:

- `server/demand/contracts.ts`
- `server/demand/ingestion.ts`

Requirements:

- validate first;
- dedupe shared public sources/signals;
- persist provenance, retrieval time, revisions and status;
- recurring series separate from occurrences;
- default status `candidate`;
- candidate/rejected/expired data cannot influence pricing;
- no private subscriber booking notes in shared public records;
- AI cannot promote its own candidate.

Add authorization tests and duplicate-evidence tests at the persistence boundary.

# Next work package 4 — Per-property source discovery

Implement `PER-PROPERTY-AI-DEMAND-DISCOVERY.md`.

New/active property lifecycle:

1. normalize/geocode location;
2. derive timezone;
3. build obvious local demand anchors;
4. select deterministic source families;
5. run AI-assisted niche-source discovery;
6. validate/promote useful sources;
7. scan 30/60/90/180/365-day horizons;
8. normalize/dedupe future candidates;
9. calculate relevance independently for that property.

Initial acceptance fixtures:

- university graduation;
- major college football home game;
- wedding venue / public availability-state source;
- rodeo/fairgrounds event;
- niche hobby competition discoverable only through a specialized platform;
- specialty expo/vendor event.

# Next work package 5 — Forward signal pricing compatibility layer

Do not rewrite the current pricing engine in one jump.

Add a compatibility adapter that exposes only:

- approved signals;
- non-expired occurrences;
- non-irrelevant property relevance.

Requirements:

- candidate/rejected/cancelled/expired signals never affect price;
- `irrelevant` relevance never affects price;
- strong/moderate/weak contribution remains explainable;
- min/max pricing caps remain authoritative;
- price reasons identify the future event and why it matters to the specific property;
- historical affinity remains calibration only;
- channel commissions/guest fees remain outside demand pricing.

# Gemini classic Gem target

Create/refresh a **separate** classic Gem:

`RAPT Demand Analyst`

Core instruction:

> Discover future travel-demand sources and candidate signals for the supplied property/location/date horizon. Prefer primary sources, retain evidence/provenance, estimate travel propensity separately from attendance, and output candidate data only using RAPT's `server/demand/contracts.ts` schema. Never approve a signal, calculate an authoritative nightly price, or write any booking/pricing platform.

The existing marketing/GEO Gem remains separate.

# Opal target

Create private workflow:

`RAPT Market Demand Packet`

Pipeline:

`property/location + horizon -> source-family selection -> niche source discovery -> evidence retrieval -> candidate normalization -> contracts.ts JSON -> review gate`

RAPT remains the persistent source of truth.

# Required handback from Antigravity

Return:

- repo + branch + commit for every change;
- generated migration SQL before any live migration;
- tests/typecheck/build results;
- persistence/API examples;
- one well-known future event candidate;
- one niche specialized-source candidate;
- proof that one shared event produces different property relevance;
- blockers requiring credentials, payment, DNS, identity, tax/banking data, or external terms approval.
