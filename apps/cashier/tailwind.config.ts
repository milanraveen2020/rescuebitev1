import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Mystery Box — Cashier PWA theme. Built on the warm sage brand (#7FB39A is
 * brand-500) from packages/ui tokens, with darker/lighter shades derived for
 * WCAG-AA contrast. Self-contained so the POS UI never clashes with the
 * emerald-based merchant/admin preset.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Soft, natural sage. 500 is the requested primary (#7FB39A); 700 is the
        // deep shade used for solid fills with white text (meets AA).
        brand: {
          50: '#f1f7f4',
          100: '#e6f0ea',
          200: '#d0e5da',
          300: '#b3d4c3',
          400: '#97c2ab',
          500: '#7fb39a',
          600: '#5e9580',
          700: '#436b59',
          800: '#34564a',
          900: '#284237',
          DEFAULT: '#436b59',
        },
        accent: {
          50: '#fffaeb',
          100: '#fef0c7',
          300: '#fec84b',
          500: '#f79009',
          700: '#b54708',
          DEFAULT: '#b54708',
        },
        surface: {
          page: '#ece6dc',
          card: '#fffdf9',
          raised: '#f5f0e7',
          sunken: '#e3dccf',
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
        success: { 50: '#ecfdf3', 500: '#039855', 600: '#027a48', 700: '#05603a' },
        warning: { 50: '#fffaeb', 500: '#dc6803', 600: '#b54708', 700: '#93370d' },
        danger: { 50: '#fef3f2', 500: '#d92d20', 600: '#b42318', 700: '#912018' },
        info: { 50: '#eff8ff', 500: '#1570ef', 600: '#175cd3', 700: '#1849a9' },
      },
      boxShadow: {
        sm: '0 1px 2px rgba(40,66,55,0.06), 0 1px 3px rgba(40,66,55,0.08)',
        card: '0 1px 2px rgba(40,66,55,0.05), 0 6px 20px -8px rgba(40,66,55,0.16)',
        'card-lg': '0 2px 6px rgba(40,66,55,0.06), 0 24px 48px -16px rgba(40,66,55,0.24)',
        pop: '0 -4px 24px -6px rgba(40,66,55,0.18)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
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
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      backgroundImage: {
        'brand-glow':
          'radial-gradient(70% 55% at 50% -5%, rgba(127,179,154,0.35) 0%, rgba(127,179,154,0) 65%), radial-gradient(45% 40% at 90% 8%, rgba(247,144,9,0.16) 0%, rgba(247,144,9,0) 70%)',
        'brand-gradient': 'linear-gradient(135deg, #5e9580 0%, #436b59 100%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(127,179,154,0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgba(127,179,154,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(127,179,154,0)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.2,0,0,1)',
        'slide-up': 'slide-up 260ms cubic-bezier(0.2,0,0,1)',
        'sheet-up': 'sheet-up 280ms cubic-bezier(0,0,0,1)',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0,0,1) infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [animate],
};

export default config;
