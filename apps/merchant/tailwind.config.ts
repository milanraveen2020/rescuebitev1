import type { Config } from 'tailwindcss';
import preset from '@rescuebite/ui/tailwind-preset';
import animate from 'tailwindcss-animate';

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [animate],
};

export default config;
