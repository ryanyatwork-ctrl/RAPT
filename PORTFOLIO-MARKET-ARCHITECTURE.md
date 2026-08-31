# RAPT Subscriber Portfolio & Property-Location Architecture

Status: approved architectural direction, refined 2026-08-31

## Product principle

RAPT must work for a host **before** they connect Airbnb, Vrbo, OwnerRez, or any other PMS/OTA.

The minimum useful onboarding path is:

`subscriber -> property location -> local/regional demand intelligence -> upcoming demand drivers -> nightly pricing recommendations`

A connected property/channel makes RAPT more capable, but it is not a prerequisite for getting recommendations.

## Critical ownership and geography rule

**Portfolio is an ownership/billing concept, not a geographic market.**

One subscriber/account may own properties in any number of ZIP codes, cities, regions, states, or countries. Each property is geographically independent and must be evaluated against demand signals based on that property's own location.

Subscription limits are based on **number of active properties**, according to the subscriber's plan. They are not based on number of ZIP codes, states, cities, regions, or overlapping markets.

A subscriber with three properties in three distinct markets consumes three property slots. A subscriber with three properties in the same ZIP also consumes three property slots.

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

Target ownership hierarchy:

`account -> membership -> portfolio -> property`

Geographic relevance is separate:

`property location <-> overlapping demand areas/signals`

A property must **not** be permanently assigned to one single market.

## Why add an account/portfolio layer now

A portfolio layer supports all of these without redesigning the system later:

- individual host with one STR;
- individual host with several STRs in one or many states/regions;
- couple/business account with shared access;
- co-host managing several owners;
- property manager with multiple owner/client portfolios;
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

Represents a logical ownership/management grouping of properties. It does **not** define the properties' geographic market.

Suggested fields:

- `id`
- `accountId`
- `name`
- optional owner/client label
- optional default pricing settings
- active flag/timestamps

Examples:

- `My Rentals`
- `Personal Properties`
- `Smith Family Rentals`
- a property manager's customer portfolio

A portfolio may contain properties in multiple states and unrelated travel markets.

### `properties`

Migrate existing `userId` ownership toward `portfolioId` while preserving a safe migration path.

Add/normalize:

- `portfolioId`
- `name`
- `addressLine1` / optional address components
- `city`
- `state/region`
- `postalCode`
- `countryCode`
- `latitude`
- `longitude`
- `timezone`
- optional `defaultRelevanceRadiusMiles`
- property type
- bedrooms/bathrooms/max guests
- base/reference price
- min/max price
- optional external IDs: OwnerRez, Airbnb, Vrbo, Booking.com, etc.

The location must be property-specific.

For the standard RAPT recommendation workflow, the host may provide either:

1. a full/partial street address, which RAPT geocodes to precise coordinates; or
2. ZIP/postal code + city/region, which RAPT geocodes to an approximate centroid when the host does not want to provide the exact address.

Exact street address should remain private account data and must never be exposed in shared/public market intelligence unless explicitly required by an authorized integration.

## Location-first onboarding

### Fast path

The first-run form should stay intentionally short:

1. Property nickname
2. Street address **or** ZIP/postal code + city/region
3. Typical/base nightly price
4. Property type
5. Bedrooms / max guests (optional but recommended)

Then RAPT should:

1. validate and normalize the location;
2. derive city/state/country and postal code where possible;
3. derive latitude/longitude;
4. determine timezone;
5. identify nearby/overlapping demand areas and demand anchors;
6. fetch/assemble upcoming candidate demand signals;
7. calculate each signal's relevance to this specific property;
8. produce an initial pricing calendar with explanations;
9. invite the subscriber to enrich the property or connect a PMS later.

Do not force an Airbnb/Vrbo listing URL merely to start using RAPT.

## Geographic model: overlapping demand areas, not one market per property

RAPT must not lump a subscriber's properties together because they are owned by the same person or happen to share a broad regional label.

A property can be affected by **zero, one, or many overlapping demand areas** depending on the signal.

Examples:

- A University of Arkansas graduation in Fayetteville may strongly affect a Springdale property but have little or no effect on a Pea Ridge property.
- A Bentonville or Rogers event may strongly affect Pea Ridge and moderately affect Springdale.
- A Northwest Arkansas regional transportation/corporate signal may affect both.
- A Coeur d'Alene event should not affect Arkansas properties merely because they are in the same subscriber portfolio.

The system therefore needs a **property-specific relevance calculation for each demand signal**, not one static subscriber or portfolio market assignment.

## Reusable market/demand geography

Do **not** copy the same public event separately onto every subscriber property.

Shared intelligence should be stored once, then evaluated against eligible properties.

### `market_areas` / reusable geographic areas

These are reusable geographic/search/caching constructs, not exclusive property ownership assignments.

Suggested fields:

- `id`
- `areaType`: `postal_code | city | metro | county | region | venue | airport | custom_radius | other`
- country/region/city/postal labels as applicable
- centroid lat/long
- optional radius/polygon definition
- timezone where meaningful
- timestamps

A property may overlap multiple market areas. Do not require a singular `marketAreaId` as the source of truth for pricing relevance.

### Demand-signal geography

Candidate/approved demand signals should carry sufficient geographic context, such as:

- venue/location coordinates;
- city/region;
- postal code;
- transportation hub;
- event footprint or radius when known;
- custom polygon/radius later;
- market-area references where useful.

At pricing time, RAPT evaluates the signal against the individual property's coordinates/location.

## Property-to-signal relevance engine

Each approved signal should receive a property-specific relevance result before it can influence price.

Potential inputs include:

- straight-line distance;
- estimated drive time/distance where available;
- event/signal type;
- event magnitude/attendance;
- venue importance;
- whether visitors typically seek lodging beyond the event's immediate city;
- transportation corridors;
- known regional lodging spillover;
- signal confidence/provenance;
- property's configured relevance radius/market behavior;
- date overlap and expected length of stay;
- later, observed booking/occupancy response if available.

The output should be explainable, for example:

- `strong`
- `moderate`
- `weak`
- `irrelevant`

or a normalized numeric relevance score with an explanation.

A signal marked `irrelevant` for a property must not affect that property's nightly recommendation even if the signal is very important elsewhere in the broader region.

## RAPT's original differentiator

RAPT should answer:

> What is likely to bring people into the area relevant to this specific rental during the upcoming booking window, how relevant and strong is that signal for this property, and how should it affect the recommended nightly rate?

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

The event does not need to be located inside the exact ZIP. Geographic relevance should account for distance, drive time, travel patterns, venue importance, event type, regional lodging behavior and the property's actual location.

## Intelligence flow

Target:

`property address / ZIP / coordinates`

`-> nearby and overlapping demand geography`

`-> candidate demand signals from Gemini/Opal + deterministic/public data collectors`

`-> evidence/provenance/confidence validation`

`-> approved shared demand signals`

`-> property-specific relevance calculation`

`-> RAPT pricing engine`

`-> explainable nightly recommendation`

`-> optional OwnerRez/channel publishing`

Gemini/Opal identifies and structures candidate evidence. RAPT remains responsible for deciding whether each signal is geographically relevant to each property and how it affects pricing.

## Recommendation-only versus connected mode

### Recommendation-only mode

Required for all subscribers, including Free tier if allowed by product policy.

Needs only:

- property
- address/region or ZIP/postal code
- base/reference rate

Provides:

- upcoming demand calendar relevant to that specific property;
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

Keep current property limits as the starting point and enforce them at the **account** level after migration.

Current baseline:

- Free: 1 active property
- Pro: up to 10 active properties
- Advanced: effectively unlimited active properties

**Geography does not consume separate subscription slots.**

Do not charge/count separately for:

- number of ZIP codes;
- number of cities;
- number of states;
- number of overlapping markets associated with a property.

A subscriber is limited by the number of active properties allowed by the plan, regardless of where those properties are physically located.

Future plan differentiation may still use non-geographic capabilities such as:

- forecast horizon;
- refresh frequency;
- integrations/automatic rate publishing;
- team members;
- advanced provenance/confidence/competitive data;
- automation frequency/API volume.

Do not artificially force one research/API lookup per property if properties overlap geographically; cache and reuse shared public market intelligence while calculating relevance separately for each property.

## Privacy and multitenancy requirements

- Every property, pricing configuration and integration credential belongs to an account/portfolio scope.
- Subscriber A must never access Subscriber B's property configuration, rates, reservations, exact address or credentials.
- Shared public market events/demand evidence may be reused across tenants, but private subscriber data must not be copied into shared market records.
- Exact property coordinates/address may be used privately for relevance calculation without becoming part of shared public demand records.
- External connector credentials should be encrypted/secret-managed and referenced, not stored in general application records/logs.
- Public RAPT pricing API consumers must be explicitly scoped to authorized properties/accounts before RAPT is offered as a general SaaS API.

## Migration strategy

Do this additively to avoid breaking the current three-property use case.

1. Add `accounts`, `account_memberships`, and `portfolios`.
2. Create one account + one default portfolio for every existing user.
3. Add nullable `portfolioId`, normalized address/postal fields, `timezone`, and optional relevance settings to existing properties.
4. Backfill existing properties into their user's default portfolio.
5. Resolve/backfill each property location independently.
6. Add reusable `market_areas` or equivalent geographic reference/cache structure without assigning a property to one exclusive market.
7. Add demand-signal geographic metadata and a property-signal relevance layer/cache.
8. Update application reads/writes to enforce account/portfolio scope.
9. Only after validation, make `portfolioId` and required property-location fields non-null for new standard properties.
10. Keep existing numeric property IDs stable so current Getaway/OwnerRez mappings do not break.
11. Move subscription limits to account-level active property counts.
12. Add team/membership UI later; individual subscribers continue to see a simple `My Properties` experience.

## Antigravity assignment addition

Before implementing the generalized demand-signal schema, Antigravity should design the DB migration for this tenancy/location/relevance model so demand signals are not permanently coupled to one subscriber property or one fixed market.

Acceptance criteria:

- existing users/properties migrate without losing IDs/data;
- every new user receives a default account + portfolio;
- property onboarding accepts a full/partial address or ZIP/postal code + region;
- each property independently resolves to lat/long/timezone;
- one subscriber can own properties in multiple ZIP codes/states/markets;
- property limits are enforced solely by active property count according to subscription tier;
- portfolio membership never causes geographic demand signals to spill from one property to another;
- pricing/event APIs validate account ownership;
- shared demand signals can be reused geographically without exposing private property/account data;
- the same signal can influence multiple eligible properties with different relevance weights without duplicated public-signal records;
- a signal can be strong for one property and irrelevant for another;
- current Getaway properties and future OwnerRez mappings continue to work;
- tests cover cross-tenant access denial and cross-property relevance isolation.

## UI direction

For a normal host, do not surface database terminology like `tenant` or require them to create an organization.

Navigation can simply be:

- **My Properties**
- Add Property
- Market Intelligence
- Pricing Calendar
- Integrations

Each property card/settings page should show its own location and its own relevant-market intelligence. Do not present all properties as sharing one demand market simply because they are in the same portfolio.

A professional manager can later unlock portfolio/team organization controls.

The key promise on first use should remain simple:

> Tell RAPT where each rental is located. RAPT will identify what may drive travel to that property's area and show how those signals should influence its upcoming nightly prices.
