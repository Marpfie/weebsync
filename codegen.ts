import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    documents: ['src/**/*.graphql'],
    generates: {
        './src/gql/': {
            config: {
                enumsAsTypes: true,
                useTypeImports: true,
            },
            preset: 'client',
            presetConfig: {
                fragmentMasking: false,
            },
        },
    },
    ignoreNoDocuments: true,
    schema: 'https://graphql.anilist.co',
}

export default config
