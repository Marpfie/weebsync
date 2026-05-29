import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ChevronDown, LogOut, RefreshCcw, RefreshCw, Settings } from 'lucide-react'
import { type FC, useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'
import { getRateLimitState, subscribeRateLimit } from '../../lib/rate-limiter'
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
import { Progress, ProgressIndicator, ProgressTrack } from '../ui/progress'
import { Spinner } from '../ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

/**
 * 1s ticking clock so the pause badge and ETA text stay live without
 * coupling the whole app to a render loop. Returns the current epoch ms
 * computed at mount and re-updated every second while `active` is true.
 */
const useNowTick = (active: boolean): number => {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!active) return
        setNow(Date.now())
        const id = globalThis.setInterval(() => {
            setNow(Date.now())
        }, 1000)
        return () => {
            globalThis.clearInterval(id)
        }
    }, [active])
    return now
}

export const AppHeader: FC = () => {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const navigate = useNavigate()
    const identity = useIdentity()
    const { failedFriendIds, friendProgress, isLoadingFriends, isSyncing, lastSyncedAt, resync, retryFailed } =
        useRecommendationsStore()
    const rateLimit = useSyncExternalStore(subscribeRateLimit, getRateLimitState)

    const handleSignOut = () => {
        if (identity?.mode === 'authed') {
            logout()
        } else {
            clearIdentity()
        }
    }

    const syncBusy = isSyncing || isLoadingFriends

    const progressCurrent = friendProgress.anime.current + friendProgress.manga.current
    const progressTotal = friendProgress.anime.total + friendProgress.manga.total
    const showProgress = isLoadingFriends && progressTotal > 0
    const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressCurrent / progressTotal) * 100)) : 0

    const failedCount = failedFriendIds.anime.length + failedFriendIds.manga.length

    const quotaLow =
        rateLimit.observedRemaining !== null && rateLimit.observedLimit !== null
            ? rateLimit.observedRemaining <= Math.max(3, Math.floor(rateLimit.observedLimit * 0.15))
            : false

    const now = useNowTick(syncBusy || rateLimit.paused)

    const pauseSecondsRemaining =
        rateLimit.paused && rateLimit.resumesAt ? Math.max(0, Math.ceil((rateLimit.resumesAt - now) / 1000)) : 0

    // x/30 badge: dev only, only while a sync is in flight, never while paused.
    const isDevelopment = import.meta.env.DEV
    const showQuota =
        isDevelopment &&
        !rateLimit.paused &&
        syncBusy &&
        rateLimit.observedLimit !== null &&
        rateLimit.observedRemaining !== null

    // Show the rate-limited badge only on an actual hard pause (429 / CORS throw).
    const showRateLimited = rateLimit.paused
    const rateLimitResumeSeconds = pauseSecondsRemaining

    const lastSyncedLabel = lastSyncedAt
        ? (() => {
              const { unit, value } = formatRelative(lastSyncedAt)
              return t('sync.lastSyncedAgo', { context: unit, count: value, value })
          })()
        : t('sync.lastSyncedNever')

    return (
        <header className="flex flex-col px-4 py-3 shrink-0 bg-card border-b border-border">
            <div className="flex items-center justify-between">
                <Link className="text-lg font-bold tracking-tight" to="/dashboard">
                    {t('nav.title1')}
                    <span className="text-primary">{t('nav.title2')}</span>
                </Link>

                <div className="flex items-center gap-2">
                    {showQuota && rateLimit.observedRemaining !== null && rateLimit.observedLimit !== null && (
                        <Badge
                            aria-label={t('header.quotaLabel')}
                            className="tabular-nums"
                            variant={quotaLow ? 'destructive' : 'outline'}
                        >
                            {t('header.quotaValue', {
                                limit: rateLimit.observedLimit,
                                remaining: rateLimit.observedRemaining,
                            })}
                        </Badge>
                    )}

                    {showRateLimited && (
                        <Badge variant="destructive">
                            {t('header.rateLimited', { seconds: rateLimitResumeSeconds })}
                        </Badge>
                    )}

                    {failedCount > 0 && retryFailed && (
                        <TooltipProvider delay={200}>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            aria-label={t('header.retryFailedAriaLabel')}
                                            onClick={retryFailed}
                                            size="sm"
                                            variant="ghost"
                                        >
                                            <AlertTriangle aria-hidden="true" className="size-4 text-amber-500" />
                                            <span className="text-sm">{failedCount}</span>
                                        </Button>
                                    }
                                />
                                <TooltipContent>{t('header.failedFriends', { count: failedCount })}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

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
                                            {identity.mode === 'authed'
                                                ? t('header.modeAuthed')
                                                : t('header.modeGuest')}
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
            </div>

            {showProgress && (
                <div className="flex items-center gap-3 mt-2">
                    <Progress
                        aria-label={t('header.syncProgressAriaLabel')}
                        className="flex-1 gap-0"
                        value={progressPercent}
                    >
                        <ProgressTrack className="h-1.5">
                            <ProgressIndicator className="progress-stripes" />
                        </ProgressTrack>
                    </Progress>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {progressCurrent}/{progressTotal}
                    </span>
                </div>
            )}
        </header>
    )
}
