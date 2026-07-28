// @ts-check
import eslint from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginImport.flatConfigs.recommended,
  eslintPluginImport.flatConfigs.typescript,
  eslintPluginPrettierRecommended,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
        },
      ],
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'max-depth': ['warn', 2],
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
  {
    files: ['src/**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.spec.json',
        projectService: false,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Specs usam mocks extensivamente; regras de "unsafe" geram ruido
      // sem valor pratico em testes de unidade.
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Dados de teste (factories / senhas hardcoded) e assertions genericas sao aceitaveis em E2E/specs
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/prefer-specific-assertions': 'off',
    },
  },
  // Scripts CLI e migrations: console.log e permitido (saida de terminal / one-off).
  // Migrations vazias (up/down sem await) sao padrao -> require-await desligado.
  // Migrations manipulam dados legados em formato nao tipado -> no-explicit-any off.
  {
    files: ['src/commands/**', 'src/database/migrations/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);