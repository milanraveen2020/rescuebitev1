import type { Config } from 'tailwindcss';
// The preset is plain ESM without types; treat it as a Tailwind config fragment.
import presetUntyped from '@rescuebite/ui/tailwind-preset';
import animate from 'tailwindcss-animate';

const preset = presetUntyped as Partial<Config>;

const config: Config = {
  presets: [preset],
  // Include the shared UI primitives' source so their Tailwind classes are generated.
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/web/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Surfaces now come from the shared preset, driven by the CSS variables in
      // globals.css — same components, warm merchant palette.
      fontFamily: {
        // Bind to the next/font CSS variables so the real faces actually load.
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Warm-tinted elevation so cards feel like paper on cream, not clinical gray.
        card: '0 1px 2px rgba(67,107,89,0.05), 0 6px 20px -8px rgba(67,107,89,0.14)',
        'card-lg': '0 2px 6px rgba(67,107,89,0.06), 0 24px 48px -16px rgba(67,107,89,0.22)',
      },
      backgroundImage: {
        'brand-glow':
          'radial-gradient(60% 55% at 50% 0%, rgba(18,183,106,0.16) 0%, rgba(18,183,106,0) 70%), radial-gradient(45% 45% at 85% 15%, rgba(247,144,9,0.14) 0%, rgba(247,144,9,0) 70%)',
      },
    },
  },
  plugins: [animate],
};

export default config;
