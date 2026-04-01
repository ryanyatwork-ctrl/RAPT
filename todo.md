# RAPT – Really Awesome Pricing Tool

## Database & Backend
- [x] Define schema: users, properties, events, pricing_rules, subscriptions, calendar_data, listing_suggestions
- [x] Run migrations and apply SQL
- [x] Server router: properties CRUD
- [x] Server router: events (local event intelligence)
- [x] Server router: pricing engine (demand scoring + multipliers)
- [x] Server router: AI listing optimizer (LLM-powered title/description)
- [x] Server router: subscriptions (tier management)
- [x] Server router: revenue forecast

## Frontend – Landing & Auth
- [x] Landing page with hero, features, pricing tiers, CTA
- [x] Auth flow (Manus OAuth login/logout)
- [x] Global DashboardLayout with sidebar navigation
- [x] Theme: dark professional with teal/emerald accent

## Frontend – Dashboard
- [x] Multi-property dashboard overview
- [x] Property switcher dropdown
- [x] Summary cards (revenue, occupancy, demand score, events)
- [x] Interactive calendar with color-coded demand (high/medium/low)
- [x] Calendar day detail panel (events, demand score, suggested price)

## Frontend – Pricing Engine
- [x] Pricing rules configuration (base price, multipliers)
- [x] Weekend / holiday / event / seasonality multiplier sliders
- [x] Suggested price per date with reasoning breakdown
- [x] Price preview scenarios panel

## Frontend – Event Intelligence
- [x] Event list panel with source badges (Eventbrite, Facebook, City, Sports)
- [x] Demand score visualization per event
- [x] Event date range overlay on calendar
- [x] Manual event add form

## Frontend – AI Listing Optimizer
- [x] Title suggestion generator (LLM)
- [x] Description insert generator (LLM)
- [x] Guest type selector (families, couples, business, outdoor, etc.)
- [x] Copy-to-clipboard for generated content
- [x] Generation history panel

## Frontend – Revenue Forecast
- [x] Monthly revenue projection chart (6-month rolling)
- [x] Occupancy rate estimate
- [x] Comparison: current vs. optimized pricing
- [x] Monthly breakdown table

## Frontend – Subscription
- [x] Subscription tier display (Free / Pro / Advanced)
- [x] Upgrade flow UI
- [x] Feature gating based on tier

## Frontend – Property Management
- [x] Add / edit / delete property form
- [x] Property detail: base price, location, type, rules
- [x] Property-specific pricing rules
- [x] Tier-based property limit enforcement

## PWA
- [x] manifest.json with icons and shortcuts
- [x] Service worker for offline capability
- [x] Service worker registration in index.html

## Testing
- [x] Vitest: auth.me and auth.logout
- [x] Vitest: subscription tier limits (free/pro/advanced)
- [x] All 7 tests passing


## Stripe Integration (NEW)
- [x] Add Stripe feature to project
- [x] Configure Stripe API keys (publishable + secret)
- [x] Build Stripe checkout session router
- [x] Create Stripe subscription info retrieval
- [x] Implement subscription status tracking in DB
- [x] Build Stripe webhook handler for payment events
- [x] Wire webhook to update user tier and payment status

## Admin Portal (NEW)
- [x] Admin-only route protection (/admin)
- [x] User list table with subscription status
- [x] Subscription status badges (active, trial, cancelled, expired)
- [x] Cancel subscription action with confirmation
- [x] Admin role enforcement (only owner can access)
- [x] Admin menu item in sidebar (hidden for non-admins)

## Event Data APIs (NEW)
- [x] Eventbrite API integration scaffolding
- [x] Ticketmaster API integration with live search
- [x] Event deduplication logic (avoid duplicates across sources)
- [x] Event source attribution (Eventbrite vs Ticketmaster)
- [x] AI demand scoring for fetched events
- [x] Event fetch router (tRPC procedure for manual fetch)
- [x] Event fetch UI trigger with zip code input
- [x] Import Events button on Events page
