import type { Config } from 'tailwindcss';
// The preset is plain ESM without types; treat it as a Tailwind config fragment.
import presetUntyped from '@rescuebite/ui/tailwind-preset';
import animate from 'tailwindcss-animate';

const preset = presetUntyped as Partial<Config>;

const config: Config = {
  presets: [preset],
  // Include the shared UI primitives' source so their Tailwind classes are generated.
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/web/**/*.{ts,tsx}'],
  plugins: [animate],
};

export default config;
