/**
 * Shared Tailwind preset for Mystery Box web apps (merchant, admin).
 * Mirrors the design tokens in `src/tokens.ts`. Loaded by Tailwind's config
 * at build time, so it stays plain ESM with no build step / workspace dist dependency.
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf3',
          100: '#d1fadf',
          200: '#a6f4c5',
          300: '#6ce9a6',
          400: '#32d583',
          500: '#12b76a',
          600: '#039855',
          700: '#027a48',
          800: '#05603a',
          900: '#054f31',
          // AA-safe default for white text on a solid fill.
          DEFAULT: '#039855',
        },
        accent: {
          50: '#fffaeb',
          100: '#fef0c7',
          300: '#fec84b',
          500: '#f79009',
          700: '#b54708',
          DEFAULT: '#b54708',
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
        danger: { 50: '#fef3f2', 100: '#fee4e2', 500: '#d92d20', 600: '#b42318', 700: '#912018' },
        success: { 50: '#ecfdf3', 100: '#d1fadf', 500: '#12b76a', 600: '#039855', 700: '#027a48' },
        warning: { 50: '#fffaeb', 100: '#fef0c7', 500: '#f79009', 600: '#dc6803', 700: '#b54708' },
        info: { 50: '#eff8ff', 100: '#d1e9ff', 500: '#2e90fa', 600: '#1570ef', 700: '#175cd3' },
        /**
         * Role-themed surfaces. Each app sets the CSS variables in its own
         * globals.css, so one component library renders warm in the merchant app
         * and cool in the admin console without forking any component.
         */
        surface: {
          page: 'hsl(var(--surface-page))',
          card: 'hsl(var(--surface-card))',
          raised: 'hsl(var(--surface-raised))',
          sunken: 'hsl(var(--surface-sunken))',
        },
        /** Semantic text + border aliases, so hierarchy is never hardcoded. */
        line: 'hsl(var(--border))',
        'line-strong': 'hsl(var(--border-strong))',
        foreground: 'hsl(var(--foreground))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        'subtle-foreground': 'hsl(var(--subtle-foreground))',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
        md: '0 2px 4px rgba(16,24,40,0.06), 0 4px 8px rgba(16,24,40,0.08)',
        lg: '0 4px 8px rgba(16,24,40,0.08), 0 12px 24px rgba(16,24,40,0.10)',
        xl: '0 8px 16px rgba(16,24,40,0.10), 0 24px 48px rgba(16,24,40,0.12)',
      },
      transitionDuration: { fast: '150ms', DEFAULT: '200ms', slow: '250ms' },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.2, 0, 0, 1)',
        'scale-in': 'scale-in 200ms cubic-bezier(0.2, 0, 0, 1)',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
        pill: '9999px',
      },
      maxWidth: {
        /** Readable measure for prose and single-column forms. */
        prose: '68ch',
        /** Widest comfortable content column before gutters take over. */
        content: '1600px',
      },
      zIndex: { sidebar: '30', topbar: '20', overlay: '40', modal: '50', toast: '60' },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        /**
         * 8pt grid aliases.
         *
         * CAUTION: Tailwind resolves `spacing` for sizing utilities too, so these
         * keys also redefine `h-*`, `w-*`, and `min-h-*`. Keys 5–10 therefore do
         * NOT mean what Tailwind's defaults mean — `h-9` is 64px here, not 36px,
         * which silently oversizes controls and can overflow a fixed-height bar.
         * For control heights and icon boxes use an explicit value
         * (`h-[2.25rem]`) or a key this map does not touch (11 = 44px, 12 = 48px).
         */
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '24px',
        6: '32px',
        7: '40px',
        8: '48px',
        9: '64px',
        10: '80px',
      },
    },
  },
  plugins: [],
};

export default preset;
