import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tanstackRouter({ routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    server: {
        proxy: {
            // Proxy AniList requests through Vite so the browser sees them as
            // same-origin. Without this, a 429 from AniList is CORS-blocked
            // so we can't read the status code and our retry logic never fires.
            '/anilist': {
                target: 'https://graphql.anilist.co',
                changeOrigin: true,
                rewrite: () => '/',
            },
        },
    },
})
