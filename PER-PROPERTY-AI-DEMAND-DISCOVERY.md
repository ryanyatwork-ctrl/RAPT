# RAPT Per-Property AI Demand Discovery

Status: core product requirement, 2026-08-31

## Product promise

For every active subscriber property, RAPT should automatically discover the future events, niche competitions, private-event anchors, institutional calendars, specialty gatherings and other travel drivers that may create overnight lodging demand in the property's relevant area.

The host should not have to know these events exist in advance.

RAPT's intended advantage is:

> **AI discovers what will bring travelers into the property's area before ordinary booking/search history necessarily reveals the demand.**

This requirement applies independently to every property in a subscriber account, regardless of how many ZIP codes, cities or states that subscriber's properties occupy.

## Per-property lifecycle

When a property is created or activated:

1. Resolve the property's address / ZIP / coordinates / timezone.
2. Build an initial local demand-anchor graph.
3. Identify standard official source families relevant to the location.
4. Perform AI-assisted discovery of niche/local source ecosystems not already in the registry.
5. Rank sources by authority, forward visibility and likelihood of producing overnight travel.
6. Persist useful source/anchor relationships for continued monitoring.
7. Scan upcoming horizons (30 / 60 / 90 / 180 / 365 days).
8. Normalize and deduplicate candidate future demand signals.
9. Calculate relevance separately for this property.
10. Produce explainable pricing recommendations.
11. Learn from host/booking feedback and expand the source graph over time.

The property does not need an Airbnb/Vrbo/PMS connection for this discovery process to work.

## Two-layer discovery architecture

### Layer 1 — deterministic known-source monitoring

RAPT maintains collectors for known source families, for example:

- university academic/commencement calendars;
- NCAA/college football schedules;
- tourism/city/chamber calendars;
- convention centers and fairgrounds;
- performing-arts and arena calendars;
- tournament systems;
- RC racing platforms;
- billiards sanctioning bodies and tournament platforms;
- rodeos/equestrian/fair calendars;
- wedding/event venues and public availability calendars;
- specialty expos/conferences;
- major employers/projects;
- airports/transportation;
- emergency/displacement sources.

Where a stable API/feed/structured page exists, deterministic collection should be preferred.

### Layer 2 — AI source discovery

Known collectors are not sufficient. RAPT must use AI to ask, for each property:

- What local or regional venues attract overnight visitors?
- What niche competition communities operate here?
- What sanctioning bodies, registration systems or bracket platforms publish events here?
- What hobby/special-interest events occur locally that ordinary tourism calendars miss?
- What nearby wedding venues, sports complexes, fairgrounds, campuses, convention spaces or private-event facilities could generate lodging demand?
- What specialty trade shows, expos, vendor events, clinics, workshops or certification events attract out-of-area participants?
- What recurring annual events have their own organizer sites rather than appearing in broad aggregators?
- What newly announced one-time events may not yet be represented in existing source registries?

AI discovery should propose **sources and candidate events**, not directly change prices.

## Local source graph

For each property, maintain a private/derived graph of relevant entities and sources.

Example conceptual graph:

`Property`

`-> nearby venue / demand anchor`

`-> organizer / sanctioning body / registration platform`

`-> public calendar / schedule / availability page`

`-> future event occurrences`

`-> property-specific relevance`

One source can serve multiple properties. Shared public-source records should be reused rather than duplicated, while each property retains its own relevance relationship.

## Niche-source discovery examples

RAPT should be capable of finding source ecosystems such as:

- radio-controlled racing: LiveRC, RCSignup, ROAR, track calendars, regional race series;
- billiards/pool: BCA/CSI, regional leagues, tournament/bracket platforms, local pool halls;
- youth/travel sports: tournament organizers, sports complexes, sanctioning bodies;
- dance/cheer/gymnastics: competition organizers and registration systems;
- martial arts/wrestling: tournament promoters and bracket systems;
- dog shows/agility: kennel clubs, trial calendars, fairgrounds;
- equestrian/rodeo: associations, arenas, fairgrounds;
- hobby conventions: model trains, comics, gaming, collectibles, maker/homesteading events;
- trade/vendor events: organizer/exhibitor calendars and fairgrounds;
- weddings/private events: venue calendars, public booked/open availability, referral feeds;
- specialty education: workshops, certification training, clinics, retreats;
- outdoor competitions: fishing tournaments, races, cycling, skiing, trail events;
- religious/family gatherings with material travel where publicly discoverable;
- other local ecosystems discovered by AI.

The list must remain extensible. New source types should be learnable without a full RAPT redeploy whenever possible.

## Source discovery output

AI source discovery should return structured candidates such as:

- source name;
- canonical URL;
- source family/type;
- geographic scope;
- authority class;
- kinds of events likely published;
- whether future dates are visible;
- whether availability state is visible;
- estimated lodging/travel relevance;
- suggested refresh cadence;
- confidence;
- evidence/rationale;
- collection constraints/terms notes;
- recommended status: candidate.

A source must pass validation before being promoted to active automatic monitoring.

## Event discovery output

Future event candidates should include:

- title;
- event/series identity;
- dates;
- venue/location;
- source/provenance;
- expected attendance/magnitude where verified;
- participant/vendor/spectator travel profile;
- overnight lodging propensity;
- confidence;
- current publication/revision timestamp;
- status.

RAPT then determines property relevance and price impact.

## Self-expanding intelligence

RAPT should learn new source ecosystems from real host experience.

Example flow:

1. Host reports that a booking was for an unfamiliar niche event.
2. RAPT identifies the event and its organizer/source ecosystem.
3. The source is added as a candidate to the registry.
4. If validated, RAPT begins monitoring future events from that ecosystem for relevant properties.
5. The finding may improve shared public intelligence for other geographically relevant subscribers without exposing the original host's private booking data.

This creates a compounding network effect: unexpected travel reasons improve future discovery.

## Subscriber isolation and shared intelligence

- Subscription limits remain based only on active property count.
- Every active property receives its own discovery/relevance process.
- A subscriber with properties in several states receives independent source graphs for each property.
- Public source/event intelligence may be shared globally across RAPT when relevant.
- Private property location, booking attribution, exact address and subscriber-specific affinity remain private.
- A discovered source near Property A must not affect Property B unless the event independently passes Property B's relevance calculation.

## Scheduling model

Not all sources require the same scan cadence.

Examples:

- annual academic calendars: low-frequency check + change detection;
- football schedules: low-frequency until schedule release, then revision checks;
- fairgrounds/event venues: weekly or daily depending on update pattern;
- wedding availability calendars: change detection on an appropriate cadence;
- tournament registration platforms: frequent during scheduling season;
- newly discovered niche sources: initial deeper crawl, then learned cadence;
- emergency/displacement signals: higher-frequency monitoring where enabled.

RAPT should minimize unnecessary crawling/API expense by caching shared source data across relevant properties.

## AI advantage and guardrails

The AI advantage is **discovery and interpretation**, not unchecked autonomy.

AI is well suited to:

- discovering non-obvious sources;
- understanding semi-structured calendars;
- identifying that an event is likely to attract travelers rather than locals only;
- connecting venue -> organizer -> sanctioning body -> future schedule;
- recognizing recurring event series despite naming changes;
- extracting dates/magnitude from announcements;
- explaining uncertainty;
- suggesting new collector patterns.

AI must not:

- invent events;
- mark weak rumors as confirmed;
- publish rates directly;
- bypass source/provenance requirements;
- use private subscriber booking information as shared public data;
- treat every nearby event as lodging demand.

## Core competitive metric

Track **non-obvious forward demand discovery**.

Potential metrics:

- meaningful events discovered that were absent from standard city/tourism calendars;
- days RAPT discovered an event before observable booking/search compression;
- percentage of subscriber-confirmed travel drivers that RAPT had already discovered;
- newly learned source ecosystems per market;
- false-positive rate;
- source-to-booking attribution over time.

These metrics should help demonstrate RAPT's AI advantage more credibly than unsupported "first" or "only" claims.

## Engineering acceptance criteria

- every active property has independent location-aware discovery;
- new subscribers do not need to manually enumerate every local source;
- AI can propose niche source ecosystems from the property's location;
- validated sources persist and are monitored forward;
- shared source data is cached across relevant properties;
- property relevance remains independent;
- source/event provenance is mandatory;
- new one-time events can affect recommendations with zero historical booking data;
- a host-confirmed unknown travel driver can seed future source discovery;
- subscription geography does not create extra property/market slots;
- tests include a niche event discoverable only from a specialized source, not a standard municipal calendar.
