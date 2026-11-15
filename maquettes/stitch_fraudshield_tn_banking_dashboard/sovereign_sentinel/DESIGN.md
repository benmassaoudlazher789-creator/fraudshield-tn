---
name: Sovereign Sentinel
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00311f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004a31'
  on-tertiary-container: '#27c38a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  metric-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.03em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  tabular-num:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system serves a high-stakes, real-time banking fraud supervision platform in Tunisia. The system balances sovereign institutional trust with the rapid analytical clarity demanded by modern financial intelligence operations. 

The aesthetic adheres to **Corporate / Modern High-Density Precision**:
- **Trust & Authority:** Uncompromising institutional stability conveyed through deep corporate blues and slate structures.
- **Urgent Clarity:** Zero ambiguity in state communication. High-contrast indicators ensure cognitive load remains minimal during rapid anomaly reviews.
- **Surgical Precision:** Compact metrics, crisp borders, and balanced whitespace provide analysts with immediate situational awareness without visual fatigue.
- **Tone:** Authoritative, vigilant, understated, and mathematically rigorous.

## Colors

The palette delivers a high-contrast division between systemic workspace architecture and operational analysis surfaces.

### Semantic & Foundation Roles
- **Primary (`#1E3A8A`):** Core institutional blue used for authoritative interactive states, primary actions, focused elements, and active navigation indicators.
- **Secondary / Shell Surfaces (`#0F172A` & `#1E293B`):** Deep navy shades reserved exclusively for the persistent navigation rail, application header controls, and terminal operational anchors.
- **Canvas / Neutral Ground (`#F8FAFC`):** Low-strain canvas gray serving as the structural backdrop for content workspaces.
- **Surface Elevation (`#FFFFFF`):** High-purity white designated for analytical cards, metric tiles, and transactional tables.
- **Structural Borders (`#E2E8F0`):** Hairline neutral boundaries establishing strict grid separation without visual clutter.

### Operational Status Palette (Fraud Triaging)
- **Normal / Validé (`#10B981`):** Emerald green for verified low-risk transactions and nominal operations. Muted tint `#ECFDF5` for subtle badges.
- **Suspicious / À Vérifier (`#F59E0B`):** Amber/orange for anomaly escalations requiring human review. Muted tint `#FFFBEB` for badge grounds.
- **Critical / Bloqué (`#EF4444`):** Crimson red signifying confirmed fraud, account locks, and critical velocity spikes. Muted tint `#FEF2F2` for badge grounds.

## Typography

The typography is built entirely on **Inter**, optimized for fast data intake and numeric precision.

- **Tabular Figures (`tnum`):** All financial values, risk indices, timestamps, and card identifiers must be rendered with `font-feature-settings: "tnum" 1`. This preserves column vertical alignment across rapid balance and stream changes.
- **Currency Convention:** Amounts must follow the Tunisian standard: values followed by the uppercase suffix non-breaking space (e.g., `1 245,500 DT`).
- **Uppercase Labels:** System status headers, micro table heads, and risk badges utilize `label-sm` or `label-md` in uppercase with tracked spacing (`letter-spacing: 0.04em - 0.05em`) for scanability.
- **Language Alignment:** French interface copy must maintain standard accented characters (e.g., *Transactions Récentes*, *Écart de Comportement*, *À Vérifier*).

## Layout & Spacing

The layout is built for complex, info-dense monitoring workstations:

- **Structure:** Two-tier frame consisting of a fixed, dark vertical sidebar (260px desktop width, collapsible to 72px icon rail) coupled with a fluid, adaptive content workspace.
- **Grid Architecture:** 12-column dynamic fluid grid for the analytical canvas. Core dashboard metrics snap to 3-column (quarter-width) or 4-column (third-width) cards; transaction streams occupy an 8-column primary block paired with a 4-column risk breakdown sidebar.
- **Density Controls:** High-density vertical rhythm. Table rows stay strictly within a 44px–48px envelope to maximize on-screen records. Card interiors use `space-lg` (24px) for padding, reducing to `space-md` (16px) on mobile viewports.
- **Breakpoints:**
  - `Desktop (>= 1280px)`: Full expanded sidebar, side-by-side data grids, uninterrupted streaming tickers.
  - `Tablet (768px - 1279px)`: Sidebar folds to 72px condensed state; analytics cards wrap to 2 columns.
  - `Mobile (< 768px)`: Navigation off-canvas; analytics cards stack to single column; tables shift to prioritized horizontally scrollable cards.

## Elevation & Depth

Visual hierarchy uses crisp boundary containment instead of dramatic z-axis shadows, keeping the analytical canvas professional and distraction-free:

- **Base Ground (`#F8FAFC`):** Level 0 baseline.
- **Data Containers (Cards & Panels):** Resting on Level 1. Composed of pure white (`#FFFFFF`) surfaces bound by a 1px uniform perimeter of `#E2E8F0`. Shadowing is extra-diffused and ambient: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Raised Interactive Overlays (Dropdowns, Filters, Tooltips):** Level 2. Pure white cards surrounded by `#CBD5E1` borders with an ambient drop: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Modals & Emergency Lock Drawers:** Level 3. Accompanied by a 40% tinted slate backdrop overlay (`rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`).
- **Navigation Shell:** Deep slate tones (`#0F172A`) present structural visual weight without casting heavy drop shadows across the active canvas.

## Shapes

The interface balances sharp enterprise geometry with slightly rounded functional corners to maintain clarity:

- **Cards & Data Modules:** `0.5rem` (`rounded-md` / 8px). Creates clear separation between information tiles without wasting space.
- **Buttons, Text Inputs, and Dropdowns:** `0.375rem` to `0.5rem` (6px–8px) for an intentional, stable visual anchor.
- **Pills & Status Tags:** Fully rounded `9999px` capsule style, distinguishing dynamic state badges from actionable geometric cards.
- **Score Indicators:** Pill-shaped capsules for track and thumb elements in progress indicators.

## Components

### Buttons
- **Primary Action:** Solid `#1E3A8A` background, white label, `0.5rem` radius, 38px height (compact enterprise sizing). Active state `#172554`. Focus ring: 2px offset with `#3B82F6`.
- **Destructive Action ("Bloquer Compte / Rejeter"):** Crimson `#EF4444` solid or outlined with `#FEE2E2` background and red text.
- **Secondary / Neutral:** Crisp `#FFFFFF` surface with `#E2E8F0` border, `#0F172A` text; hover to `#F1F5F9`.

### Status Badges & Pills
- **Geometry:** Height 22px, `rounded-full`, 8px horizontal padding, `label-sm` font.
- **Validé / Conforme:** `#ECFDF5` background, `#065F46` text, with a 6px solid `#10B981` leading pulse dot.
- **À Vérifier:** `#FFFBEB` background, `#92400E` text, with a 6px solid `#F59E0B` leading warning dot.
- **Bloqué / Fraude Confirmée:** `#FEF2F2` background, `#991B1B` text, with an inline stop icon or solid `#EF4444` dot.

### Data Tables & Transaction Logs
- **Header:** Sticky `#F8FAFC` row, `label-sm` muted text `#64748B`, 36px height, bottom boundary `#E2E8F0`.
- **Cells:** Tabular alignment, 48px row height, subtle divider `#F1F5F9`. Hover state `#F8FAFC`.
- **Financial Figures:** Right-aligned, `tabular-num` weight 500, with currency token displayed as a lighter `#64748B` suffix (`DT`).

### Risk Score Indicators & Progress Bars
- **Meter Track:** 6px height, `#E2E8F0` fill, `rounded-full`.
- **Score Dynamics:** Dynamic multi-segment or single fill:
  - `0 - 39` (Low Risk): `#10B981`
  - `40 - 74` (Medium / Suspect): `#F59E0B`
  - `75 - 100` (Critical Fraud Threat): `#EF4444`
- Accompanying numeric score uses `tabular-num` bold alongside the progress bar.

### Input & Search Fields
- **Search Terminal:** 38px height, `#FFFFFF` fill, `#E2E8F0` border with an inline search icon (`#94A3B8`). Placeholder text: *"Rechercher par RIB, transaction, CIN..."*
- **Focus:** Sharp transition to `#1E3A8A` border and `0 0 0 1px #1E3A8A`.

### Transaction Inspection Drawer
- Slide-over card for inspecting flagged payments. Fixed to the right edge (440px width), pure white background, distinct border-left `#CBD5E1`. Contains a high-contrast customer risk radar, geolocation map thumbnail, device fingerprint details, and instant triage buttons.