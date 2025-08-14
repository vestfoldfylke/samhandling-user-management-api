import eslintPluginTs from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const commonRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_$',
      varsIgnorePattern: '^_$'
    }
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  'semi': ['error', 'never'],
  '@typescript-eslint/explicit-function-return-type': 'error',
  'quotes': [
    'error',
    'single',
    {
      'avoidEscape': true
    }
  ]
}

export default [
  {
    files: ['**/*.ts'],
    ignores: ['node_modules', 'dist', 'tests'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2022
      }
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs
    },
    rules: {
      ...commonRules
    }
  },
  {
    files: ['**/tests/*.test.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig_tests.json',
        sourceType: 'module',
        ecmaVersion: 2022
      }
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs
    },
    rules: {
      ...commonRules
    }
  }
]
