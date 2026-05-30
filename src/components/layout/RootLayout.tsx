import { useApolloClient } from '@apollo/client/react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { FC } from 'react'
import { useEffect } from 'react'

import { useAuth } from '../../hooks/useAuth'
import { useRecommendationSync } from '../../hooks/useRecommendationSync'
import { useViewer } from '../../hooks/useViewer'
import { useIdentity } from '../../store/identity'
import { ErrorBoundary } from '../ErrorBoundary'
import { Toaster } from '../ui/sonner'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export const RootLayout: FC = () => {
    const identity = useIdentity()
    const { token } = useAuth()
    const routerState = useRouterState()
    const navigate = useNavigate()
    const client = useApolloClient()
    const pathname = routerState.location.pathname
    const isOAuthCallback = pathname.startsWith('/auth')
    const isLandingPage = pathname === '/'
    const showAppShell = identity != null && !isOAuthCallback && !isLandingPage

    useViewer()
    // Don't kick off recommendation work on the landing page or during the
    // OAuth callback — there's no UI to consume it there, and on logged-in
    // visits to `/` the redirect in beforeLoad means this only matters on the
    // rare moment between mount and redirect.
    useRecommendationSync(showAppShell)

    // Whenever identity disappears, cancel any in-flight queries (so friend-list
    // fetches don't keep burning rate-limit calls) and bounce back to landing.
    // If a token is present, the viewer query is still resolving — wait for it
    // to populate identity before deciding we're signed out (otherwise OAuth
    // bounces straight back home).
    useEffect(() => {
        if (identity == null && !token && !isOAuthCallback) {
            void client.clearStore()
            void navigate({ to: '/' })
        }
    }, [identity, token, isOAuthCallback, client, navigate])

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-primary focus:text-primary-foreground"
                href="#main-content"
            >
                Skip to main content
            </a>
            {showAppShell && <AppHeader />}
            <div className={'flex flex-1 overflow-hidden'}>
                {showAppShell && <AppSidebar />}
                <main className="flex-1 min-w-0 overflow-y-auto" id="main-content">
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
