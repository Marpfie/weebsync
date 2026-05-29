import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut, RefreshCcw, RefreshCw, Settings } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'
import { formatRelative } from '../../lib/utils'
import { useIdentity } from '../../store/identity'
import { clearIdentity } from '../../store/identity'
import { useRecommendationsStore } from '../../store/recommendationsStore'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Spinner } from '../ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

export const AppHeader: FC = () => {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const navigate = useNavigate()
    const identity = useIdentity()
    const { isLoadingFriends, isSyncing, lastSyncedAt, resync } = useRecommendationsStore()

    const handleSignOut = () => {
        if (identity?.mode === 'authed') {
            logout()
        } else {
            clearIdentity()
        }
    }

    const syncBusy = isSyncing || isLoadingFriends

    const lastSyncedLabel = lastSyncedAt
        ? (() => {
              const { unit, value } = formatRelative(lastSyncedAt)
              return t('sync.lastSyncedAgo', { context: unit, count: value, value })
          })()
        : t('sync.lastSyncedNever')

    return (
        <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-card border-b border-border">
            <Link className="text-lg font-bold tracking-tight" to="/dashboard">
                {t('nav.title1')}
                <span className="text-primary">{t('nav.title2')}</span>
            </Link>

            <div className="flex items-center gap-2">
                {identity && resync && (
                    <TooltipProvider delay={200}>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        aria-label={t('header.syncAriaLabel')}
                                        disabled={syncBusy}
                                        onClick={resync}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        {syncBusy ? (
                                            <Spinner aria-hidden="true" />
                                        ) : (
                                            <RefreshCw aria-hidden="true" className="size-4" />
                                        )}
                                    </Button>
                                }
                            />
                            <TooltipContent>{lastSyncedLabel}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {identity && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button aria-label={t('header.userMenuAriaLabel')} size="sm" variant="ghost">
                                    <Avatar size="sm">
                                        {identity.avatarUrl && (
                                            <AvatarImage
                                                alt={t('header.avatarAlt', { name: identity.name })}
                                                src={identity.avatarUrl}
                                            />
                                        )}
                                        <AvatarFallback>{identity.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm hidden sm:block">{identity.name}</span>
                                    {identity.mode === 'guest' && (
                                        <Badge variant="secondary">{t('header.guestBadge')}</Badge>
                                    )}
                                    <ChevronDown aria-hidden="true" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent align="end" sideOffset={6}>
                            <DropdownMenuItem disabled>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{identity.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {identity.mode === 'authed' ? t('header.modeAuthed') : t('header.modeGuest')}
                                    </span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
                                <Settings aria-hidden="true" />
                                {t('nav.settings')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut}>
                                {identity.mode === 'guest' ? (
                                    <>
                                        <RefreshCcw aria-hidden="true" />
                                        {t('header.switchUser')}
                                    </>
                                ) : (
                                    <>
                                        <LogOut aria-hidden="true" />
                                        {t('header.logout')}
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    )
}
