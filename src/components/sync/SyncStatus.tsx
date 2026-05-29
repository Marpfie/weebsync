import { RefreshCw } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'

interface SyncStatusProps {
    className?: string
    isLoading: boolean
    isSyncing?: boolean
    lastSyncedAt: null | number
    onResync: () => void
    progress?: { current: number; total: number }
}

export const SyncStatus: FC<SyncStatusProps> = ({
    className,
    isLoading,
    isSyncing = false,
    lastSyncedAt,
    onResync,
    progress,
}) => {
    const { t } = useTranslation()
    const [now, setNow] = useState(Date.now)
    const wasSyncingRef = useRef(isSyncing)

    useEffect(() => {
        const id = setInterval(() => {
            setNow(Date.now())
        }, 60_000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (wasSyncingRef.current && !isSyncing) {
            toast.success(t('sync.completeToast'))
        }
        wasSyncingRef.current = isSyncing
    }, [isSyncing, t])

    const lastSyncLabel = lastSyncedAt
        ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
              Math.round((lastSyncedAt - now) / 60_000),
              'minute'
          )
        : t('sync.never')

    return (
        <div className={cn('flex items-center gap-3 text-sm text-muted-foreground', className)}>
            {isSyncing && progress ? (
                <span className="flex items-center gap-2">
                    <Spinner />
                    {t('sync.syncing', { current: progress.current, total: progress.total })}
                </span>
            ) : (
                <span>{t('sync.lastSynced', { time: lastSyncLabel })}</span>
            )}
            <Button
                aria-label={t('sync.resyncAriaLabel')}
                disabled={isLoading}
                onClick={onResync}
                size="sm"
                variant="secondary"
            >
                <RefreshCw aria-hidden="true" className={cn(isLoading && 'animate-spin')} size={12} />
                {t('sync.resync')}
            </Button>
        </div>
    )
}
