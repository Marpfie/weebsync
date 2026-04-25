import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: 'https://graphql.anilist.co',
    documents: ['src/**/*.{ts,tsx,graphql}'],
    generates: {
        './src/gql/': {
            preset: 'client',
            presetConfig: {
                fragmentMasking: false,
            },
            config: {
                useTypeImports: true,
                enumsAsTypes: true,
            },
        },
    },
    ignoreNoDocuments: true,
}

export default config
