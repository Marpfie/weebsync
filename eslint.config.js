import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
    globalIgnores([
        'dist',
        'bin',
        'build',
        'node_modules',
        'vite.config.ts',
        '.vite-inspect/*',
        'src/vite-env.d.ts',
        'src/routeTree.gen.ts',
        'src/gql/**',
    ]),
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        extends: [...tseslint.configs.strictTypeChecked, eslintReact.configs['strict-type-checked']],
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        },
    },
    reactRefresh.configs.vite,
    eslintConfigPrettier,
    perfectionist.configs['recommended-natural'],
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
            'react-hooks': reactHooks,
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
            'perfectionist/sort-imports': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        ['parent', 'sibling', 'index'],
                        'side-effect-style',
                        'side-effect',
                    ],
                    newlinesBetween: 1,
                    order: 'asc',
                    type: 'natural',
                },
            ],
            'react-hooks/purity': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
            'unicorn/filename-case': [
                'off',
                {
                    cases: {
                        camelCase: true,
                        pascalCase: true,
                    },
                },
            ],
            'unicorn/no-keyword-prefix': ['error', { disallowedPrefixes: ['new'] }],
            'unicorn/no-null': 'off',
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
    },
    {
        // TanStack Router route files export both a `Route` object (required by the
        // file-based router) and define the component inline. That mixed shape trips
        // `react-refresh/only-export-components`, which is meaningless for route files
        // since Vite's HMR for routes is handled by the router plugin itself.
        files: ['src/routes/**/*.{ts,tsx}'],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
])
