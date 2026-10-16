import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `_`-prefixed names are intentional (destructure-to-omit, unused catch params)
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_', argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true,
      }],
    },
  },
  {
    // shadcn/ui vendor components: co-located variant helpers are idiomatic there
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
