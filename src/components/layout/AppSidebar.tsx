import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, Clapperboard, LayoutDashboard, Settings, Users } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { ScrollArea } from '../ui/scroll-area'

const NAV_LINKS = [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard', to: '/dashboard' },
    { icon: Clapperboard, labelKey: 'nav.anime', to: '/anime' },
    { icon: BookOpen, labelKey: 'nav.manga', to: '/manga' },
    { icon: Users, labelKey: 'nav.friends', to: '/friends' },
    { icon: Settings, labelKey: 'nav.settings', to: '/settings' },
] as const

export const AppSidebar: FC = () => {
    const { t } = useTranslation()
    const routerState = useRouterState()
    const pathname = routerState.location.pathname

    return (
        <nav
            aria-label="Main navigation"
            className="hidden md:flex flex-col w-56 shrink-0 bg-card border-r border-border"
        >
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 py-6 px-3">
                    {NAV_LINKS.map(({ icon: Icon, labelKey, to }) => {
                        const isActive = pathname.startsWith(to)
                        return (
                            <Link
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-secondary'
                                )}
                                key={to}
                                to={to}
                            >
                                <Icon aria-hidden="true" size={18} />
                                {t(labelKey)}
                            </Link>
                        )
                    })}
                </div>
            </ScrollArea>
        </nav>
    )
}
