import { useApolloClient } from '@apollo/client/react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { FC } from 'react'
import { useEffect } from 'react'

import { useIdentity } from '../../store/identity'
import { ErrorBoundary } from '../ErrorBoundary'
import { Toaster } from '../ui/sonner'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export const RootLayout: FC = () => {
    const identity = useIdentity()
    const routerState = useRouterState()
    const navigate = useNavigate()
    const client = useApolloClient()
    const pathname = routerState.location.pathname
    const isOAuthCallback = pathname.startsWith('/auth')
    const isLandingPage = pathname === '/'
    const showAppShell = identity != null && !isOAuthCallback && !isLandingPage

    // Whenever identity disappears, cancel any in-flight queries (so friend-list
    // fetches don't keep burning rate-limit calls) and bounce back to landing.
    useEffect(() => {
        if (identity == null && !isOAuthCallback) {
            void client.clearStore()
            void navigate({ to: '/' })
        }
    }, [identity, isOAuthCallback, client, navigate])

    return (
        <div className="min-h-screen flex flex-col">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-primary focus:text-primary-foreground"
                href="#main-content"
            >
                Skip to main content
            </a>
            {showAppShell && <AppHeader />}
            <div className={'flex flex-1'}>
                {showAppShell && <AppSidebar />}
                <main className="flex-1 min-w-0" id="main-content">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </div>
            <Toaster richColors />
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </div>
    )
}
