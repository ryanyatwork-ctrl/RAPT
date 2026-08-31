# RAPT Subscriber Portfolio & ZIP-First Market Architecture

Status: approved architectural direction, 2026-08-31

## Product principle

RAPT must work for a host **before** they connect Airbnb, Vrbo, OwnerRez, or any other PMS/OTA.

The minimum useful onboarding path is:

`subscriber -> ZIP/postal code -> local market intelligence -> upcoming demand drivers -> nightly pricing recommendations`

A connected property/channel makes RAPT more capable, but it is not a prerequisite for getting recommendations.

## Current state

RAPT already has:

- authenticated users/subscribers;
- subscription tiers;
- multiple properties per user;
- plan limits of 1 property on Free, 10 on Pro, and effectively unlimited on Advanced;
- each property currently stores `userId`, location/city/state/country, optional lat/long, property type, base price and basic capacity information;
- pricing rules, events, calendar data and listing suggestions attached to a property.

This is a useful starting point but the ownership hierarchy is currently too direct for a mature SaaS product:

`user -> property`

Target:

`account -> membership -> portfolio -> property -> market profile`

## Why add an account/portfolio layer now

A portfolio layer supports all of these without redesigning the system later:

- individual host with one STR;
- individual host with several STRs;
- couple/business account with shared access;
- co-host managing several owners;
- property manager with multiple portfolios;
- team members with read/admin/pricing roles;
- subscription/property limits applied at the billing account level;
- future agency/enterprise plans;
- portfolio-level analytics and benchmarking.

A new individual subscriber should automatically receive one default portfolio, so normal users do not experience extra setup complexity.

## Proposed tenancy model

### `accounts`

Represents the billing/security tenant.

Suggested fields:

- `id`
- `name`
- `accountType`: `individual | business | property_manager`
- `billingOwnerUserId`
- `subscriptionTier`
- `status`
- timestamps

Existing subscription/Stripe ownership should eventually move from a raw user to this account boundary while retaining a compatibility path during migration.

### `account_memberships`

Suggested fields:

- `accountId`
- `userId`
- `role`: `owner | admin | manager | analyst | viewer`
- status/timestamps

All authorization must check account membership and property/portfolio scope; knowing an ID must never grant access.

### `portfolios`

Represents a logical group of properties.

Suggested fields:

- `id`
- `accountId`
- `name`
- optional owner/client label
- optional default pricing settings
- optional default market radius
- active flag/timestamps

Examples:

- `My Rentals`
- `North Idaho`
- `Northwest Arkansas`
- a property manager's customer portfolio

### `properties`

Migrate existing `userId` ownership toward `portfolioId` while preserving a safe migration path.

Add/normalize:

- `portfolioId`
- `name`
- `postalCode`
- `countryCode`
- `city`
- `state/region`
- `latitude`
- `longitude`
- `timezone`
- `marketRadiusMiles`
- property type
- bedrooms/bathrooms/max guests
- base/reference price
- min/max price
- optional address fields
- optional external IDs: OwnerRez, Airbnb, Vrbo, Booking.com, etc.

The **postal code is required for the standard RAPT recommendation workflow**. A precise street address should remain optional unless needed by a connected booking/channel integration.

## ZIP-first onboarding

### Fast path

The first-run form should be intentionally short:

1. Property nickname
2. ZIP/postal code
3. Typical/base nightly price
4. Property type
5. Bedrooms / max guests (optional but recommended)

Then RAPT should:

1. validate and normalize the postal code;
2. derive city/state/country;
3. derive a representative latitude/longitude;
4. determine timezone;
5. create a default market radius;
6. identify nearby demand anchors;
7. fetch/assemble upcoming candidate demand signals;
8. produce an initial pricing calendar with explanations;
9. invite the subscriber to enrich the property or connect a PMS later.

Do not force an Airbnb/Vrbo listing URL merely to start using RAPT.

## Market profiles should be reusable

Do **not** copy the same Spokane event separately onto every nearby subscriber property.

Introduce a reusable market layer.

### `market_profiles`

Suggested fields:

- `id`
- `countryCode`
- `postalCode`
- city/region/metro labels
- centroid lat/long
- timezone
- default radius
- optional market hierarchy IDs
- timestamps

A property points to a market profile plus its own coordinates/radius overrides.

### Demand-signal scoping

Candidate/approved signals should be associated with a geographic scope such as:

- exact postal code;
- city;
- metro/region;
- venue coordinate + radius;
- transportation hub;
- custom polygon/radius later.

At pricing time RAPT determines whether the signal is relevant to a particular property.

This prevents duplicate research/storage and makes the intelligence network improve as subscriber count grows.

## RAPT's original differentiator

RAPT should answer:

> What is likely to bring people into this property's region during the upcoming booking window, how strong is that signal, and how should it affect the recommended nightly rate?

Examples:

- concerts/festivals;
- sports tournaments;
- conferences/conventions;
- university calendars and major events;
- corporate projects / temporary workforces;
- transportation/airport changes;
- major construction projects;
- wildfire/disaster displacement and insurance housing demand;
- seasonal tourism drivers;
- holidays;
- weather impacts where appropriate;
- unusual local demand events.

The event does not need to be located inside the exact ZIP. Geographic relevance should account for distance, travel patterns, venue importance and the property's actual lodging market.

## Intelligence flow

Target:

`ZIP/property coordinates`

`-> reusable market profile`

`-> candidate demand signals from Gemini/Opal + deterministic/public data collectors`

`-> evidence/provenance/confidence validation`

`-> approved market signals`

`-> property relevance calculation`

`-> RAPT pricing engine`

`-> explainable nightly recommendation`

`-> optional OwnerRez/channel publishing`

Gemini/Opal identifies and structures candidate evidence. RAPT remains responsible for deciding how evidence affects pricing.

## Recommendation-only versus connected mode

### Recommendation-only mode

Required for all subscribers, including Free tier if allowed by product policy.

Needs only:

- property/portfolio
- ZIP/postal code
- base/reference rate

Provides:

- upcoming demand calendar;
- events/drivers;
- suggested nightly prices;
- explanations/confidence;
- manual export/use by subscriber.

### Connected mode

Optional higher-value capability.

Connections may include:

- OwnerRez
- Airbnb
- Vrbo
- Booking.com
- other PMS/channel managers

Adds:

- current bookings/occupancy;
- synchronized rates;
- channel publishing;
- booking pace;
- actual performance feedback;
- automated optimization subject to plan/authorization.

A channel connection must enrich RAPT rather than define the core product.

## Subscription model implications

Keep current property limits as a starting point, but enforce them at the **account** level after migration.

Current baseline:

- Free: 1 property
- Pro: up to 10 properties
- Advanced: effectively unlimited

Before commercial launch, revisit pricing/limits based on external-data/API cost because forward market intelligence has a per-market/per-property compute/retrieval cost.

Potential future distinction:

- number of active properties;
- number of distinct markets/ZIPs monitored;
- forecast horizon;
- refresh frequency;
- integrations/automatic rate publishing;
- team members;
- advanced provenance/confidence/competitive data.

Do not artificially force one API lookup per property if several properties share the same market; cache/reuse market intelligence.

## Privacy and multitenancy requirements

- Every property, pricing configuration and integration credential belongs to an account/portfolio scope.
- Subscriber A must never access Subscriber B's property configuration, rates, reservations or credentials.
- Shared public market events/demand evidence may be reused across tenants, but private subscriber data must not be copied into shared market records.
- External connector credentials should be encrypted/secret-managed and referenced, not stored in general application records/logs.
- Public RAPT pricing API consumers must be explicitly scoped to authorized properties/accounts before RAPT is offered as a general SaaS API.

## Migration strategy

Do this additively to avoid breaking the current three-property use case.

1. Add `accounts`, `account_memberships`, `portfolios`, and `market_profiles`.
2. Create one account + one default portfolio for every existing user.
3. Add nullable `portfolioId`, `postalCode`, `marketProfileId`, `timezone`, and `marketRadiusMiles` to existing properties.
4. Backfill existing properties into their user's default portfolio.
5. Resolve/backfill postal/market information for known properties.
6. Update application reads/writes to enforce account/portfolio scope.
7. Only after validation, make `portfolioId` and required ZIP/market fields non-null for new standard properties.
8. Keep existing numeric property IDs stable so current Getaway/OwnerRez mappings do not break.
9. Move subscription limits to account scope.
10. Add team/membership UI later; individual subscribers continue to see a simple `My Properties` experience.

## Antigravity assignment addition

Before implementing the generalized demand-signal schema, Antigravity should design the DB migration for this tenancy/market model so demand signals are not permanently coupled to one subscriber property.

Acceptance criteria:

- existing users/properties migrate without losing IDs/data;
- every new user receives a default account + portfolio;
- property onboarding accepts ZIP/postal code as the geographic anchor;
- ZIP is normalized into market profile + lat/long/timezone;
- pricing/event APIs validate account ownership;
- market signals can be shared geographically without exposing private property/account data;
- same market signal can influence multiple eligible properties without duplicated records;
- property plan limits are enforced at account level;
- current Getaway properties and future OwnerRez mappings continue to work;
- tests cover cross-tenant access denial.

## UI direction

For a normal host, do not surface database terminology like `tenant` or require them to create an organization.

Navigation can simply be:

- **Portfolio** / **My Properties**
- Add property
- Market Intelligence
- Pricing Calendar
- Integrations

A professional manager can later unlock portfolio/team organization controls.

The key promise on first use should remain simple:

> Enter where your rental is located and RAPT will show what may drive travel to the area and how that should influence upcoming nightly prices.
