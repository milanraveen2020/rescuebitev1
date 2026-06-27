/**
 * RescueBite design tokens — the single source of truth for color, spacing,
 * radii, and typography across web (Tailwind) and React Native. Warm, sustainable,
 * a little playful. All spacing follows an 8pt grid; color pairs meet WCAG AA.
 */

export const colors = {
  // Brand: a warm, appetizing "rescue" green paired with a friendly amber.
  brand: {
    50: '#ecfdf3',
    100: '#d1fadf',
    200: '#a6f4c5',
    300: '#6ce9a6',
    400: '#32d583',
    500: '#12b76a', // primary
    600: '#039855',
    700: '#027a48',
    800: '#05603a',
    900: '#054f31',
  },
  accent: {
    50: '#fffaeb',
    100: '#fef0c7',
    300: '#fec84b',
    500: '#f79009', // playful amber for highlights / "surprise"
    700: '#b54708',
  },
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f2f4f7',
    200: '#e4e7ec',
    300: '#d0d5dd',
    400: '#98a2b3',
    500: '#667085',
    600: '#475467',
    700: '#344054',
    800: '#1d2939',
    900: '#101828',
  },
  semantic: {
    success: '#039855',
    warning: '#dc6803',
    error: '#d92d20',
    info: '#1570ef',
  },
} as const;

/** 8pt spacing grid. Keys are step multipliers; values are pixels. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
  10: 80,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    // Friendly, rounded display face for headings and the brand voice.
    display: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

/**
 * Elevation. Web uses CSS box-shadow strings; React Native uses the matching
 * shadow* props (+ Android elevation) under `elevation`.
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
  md: '0 2px 4px rgba(16,24,40,0.06), 0 4px 8px rgba(16,24,40,0.08)',
  lg: '0 4px 8px rgba(16,24,40,0.08), 0 12px 24px rgba(16,24,40,0.10)',
  xl: '0 8px 16px rgba(16,24,40,0.10), 0 24px 48px rgba(16,24,40,0.12)',
} as const;

export const elevation = {
  sm: { elevation: 1, shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  md: { elevation: 3, shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  lg: { elevation: 8, shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
} as const;

/**
 * Motion: subtle and fast (150–250ms), with a gentle spring on press. Avoid
 * gratuitous animation — respect `prefers-reduced-motion` on web.
 */
export const motion = {
  duration: { fast: 150, base: 200, slow: 250 },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
  },
  /** React Native Animated.spring config for press feedback. */
  spring: { damping: 18, stiffness: 220, mass: 0.6 },
  /** Scale applied while a pressable is held. */
  pressScale: 0.97,
} as const;

/** Layout constants. Interactive targets must be at least 44×44pt (WCAG AA). */
export const layout = {
  minTapTarget: 44,
} as const;

export const tokens = { colors, spacing, radii, typography, shadows, elevation, motion, layout } as const;
export type Tokens = typeof tokens;
