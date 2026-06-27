/**
 * Shared Tailwind preset for RescueBite web apps (merchant, admin).
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
          DEFAULT: '#12b76a',
        },
        accent: {
          50: '#fffaeb',
          100: '#fef0c7',
          300: '#fec84b',
          500: '#f79009',
          700: '#b54708',
          DEFAULT: '#f79009',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // 8pt grid aliases.
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
