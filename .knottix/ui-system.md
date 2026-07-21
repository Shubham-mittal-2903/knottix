# Knottix — UI System

## Design Identity

Knottix is a dark-mode-first, premium internal operating system. The interface communicates power, precision, and intelligence. Every pixel serves a purpose.

## Color System

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#09090B` | Main background (zinc-950) |
| `--bg-secondary` | `#18181B` | Cards, panels, elevated surfaces (zinc-900) |
| `--bg-tertiary` | `#27272A` | Hover states, subtle containers (zinc-800) |
| `--border-default` | `#3F3F46` | Default borders (zinc-700) |
| `--border-subtle` | `#27272A` | Subtle separators (zinc-800) |
| `--text-primary` | `#FAFAFA` | Primary text (zinc-50) |
| `--text-secondary` | `#A1A1AA` | Secondary/muted text (zinc-400) |
| `--text-tertiary` | `#71717A` | Disabled/hint text (zinc-500) |

### Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-primary` | `#6366F1` | Primary actions, active states (indigo-500) |
| `--accent-primary-hover` | `#818CF8` | Hover on primary accent (indigo-400) |
| `--accent-glow` | `rgba(99,102,241,0.15)` | Glow effects behind accent elements |
| `--success` | `#22C55E` | Success states, positive indicators |
| `--warning` | `#F59E0B` | Warning states, attention needed |
| `--error` | `#EF4444` | Error states, destructive actions |
| `--info` | `#3B82F6` | Informational states |

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Display | Inter | 36px / 2.25rem | 700 |
| H1 | Inter | 28px / 1.75rem | 600 |
| H2 | Inter | 22px / 1.375rem | 600 |
| H3 | Inter | 18px / 1.125rem | 600 |
| Body | Inter | 14px / 0.875rem | 400 |
| Body Small | Inter | 13px / 0.8125rem | 400 |
| Caption | Inter | 12px / 0.75rem | 400 |
| Code/Mono | JetBrains Mono | 13px / 0.8125rem | 400 |

## Spacing Scale

4px increments: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Chips, tags, small elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Modals, large containers |

## Elevation / Depth

No traditional box-shadow stacking. Depth is communicated through:
- Background color stepping (primary → secondary → tertiary)
- Subtle borders
- Accent glow for interactive/active elements

Exception: Modals and command palette use a soft shadow: `0 24px 48px rgba(0,0,0,0.4)`

## Layout

- **Shell**: Fixed sidebar (left, 260px collapsed to 64px) + topbar (56px) + content area
- **Sidebar**: Navigation, module list, user avatar at bottom
- **Content**: Max-width 1440px, centered, with 24px padding
- **Grid**: CSS Grid for dashboards, Flexbox for linear layouts
- **Responsive**: Desktop-first. Minimum supported width: 1024px (internal tool — no mobile)

## Component Primitives

Built on shadcn/ui (base-nova style) with Knottix dark theme applied. Icons: Lucide React.

| Component | Notes |
|-----------|-------|
| Button | Variants: primary (accent bg), secondary (ghost), danger (error bg), icon-only |
| Input | Dark bg, subtle border, focus ring with accent glow |
| Select | Custom dropdown, no native select |
| Modal | Centered overlay, backdrop blur, escape to close |
| Card | bg-secondary, border-default, radius-lg, 20px padding |
| Table | Sticky header, row hover, compact density |
| Badge | Status indicator, color-coded by state |
| Avatar | Circle, initials fallback, online indicator |
| Tooltip | Dark bg, small text, 200ms delay |
| Command Palette | Cmd+K, full-width search, categorized results |
| Toast | Bottom-right stack, auto-dismiss, accent-coded by type |
| Tabs | Underline variant, no background tabs |
| Skeleton | Pulse animation, matches component shape |

## Animation

- **Duration**: 150ms for micro-interactions, 300ms for transitions, 500ms for page-level
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (standard material ease)
- **Framer Motion** for: page transitions, list reordering, modal enter/exit, command palette
- **CSS transitions** for: hover states, focus rings, color changes
- No animation on first paint. No animation that blocks interaction.

## AI Interface

The AI interaction is NOT a chatbot bubble. It is:
- A command-line-inspired input at the module level
- Streaming responses rendered as structured output (tables, cards, summaries) — not raw text blobs
- Contextual: the AI knows which module the user is in and what data is visible
