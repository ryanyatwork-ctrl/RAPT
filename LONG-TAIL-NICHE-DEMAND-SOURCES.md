# RAPT Long-Tail & Niche Travel-Demand Sources

Status: architectural requirement, 2026-08-31

## Why this matters

Some of the highest-value lodging demand is created by events that never appear on major tourism calendars, large ticketing sites, or generic city event feeds.

Examples include:

- radio-controlled car races and nationals;
- billiards/pool championships;
- youth sports tournaments;
- specialty conferences and expos;
- hobby competitions;
- livestock/equestrian events;
- maker/homesteading gatherings;
- specialty trade gatherings;
- regional club championships.

Participants, vendors, teams and families may travel hundreds or thousands of miles and stay multiple nights even when the event is obscure to the general public.

RAPT must therefore search the **ecosystems where niche communities actually publish schedules**, not just generic event aggregators.

## Source-family strategy

### RC / model racing

Potential source classes:

- track websites;
- LiveRC event archives/calendars;
- RCSignup;
- sanctioning bodies such as ROAR;
- race series websites;
- manufacturer/team calendars;
- local/regional RC clubs;
- track social pages where allowed.

These sources often reveal multi-day race weekends, warmups, nationals and finals well before broader local calendars notice them.

### Billiards / pool

Potential source classes:

- CSI/BCA league directories;
- Western BCA and local league pages;
- tournament-finder services such as Action Buddy;
- AZBilliards event calendars/results;
- venue calendars and social pages;
- league Facebook pages where collection is allowed;
- Challonge/other public bracket systems when location/date metadata is available;
- local newspaper sports/community notices.

Because many pool events recur annually and draw players across state/province lines, RAPT should support recurring-series identity and infer travel propensity from field size, prize pool, league scope and historical origin patterns where defensible.

### Specialty conferences/expos

Potential source classes:

- venue/fairgrounds calendars;
- organizer websites;
- vendor/exhibitor pages;
- speaker pages;
- ticketing pages;
- sponsor announcements;
- exhibitor travel pages;
- niche community media.

Vendor/exhibitor participation is itself a lodging-demand signal, distinct from attendee demand.

## Concrete discovery examples

### Hayden Radio Controlled Raceway

A race facility in Hayden, Idaho publishes event results through LiveRC. Its 2025 archive included `HRCR 2025 Adam Drake Gas Truck Nationals`, held June 13-15, 2025, with more than 100 entries. LiveRC also exposes recurring series and other major race weekends.

This is the exact kind of source a generic tourism-event collector may miss but RAPT should monitor when the property is in North Idaho.

### Kootenai County Fairgrounds / Modern Homesteading Conference

The Kootenai County Fairgrounds publishes its own event calendar, and the Modern Homesteading Conference organizer publishes future dates, speakers, vendor information and travel details. The 2026 event advertised roughly 4,000 attendees and vendor participation, and the organizer is already publishing the 2027 dates.

RAPT should treat:

- attendee travel;
- vendor/exhibitor travel;
- speaker/staff travel;
- multi-day duration;
- fairgrounds proximity;

as separate contributing factors where evidence supports them.

### North Idaho billiards

North Idaho BCA/CSI sources identify an active Coeur d'Alene league/venue ecosystem, including Paddy's Sports Bar & Grill. Historical public reporting confirms an annual North Idaho Championships 8-ball tournament, while current tournament-finder sources expose additional Coeur d'Alene pool events.

Even when the exact prior tournament cannot be reconstructed from public search, the source ecosystem itself should become a monitored RAPT collector family.

## Discovery principle

When a host reports:

> “A guest came from far away for an event I had never heard of.”

RAPT should ask:

1. What event was it?
2. What venue/organizer/sanctioning body published it?
3. What niche platform or league system contained the schedule?
4. Is this a recurring event/series?
5. What other similar event sources exist in that niche?
6. Should the source family be added to the regional collector registry?

This turns unexpected guest travel reasons into **source-discovery intelligence**, not merely historical booking notes.

## Source expansion feedback loop

Target workflow:

`unexpected guest travel reason`

`-> identify event/series`

`-> identify original source ecosystem`

`-> register source family`

`-> backfill recurring/event history`

`-> begin forward monitoring`

`-> future event discovered before booking spike`

This supports RAPT's forward-looking differentiation: historical guest feedback teaches RAPT **where to look next time**, while future published schedules drive the forecast.

## Niche-event travel propensity

RAPT should not discount an event simply because the general public has never heard of it.

Potential evidence of high lodging propensity includes:

- national/regional championship designation;
- multi-state league participation;
- multi-day schedule;
- large entry field;
- participants from distant states/provinces;
- vendor/exhibitor requirements;
- early registration/waitlist behavior;
- host hotel recommendations;
- prize purse or sanctioning-body importance;
- participant/family travel patterns;
- prior confirmed event-related stays.

## Engineering requirements

- source registry must support niche platform types, not only generic `eventbrite`/city sources;
- collectors should be modular by source family;
- LiveRC-like structured event archives should be parsable deterministically where practical;
- recurring event series should be matched across years;
- niche event discovery must feed the same normalized demand-signal schema as mainstream events;
- historical guest feedback may suggest source families but does not substitute for current forward evidence;
- a newly announced niche event with no prior booking history must still be able to influence price if evidence and property relevance justify it;
- provenance must identify the original organizer/venue/platform rather than only a secondary search result.
