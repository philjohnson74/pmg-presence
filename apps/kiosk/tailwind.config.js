import pmgPreset from '@pmg/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [pmgPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
