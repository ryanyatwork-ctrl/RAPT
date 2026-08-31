# RAPT Forward-Demand Source Registry

Status: architectural requirement, 2026-08-31

## Purpose

RAPT's forecasting advantage depends on discovering **future travel drivers from the sources that announce them**, not merely waiting for historical occupancy, booking pace, search behavior, or competitor pricing to react.

The source layer must therefore be broad, property-aware, forward-looking, and explainable.

RAPT should continuously answer:

> What future events or travel drivers are being announced in the areas relevant to this property, and which sources are authoritative enough to support a pricing recommendation?

## Source registry model

RAPT should maintain a structured registry of source families and concrete sources.

Suggested source fields:

- `id`
- `sourceType`
- `name`
- `canonicalUrl`
- `authorityClass`
- `geographicScope`
- `eventTypes`
- `refreshCadence`
- `parser/collector type`
- `structuredFeedAvailable`
- `lastSuccessfulFetch`
- `lastChangedAt`
- `confidenceBaseline`
- `terms/collection notes`
- active flag

Potential authority classes:

- `official_primary`
- `official_secondary`
- `venue_primary`
- `regional_tourism`
- `trusted_media`
- `aggregator`
- `social_public`
- `host_supplied`

Primary/official sources should normally outrank aggregators and social posts for dates, venues and attendance/magnitude.

## Required source families

### 1. Universities and colleges

Monitor, where geographically relevant:

- academic calendars
- commencement/graduation schedules
- family weekends
- move-in/move-out periods
- major admissions/parent events
- alumni weekends
- large conferences hosted by the institution
- official athletics schedules

Important: do not treat all sports equally.

A major home football game may create materially more lodging demand than an ordinary home match in another sport. RAPT should classify the sport, opponent/importance, stadium capacity, event timing, rivalry/postseason context and observed lodging propensity rather than assigning one generic `university_sports` weight.

### 2. Major sports and tournament sources

Monitor:

- NCAA/college football schedules
- major collegiate tournaments
- youth baseball/softball/soccer/basketball tournament organizers
- regional sports complexes
- race/marathon calendars
- cycling events
- hockey tournaments where relevant
- motorsports/rodeos/equestrian events

Sports tourism should be modeled based on whether participants/families are likely to travel and stay overnight, not simply attendance.

### 3. Rodeos, fairs and fairgrounds/event complexes

Monitor official calendars for:

- rodeos
- demolition derbies
- livestock shows
- fairs
- equestrian events
- concerts/festivals hosted at the grounds
- multi-day competitions

The venue itself can be a persistent **property demand anchor** even when individual events change year to year.

### 4. Wedding and private-event venues

Wedding venues are an important property-specific demand source, but many weddings will never appear on a public event calendar.

RAPT should support persistent property-specific `demand_anchors` such as:

- nearby wedding venues
- reception/event halls
- churches with destination wedding activity
- retreat/event centers

Potential future evidence sources:

- venue public calendars
- venue public announcements/social posts where collection is allowed
- host-entered known event dates
- venue/referral partnership feeds
- PMS tags/booking notes where authorized

Do not assume absence from the public web means no demand exists.

### 5. Municipal, downtown and tourism calendars

Monitor:

- city government event calendars
- downtown associations
- tourism/visitor bureaus
- chambers of commerce
- parks/recreation calendars when they host visitor-drawing events
- cultural districts

These sources are valuable for festivals, parades, concerts, holiday events and unusual one-time celebrations.

### 6. Convention, conference and performing-arts venues

Monitor:

- convention centers
- expo halls
- arenas
- performing arts centers
- amphitheaters
- major theaters
- museums with major exhibitions/events

RAPT should differentiate a local-interest event from an event likely to create overnight demand.

### 7. Corporate/business travel drivers

Monitor forward-looking evidence such as:

- major employer events
- shareholder/associate meetings
- facility openings
- construction projects
- relocations/expansions
- temporary workforce projects
- supplier conferences
- government contracts/projects

These may not appear in ordinary event aggregators but can create significant medium-term lodging demand.

### 8. Transportation sources

Monitor:

- airport route additions
- major airport events/closures
- transportation hubs
- large road/bridge projects affecting access
- rail/service changes where relevant

Transportation changes can affect both travel volume and property relevance.

### 9. Emergency/displacement sources

Where appropriate and lawful, monitor official:

- wildfire/evacuation notices
- severe-weather disasters
- major insurance-displacement events
- emergency-management releases

These signals require extra caution because travel demand may be humanitarian/displacement-related rather than tourism.

### 10. Recurring seasonal/local demand anchors

Examples:

- ski areas
- lake season
- theme parks
- major trail systems
- hunting/fishing seasons where relevant
- annual festivals
- seasonal workforces

These may be recurring rather than event-specific, but RAPT should still use forward calendar/operating evidence rather than blindly replaying last year's occupancy.

## Property-specific demand anchors

Each property should be able to maintain its own list of nearby or historically important anchors.

Suggested `property_demand_anchors` fields:

- `propertyId`
- `anchorType`
- `name`
- coordinates/address
- drive time/distance cache
- source URL(s)
- known event categories
- user priority/notes
- learned affinity score
- active flag

Examples of anchor types:

- university
- football stadium
- sports complex
- wedding venue
- rodeo/fairground
- convention center
- hospital
- major employer/campus
- airport
- performing arts venue
- recreation destination
- custom

Property anchors do not automatically affect price. They guide discovery and relevance evaluation.

## Source weighting and travel propensity

RAPT must not count all discovered events equally.

A demand signal should be evaluated for:

- expected attendance/magnitude
- percentage of attendees likely to originate outside the local area
- overnight lodging propensity
- event duration
- participant/family travel pattern
- venue capacity
- event type
- timing/day of week
- recurring/event-series history
- regional supply/compression risk
- drive time to property
- transportation access
- property-event affinity
- evidence quality/confidence

Examples:

- home college football game: potentially high overnight-travel propensity
- ordinary local youth league game: low unless part of a traveling tournament
- graduation: high family travel propensity despite being academically rather than athletically driven
- multi-day rodeo/fair: potentially high depending on scale
- wedding at a venue one mile away: potentially very high for a nearby multi-bedroom property even if total attendance is modest

## Discovery horizons

RAPT collectors/Gemini/Opal should support multiple horizons:

- next 30 days
- next 60 days
- next 90 days
- next 180 days
- next 365 days

Long-horizon sources such as academic schedules and football schedules should be captured as soon as published. Shorter-horizon collectors should catch newly announced concerts, tournaments, private-event evidence and project changes.

## Freshness and revisions

Events change.

Every stored signal should track:

- source retrieval time
- source publication/update time when known
- last verified time
- changed dates/venue/magnitude
- cancellation/postponement status

A recurring event's prior-year details must not override current-year official data.

## Gemini / Opal assignment

The RAPT Demand Analyst and Opal workflow should use this source registry to decide **where to look**, not simply perform generic web search.

For each property:

1. load property location and demand anchors;
2. identify relevant official source families;
3. query/check scheduled future events;
4. package candidate signals with provenance;
5. estimate travel/lodging propensity separately from raw attendance;
6. pass candidates to RAPT for approval/relevance/pricing.

Gemini/Opal must not set final prices or publish rates.

## Collector architecture

Prefer deterministic collectors/API/feed parsers where stable structured sources exist.

Use LLM-assisted extraction where pages are semi-structured or announcements require interpretation.

Target:

`source registry`

`-> deterministic collectors + LLM-assisted extraction`

`-> normalized candidate demand signals`

`-> deduplication / recurring-series matching`

`-> evidence/confidence checks`

`-> approved shared signal`

`-> property-specific relevance`

`-> RAPT pricing`

## Acceptance criteria

- a property can maintain multiple demand anchors;
- source discovery is property/location-aware;
- official academic and football schedules can generate future signals before booking/search response appears;
- football can be weighted differently from lower-travel sports;
- a rodeo/fairground can generate recurring and one-time future events;
- nearby wedding venues can exist as demand anchors even if private wedding dates are not publicly discoverable;
- host-supplied known event dates remain private and can be used as candidate/confirmed property signals;
- source provenance/freshness is retained;
- duplicate events from multiple sources are reconciled rather than multiplied;
- travel/lodging propensity is modeled separately from attendance;
- all candidate signals still pass property-specific relevance and confidence controls before influencing price.
