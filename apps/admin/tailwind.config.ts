import type { Config } from 'tailwindcss';
// The preset is plain ESM without types; treat it as a Tailwind config fragment.
import presetUntyped from '@rescuebite/ui/tailwind-preset';
import animate from 'tailwindcss-animate';

const preset = presetUntyped as Partial<Config>;

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [animate],
};

export default config;
