# RescueBite Style Guide

The design system lives in `@rescuebite/ui`. It exports framework-agnostic **tokens**, **web
primitives** (`@rescuebite/ui/web`, for the Next.js merchant/admin apps), and **native primitives**
(`@rescuebite/ui/native`, for the Expo customer app). Tokens are the single source of truth — apps
never hardcode hex/pixels.

> Tone: warm, sustainable, a little playful. Mobile-first, generous whitespace, one primary action
> per screen.

## Tokens

Import from `@rescuebite/ui/tokens` (RN) or use the Tailwind preset (web, `@rescuebite/ui/tailwind-preset`).

### Color

- **Brand (deep green)** — `brand.50…900`. Primary fills use `brand-600` (`#039855`) with white
  text for ≥4.5:1 AA contrast; `brand-700` for small text on light backgrounds.
- **Accent (amber)** — `accent.50…700`. Discounts, "surprise", highlights. Text uses `accent-700`.
- **Neutral grays** — `neutral.0…900` for text, borders, surfaces.
- **Semantic** — `success`, `warning`, `error`, `info` (+ `danger` scale on web).

### Spacing — 8pt grid

`spacing[1..10]` = 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 px. Use multiples of 8 (4 for tight pairs).

### Radii

`sm 6 · md 10 · lg 16 · xl 24 · pill 9999`.

### Elevation / shadows

Web: `shadow-sm|md|lg|xl` (Tailwind). RN: `elevation.sm|md|lg` (shadow* props + Android elevation).

### Typography

- **Display:** Plus Jakarta Sans (headings, brand voice).
- **Body:** Inter.
- Scale: `xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36`.
- Weights: 400 / 500 / 600 / 700. Line heights: tight 1.2 · normal 1.5 · relaxed 1.7.

## Motion

Subtle and fast. **Durations 150–250ms** (`motion.duration.fast|base|slow`), standard easing
`cubic-bezier(0.2,0,0,1)`. Pressables spring to `motion.pressScale` (0.97) on press — `Animated.spring`
on native, `active:scale-[0.97]` on web. No gratuitous animation; respect `prefers-reduced-motion`.

## Primitives

Same API in spirit across web and native:

| Primitive          | Notes                                                         |
| ------------------ | ------------------------------------------------------------- |
| `Button`           | variants `primary/secondary/ghost/danger`, sizes `sm/md/lg`, `loading`, `block`; ≥44px tall |
| `Input`            | label + value + `errorText`; AA focus ring; 48px tall         |
| `Card`             | surface with border + `shadow-sm`                             |
| `Badge`            | tones `neutral/brand/accent/danger`                           |
| `Avatar`           | image with initials fallback                                  |
| `Modal` / `Sheet`  | centered dialog (web) / bottom sheet; Escape + backdrop close |
| `Toast`            | `ToastProvider` + `useToast().toast(msg, tone)`               |
| `EmptyState`       | title + description + optional action                         |
| `Skeleton`         | shimmer (web) / opacity pulse (native) loading placeholder    |
| `RatingStars`      | read-only or interactive (`onChange`)                         |
| `PriceTag`         | discounted price + struck-through original + `-NN%` badge     |
| `PickupWindowChip` | "Today · 5:00–7:00 PM" pickup window                          |

### Web (Next.js)

```tsx
import { Button, Input, Card, PriceTag, useToast } from '@rescuebite/ui/web';

<Card>
  <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
  <PriceTag originalMinor={1500} priceMinor={499} currency="EUR" />
  <Button loading={submitting} block>Reserve</Button>
</Card>;
```

> Apps must include the primitives in their Tailwind `content`:
> `'../../packages/ui/src/web/**/*.{ts,tsx}'`.

### Native (Expo)

```tsx
import { Button, Input, PriceTag } from '@rescuebite/ui/native';

<Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
<PriceTag originalMinor={1500} priceMinor={499} />
<Button label="Reserve" onPress={onReserve} loading={submitting} />
```

## Accessibility

- Text contrast ≥ 4.5:1 (≥3:1 for large text / UI). Brand fills use `brand-600`+ for white text.
- Interactive targets are **≥44×44pt** (buttons, stars use `hitSlop`).
- Inputs have real labels and `aria-describedby` error wiring (web) / `accessibilityLabel` (native).
- Focus-visible rings on web; respect reduced motion.
