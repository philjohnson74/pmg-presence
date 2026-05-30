import { createConfig } from '@pmg/config/eslint';

export default [
  ...createConfig(),
  // tailwind-preset.js is a plain JS config file, not TS — exclude from typed linting
  { ignores: ['src/tailwind-preset.js'] },
];
