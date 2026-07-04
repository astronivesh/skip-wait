# Handoff: SkipWait — Restaurant Menu & Item Detail

## Overview
SkipWait is a self-pickup food app with delivery options. Its hero feature is **order ahead with a live ready-time** — every surface answers "when is my food ready?". This handoff covers two mobile screens: the restaurant menu page and the item detail (customization) page.

## About the Design Files
The file in this bundle (`SkipWait UI.dc.html`) is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. Your task is to **recreate these designs in the target codebase's existing environment** (React Native, Flutter, SwiftUI, web, etc.) using its established patterns and libraries — or, if no codebase exists yet, choose the most appropriate framework and implement the designs there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and interactions are final. Recreate pixel-perfectly. Food/hero photos are striped placeholders — replace with real photography.

## Design Tokens

### Colors
- Ink (primary text): `#2B1E16`
- Page background: `#FBF4EA`
- Card / surface: `#FFFBF4`
- Accent (chili red): `#B03526`
- Accent dark (pressed / emphasis text): `#8A2418`
- Accent tint (selected fills): `#F8E4DE`
- Accent tint border: `#EBC2B7`
- Muted surface (toggle track, stepper track): `#F0E6D6`
- Success green (live status dot, GF badge): `#3E7C4F`
- Secondary text: `rgba(43,30,22,.55–.62)`
- Hairline borders: `rgba(43,30,22,.07–.12)`
- Placeholder stripes: `repeating-linear-gradient(-45deg, #E8DECF 0 14px, #EFE7D9 14px 28px)`

### Typography
- Display: **Bricolage Grotesque** (Google Fonts), weight 800, letter-spacing -0.02em — used for restaurant name (24px), dish name (26px), prices (18–22px), ready-time number (18px)
- Body/UI: **Schibsted Grotesk** (Google Fonts) — 400/500/600/700
- Scale: 26 / 24 / 15 / 14.5 / 13.5 / 13 / 12.5 / 12 / 11 / 10 / 9.5px
- Badges: 9.5–10px, weight 700, uppercase, letter-spacing .07–.08em

### Radii
- Cards: 18–22px · Inputs/option rows: 14px · Pills/buttons/toggle/stepper: 999px · Badges: 5–8px · Photo thumbs: 14px

### Shadows
- Overlapping restaurant card: `0 10px 30px -12px rgba(43,30,22,.25)`
- Dark cart bar: `0 12px 28px -10px rgba(43,30,22,.5)`
- Primary CTA: `0 12px 28px -10px rgba(176,53,38,.55)`
- Selected toggle segment: `0 3px 10px rgba(43,30,22,.18)`
- Floating circular icon buttons: `0 2px 8px rgba(43,30,22,.15)`

### Layout
- Screen width: 390pt (mobile-neutral)
- Screen padding: 16px; content sections in item detail: 20px horizontal
- Card outer radius: 34px in the mock (device frame — ignore in app)

## Screens / Views

### 1. Restaurant Menu (`1a`)
Purpose: browse a restaurant's menu, switch pickup/delivery, add items.

Layout, top to bottom:
1. **Hero photo** — 196px tall, full-bleed. Floating circle buttons (38px, `rgba(255,251,244,.92)` bg): back (top-left); favorite + search (top-right, 8px gap).
2. **Restaurant card** — overlaps hero by 44px (`margin-top:-44px`, 16px side margins), surface bg, radius 22, padding 18. Contains:
   - Name "Lucia's Counter" (display 24px/800) + meta row: `★ 4.8 (1.2k) · Mexican · 0.4 mi` (12.5px)
   - **Ready-time chip** top-right: tint bg `#F8E4DE`, border `#EBC2B7`, radius 14; big number (display 18px, `#8A2418`) over "MIN" label (9.5px uppercase)
   - **Pickup/Delivery segmented toggle**: track `#F0E6D6`, radius 999, 4px padding; selected segment accent bg, white text, shadow; unselected transparent, `rgba(43,30,22,.55)` text; 13px/700; 250ms transition
   - **Status line** below toggle (12px, centered): green 7px dot + text. Pickup: "Order now — ready for pickup at {time}". Delivery: "Delivery to Main St — arrives in ~{n} min · $1.99 fee"
3. **Category tabs** — horizontal scroll of pills (Bowls, Tacos, Sides, Drinks, Desserts), 8px gap. Selected: ink bg, cream text. Unselected: surface bg, hairline border.
4. **Menu item cards** — vertical stack, 10px gap. Each: surface bg, radius 18, padding 12, hairline border (accent border on hover). Left column: optional "★ POPULAR" badge (tint bg, accent-dark text), name (15px/700), 2-line clamped description (12px, muted), price (14px/700) pinned to bottom. Right: 92px-wide photo thumb (radius 14) with a 30px accent "+" FAB overlapping its bottom-right corner (-6px offsets, accent shadow).
5. **Sticky cart bar** — sticky bottom, cream gradient fade above. Dark pill (`#2B1E16`, radius 999, padding 14×20): accent count badge "2" + "View order" left; ETA (muted cream) + "$18.50" right.

### 2. Item Detail (`1b`)
Purpose: customize a dish and add to order.

Layout, top to bottom:
1. **Hero photo** — 250px, back + favorite floating buttons; bottom-left badge row: "★ POPULAR" (accent-dark text) and "GF OPTION" (green text), both on `rgba(255,251,244,.94)` chips.
2. **Title block** (padding 20): "Al Pastor Bowl" (display 26px/800) with price right-aligned (display 22px, `#8A2418`); description 13px muted below.
3. **Size section** — header "Size" (14px/700) + "Required" (11px muted right). Radio rows (radius 14, padding 12×14, 8px gap): Regular, Large (+ $2.50). Selected: tint bg, 1.5px accent border, filled accent radio dot. Unselected: surface bg, hairline border.
4. **Add-ons section** — same row style with 18px checkboxes (radius 6; selected: accent fill + white ✓): Guacamole (+ $2.00), Extra salsa verde (+ $0.75), Chips (+ $3.00).
5. **Footer** (surface bg, top hairline): ready-by line (green dot + "Order now — ready for pickup by **{time}**"), then a row: **quantity stepper** (track `#F0E6D6` pill; 36px circular − / + buttons on surface bg; count 15px/800, min 1 max 9) + **primary CTA** (accent pill, padding 14×20, white; "Add to order" left, live total right; darkens to `#8A2418` on hover).

## Interactions & Behavior
- **Pickup/Delivery toggle**: switches selected segment (250ms ease), recomputes ready-time number (pickup 12 min vs delivery 28 min base), status line copy, and cart-bar ETA.
- **Ready-by time** = now + pickup minutes, formatted h:mm AM/PM.
- **Busy level** (simulation concept): quiet −4 min, normal +0, rush +10 — in production this comes from live restaurant load.
- **Category tabs**: single-select.
- **Size**: single-select radio; updates displayed item price.
- **Add-ons**: multi-select; each updates total.
- **Stepper**: qty 1–9; CTA total = (base 11.50 + size delta + add-ons) × qty, always live.
- Hover: menu cards get accent border; CTA darkens.

## State Management
- `mode: 'pickup' | 'delivery'`
- `tab: number` (selected category)
- `size: number`, `addons: boolean[]`, `qty: number`
- Derived: readyMins, readyBy time, item price, order total
- Data fetching: restaurant info + live wait estimate, menu by category, item option schema, cart contents.

## Assets
- Fonts: Bricolage Grotesque + Schibsted Grotesk from Google Fonts.
- All photos are striped placeholders (see token above) — supply real hero/dish photography.
- Icons in the mock are unicode glyphs (← ♡ ⌕ ★ ✓ + −); replace with the codebase's icon set at equal visual weight.

## Files
- `SkipWait UI.dc.html` — both screens, interactive. Markup lives between `<x-dc>` tags with inline styles; interaction logic is the `Component` class in the embedded script. Ignore the `dv-*` presentation wrapper (canvas chrome for review) — the screens are the two 390px cards.
