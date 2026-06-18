# RAPT User Guide
### Really Awesome Pricing Tool — Complete Feature Walkthrough

**Version:** 1.0 · **App URL:** [getrapt.app](https://getrapt.app)

---

## Table of Contents

1. [What is RAPT?](#1-what-is-rapt)
2. [Getting Started — Landing Page & Sign-In](#2-getting-started--landing-page--sign-in)
3. [Navigation — The Sidebar](#3-navigation--the-sidebar)
4. [Dashboard](#4-dashboard)
5. [Demand Calendar](#5-demand-calendar)
6. [Pricing Engine](#6-pricing-engine)
7. [Event Intelligence](#7-event-intelligence)
8. [AI Listing Optimizer](#8-ai-listing-optimizer) *(Pro / Advanced)*
9. [Revenue Forecast](#9-revenue-forecast)
10. [Properties](#10-properties)
11. [Subscription](#11-subscription)
12. [Admin Portal](#12-admin-portal) *(Admin only)*
13. [Plans & Feature Limits at a Glance](#13-plans--feature-limits-at-a-glance)
14. [How the Pricing Engine Works](#14-how-the-pricing-engine-works)
15. [Frequently Asked Questions](#15-frequently-asked-questions)

---

## 1. What is RAPT?

RAPT (**Really Awesome Pricing Tool**) is a short-term rental pricing and optimization platform. It combines:

- **Local event intelligence** — knows when concerts, sports games, and festivals drive demand near your property
- **Dynamic pricing engine** — configurable multipliers that automatically adjust nightly rates
- **AI listing optimizer** — generates compelling Airbnb/VRBO titles and descriptions tailored to upcoming events
- **Revenue forecasting** — 6-month rolling projections so you can plan ahead

RAPT is purpose-built for STR hosts who want to charge the *right* price for the *right* guest on the *right* night.

---

## 2. Getting Started — Landing Page & Sign-In

### 2.1 The Home Page

When you visit **getrapt.app**, you'll see the public landing page. It has four sections:

| Section | What You'll See |
|---------|----------------|
| **Hero** | Headline "Set the right price for the right guest," a demo demand calendar preview, and two call-to-action buttons: **Start Free Today** and **View Demo Dashboard** |
| **Features** | Six feature cards (Smart Calendar, Event Intelligence, Dynamic Pricing Engine, AI Listing Optimizer, Multi-Property Support, Revenue Forecasting) |
| **Compare** | Side-by-side comparison table: RAPT vs. AirDNA vs. PriceLabs |
| **Pricing** | Three plan cards: Free ($0), Pro ($14/mo), Advanced ($29/mo) |

The top navigation bar (fixed, frosted glass effect) contains:
- **RAPT logo** (top left)
- **Features / Pricing / Compare** anchor links (desktop only)
- **Sign In** button (ghost style) and **Get Started** button (filled)

### 2.2 Signing In

RAPT uses a secure OAuth/OpenID sign-in flow.

**Steps:**
1. Click **Sign In** or **Get Started** on the landing page
2. You are redirected to the identity provider login screen
3. After authenticating, you are redirected to `/dashboard`

> **Note:** If you are already signed in and visit the landing page, the **Sign In** button is replaced by **Go to Dashboard**.

---

## 3. Navigation — The Sidebar

After signing in, all app pages share a left-side navigation panel.

### 3.1 Sidebar Structure

```
┌─────────────────────────┐
│  ☰  RAPT    [PRO]       │  ← Logo + plan badge
├─────────────────────────┤
│  ⊞  Dashboard           │
│  📅  Calendar           │
│  📈  Pricing Engine     │
│  ⚡  Event Intelligence  │
│  🧠  AI Listing         │
│  📊  Revenue Forecast   │
│  🏠  Properties         │
│  💳  Subscription       │
│  🛡  Admin              │  ← visible to admin only
├─────────────────────────┤
│  👤  Your Name          │  ← click to open user menu
│     your@email.com      │
└─────────────────────────┘
```

### 3.2 Sidebar Behaviors

| Behavior | How |
|----------|-----|
| **Collapse / expand** | Click the **☰** (PanelLeft) icon at the top of the sidebar. In collapsed mode, only icons are shown with tooltips on hover. |
| **Resize** | Drag the thin vertical divider on the right edge of the sidebar. Width is saved between sessions (min 200px, max 320px). |
| **Mobile** | On small screens the sidebar is hidden by default. A hamburger button appears in the top bar to open it as an overlay. |
| **Active item** | The current page is highlighted with the accent color and a bold label. |
| **Plan badge** | The `[FREE]`, `[PRO]`, or `[ADVANCED]` badge next to the logo reflects your active subscription tier. |

### 3.3 User Menu (Footer)

Click your avatar or name at the bottom of the sidebar to open a dropdown with:
- **Subscription** → navigates to `/subscription`
- **Sign out** → logs you out and returns to the landing page

---

## 4. Dashboard

**URL:** `/dashboard`

The Dashboard is the home screen after login. It shows a real-time overview of one selected property for the current month.

### 4.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Dashboard           [June 2026 overview]             │
│                                    [Property Selector] │
└───────────────────────────────────────────────────────┘

┌─ Property Info Bar ───────────────────────────────────┐
│  📍 Pea Ridge Mountain Cabin  Pea Ridge, AR  [Cabin]  │
│                                      $150/night base  │
└───────────────────────────────────────────────────────┘

┌──── Stats Cards (2×2 grid on mobile, 1×4 on desktop) ─┐
│  Projected Revenue │ Avg Suggested Price │ High Demand │ Upcoming Events │
│  $3,420            │ $171/night          │ 8 days      │ 3               │
└────────────────────┴─────────────────────┴─────────────┴─────────────────┘

┌─ Next 7 Days ─────────────────────────────────────────┐
│  [Sun]  [Mon]  [Tue]  [Wed]  [Thu]  [Fri]  [Sat]     │
│   18     19     20     21     22     23     24         │
│  $95    $90   $120   $220   $130   $180   $195         │
│  (blue)(blue)(yellow)(red)(yellow)(red) (red)         │
└───────────────────────────────────────────────────────┘

┌─ Upcoming Events ─────────┐  ┌─ Quick Actions ──────────┐
│  • Bikes Blues BBQ  HIGH  │  │  📈 Update Pricing Rules  │
│  • AMP Concert     MEDIUM │  │  ⚡ Add Local Event        │
│  • Labor Day        HIGH  │  │  🧠 Generate AI Listing   │
│                           │  │  💵 View Revenue Forecast │
└───────────────────────────┘  └──────────────────────────┘

[Free tier only] ──────────────────────────────────────
⚠ Unlock AI Listing Optimizer & Multi-Property Support
   Upgrade to Pro for $14/mo                [Upgrade →]
```

### 4.2 Property Selector

The **Property Selector** dropdown (top-right of the header) lets you switch between all your properties. It auto-selects your first property on load.

> If you have no properties yet, a full-page empty state appears with an **Add Property** button that links to `/properties`.

### 4.3 Stats Cards

| Card | What it Shows |
|------|--------------|
| **Projected Revenue** | Estimated monthly revenue based on occupancy rates and suggested prices for the current month |
| **Avg Suggested Price** | Mean of all suggested nightly prices across the month |
| **High Demand Days** | Count of days this month classified as "high demand" (demand score ≥ 7.5/10) |
| **Upcoming Events** | Count of events in your Event Intelligence list with a start date in the future |

### 4.4 Next 7 Days Strip

Shows the next 7 calendar days as colored tiles:
- **Red** = High demand — price shown in red
- **Yellow** = Medium demand — price shown in yellow
- **Blue** = Low demand — price shown in blue

Click any tile to jump to the full Calendar page (`/calendar`).

### 4.5 Upcoming Events Panel

Lists up to 5 upcoming events with:
- Colored dot (red = high, yellow = medium, blue = low impact)
- Event title
- Date range
- Impact badge (High / Medium / Low)

Click **All Events →** to navigate to Event Intelligence.

### 4.6 Quick Actions Panel

| Action | Where It Goes | Note |
|--------|--------------|------|
| Update Pricing Rules | `/pricing` | Always available |
| Add Local Event | `/events` | Always available |
| Generate AI Listing | `/listing` | **Disabled** on Free tier (shows "Pro" badge) |
| View Revenue Forecast | `/forecast` | Always available |

### 4.7 Upgrade Banner (Free Tier)

If you're on the Free plan, a blue banner at the bottom prompts you to upgrade to Pro with a direct link to `/subscription`.

---

## 5. Demand Calendar

**URL:** `/calendar`

The Demand Calendar gives you a full month view of every day's suggested price and demand level, with event overlays.

### 5.1 Page Layout

```
┌─ Header ───────────────────────────────────────────────┐
│  Demand Calendar                  [Property Selector]  │
│  Color-coded pricing and event intelligence            │
└────────────────────────────────────────────────────────┘

● High demand (8 days)  ● Medium demand (12 days)  ● Low demand (10 days)  ⚡ Has events

┌─ Calendar (2/3 width) ───────────┐  ┌─ Day Detail Panel (1/3) ─────────┐
│   ← June 2026 →                  │  │  (click a day to populate)        │
│  Sun Mon Tue Wed Thu Fri Sat      │  │  • Suggested Price: $220          │
│   1    2   3   4   5   6   7     │  │  • Demand Score: 9.0 / 10 [HIGH]  │
│   8    9  10  11  12  13  14     │  │  • Pricing Factors:               │
│  15   16  17  18  19  20  21     │  │    - Weekend pricing (+30%)        │
│  22   23  24  25  26  27  28     │  │    - Holiday: Memorial Day (+45%)  │
│  29   30                         │  │    - High-demand event: AMP (+35%) │
└──────────────────────────────────┘  │  • Events on this day:             │
                                       │    ⚡ Bikes Blues BBQ [high impact] │
                                       └────────────────────────────────────┘
                                       ┌─ Month Summary ──────────────────┐
                                       │  Base price:      $150/night      │
                                       │  Avg suggested:   $171/night      │
                                       │  Peak price:      $287/night      │
                                       │  Events this month: 5             │
                                       └──────────────────────────────────┘
```

### 5.2 Navigating the Calendar

| Control | Action |
|---------|--------|
| **← / →** arrows | Navigate to the previous or next month |
| **Click a day tile** | Opens the Day Detail Panel on the right |
| **Click again (selected day)** | Closes the Day Detail Panel |

### 5.3 Day Tile Colors

Each day tile in the calendar is color-coded by demand level:

| Color | Demand Level | Demand Score |
|-------|-------------|-------------|
| 🔴 Red background | High | 7.5 – 10 |
| 🟡 Yellow background | Medium | 5.0 – 7.4 |
| 🔵 Blue background | Low | 1.0 – 4.9 |

Each tile shows:
- **Day number** (today is bold and accent-colored)
- **Suggested price** (e.g., `$185`)
- **Demand score** (small gray text, e.g., `8.5`)
- **⚡ lightning bolt** in the top-right corner if one or more events fall on that day

### 5.4 Day Detail Panel

When you click a day, the right panel shows:

- **Suggested Price** — the computed nightly rate in large text
- **Demand Score** — a score from 1–10 with a demand level badge (High / Medium / Low)
- **Pricing Factors** — bulleted list explaining exactly *why* the price is what it is (e.g., "Weekend pricing +30%", "Holiday: Christmas +45%", "Peak season +25%")
- **Events on this day** — each event with its source badge and impact level

### 5.5 Month Summary Card

Always visible on the right (below the Day Detail Panel). Shows:
- Base price
- Average suggested price
- Peak (highest) price
- Count of events this month

### 5.6 Legend

The row below the header explains the color coding and the lightning bolt icon. The day counts update dynamically as you change months.

---

## 6. Pricing Engine

**URL:** `/pricing`

The Pricing Engine lets you fine-tune how RAPT computes nightly rates for each property. All changes are saved per-property.

### 6.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Pricing Engine              [Property Selector]      │
│  Configure dynamic pricing multipliers                │
└───────────────────────────────────────────────────────┘

┌─ Demand Multipliers (left 2/3) ─┐  ┌─ Price Preview (right 1/3) ──────┐
│                                  │  │  Based on $150/night base         │
│  Weekend Premium        +30%     │  │                                    │
│  [slider ●────────────]  ×1.30  │  │  Regular weekday      $135        │
│                                  │  │  Weekend              $195        │
│  Holiday Premium        +45%     │  │  Peak season weekend  $244        │
│  [slider ●────────────]  ×1.45  │  │  High-demand event    $203        │
│                                  │  │  Holiday              $218        │
│  High-Impact Event      +35%     │  │  Holiday + event      $294        │
│  [slider ●────────────]  ×1.35  │  │                                    │
│                                  │  │  ℹ How multipliers stack:         │
│  Medium-Impact Event    +15%     │  │  Applied sequentially. Price caps  │
│  [slider ●────────────]  ×1.15  │  │  are enforced last.               │
│                                  │  └────────────────────────────────────┘
│  Low Demand Discount    -10%     │
│  [slider ●────────────]  ×0.90  │
└──────────────────────────────────┘

┌─ Seasonal Pricing ────────────────────────────────────┐
│  Peak Season Premium   +25%   [slider]   ×1.25       │
│  Off-Season Discount   -15%   [slider]   ×0.85       │
│                                                       │
│  Peak Months:  [Jan] [Feb] [Mar] [Apr] [May] [Jun]   │
│                [Jul] [Aug] [Sep] [Oct] [Nov] [Dec]   │
│  (highlighted = selected, defaults: Jun, Jul, Aug)    │
└───────────────────────────────────────────────────────┘

┌─ Price Floors & Ceilings ─────────────────────────────┐
│  Minimum Price ($/night): [________]  No minimum      │
│  Maximum Price ($/night): [________]  No maximum      │
└───────────────────────────────────────────────────────┘

[Save Pricing Rules]   [Reset Defaults]
```

### 6.2 Demand Multipliers

Each multiplier has a **slider** (drag to adjust) and a **percentage label** that shows the impact at a glance.

| Multiplier | Default | When Applied |
|-----------|---------|-------------|
| **Weekend Premium** | +30% (×1.30) | Friday, Saturday, and Sunday nights |
| **Holiday Premium** | +45% (×1.45) | US federal holidays (New Year's, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas) |
| **High-Impact Event** | +35% (×1.35) | When a "high" demand impact event falls on that date |
| **Medium-Impact Event** | +15% (×1.15) | When a "medium" demand impact event falls on that date |
| **Low Demand Discount** | −10% (×0.90) | Standard weekdays with no events or seasonal boosts |

> **Slider range:** All demand multipliers run from 0.50× (−50%) to 2.50× (+150%). The Low Demand Discount is capped at ×1.00 (no discount above base).

**How to read the controls:**
- The **percentage** on the right (e.g., `+30%`) shows increase or decrease from base price
- The **multiplier badge** (e.g., `×1.30`) shows the raw multiplier value
- Drag the slider left to decrease, right to increase

### 6.3 Seasonal Pricing

| Setting | Default | Description |
|---------|---------|-------------|
| **Peak Season Premium** | +25% (×1.25) | Applied to every day that falls in a "peak month" |
| **Off-Season Discount** | −15% (×0.85) | Applied to January, February, and November by default (configurable) |

**Peak Months selector** — click any of the 12 month buttons to toggle that month as a peak period. Selected months appear with an accent color border and background. Defaults: June, July, August.

### 6.4 Price Floors & Ceilings

Two numeric inputs let you set absolute price limits regardless of what the multipliers compute:

- **Minimum Price** — RAPT will never suggest a price below this value. Leave blank for no floor (defaults to 50% of base price).
- **Maximum Price** — RAPT will never suggest a price above this value. Leave blank for no ceiling (defaults to 4× base price).

Price caps are always enforced *last*, after all multipliers are applied.

### 6.5 Price Preview Panel

The right-side panel shows live previews of what 6 common scenarios would cost with your current settings, using your property's base price:

| Scenario | Multipliers Applied |
|----------|-------------------|
| Regular weekday | Low demand ×0.90 |
| Weekend | Weekend ×1.30 |
| Peak season weekend | Weekend × Peak season |
| High-demand event | High event ×1.35 |
| Holiday | Holiday ×1.45 |
| Holiday + event | Holiday × High event (stacked) |

All previews update **in real time** as you move sliders.

### 6.6 Saving Changes

Click **Save Pricing Rules** to persist your settings. The button shows "Saving..." while the request is in flight. A green toast notification appears on success. Click **Reset Defaults** to restore all sliders to their factory values.

> Changes take effect immediately for future pricing calculations but do not retroactively alter calendar data already generated.

---

## 7. Event Intelligence

**URL:** `/events`

Event Intelligence lets you build a database of local events that RAPT factors into demand scoring and pricing. You can add events manually or auto-import from Ticketmaster.

### 7.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Event Intelligence           [Property Selector]     │
│  Track local events that drive demand                 │
└───────────────────────────────────────────────────────┘

┌─ Stats Row ───────────────────────────────────────────┐
│  Total Events: 12  │  High Impact: 4  │  Upcoming: 7  │
└───────────────────────────────────────────────────────┘

[🔍 Search events...]   [Zip code] [Import Events]  [+ Add Event]

─── UPCOMING (7) ─────────────────────────────────────────

│ ● Bikes Blues & BBQ Festival  [HIGH] [festival]       │
│   📅 Sep 27 – Sep 29  📍 Bentonville, AR  festival   │
│   3,000 expected                          [✏][🗑]    │

│ ● AMP Summer Concert Series  [MEDIUM] [music]         │
│   📅 Jul 12  📍 Walmart AMP, Rogers AR  manual        │
│   5,000 expected                          [✏][🗑]    │

─── PAST (5) ──────────────────────────────────────────────
(grayed out)
```

### 7.2 Stats Cards

Three quick-stat cards at the top:
- **Total Events** — count of all events for this property
- **High Impact** — count of events marked "high" demand impact
- **Upcoming** — events with an end date in the future

### 7.3 Search and Import Bar

- **Search field** — filters events by title or venue name in real time
- **Zip code field** — enter a ZIP code to enable the Ticketmaster auto-import
- **Import Events** button — fetches upcoming events from Ticketmaster for the entered ZIP code and adds them automatically. Shows a spinner while loading. Displays a success toast with the count of events imported.
- **Add Event** button — opens the Add Event dialog

### 7.4 Event List

Events are split into two sections:
- **Upcoming** — events whose end date is today or later, sorted by start date
- **Past** — events already finished (shown at 60% opacity, limited to the 5 most recent)

**Event Card layout:**
```
│ ●  Event Title           [HIGH] [category]           │
│    📅 Jul 12 – Jul 14   📍 Venue Name   source       │
│    5,000 expected                    [🔗][✏][🗑]    │
```

- **Color bar** on the left edge: red (high), yellow (medium), blue (low)
- **Impact badge**: HIGH / MEDIUM / LOW
- **Category badge**: Sports, Music, Festival, Conference, etc.
- **Date range**, **venue**, **source**, and **attendance** in the subtitle row
- **Icons** (appear on hover): external link (if URL set), edit, delete

### 7.5 Adding an Event

Click **+ Add Event** to open the dialog:

| Field | Required | Notes |
|-------|----------|-------|
| **Event Title** | Yes | e.g., "Bikes, Blues & BBQ Festival" |
| **Start Date** | Yes | Date picker |
| **End Date** | Yes | Auto-fills to match Start Date if not set |
| **Demand Impact** | No | High / Medium / Low. Determines which pricing multiplier applies |
| **Source** | No | Manual, Eventbrite, Facebook, City Calendar, Sports, Festival, Conference, Other |
| **Category** | No | Sports, Music, Festival, Conference, Holiday, Local, Other |
| **Expected Attendance** | No | Numeric estimate |
| **Venue / Location** | No | e.g., "Walmart AMP, Rogers AR" |
| **Event URL** | No | Shown as an external link icon on the card |
| **Description** | No | Brief free-text summary |

Click **Add Event** to save. The list refreshes automatically.

### 7.6 Editing an Event

Click the **✏ pencil icon** on any event card to open the Edit dialog pre-filled with that event's data. All fields can be modified. Click **Update Event** to save.

> **Note:** Only Title, Dates, Demand Impact, and Demand Score can be edited on existing events. Source and Category are set at creation time.

### 7.7 Deleting an Event

Click the **🗑 trash icon** on an event card. The event is deleted immediately (no confirmation dialog). A green toast confirms deletion.

### 7.8 Auto-Import from Ticketmaster

1. Enter a ZIP code in the zip field (e.g., `72756` for Rogers, AR)
2. Click **Import Events**
3. RAPT fetches upcoming events from the Ticketmaster API near that ZIP code
4. Events are auto-categorized and added to your property's list
5. A success toast shows how many events were imported (e.g., "14 events imported")

> Imported events default to **Medium** demand impact. Review them and change any to **High** for major events that significantly drive occupancy (e.g., sold-out concerts, major sporting events).

---

## 8. AI Listing Optimizer

**URL:** `/listing`  
**Tier required:** Pro or Advanced

The AI Listing Optimizer uses Claude AI to generate compelling Airbnb/VRBO listing titles and descriptions tailored to your property and upcoming events.

### 8.1 Locked State (Free Tier)

Free users see a locked screen with:
- Lock icon and feature description
- **Upgrade to Pro — $14/mo** button linking to `/subscription`

### 8.2 Page Layout (Unlocked)

```
┌─ Header ──────────────────────────────────────────────┐
│  AI Listing Optimizer           [Property Selector]   │
│  Generate compelling titles and descriptions          │
└───────────────────────────────────────────────────────┘

┌─ Generation Settings (left half) ─┐  ┌─ Output (right half) ────────────┐
│  🧠 Generation Settings            │  │  ✨ Latest Generation              │
│                                    │  │  Generated Jun 15, 2:34 PM        │
│  Target Guest Type                 │  │                                    │
│  [General Travelers ▼]             │  │  LISTING TITLE                     │
│                                    │  │  Perfect Mountain Escape Near      │
│  Property Features to Highlight    │  │  Bikes Blues BBQ – Hot Tub,        │
│  [hot tub, mountain views, ...]    │  │  Fire Pit & Stunning Views         │
│                                    │  │  75 characters  ⚠ <80 recommended  │
│  Focus Events (optional)           │  │  [Copy]                            │
│  [Bikes Blues BBQ, AMP ...]        │  │                                    │
│                                    │  │  DESCRIPTION                       │
│  [✨ Generate Listing Copy]        │  │  [Full AI-written description      │
│                                    │  │   shown in read-only textarea]     │
│                                    │  │  [Copy]                            │
│                                    │  │                                    │
│                                    │  │  EVENTS REFERENCED                 │
│                                    │  │  [Bikes Blues BBQ] [AMP Concert]   │
│                                    │  │                                    │
│                                    │  │  [✓ Mark as Applied to Listing]    │
└────────────────────────────────────┘  └────────────────────────────────────┘

┌─ Generation History ──────────────────────────────────┐
│  Perfect Mountain Escape Near...   couples · Jun 10   │
│  Book Your Ozarks Retreat...       families · Jun 5   │
│  ...                                                   │
└───────────────────────────────────────────────────────┘
```

### 8.3 Generation Settings

| Field | Options | Description |
|-------|---------|-------------|
| **Target Guest Type** | General Travelers, Families with Kids, Couples / Romantic, Business Travelers, Outdoor Enthusiasts, Event Attendees, Groups & Friends | The AI tailors tone and emphasis to this audience |
| **Property Features to Highlight** | Free text, comma-separated | e.g., `hot tub, mountain views, pet-friendly, fire pit` |
| **Focus Events** | Free text, comma-separated | Override the auto-detected upcoming events. Leave blank to let RAPT pick the most relevant ones from your Event Intelligence list |

### 8.4 Generating Listing Copy

1. Select a **Target Guest Type** from the dropdown
2. Optionally add **features** and **focus events**
3. Click **✨ Generate Listing Copy**
4. The button shows a spinner ("Generating...") while the AI works
5. On success, the output panel populates with a **title** and **description**

The AI uses:
- Your property's name, location, type, bedrooms, bathrooms, and max guests
- Your listed amenities
- The selected guest type
- Upcoming events from your Event Intelligence list

### 8.5 Reading the Output

**Listing Title:**
- Shown in a bordered box
- Character count displayed below
- ⚠ Yellow warning if over 80 characters (Airbnb's recommended limit)
- **Copy** button to copy to clipboard

**Description:**
- Full AI-written description in a read-only scrollable text area
- **Copy** button to copy to clipboard

**Events Referenced:**
- Badge list showing which events the AI incorporated into the copy

### 8.6 Marking as Applied

Once you've copied the title and description into your Airbnb or VRBO listing, click **✓ Mark as Applied to Listing**. This:
- Shows an "Applied" badge on the generation
- Helps you track which version is currently live

### 8.7 Generation History

Below the main panel, a **Generation History** card shows up to 5 previous generations:
- Truncated title
- Guest type and date
- "Applied" badge if that version was marked applied

Click any history entry to view its content (feature in development; currently shown as read-only reference).

---

## 9. Revenue Forecast

**URL:** `/forecast`

The Revenue Forecast page provides a 6-month rolling projection of your property's revenue potential.

### 9.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Revenue Forecast               [Property Selector]   │
│  6-month rolling projection based on demand scoring   │
└───────────────────────────────────────────────────────┘

┌─ Summary Cards ───────────────────────────────────────┐
│  This Month   │  Optimized      │  Avg Occupancy │  6-Month Total │
│  $3,420       │  $3,831         │  62%           │  $19,840       │
│  projected    │  w/ optimization│  this month    │  projected     │
└───────────────────────────────────────────────────────┘

┌─ 6-Month Bar Chart ───────────────────────────────────┐
│  $8k │         ██                                     │
│  $6k │    ██   ██  ██                                 │
│  $4k │ ██ ██   ██  ██  ██  ██                        │
│  $2k │ ██ ██   ██  ██  ██  ██                        │
│  $0k └──────────────────────────────────────          │
│        Jun Jul  Aug Sep Oct Nov                       │
│        ■ Projected  ■ Optimized                      │
└───────────────────────────────────────────────────────┘

┌─ Weekly Price Distribution ─┐  ┌─ Demand Distribution ──────────┐
│  $250│    ██                │  │  High:   8 days (27%)  ████    │
│  $200│ ██ ██  ██            │  │  Medium: 12 days (40%) ██████  │
│  $150│ ██ ██  ██  ██        │  │  Low:    10 days (33%) █████   │
│  $100│ ██ ██  ██  ██        │  │                                 │
│       W1  W2  W3  W4        │  │  Base price:    $150/night      │
└──────────────────────────────┘  │  Avg suggested: $171/night     │
                                   │  Revenue uplift: +14%          │
                                   └─────────────────────────────────┘

┌─ Monthly Breakdown Table ─────────────────────────────┐
│  Month    │ Projected │ Optimized │ Occupancy │ Uplift │
│  Jun 2026 │  $3,420   │  $3,831   │   62%     │  +$411 │ [Current]
│  Jul 2026 │  $4,180   │  $4,682   │   70%     │  +$502 │
│  Aug 2026 │  $4,050   │  $4,536   │   68%     │  +$486 │
│  Sep 2026 │  $3,100   │  $3,472   │   55%     │  +$372 │
│  Oct 2026 │  $2,680   │  $3,002   │   48%     │  +$322 │
│  Nov 2026 │  $2,410   │  $2,699   │   42%     │  +$289 │
│  ─────────────────────────────────────────────────── │
│  6-Month  │ $19,840   │ $22,222   │     —     │ +$2,382│
└───────────────────────────────────────────────────────┘
```

### 9.2 Summary Cards

| Card | What it Shows |
|------|--------------|
| **This Month** | Current month's projected revenue using occupancy rates by demand level (High=85%, Medium=65%, Low=40%) |
| **Optimized Potential** | Same as Projected × 1.12 — assumes full adoption of RAPT's pricing strategy |
| **Avg Occupancy** | Weighted average occupancy rate across all days this month |
| **6-Month Total** | Sum of projected revenues for the next 6 months |

### 9.3 6-Month Bar Chart

A grouped bar chart showing **Projected** vs **Optimized** revenue side-by-side for each of the next 6 months. The chart uses Recharts with a custom dark theme.

- **Blue bars** = Projected (current pricing strategy)
- **Green bars** = Optimized (assumes +12% uplift from full pricing optimization)
- Hover over any bar to see exact dollar amounts in a tooltip

### 9.4 Weekly Price Distribution

A bar chart showing the **average suggested nightly price by week** for the current month (W1–W4). Hover for exact averages. Useful for spotting which weeks have the strongest pricing.

### 9.5 Demand Distribution

Progress bars showing the split between High, Medium, and Low demand days this month, with:
- Day count and percentage for each level
- Base price vs. Average suggested price comparison
- **Revenue uplift** — the percentage premium over base price the suggested pricing achieves

### 9.6 Monthly Breakdown Table

A detailed table with one row per forecast month:

| Column | Description |
|--------|-------------|
| **Month** | Month name + year. Current month has a [Current] badge |
| **Projected** | Revenue estimate at current occupancy rates |
| **Optimized** | Projected × 1.12 (full optimization target) |
| **Occupancy** | Estimated occupancy rate percentage |
| **Uplift** | Dollar difference between Optimized and Projected |

The footer row shows 6-month totals. The table is horizontally scrollable on small screens.

---

## 10. Properties

**URL:** `/properties`

The Properties page is where you add and manage the rental properties you want to price.

### 10.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Properties                    [+ Add Property]       │
│  2 / 10 properties                                    │
└───────────────────────────────────────────────────────┘

┌─ Property Cards Grid (3 columns on desktop) ──────────┐
│ ┌─────────────────────┐  ┌─────────────────────┐     │
│ │ Pea Ridge Cabin     │  │ Springdale Cottage  │     │
│ │ 📍 Pea Ridge, AR    │  │ 📍 Springdale, AR   │     │
│ │             [Cabin] │  │             [House] │     │
│ │ 🛏2  🛁1  👥4       │  │ 🛏3  🛁2  👥6       │     │
│ │ Base: $150/night    │  │ Base: $125/night    │     │
│ │ Cozy mountain cabin │  │ Downtown location   │     │
│ │ [Edit] [🗑]         │  │ [Edit] [🗑]         │     │
│ └─────────────────────┘  └─────────────────────┘     │
└───────────────────────────────────────────────────────┘
```

### 10.2 Property Count

The subtitle shows how many properties you currently have vs. your plan's limit:
- Free: `1 / 1 properties`
- Pro: `3 / 10 properties`
- Advanced: `3 / ∞ properties`

### 10.3 Plan Limit Banner

If you've reached your plan's property limit, a blue banner appears with:
- Explanation of the limit
- **Upgrade** button linking to `/subscription`
- The **Add Property** button in the header shows a toast error and redirects to Subscription instead of opening the dialog

### 10.4 Property Card

Each property shows:
- **Name** and **City, State**
- **Property type** badge (Cabin, House, Condo, Apartment, Villa, Cottage, Other)
- **Bedrooms / Bathrooms / Max Guests** icons row
- **Base price** (accent colored, large)
- **Description** (first 2 lines, truncated)
- On hover: **Edit** and **Delete** buttons appear

### 10.5 Adding a Property

Click **+ Add Property** to open the dialog:

| Field | Required | Notes |
|-------|----------|-------|
| **Property Name** | Yes | e.g., "Pea Ridge Mountain Cabin" |
| **City** | Yes | e.g., "Pea Ridge" |
| **State** | No | e.g., "AR" |
| **Full Address / Location** | Yes | Used for maps and context |
| **Property Type** | No | Cabin, House, Condo, Apartment, Villa, Cottage, Other |
| **Base Price ($/night)** | Yes | The "floor" price before multipliers |
| **Bedrooms** | No | Default: 2 |
| **Bathrooms** | No | Default: 1 |
| **Max Guests** | No | Default: 4 |
| **Amenities** | No | Comma-separated list (e.g., `hot tub, fire pit, pet-friendly`) |
| **Description** | No | Free-text description shown on cards |

Click **Add Property** to save. RAPT automatically generates default pricing rules for the new property.

### 10.6 Editing a Property

Click the **Edit** button on any property card. The same dialog opens pre-filled with the property's current data. Edit any fields and click **Update Property**.

### 10.7 Deleting a Property

Click the **🗑 delete** button on a property card. A browser `confirm()` dialog asks: *"Delete 'Property Name'? This cannot be undone."* Confirm to proceed. The property is soft-deleted (marked inactive) and disappears from all dropdowns and lists.

> **Warning:** Deleting a property also removes its events, pricing rules, and listing suggestions from your active workspace.

---

## 11. Subscription

**URL:** `/subscription`

The Subscription page shows your current plan and lets you upgrade, downgrade, or cancel.

### 11.1 Page Layout

```
┌─ Header ──────────────────────────────────────────────┐
│  Subscription                                         │
│  Manage your plan and unlock more features            │
└───────────────────────────────────────────────────────┘

┌─ Current Plan Banner ─────────────────────────────────┐
│  💳 Current Plan: Pro                          [PRO]  │
│     You have access to AI listing optimizer           │
│     and up to 10 properties                          │
└───────────────────────────────────────────────────────┘

┌─ Plan Cards ──────────────────────────────────────────┐
│  ┌─ FREE ──────┐  ┌─ PRO ──────────┐  ┌─ ADVANCED ─┐ │
│  │ $0/forever  │  │ $14/mo         │  │ $29/mo     │ │
│  │             │  │ [Current Plan] │  │            │ │
│  │ ✓ 1 prop    │  │ ✓ 10 prop      │  │ ✓ Unlimited│ │
│  │ ✓ Basic cal │  │ ✓ Full event   │  │ ✓ Pro feats│ │
│  │ ✓ Manual ev │  │   intelligence │  │ ✓ Automation│ │
│  │ ✓ Simple px │  │ ✓ AI listing   │  │ ✓ API soon │ │
│  │ ✗ AI list   │  │ ✓ Rev forecast │  │ ✓ Sync soon│ │
│  │ ✗ Multi-prop│  │ ✓ Priority sup │  │ ✓ Dedicated│ │
│  │ ✗ Rev fcst  │  │ ✗ Automation  │  │   support  │ │
│  │ ✗ Automation│  │               │  │            │ │
│  │             │  │               │  │            │ │
│  │[Current Plan│  │[Current Plan] │  │[Go Advanced│ │
│  └─────────────┘  └───────────────┘  └────────────┘ │
└───────────────────────────────────────────────────────┘

┌─ Feature Availability ────────────────────────────────┐
│  Feature                    [free] [pro] [advanced]   │
│  Multi-Property Management    —     ✓      ✓          │
│  Event Intelligence Engine    —     ✓      ✓          │
│  AI Listing Optimizer         —     ✓      ✓          │
│  Revenue Forecasting          —     ✓      ✓          │
│  Automation Features          —     —      ✓          │
└───────────────────────────────────────────────────────┘
```

### 11.2 Plan Cards

Each plan card shows:
- Plan name and badge
- Price and billing period
- Feature list (✓ = included, ✗ = not included)
- Action button:
  - **Current plan** → grayed out disabled button
  - **Upgrade** → fills the plan, shows "Upgrading…" while processing
  - **Downgrade** → triggers a confirmation prompt before proceeding

### 11.3 Upgrading

Click **Upgrade to Pro** or **Go Advanced**. RAPT processes the upgrade immediately and:
- Shows a success toast with the new plan name
- Updates the plan badge in the sidebar
- Unlocks features immediately (e.g., AI Listing Optimizer becomes accessible)

> In production, upgrades are processed through Stripe. The demo version applies plan changes instantly without payment.

### 11.4 Downgrading / Cancelling

Click **Downgrade to Free** or **Downgrade to Pro** (depending on your current tier). A browser `confirm()` dialog warns: *"Are you sure you want to downgrade? You'll lose access to premium features."*

- Downgrading from **Advanced → Pro**: keeps AI Listing, removes automation features
- Downgrading from **Pro → Free**: removes AI Listing, limits back to 1 property
- If you have more than 1 property when downgrading to Free, existing properties remain but you can't add new ones

### 11.5 Feature Availability Table

A quick-reference grid showing which tiers include each major feature, with colored badges (free = gray, pro = accent, advanced = gold).

---

## 12. Admin Portal

**URL:** `/admin`  
**Access:** Admin users only (not shown in the sidebar for non-admins)

### 12.1 What You'll See

```
┌─ Admin Portal ────────────────────────────────────────┐
│  👥 Admin Portal                                      │
└───────────────────────────────────────────────────────┘

┌─ User Accounts & Subscriptions ───────────────────────┐
│  Name      Email         Tier   Status    Stripe ID   Joined      Last Sign In  Actions │
│  Ryan Young ryan@...      pro    active   cus_abc...  Jan 1, 2026 Jun 15, 2026  [Cancel]│
│  Jane Doe  jane@...       free   trial    —           Feb 3, 2026 Jun 10, 2026   —      │
│  Bob Smith bob@...        adv    active   cus_xyz...  Mar 5, 2026 Jun 12, 2026  [Cancel]│
└───────────────────────────────────────────────────────┘
```

### 12.2 User Table Columns

| Column | Description |
|--------|-------------|
| **Name** | User's display name |
| **Email** | Login email address |
| **Tier** | Current subscription plan (free / pro / advanced) |
| **Payment Status** | active, trial, past_due, cancelled, unpaid |
| **Stripe ID** | First 12 characters of Stripe Customer ID (truncated) |
| **Joined** | Account creation date |
| **Last Sign In** | Most recent authentication |
| **Actions** | **Cancel** button (only visible for users with an active Stripe subscription) |

### 12.3 Cancelling a Subscription

Click the **Cancel** button next to a user. An alert dialog appears:

> *"Cancel Subscription? This will immediately cancel the user's subscription and downgrade them to the Free tier. This action cannot be undone."*

- **Keep Subscription** → closes dialog
- **Cancel Subscription** → cancels via Stripe API and downgrades user to Free tier

> Admin access is granted to the account whose OpenID matches the `OWNER_OPEN_ID` environment variable set at deployment time.

---

## 13. Plans & Feature Limits at a Glance

| Feature | Free | Pro ($14/mo) | Advanced ($29/mo) |
|---------|------|-------------|-------------------|
| Properties | 1 | Up to 10 | Unlimited |
| Demand Calendar | Basic | Full | Full |
| Manual Event Entry | ✓ | ✓ | ✓ |
| Event Auto-Import (Ticketmaster) | ✓ | ✓ | ✓ |
| Pricing Engine (multipliers) | ✓ | ✓ | ✓ |
| Revenue Forecasting | ✓ | ✓ | ✓ |
| AI Listing Optimizer | ✗ | ✓ | ✓ |
| Multi-Property Support | ✗ | ✓ | ✓ |
| Automation Features | ✗ | ✗ | ✓ |
| API Access | ✗ | ✗ | Coming soon |
| Airbnb Sync | ✗ | ✗ | Coming soon |
| Support | Community | Priority | Dedicated |

---

## 14. How the Pricing Engine Works

Understanding RAPT's pricing logic helps you configure it effectively.

### 14.1 The Calculation Flow

For each date, RAPT runs the following calculation:

```
Starting Price = Base Price

Step 1 — Weekend check
  If date is Fri, Sat, or Sun:
    Price × Weekend Multiplier (default 1.30)
    Demand Score +1.5

Step 2 — Holiday check
  If date is a US federal holiday:
    Price × Holiday Multiplier (default 1.45)
    Demand Score +2.0

Step 3 — Event check
  If a HIGH-impact event falls on this date:
    Price × High Event Multiplier (default 1.35)
    Demand Score +2.5
  Else if a MEDIUM-impact event falls on this date:
    Price × Medium Event Multiplier (default 1.15)
    Demand Score +1.0

Step 4 — Seasonality check
  If month is in Peak Months list:
    Price × Peak Season Multiplier (default 1.25)
    Demand Score +1.0
  Else if month is an off-season month (Jan, Feb, Nov):
    Price × Off-Season Multiplier (default 0.85)
    Demand Score −1.0

Step 5 — Low demand fallback
  If NO multipliers were applied yet:
    Price × Low Demand Multiplier (default 0.90)
    Demand Score −0.5

Step 6 — Price caps
  Price = max(Min Price, min(Max Price, Price))

Step 7 — Demand Level classification
  Score ≥ 7.5 → HIGH
  Score 5.0–7.4 → MEDIUM
  Score < 5.0 → LOW

Final Price = round(Price to nearest dollar)
```

### 14.2 Stacking Multipliers

Multipliers **multiply**, not add. For example:

- Base: $150
- Weekend (×1.30) = $195
- Holiday (×1.45) = $195 × 1.45 = **$283**
- Peak Season (×1.25) = $283 × 1.25 = **$354**
- Price cap at $300 → **Final: $300**

Always check the **Price Preview** panel in the Pricing Engine to see combined multiplier effects.

### 14.3 US Holidays Covered

RAPT includes hardcoded dates for 2025–2026:
- New Year's Day
- Martin Luther King Jr. Day
- Presidents' Day
- Memorial Day
- Independence Day (July 4th)
- Labor Day
- Thanksgiving
- Black Friday
- Christmas Eve
- Christmas Day
- New Year's Eve

### 14.4 Revenue Forecast Methodology

Occupancy rates used in projections:

| Demand Level | Assumed Occupancy |
|-------------|------------------|
| High | 85% |
| Medium | 65% |
| Low | 40% |

**Projected Revenue** = Σ (suggested price × occupancy rate) for all days in the month  
**Optimized Revenue** = Projected × 1.12 (assumes +12% uplift from fully implementing RAPT's pricing suggestions)

---

## 15. Frequently Asked Questions

**Q: Can I use RAPT for properties outside the US?**  
A: Yes. The platform works globally. Note that the built-in holiday calendar covers US federal holidays only. For non-US properties, use Event Intelligence to manually add local public holidays and their demand impact.

**Q: How often does the calendar update?**  
A: Pricing calculations run on demand when you view the Calendar or Dashboard. If you change your pricing rules, navigate away and back to the Calendar to see updated prices.

**Q: Does changing pricing rules affect past months?**  
A: No. Pricing rules only affect future calculations. Historical calendar data is not retroactively changed.

**Q: How does the Ticketmaster import work?**  
A: Enter a ZIP code and click "Import Events." RAPT calls the Ticketmaster Discovery API, filters for upcoming events within range, and auto-creates them in your Event Intelligence list. You may need to review and adjust impact levels (the import defaults to Medium for all events).

**Q: Can multiple users share one RAPT account?**  
A: Not currently. Each account is tied to one login. Multi-user/team access is planned for a future release.

**Q: I'm on the Free plan. Can I still see the Revenue Forecast?**  
A: Yes. Revenue Forecast is available on all plans. The AI Listing Optimizer is the main Pro-exclusive feature.

**Q: What happens to my properties if I downgrade from Pro to Free?**  
A: Your existing properties remain in the database, but the Free plan allows managing only 1 property at a time. You cannot add new properties until you upgrade again or delete properties to stay within the limit.

**Q: How do I mark a listing copy as "applied"?**  
A: In the AI Listing Optimizer, after copying the generated title and description into Airbnb/VRBO, click **✓ Mark as Applied to Listing**. This records which version is currently live, helping you track iterations.

**Q: Is RAPT a Progressive Web App (PWA)?**  
A: Yes. You can install RAPT on your phone or desktop from the browser's "Add to Home Screen" / "Install App" option. It works offline for viewing previously loaded data.

**Q: How do I contact support?**  
A: Pro and Advanced subscribers get priority support. Reach out via the contact details in your welcome email. Free users have community support.

---

*Guide last updated: June 2026 — matches getrapt.app source at commit `026cd4c`*
