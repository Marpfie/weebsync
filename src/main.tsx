import { ApolloProvider } from '@apollo/client/react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthProvider } from './context/AuthContext.tsx'
import { i18nReady } from './i18n'
import { initApollo } from './lib/apollo.ts'
import { routeTree } from './routeTree.gen.ts'

import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.querySelector('#root')!)

const [client] = await Promise.all([initApollo(), i18nReady])

root.render(
    <StrictMode>
        <ApolloProvider client={client}>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ApolloProvider>
    </StrictMode>
)
