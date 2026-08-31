# RAPT Observed Demand Feedback & Property-Event Affinity

Status: architectural requirement, 2026-08-31

## Purpose

RAPT should not treat every demand signal as purely theoretical. When a property has actually booked because of a recurring event or demand driver, that observed response is direct evidence that the signal is relevant to that property.

This creates a feedback layer above generic distance-based reasoning:

`public demand signal -> property relevance estimate -> observed booking response -> learned property-event affinity -> stronger future relevance`

The design must preserve privacy. Shared public event records stay reusable across subscribers, while booking-response evidence remains private to the account/property.

## Representative scenario

Consider a recurring youth/adult sports tournament held at fields approximately one mile from a rental property.

If guests have explicitly stated that they selected that rental for the same tournament in three consecutive years, RAPT should treat that as substantially stronger evidence than simply knowing:

- the tournament exists;
- the fields are nearby;
- the event has a particular attendance estimate.

On the next recurrence, the system should recognize a high-confidence **property-event affinity** and elevate the relevance of that tournament for that property.

This example is intentionally generic and contains no private guest or property-identifying data.

## Evidence hierarchy for property relevance

Potential relevance evidence, from weaker to stronger:

1. **Geographic inference**
   - straight-line distance
   - drive time
   - same ZIP/city/metro

2. **Event/travel characteristics**
   - event type
   - duration
   - attendance/magnitude
   - visitor origin profile
   - lodging requirement likelihood
   - transportation corridors
   - known regional lodging spillover

3. **Market behavior**
   - observed occupancy increase during prior occurrences
   - compression/price movement
   - booking lead-time changes
   - competitor/market booking response where defensible data exists

4. **Direct property response**
   - guest explicitly identifies the event/travel driver as the reason for the stay
   - booking dates align with the event
   - repeated bookings tied to the same recurring event
   - repeat guest/team/organization associated with the event

Repeated direct property response should materially increase future relevance confidence, subject to recency and evidence quality.

## New private data concept: `property_signal_observations`

Suggested fields:

- `id`
- `accountId`
- `propertyId`
- `signalId` or recurring-series ID
- `observationType`
  - `guest_stated_reason`
  - `host_confirmed_reason`
  - `booking_date_alignment`
  - `repeat_event_booking`
  - `occupancy_response`
  - `pricing_response`
  - `other`
- `bookingId` or external booking reference **only if privately authorized and appropriately protected**
- `eventOccurrenceId` / event year
- `stayStartDate`
- `stayEndDate`
- `observedImpact`
  - `strong_positive`
  - `positive`
  - `neutral`
  - `negative`
  - `unknown`
- `confidence`
- `source`
  - host entered
  - structured booking field
  - PMS metadata
  - approved message classification
  - system inference
- `notes` with no unnecessary guest PII
- timestamps

These observations are private subscriber data and must never be copied into shared public demand-signal records.

## Derived concept: `property_signal_affinity`

RAPT may maintain a derived/cache record representing accumulated evidence for a recurring signal/series and property.

Suggested fields:

- `propertyId`
- `signalSeriesId`
- `affinityScore` (normalized)
- `confidenceClass`
- `observationCount`
- `directReasonCount`
- `yearsObserved` / occurrence count
- `lastObservedAt`
- `recencyWeight`
- `explanationJson`
- updated timestamp

This is a derived recommendation input, not an immutable fact. It should be recomputable from private observations plus signal history.

## Recurring-event identity matters

RAPT should distinguish:

- one occurrence of an event;
- the recurring event series.

Example:

`Regional Softball Tournament` = series

`Regional Softball Tournament — 2026` = occurrence

Historical evidence from 2024, 2025 and 2026 can inform the expected relevance of the 2027 occurrence even if the exact dates, attendance or venue configuration change.

The system should therefore support a `signalSeriesId` or equivalent recurrence identity.

## Relevance calculation

Property-specific signal relevance should eventually combine factors such as:

`base geographic relevance`

`× event travel/lodging propensity`

`× magnitude/attendance factor`

`× regional spillover factor`

`× evidence confidence`

`× learned property-event affinity`

with reasonable caps and explainability.

Do not blindly multiply raw values. The final implementation should be calibrated and testable, but the conceptual rule is important:

> Proven historical response at the specific property should be allowed to override weak generic assumptions about whether travelers "should" stay there.

For example, even if a broad model says a particular tournament is only moderately important to a city, three years of confirmed bookings for one property can justify a strong relevance score for that property.

## Pricing explanation

When historical affinity materially affects a recommendation, RAPT should tell the subscriber.

Example explanation:

- `Recurring sports tournament 1.2 mi away: +12%`
- `High property relevance: guests booked for this event in 3 prior occurrences`
- `Confidence: high`

The exact adjustment should be calculated by RAPT policy/model, not hard-coded from this example.

## How observations enter the system

### Manual first

The lowest-risk implementation is a simple host action on a booking/property/event:

**“Was this stay related to a local event or demand driver?”**

Options could include:

- select a known RAPT event/signal;
- search another event;
- enter another reason;
- not event-related / unknown.

This gives RAPT high-quality feedback without requiring access to guest conversations.

### PMS-connected mode later

Where permitted and authorized, OwnerRez or another PMS may provide:

- booking dates;
- source/channel;
- optional tags/custom fields;
- repeat booking metadata.

RAPT can propose likely event alignment but should distinguish inference from confirmed reason.

### Message classification later

If a subscriber explicitly authorizes access to relevant guest communications, an AI classifier may propose that a guest stated a travel reason.

Guardrails:

- do not store full guest messages in shared intelligence;
- minimize PII;
- retain source/provenance;
- mark model-derived classifications as inferred until confirmed if confidence is insufficient;
- never use unrelated private communications for general market intelligence.

## Negative learning matters too

Observed response should not only increase scores.

If an event repeatedly occurs nearby but produces no discernible demand for a property, RAPT may lower its property-specific relevance over time.

However, absence of a booking is weaker evidence than a confirmed event-related booking because many other factors affect whether an individual property books.

Therefore:

- direct positive booking attribution = strong evidence;
- repeated market/property response = meaningful evidence;
- no booking = weak negative evidence unless enough history/context exists.

## Cold-start behavior

New properties have no booking-response history.

RAPT should begin with:

- location;
- event attributes;
- event attendance/magnitude;
- drive time;
- lodging propensity;
- regional spillover;
- comparable public/aggregate patterns where legitimate.

As real subscriber observations accumulate, property-specific affinity becomes progressively more important.

This lets RAPT work immediately from an address/ZIP while getting smarter for long-term users.

## Cross-property behavior

Affinity must remain property-specific.

If one subscriber owns two properties 25 miles apart and Property A repeatedly books for an event, that does not automatically prove Property B has the same affinity.

The shared event record may be reused, but each property receives its own relevance/affinity evaluation.

## Subscription implications

This feedback system does **not** create new location/market subscription slots.

Subscription limits remain based on active property count. Historical observations and overlapping demand signals are features of those properties.

Higher subscription tiers may later differ by:

- history horizon;
- automated PMS feedback ingestion;
- advanced affinity learning;
- refresh frequency;
- automatic rate publishing;
- analytics depth.

Do not meter the subscriber simply because one property is influenced by many events.

## Antigravity implementation requirements

When implementing the demand-signal/relevance model, include a migration/design for private property-signal observations and derived affinity.

Acceptance tests must include:

1. A nearby event with no history starts from generic geographic/event relevance.
2. One confirmed event-related booking increases relevance for that property.
3. Three confirmed recurring-event bookings across separate occurrences produce a materially higher confidence/affinity than proximity alone.
4. Historical affinity for Property A does not automatically increase Property B's affinity.
5. Old observations decay appropriately rather than remaining permanently dominant.
6. A future occurrence of the same recurring event can inherit historical series evidence.
7. Private booking observations never appear in public/shared market-signal payloads.
8. Pricing explanations can identify historical property response as a reason without exposing guest identity or private messages.
9. Min/max price guardrails remain authoritative regardless of affinity.
10. Unconfirmed model inference is weighted below host-confirmed/direct booking attribution.

## Product opportunity

This feedback loop gives RAPT a compounding advantage:

**Year 1:** RAPT knows the event is nearby.

**Year 2:** RAPT knows the event correlated with a booking.

**Year 3+:** RAPT knows this specific recurring event is a proven demand driver for this specific property and can price earlier and with greater confidence.

That is materially different from a generic event calendar or a purely historical market-rate tool.
