// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Base ESLint flat config for all PMG packages.
 * Each package's eslint.config.js calls this and may add ignores or overrides.
 * Type-aware rules use the tsconfig.json in the package root (projectService auto-discovers it).
 */
export function createConfig() {
  return tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  });
}
