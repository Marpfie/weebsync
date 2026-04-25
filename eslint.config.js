import js from '@eslint/js'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sortKeysFix from 'eslint-plugin-sort-keys-fix'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
    globalIgnores(['dist', 'bin', 'build', 'node_modules', 'vite.config.ts', '.vite-inspect/*', 'src/vite-env.d.ts']),
    js.configs.recommended,
    ...tseslint.configs.recommended,
    react.configs.flat.recommended,
    reactRefresh.configs.vite,
    eslintPluginPrettierRecommended,
    eslintPluginUnicorn.configs.all,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.browser,
            },
            sourceType: 'module',
        },
        plugins: {
            prettier: eslintPluginPrettier,
            react,
            'react-hooks': reactHooks,
            'simple-import-sort': simpleImportSort,
            'sort-keys-fix': sortKeysFix,
            'unused-imports': unusedImports,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    fixStyle: 'separate-type-imports',
                    prefer: 'type-imports',
                },
            ],
            // Handled via unused-imports Plugin
            '@typescript-eslint/no-unused-vars': 'off',
            'prettier/prettier': 'warn',
            'simple-import-sort/exports': 'warn',
            'simple-import-sort/imports': 'warn',
            'sort-keys-fix/sort-keys-fix': 'warn',
            'unicorn/filename-case': [
                'off',
                {
                    cases: {
                        camelCase: true,
                        pascalCase: true,
                    },
                },
            ],
            'unicorn/prevent-abbreviations': [
                'warn',
                {
                    replacements: {
                        id: false,
                        props: false,
                        ref: false,
                        refs: false,
                        temp: false,
                        utils: false,
                    },
                },
            ],
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                    varsIgnorePattern: '^_',
                },
            ],
        },
        settings: {
            react: { version: 'detect' },
        },
    },
])
