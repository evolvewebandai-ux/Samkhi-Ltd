# Admin Portal Design System & UI Component Specification
### Samkhi Limited — Enterprise LED & Solar E-Commerce / Quoting Platform

---

## 1. Design Philosophy & Foundations

The Samkhi Limited Admin Portal is a high-density, high-clarity operational utility. Its interface is designed to optimize cognitive efficiency, speed, and accuracy for internal personnel managing complex solar configurations, financial ledgers, and inventory logistics.

### 1.1 Brand & Style Tokens

#### Color Palette
The portal defaults to a high-contrast, professional, light-neutral palette offset by deep, warm, eye-safe accents that minimize fatigue over long workspaces:

| Token Name | Value | Tailwind Equivalent | Role |
| :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `#2563EB` | `bg-blue-600` | Accent buttons, active tabs, critical focus states, brand signifiers. |
| **Secondary (Core UI)**| `#0F172A` | `bg-slate-900` | Headers, secondary primary buttons, structural dark elements. |
| **Surface Dark** | `#1E293B` | `bg-slate-800` | Navigation drawer containers (to maintain clear separation of scopes). |
| **Neutral Dark (Text)** | `#191A1A` | `text-[#191a1a]` | Ultimate body text color, high contrast but less harsh than pitch black. |
| **Neutral Medium** | `#616161` | `text-[#616161]` | Captions, metadata labels, borders, disabled text symbols. |
| **Neutral Light** | `#F8FAFC` | `bg-slate-50` / `bg-surface` | Screen background, light cards, passive panels. |
| **Alert Success** | `#10B981` | `bg-emerald-500` | Clean verified states, "PAID" statuses, credited accounts. |
| **Alert Warning** | `#F59E0B` | `bg-amber-500` | Pending verification, inventory warnings, unverified Fygaro references. |

#### Typography Scale
Utilizes **Inter** paired with **JetBrains Mono** for technical parameters (currencies, SKUs, inventory counts, timestamps) to avoid numeric misinterpretation:

```css
--font-sans: "Inter", ui-sans-serif, system-ui;
--font-mono: "JetBrains Mono", ui-monospace, SFMono;
```

| Element Theme Group | Size | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Main Page Heading (H1)** | `24px` | `800` | `-0.025em` | Dashboard primary views, major collection headers. |
| **Section Header (H2)** | `16px` | `700` | `-0.02em` | Card groups, list panels, modal view modules. |
| **Dense Table Text** | `13px` | `500` | `0` | Data grids, row cells, tabular inputs. |
| **Technical Label** | `11px` | `700` | `0.05em` | Monospaced tags (SKUs, IDs, payment references). |
| **Metadata Caption** | `10px` | `600` | `0.02em` | Helper captions, audit actor indicators, timestamps. |

#### Spacing & Layout Grid
Standardizes on a clean **8px bounding box** (`0.5rem`) multiplier:
- **`4px` (`pt-1`, `m-1`)**: Micro-spacing (between badge text and icons, cell content vertical margins).
- **`8px` (`p-2`, `gap-2`)**: Standard structural padding (list elements, row alignment, inputs internal padding).
- **`16px` (`p-4`, `space-y-4`)**: Component inner padding (cards, dense tables, form layouts).
- **`24px` (`p-6`, `gap-6`)**: Global window grid margins, modal borders, grid layout gaps.

---

## 2. Component Library Specification

### 2.1 Buttons

```
  +-------------------------------------+
  |  [Icon]   Button Text Label         |  <-- Internal Padding: px-4 py-2.5 (High dense target)
  +-------------------------------------+
```

#### Anatomy & Hierarchy
- **Primary Button**: Filled solid background with vibrant typography (blue or slate bg, white text).
- **Secondary Button**: Outlined border with matching text (neutral gray outline, dark interactive text).
- **Danger Action**: Filled destructive accent or raw white-on-red background for deletions/cancels.
- **Bypass Action**: Yellow/amber warning container to emphasize actions like *Fygaro Manual Reconciliation*.

#### Interaction States & Visual Guidelines
- **Hover**: Opacity down relative by 10% (e.g., `hover:bg-opacity-90`) or slight scale down (`active:scale-[0.98]` with transition-all).
- **Focus**: `focus:ring-2 focus:ring-blue-600 focus:outline-none`.
- **Disabled**: Grayscale backdrop, `opacity-50`, and cursor overrides `cursor-not-allowed`.

#### Do's and Don'ts
- **DO**: Use primary buttons solely for the single most critical task in a viewport (e.g., "Save Product" or "Confirm Checkout").
- **DON'T**: Stack secondary or tertiary utility actions with matching weights. Always visually subordinate negative or cancels.

---

### 2.2 Inputs

```
  Field Label Name (uppercase, monospaced text-xs font-bold)
  +-------------------------------------+
  |  [Optional Icon]  Value Placeholder |  <-- Border: 1px solid slate-200, Radius: rounded-xl
  +-------------------------------------+
```

#### Anatomy & Guidelines
- **Height Target**: 40px to 44px to maintain an active tap target matching guidelines.
- **Focus Indicator**: Outer border ring turns to brand-blue with a 3px smooth transition.
- **Error Flagging**: Input border turns destructive red, with clean absolute error captions below.

---

### 2.3 Tables

```
  +--------------------------------------------------------------------------------+
  |  Header Column Title  |  Header Column Price  |  Header Status Label           | <-- px-4 py-3, bg-slate-50
  +--------------------------------------------------------------------------------+
  |  Record Item Cell     |  $45,000 JMD          |  [ PAID Badges ]               | <-- px-4 py-3, border-b
  +--------------------------------------------------------------------------------+
```

#### Anatomy & Densities
- Highly structured rows with light hairline bottom borders (`border-slate-100`).
- Headers tinted slightly with light backgrounds (`bg-slate-50`) using monospaced labels.
- Interactive status markers (e.g., Paid, Cancelled, Pending) rendered in dense rounded badges with safe pastels representing warnings.

---

## 3. Structural Layout & Interaction Patterns

```
  +------------------------------------------------------------------------------+
  | Navigation Drawer [Sidebar]        | Header / Title Bar                      |
  | (Dark theme slate-800)             | Admin details (payments@samkhi.com)     |
  |                                    +-----------------------------------------+
  | - Dashboard                        | View Stage                              |
  | - Customers                        | (Main dashboard grids, sales widgets,   |
  | - Products                         | detail cards, solar estimates)          |
  | - Orders                           |                                         |
  | - Solar Quotes                     |                                         |
  +------------------------------------------------------------------------------+
```

### 3.1 Structural Navigation
- **Persistent Left Navigation Rail (Iframe-Safe)**: Retains access routes across operational layers.
- **Context-Preserving Back Options**: Form updates and nested panels like *Order Details* must provide simple close overlays or back paths instead of disruptive browsers refreshes.

### 3.2 Feedback & Alert Triggers
- **Asynchronous Work Indicators**: Buttons must display loaders and disable active states during processes (e.g., "Syncing webhook..." or "Saving settings...").
- **Audit Logs Confirmation**: Manual overrides and adjustments must always display validation toasts and refresh records cleanly once processing ends.
