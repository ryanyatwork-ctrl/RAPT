# RAPT Forward-Demand Forecasting Principle

Status: core product doctrine, 2026-08-31

## Principle

RAPT must remain **forward-looking first**.

The primary question is not:

> What did travelers book in the past?

It is:

> What is going to happen in or around this property's relevant travel market, why could it cause people to travel there, and how should that expected demand affect upcoming nightly prices?

Historical data, booking pace, occupancy, search behavior and prior event response are valuable calibration inputs. They must not replace forward event/demand discovery as RAPT's core forecasting method.

## Forecasting hierarchy

RAPT should reason in this order:

1. **Discover future demand drivers**
   - upcoming sports tournaments
   - graduations/university calendars
   - concerts/festivals
   - conferences/conventions
   - corporate projects and temporary workforce demand
   - transportation/airport changes
   - construction/infrastructure projects
   - displacement/emergency housing demand
   - seasonal tourism drivers
   - holidays
   - other verified travel-generating events

2. **Evaluate each driver's relevance to the specific property**
   - location
   - drive time/distance
   - event type
   - expected attendance/magnitude
   - duration
   - transportation corridors
   - visitor lodging propensity
   - regional lodging spillover
   - evidence confidence

3. **Use observed/historical property response as calibration**
   - prior bookings explicitly attributed to the recurring event
   - occupancy response
   - booking lead-time response
   - realized price response
   - repeat event-related stays

4. **Use current market response as confirmation/calibration**
   - booking pace
   - availability/occupancy compression
   - search demand where available
   - defensible competitor/market signals

5. **Produce the explainable nightly recommendation**
   - future driver discovered
   - property-specific relevance
   - confidence/provenance
   - historical affinity calibration where available
   - market-response confirmation where available
   - pricing caps/rules

The absence of historical bookings must **not** prevent RAPT from forecasting a new future event.

## New-event advantage

A core use case is a newly announced event with no prior booking history.

Example:

- a new tournament is announced for a venue near a property;
- the event has verified dates, meaningful expected attendance and a strong lodging requirement;
- no historical occurrence exists;
- no booking/search spike has appeared yet.

RAPT should still be capable of identifying the event, evaluating its likely property relevance and recommending an anticipatory pricing adjustment.

That is the intended advantage of forward-demand intelligence: act **before lagging market behavior fully reveals the demand**.

## Recurring events

For recurring events, forward discovery remains primary, while historical property-event affinity improves calibration.

Target logic:

`future occurrence discovered`

`-> current-year evidence/magnitude/location evaluated`

`-> property relevance calculated`

`-> prior occurrence response used to calibrate confidence/strength`

Historical affinity must not blindly reuse last year's adjustment. The current occurrence may differ in:

- dates
- venue
- attendance
- duration
- competing events
- transportation access
- lodging supply
- economic context

## Competitive positioning

Do not claim merely that RAPT is "the first pricing tool to use events" without defensible evidence. Existing dynamic-pricing vendors also reference local events.

RAPT's intended distinction is narrower and more defensible:

> **RAPT is designed around forward event and travel-driver intelligence as a primary exogenous demand signal, then uses observed market and property history as calibration rather than waiting for those lagging indicators to reveal demand.**

Potential positioning language should emphasize:

- forecast travel demand from what is about to happen;
- identify demand before booking pace alone shows it;
- property-specific relevance rather than broad-market event labels;
- explain why a future event should affect this specific rental;
- learn from prior property response without becoming historically dependent.

Before making any public "first," "only," or patent-like competitive claim, perform a documented competitive review and preserve supporting evidence.

## Gemini / Opal role

Gemini/Opal should focus heavily on **future event discovery and evidence packaging**.

They should answer questions such as:

- What verified events are scheduled in the property's relevant travel radius over the next 30/60/90/365 days?
- Which announcements indicate future business/workforce travel?
- Which university/sports/conference calendars create lodging demand?
- What newly announced event might not yet show up in occupancy/search data?
- What is known about attendance, duration, visitor origin and lodging propensity?

They should return candidate demand signals with provenance/confidence. RAPT determines relevance and price impact.

## Product metrics

RAPT should eventually measure whether forward intelligence creates value before lagging indicators emerge.

Useful metrics include:

- days between RAPT signal discovery and measurable market-demand response;
- days between RAPT signal discovery and first related booking;
- forecasted demand direction versus realized occupancy/ADR;
- event-specific revenue lift versus baseline;
- percentage of meaningful demand signals discovered before search/booking spikes;
- false-positive rate for forecast signals;
- property-event affinity calibration accuracy.

These metrics can become stronger evidence of RAPT's differentiation than broad marketing claims.

## Engineering acceptance criteria

- future demand signals can affect recommendations without any prior occurrence/history;
- historical booking response is optional calibration, never required input;
- new/one-time events are supported as first-class signals;
- recurring-event history cannot override current-year factual evidence;
- recommendation explanations distinguish `forward signal`, `historical calibration`, and `current market confirmation`;
- tests include a new event with zero historical data producing a justified recommendation;
- tests include a recurring event where prior affinity improves confidence;
- tests include a prior recurring event whose current-year venue/magnitude changed and therefore receives a different effect;
- Gemini/Opal workflows prioritize upcoming/future evidence rather than historical booking data.
