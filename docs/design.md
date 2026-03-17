# DuckGrades Design Identity

## Overview

DuckGrades is a clean, nature-inspired academic tool. The design is minimal and data-forward, with a soft green palette that subtly references Oregon's landscape. It avoids harsh contrast in favor of muted sage greens, warm whites, and earthy tones. The overall tone is **professional-minimal with a gentle natural character** — trustworthy and fast without feeling corporate or sterile.

---

## Brand

- **App name**: DuckGrades — stylized as two words with distinct colors: "**Duck**" + "**Grades**"
- **Tagline**: "Explore University of Oregon grade distributions and statistics by subject, course, and professor."
- **Logo**: `duckgrades.png` / `duckgrades.svg` — a duck icon, rendered with a subtle dark-green drop-shadow
- **Canonical URL**: `https://duckgrades.maarv.dev/`
- **GitHub**: `https://github.com/MarvNC/DuckGrades`

---

## Color System

All colors are CSS custom properties under the `--duck-*` namespace, defined in `src/styles.css`. They are consumed in Tailwind via arbitrary values (`bg-[var(--duck-surface)]`, etc.) so dark-mode switching is handled entirely by CSS with zero JS class toggling.

### Light Mode (`:root`)

| Token                                   | Hex                    | Role                                                  |
| --------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `--duck-bg`                             | `#f5f9ef`              | Page background (soft sage-white)                     |
| `--duck-bg-accent`                      | `#f8fbf4`              | Slightly lighter background accent                    |
| `--duck-fg`                             | `#182116`              | Primary text (very dark green-black)                  |
| `--duck-primary`                        | `#b9e48c`              | Primary brand green (light lime)                      |
| `--duck-accent`                         | `#ffec8f`              | Accent yellow (secondary pill buttons)                |
| `--duck-muted`                          | `#5f6f5d`              | Muted body text (medium sage green)                   |
| `--duck-muted-strong`                   | `#485747`              | Stronger muted text (darker green-grey)               |
| `--duck-border`                         | `#d4e2ca`              | Default border (light sage)                           |
| `--duck-border-strong`                  | `#bfd1b1`              | Stronger/hover border                                 |
| `--duck-surface`                        | `#ffffff`              | Card/surface background                               |
| `--duck-surface-soft`                   | `#f3f8ed`              | Softer surface (hover states)                         |
| `--duck-surface-muted`                  | `#edf4e6`              | Even softer surface variant                           |
| `--duck-accent-strong`                  | `#4f6e3d`              | Deep forest green (hover text, active links)          |
| `--duck-focus`                          | `#4d8152`              | Focus ring color                                      |
| `--duck-brand-duck`                     | `#1d2b16`              | "Duck" wordmark (near-black dark green)               |
| `--duck-brand-grades`                   | `#4f6e3d`              | "Grades" wordmark (deep forest green)                 |
| `--duck-danger-border`                  | `#fcd6a5`              | Warning badge border (pale amber)                     |
| `--duck-danger-bg`                      | `#fff5e6`              | Warning badge background (warm cream)                 |
| `--duck-danger-text`                    | `#9a5f05`              | Warning badge text (amber-brown)                      |
| `--duck-chart-1` … `--duck-chart-5`     | semantic chart palette | Reusable analytics series colors                      |
| `--duck-level-100` … `--duck-level-500` | level accent palette   | Course-level series colors (100, 200, 300, 400, 500+) |

### Dark Mode (`:root[data-theme='dark']`)

| Token                                   | Hex                    | Role                                                  |
| --------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `--duck-bg`                             | `#131715`              | Dark background (near-black with warm-green tint)     |
| `--duck-bg-accent`                      | `#1a201d`              | Slightly lighter dark bg with warm-green tint         |
| `--duck-fg`                             | `#e9edf2`              | Light text (cool off-white)                           |
| `--duck-muted`                          | `#a8b0ba`              | Muted text (medium cool grey)                         |
| `--duck-muted-strong`                   | `#c6ced8`              | Stronger muted (lighter cool grey)                    |
| `--duck-border`                         | `#373e49`              | Dark border (dark blue-grey)                          |
| `--duck-border-strong`                  | `#4c5563`              | Stronger dark border                                  |
| `--duck-surface`                        | `#20262f`              | Card surface (dark blue-grey)                         |
| `--duck-surface-soft`                   | `#2a313b`              | Softer dark surface                                   |
| `--duck-surface-muted`                  | `#303843`              | Muted dark surface                                    |
| `--duck-accent-strong`                  | `#8fcf9d`              | Soft mint green (hover text)                          |
| `--duck-focus`                          | `#73ba86`              | Focus ring (lighter mint)                             |
| `--duck-brand-duck`                     | `#e9edf2`              | "Duck" wordmark (light in dark mode)                  |
| `--duck-brand-grades`                   | `#8fcf9d`              | "Grades" wordmark (mint)                              |
| `--duck-danger-border`                  | `#846130`              | Dark danger border (dark amber)                       |
| `--duck-danger-bg`                      | `#3f321d`              | Dark danger background (dark brown)                   |
| `--duck-danger-text`                    | `#f2cd96`              | Dark danger text (light gold)                         |
| `--duck-chart-1` … `--duck-chart-5`     | semantic chart palette | Reusable analytics series colors                      |
| `--duck-level-100` … `--duck-level-500` | level accent palette   | Course-level series colors (100, 200, 300, 400, 500+) |

### Data Visualization Colors

| Usage             | Color                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Grade bars F → A+ | `hsl(10 62% 58%)` (warm red) → `hsl(138 62% 58%)` (green), 13-step sweep |
| Pass (P)          | `#7dbf8a` (muted sage green)                                             |
| No Pass (NP)      | `#88a7c6` (muted blue)                                                   |
| Other             | `#c7b182` (muted sand/gold)                                              |
| Withdrawal (W)    | `#c98f90` (muted rose/salmon)                                            |

### Color Rules

- **Never** introduce hard-coded colors in component files. Always use `var(--duck-*)` tokens.
- **Never** add Tailwind color utilities (e.g. `text-green-600`). Only `var(--duck-*)` inside arbitrary value brackets.
- When adding a new semantic color, define it in both the light `:root` and dark `:root[data-theme='dark']` blocks in `src/styles.css`.

---

## Typography

### Font Family

- **Primary**: `'Sora'` — loaded from Google Fonts at weights 400, 500, 600, 700, 800
- **Fallback**: `ui-sans-serif`, `system-ui`, `sans-serif`
- Set on `body` in `src/styles.css`

### Font Weights

| Weight | Class                   | Usage                      |
| ------ | ----------------------- | -------------------------- |
| 400    | (normal)                | Body text                  |
| 500    | `font-medium`           | Secondary labels           |
| 600    | `font-semibold`         | Meta chips, card labels    |
| 700    | `font-bold`             | Card titles, nav links     |
| 800    | `font-extrabold`        | Page `<h1>` headings       |
| 900    | `.brand-duck` CSS class | Brand "Duck" wordmark only |

### Letter Spacing Conventions

Metadata labels (MEAN, MEDIAN, MODE, SORT BY, etc.) always use generous uppercase tracking:

| Usage                          | Value                         |
| ------------------------------ | ----------------------------- |
| Filter bar labels              | `tracking-[0.1em]` uppercase  |
| Stat labels (MEAN/MEDIAN/MODE) | `tracking-[0.08em]` uppercase |
| Card section labels            | `tracking-[0.12em]` uppercase |
| Chart axis labels              | `tracking-[0.06em]`           |

### Typography Rules

- Page `<h1>` headings: `text-3xl font-extrabold tracking-tight`
- Metadata labels are always **uppercase** with generous tracking — do not use mixed-case for labels
- Do not introduce new font families; Sora is the only typeface

---

## Spacing & Layout

- **Content max-width**: `max-w-4xl`
- **Shell/footer max-width**: `max-w-6xl`
- **Horizontal page padding**: `px-5` mobile / `sm:px-8` desktop
- **Vertical page padding**: `pb-24` mobile / `sm:pb-16` desktop (accounts for fixed mobile search bar)
- **Card padding**: `p-3.5` / `sm:p-4` (summary cards); `p-5` / `sm:p-7` (page sections)
- **Stacked card gap**: `space-y-2.5`
- **Meta chip gap**: `gap-1.5`
- **Primary breakpoint**: `sm:` (640px) — mobile-first
- **Secondary breakpoint**: `lg:` (1024px) — multi-column detail pages

---

## Border Radius

| Value                              | Usage                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| `rounded-full` / `rounded-[999px]` | Pills: MetaChips, nav buttons, ThemeToggle, pill-buttons, badges |
| `rounded-3xl`                      | Page section containers                                          |
| `rounded-2xl`                      | Cards, header bar, filter bars                                   |
| `rounded-xl`                       | Inputs, selects, search result items, SectionDrilldown container |
| `rounded-lg`                       | SectionDrilldown summary row                                     |
| `rounded-md`                       | Student count labels                                             |
| `rounded-[3px]`                    | Individual bars in GradeDistributionStrip                        |

**Rule**: No sharp corners (`rounded-none`) on any interactive or content surface.

---

## Shadows

| Style                                                 | Usage                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `shadow-sm`                                           | Standard card/surface shadow                                       |
| `shadow-md`                                           | Hover state on buttons                                             |
| `shadow-lg`                                           | Homepage hero search input                                         |
| Custom `0 6px 18px -14px rgba(0,0,0,0.45)`            | Sticky header bar                                                  |
| Custom `color-mix` shadow                             | `.pill-button:hover` — colored shadow using `--duck-border-strong` |
| `filter: drop-shadow(0 6px 12px rgba(18,71,52,0.12))` | Brand logo — subtle green-tinted                                   |

---

## Interactions & Motion

- Transition duration: `duration-200` (most interactions), `duration-150` (fast toggles)
- Hover lift: `hover:-translate-y-0.5` — subtle vertical lift on cards and buttons
- Hover shadow: shadow deepens one step on hover (e.g. `shadow-sm` → `shadow-md`)
- Hover border: border color advances from `--duck-border` to `--duck-border-strong`
- Focus ring: `focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20`
- Global `focus-visible`: `outline: 2px solid var(--duck-focus)` (defined in `src/styles.css`)

### Animations (CSS keyframes in `src/styles.css`)

- `fade-in-up` (0.8s, ease-out): homepage hero sections stagger-animate upward on load
- `home-search-header-enter` (180ms, ease-out): header slides down when search activates

---

## Special Effects

### Glassmorphism Header

The sticky navigation bar uses a frosted-glass effect — the most visually distinctive UI element:

```
bg-[var(--duck-surface)]/55 backdrop-blur-lg backdrop-saturate-125
```

### Homepage Dot Grid

The homepage background uses a fixed radial-dot CSS pattern at 30px pitch with a radial gradient overlay:

```css
/* .home-grid-bg + .home-bg-overlay — defined in src/styles.css */
```

---

## Dark Mode

- **Three-way toggle**: `system` → `light` → `dark`, cycled by `ThemeToggleButton`
- **Storage key**: `duckgrades-theme` in `localStorage`
- **Application**: `data-theme="dark"` attribute on `<html>` activates `:root[data-theme='dark']` CSS
- **System sync**: `window.matchMedia('(prefers-color-scheme: dark)')` with a live `change` listener
- **Icons**: `<Monitor>` (system) / `<Sun>` (light) / `<Moon>` (dark) from lucide-react

---

## Component Patterns

### Pill / Badge

Rounded-full pills are used universally for metadata. `MetaChip` auto-selects a Lucide icon based on content:

- "… sections" → `<Layers>`
- "… students" → `<Users>`
- "… courses" → `<BookOpen>`
- "… professors" / "… instructors" → `<GraduationCap>`
- "… subjects" → `<Library>`

### Cards

Two card types:

- **`AggregateSummaryCard`**: bordered `rounded-2xl` white card for top-level grade stats. Contains label, MetaChip row, GradeDistributionStrip, and Mean/Median/Mode stats.
- **`EntityAggregateCard`**: list-item `<article>` card. Title + subtitle + MetaChip row + GradeDistributionStrip + micro stats.

### Grade Bar Chart (`GradeDistributionStrip`)

- Left group: 4 bars for P / NP / Other / W (fixed muted colors, separated by dashed line)
- Right group: 13 bars for F → A+ (red-to-green hue ramp)
- Bar height uses a power-curve function (not linear) for visual clarity
- Hover/focus/touch on any bar shows grade + count + percentage in an info line above

### Analytics Charts

- `uPlot` is the default engine for analytics charts (time-series, scatter, histogram)
- Chart colors come from `--duck-chart-*` and `--duck-level-*` tokens for theme consistency
- Axis labels follow uppercase metadata styling (`tracking-[0.06em]`)
- Use bordered `rounded-2xl` cards to frame each chart section; avoid full-bleed chart canvases

### Search Results

- Grouped by entity type (Subjects / Courses / Professors) with section headers
- Matched characters are `font-semibold` highlighted
- Active item: green border + soft background
- Full keyboard navigation: Arrow keys, Tab, Escape, Shift+Tab

---

## Iconography

All icons are from **lucide-react**. Icons are always `aria-hidden="true"` when decorative; interactive icon-only buttons carry an `sr-only` accessible label.

Icons in use: `Search`, `Moon`, `Sun`, `Monitor`, `ChevronDown`, `Users`, `Layers`, `BookOpen`, `GraduationCap`, `Library`, `Github`, `CalendarDays`, `Hash`, `Eye`, `ShieldAlert`, `Compass`, `List`, `User`

---

## Accessibility

- All decorative icons: `aria-hidden="true"`
- All icon-only interactive elements: `sr-only` visible label
- Global `focus-visible` ring using `--duck-focus` color
- Keyboard-navigable search (Arrow keys / Tab / Escape / Shift+Tab)
- Semantic HTML: `<article>`, `<details>`, `<summary>`, `<nav>`, `<main>`, `<footer>`

---

## What to Avoid

- Hard-coded hex or RGB colors in component files — use `var(--duck-*)` tokens only
- Tailwind color palette classes (e.g. `text-green-600`, `bg-gray-100`) — use tokens
- Sharp corners on interactive/content surfaces
- New font families — Sora only
- Mixed-case metadata labels — uppercase + tracking is the established pattern
- Decorative imagery or gradients on content areas — the data is the hero
- Adding new icons from icon libraries other than lucide-react
