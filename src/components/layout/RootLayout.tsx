import { Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { FC } from 'react'

import { useAuth } from '../../hooks/useAuth'
import { ErrorBoundary } from '../ErrorBoundary'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export const RootLayout: FC = () => {
    const { token } = useAuth()
    const routerState = useRouterState()
    const isAuthPage = routerState.location.pathname === '/' || routerState.location.pathname.startsWith('/auth')

    return (
        <div className="min-h-screen flex flex-col">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-primary focus:text-primary-foreground"
                href="#main-content"
            >
                Skip to main content
            </a>
            {token && !isAuthPage && <AppHeader />}
            <div className={'flex flex-1'}>
                {token && !isAuthPage && <AppSidebar />}
                <main className="flex-1 min-w-0" id="main-content">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </div>
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </div>
    )
}
