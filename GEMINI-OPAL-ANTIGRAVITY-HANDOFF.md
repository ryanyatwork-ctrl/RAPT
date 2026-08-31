# RAPT — Gemini / Opal / Antigravity Modernization Handoff

Prepared: 2026-08-31

## Mission

Modernize RAPT into the pricing authority for the Belleville Systems vacation-rental stack while preserving its intended differentiation: **forward-looking local travel-demand intelligence with explainable pricing**, not a clone of Beyond Pricing or Wheelhouse.

RAPT must remain the pricing brain. Gemini/Opal may research, classify, and propose demand signals, but they are **not** the production price engine and must never directly write OTA rates.

Target architecture:

`public/local demand evidence -> Gemini/Opal candidate signal workflow -> validated structured RAPT signal -> RAPT pricing decision -> OwnerRez nightly rates -> channels`

Booking architecture:

`traveler / Google / AI agent -> Getaway discovery APIs -> live quote -> booking.getaway*.com -> OwnerRez-backed hold/checkout`

## What has already changed on 2026-08-31

Do not undo these changes.

### RAPT

- Added authenticated server-to-server public monthly pricing endpoints:
  - `GET /api/public/pricing/:propertyId?year=YYYY&month=M`
  - compatibility form `GET /api/public/pricing?propertyId=...&year=...&month=...`
- Added `RAPT_PUBLIC_API_KEY` configuration.
- Replaced the hard-coded 2025/2026 holiday table with generated U.S. holiday dates for arbitrary years.
- Added an OwnerRez integration scaffold at `server/integrations/ownerrez.ts`.
- OwnerRez publishing is disabled by default and dry-run first.
- Added `scripts/publish-ownerrez.ts` and `pnpm ownerrez:rates`.
- OwnerRez integration requires explicit enablement, credentials, and a RAPT-property -> OwnerRez-property mapping.
- Fixed Stripe initialization so tests/local imports do not require a live Stripe key.

### GetawayNWA

- RAPT can be configured independently for Pea Ridge and Springdale.
- Checkout now fails closed when live availability cannot be verified.
- Checkout prices nights from the same live availability/pricing snapshot used for the availability decision.
- `REQUIRE_RAPT_PRICING=true` can make RAPT a hard pricing dependency after validation.
- Added machine-facing discovery/quote endpoints and travel-agent manifest.
- Planned branded booking domain: `booking.getawaynwa.com`.

### StayInCDA / GetawayCDA

- Checkout fails closed on live availability failures.
- `REQUIRE_RAPT_PRICING=true` can make RAPT a hard pricing dependency after validation.
- Added machine-facing discovery/quote endpoints and travel-agent manifest.
- Planned branded booking domain: `booking.getawaycda.com`.

## Important current RAPT limitations

The current pricing model is still a deterministic first-generation heuristic:

- base price
- weekend multiplier
- generated U.S. holiday multiplier
- manually/statically stored event multiplier
- peak/off-season multiplier
- min/max caps

Demand score is additive and event impact is reduced to high/medium/low. This is useful as a baseline, but it is not yet the forward-demand intelligence product RAPT is intended to become.

The current `events` schema already contains useful building blocks such as source, category, dates, demand impact/score, attendance, venue, URL and tags. Extend rather than discard it unless a separate generic `demand_signals` model is demonstrably cleaner.

## Existing Gemini / Opal material

There are two concepts that must remain separate.

### Existing RAPT marketing Gem

The current `rapt-gem-pack.md` is a marketing/GEO knowledge pack. It describes RAPT's value propositions, brand voice, content workflows and dated GEO/AEO measurements. Keep it as a **marketing/discovery Gem** if still useful. Do not turn it into the pricing intelligence source of truth.

### RAPT demand-intelligence role

Earlier product context correctly describes RAPT as using a Google Gem for the forward view of who may travel to a market and why. Rebuild/refresh that concept as a dedicated **RAPT Demand Analyst** plus an Opal workflow that produces structured candidate signals.

Google currently distinguishes:

- **Classic Gems**: repeatable expert conversations driven by instructions + knowledge.
- **Gems from Google Labs / Opal**: interactive multi-step mini-app workflows.

Use those roles intentionally.

---

# Assignment A — Antigravity: validate and stabilize current repositories

Work locally, one repository at a time. Do not deploy and do not change external accounts/DNS.

## A1. RAPT

Open the local RAPT repository and sync current `main`.

Run:

```powershell
git status
git pull
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
```

If CI is still failing, inspect the latest GitHub Actions failure and fix the smallest root cause. Do not disable tests, remove type checking, weaken frozen-lockfile behavior, or add fake secrets merely to make CI green.

Verify specifically:

1. `server/publicPricingApi.ts` compiles and requires API authentication in production.
2. Public pricing response shape remains compatible with both Getaway site adapters (`pricing`, `days`, raw array handling).
3. `server/integrations/ownerrez.ts` compiles but cannot publish unless explicitly enabled.
4. `pnpm ownerrez:rates -- --property=<id> --year=2026 --month=9` operates as a dry run when valid local mapping is provided.
5. No OwnerRez call occurs from normal app startup/tests.
6. Holiday tests still pass for 2026 and add at least one future-year holiday test (2027+).
7. Stripe-related tests run without a production Stripe secret.

Stop before deployment or OwnerRez publish.

## A2. GetawayNWA

Open/sync the GetawayNWA repo.

Run its install, tests/typecheck if defined, and production build.

Then reconcile the booking UI with the new server quote path. The current client-side `quoteStay()` path still uses legacy/static/Beyond-era daily-rate data for display, while checkout now uses the live availability/RAPT snapshot. This must not remain divergent.

Required result:

- booking dialog requests a live quote from `POST /api/travel/quote` after property + dates + guest count are selected;
- UI displays the exact live nightly breakdown returned by the server;
- checkout revalidates independently immediately before payment;
- no client-provided price is trusted by checkout;
- availability/quote failure is shown clearly and blocks payment;
- local fallback pricing may remain only while `REQUIRE_RAPT_PRICING=false`;
- once RAPT production validation is complete, the deployment can safely set `REQUIRE_RAPT_PRICING=true`.

Also validate:

- `GET /api/travel/properties`
- `POST /api/travel/quote`
- `GET /.well-known/travel-agent`
- `NEXT_PUBLIC_BOOKING_BASE_URL=https://booking.getawaynwa.com`
- property-aware handoff for Pea Ridge and Springdale.

## A3. StayInCDA

Run equivalent build/typecheck tests.

Validate:

- RAPT live pricing is represented correctly in direct availability/quote output;
- `$300` deposit behavior remains unchanged unless explicitly assigned otherwise;
- quote describes StayInCDA truthfully as a private upstairs guest level with hosts on-site;
- no whole-home classification is introduced;
- `NEXT_PUBLIC_BOOKING_BASE_URL=https://booking.getawaycda.com` is supported without requiring DNS to exist yet.

Stop before deployment.

---

# Assignment B — Antigravity: build the RAPT demand-signal model

Create a dedicated branch after Assignment A is green.

Suggested branch:

`rapt-demand-intelligence-v2`

## Objective

Give RAPT a structured way to accept forward-looking demand evidence without letting an LLM directly determine or publish prices.

### Required canonical signal fields

Design the schema cleanly, but it must be able to represent at least:

- property / market scope
- signal type (`event`, `conference`, `sports`, `festival`, `school_calendar`, `corporate_travel`, `construction_project`, `weather_disruption`, `displacement`, `transportation`, `seasonal_driver`, `other`)
- title / concise description
- start/end date or active window
- location and optional radius/market relevance
- source name/type
- source URL/reference
- source publication/retrieval timestamp
- expected attendance or magnitude when known
- impact direction (`positive`, `negative`, `mixed`, `unknown`)
- impact score / proposed demand strength
- confidence class/score
- provenance / evidence notes
- expiration/staleness date
- status (`candidate`, `approved`, `rejected`, `expired`)
- producing workflow/agent where applicable
- human-review metadata where required

Do not put secrets or private guest data in demand-signal records.

### Pricing integration

The pricing engine should consume **approved, non-expired** signals only.

Do not replace the deterministic pricing model in one jump. Add the new signal contribution as an explainable layer and preserve:

- min price
- max price
- base price
- existing weekend/season/holiday behavior until tests justify changes
- readable price reasons

A price response should increasingly be able to explain:

- base rate
- calendar/season effects
- approved demand signals used
- each signal's contribution
- confidence/provenance summary
- final caps applied

### Guardrails

- LLM output is a **candidate** signal, never automatic production truth.
- One unsupported web/social assertion must not become a high-impact multiplier.
- Expired/stale signals must stop affecting prices automatically.
- RAPT, not Gemini/Opal, computes the final nightly rate.
- OwnerRez publishing uses only RAPT's final approved nightly rates.
- Keep channel commissions/guest fees outside the demand model.

### Tests

Add tests for:

- approved future event increases demand as configured;
- candidate/unapproved signal does not affect rate;
- expired signal does not affect rate;
- negative signal can reduce demand when policy permits;
- confidence/evidence weighting cannot bypass min/max caps;
- multiple overlapping signals remain explainable;
- future-year pricing works without a hard-coded holiday table.

---

# Assignment C — Gemini classic Gem: `RAPT Demand Analyst`

Create a new classic Gem. Do **not** overwrite the existing marketing Gem.

Suggested instructions:

```text
You are the RAPT Demand Analyst for the Really Awesome Pricing Tool (RAPT).

MISSION
Identify forward-looking travel-demand signals that may affect short-term-rental demand in a specific market and date range. Your output is evidence for RAPT, not a final nightly price.

RAPT IS AUTHORITATIVE FOR PRICING
Never set, publish, or claim an authoritative nightly rate. Never modify Airbnb, Vrbo, Booking.com, OwnerRez, or direct-booking inventory. Produce structured candidate demand signals only.

EVIDENCE RULES
- Distinguish confirmed events/facts from inference.
- Prefer primary/official sources for event dates, venue schedules, public projects, transportation changes, emergency notices, major employers/universities and local authorities.
- Include source, publication/retrieval date, event/impact dates and uncertainty.
- Do not invent attendance, occupancy, demand, revenue, bookings or competitor rates.
- If magnitude is unknown, say unknown.
- Separate multiple independent signals rather than merging them into one vague conclusion.
- Flag stale, contradictory or weak evidence.

FOR EACH SIGNAL RETURN
- title
- market/location
- affected date range
- type
- concise factual description
- source name
- source URL/reference
- retrieved/published date
- expected magnitude/attendance if verified, otherwise null
- impact direction: positive / negative / mixed / unknown
- proposed demand strength: 1-10
- confidence: low / medium / high
- rationale
- uncertainties/contradictions
- expiration/staleness date
- recommended status: candidate

OUTPUT
Return a human-readable summary followed by a JSON array matching the current RAPT demand-signal ingestion schema supplied in your knowledge files.

Never mark your own signal approved. Approval belongs to RAPT policy/human review.
```

Knowledge for this Gem should include a current, generated RAPT schema/API guide—not hard-coded secrets or stale marketing metrics.

---

# Assignment D — Opal / Gem from Google Labs: `RAPT Market Demand Packet`

Create a **private** Opal workflow/Gem from Google Labs.

This is a workflow UI for producing a reusable demand packet, not the persistent system of record.

## Inputs

- market/city
- property or market identifier
- arrival window / analysis window
- optional property facts
- optional known event URLs or source documents

## Workflow

1. **Normalize request**
   - market
   - property scope
   - date window
   - guest/trip segment if relevant

2. **Gather/inspect supplied evidence**
   - extract event/travel facts
   - preserve source references and dates
   - reject unsupported claims

3. **Classify signals**
   - event
   - sports
   - conference
   - corporate/business
   - university/school
   - transportation
   - construction/project workforce
   - displacement/emergency
   - weather disruption
   - seasonal driver
   - other

4. **Assess relevance**
   - affected dates
   - geographic relevance
   - likely direction
   - proposed strength
   - confidence
   - staleness/expiry

5. **Produce structured packet**
   - exact JSON matching RAPT's candidate-signal schema
   - human-readable explanation
   - explicit unknowns

6. **Review gate**
   - output remains `candidate` only
   - show a clear message that RAPT/human review is required before the signal can influence pricing

## Opal non-goals

- no direct OwnerRez writes
- no Airbnb/Vrbo writes
- no payment access
- no credentials in prompts/workflow state
- no guest PII
- no autonomous approval
- no authoritative price calculation

Once the RAPT candidate-signal API exists, Antigravity may propose a secure ingestion connection. Do not create that external connection until its authentication and approval model is reviewed.

---

# Assignment E — update the RAPT marketing Gem separately

The current marketing Gem knowledge pack contains dated July 2026 GEO/AEO measurements. Refresh it only from verified current measurements.

Keep its mission limited to:

- RAPT product explanation
- SEO/AEO/GEO analysis
- marketing copy
- positioning/content

It must not act as the RAPT pricing/demand analyst.

Remove or refresh stale numeric grades and citation percentages rather than presenting old measurements as current.

---

# Assignment F — booking/OwnerRez integration readiness

After local builds are green and the OwnerRez account exists:

1. obtain OwnerRez property IDs;
2. map each numeric RAPT property ID to the OwnerRez property ID;
3. set credentials locally/secret store only;
4. run dry-run monthly publisher output;
5. compare every generated rate against RAPT UI/API;
6. publish a deliberately limited future test window only after explicit owner approval;
7. verify OwnerRez -> OTA propagation before expanding the horizon;
8. then begin replacing iCal as the primary reservation-sync method.

No paid enrollment, external terms acceptance, DNS change or live rate publication is authorized by this document alone.

## Deliverable back to ChatGPT/Forge

Return:

- exact branch/commit
- files changed
- `pnpm test` result
- `pnpm check` result
- `pnpm build` result
- remaining CI failures if any
- screenshots or curl/HTTP output for the public pricing endpoint and travel quote endpoints
- proposed DB migration for demand signals
- sample Gemini demand-signal JSON
- Opal workflow screenshot/export or step inventory
- blockers requiring account credentials, DNS, platform enrollment or payment approval
