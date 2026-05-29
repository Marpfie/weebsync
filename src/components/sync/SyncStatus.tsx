import { RefreshCw } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

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

    useEffect(() => {
        const id = setInterval(() => {
            setNow(Date.now())
        }, 60_000)
        return () => {
            clearInterval(id)
        }
    }, [])

    const lastSyncLabel = lastSyncedAt
        ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
              Math.round((lastSyncedAt - now) / 60_000),
              'minute'
          )
        : t('sync.never')

    return (
        <div className={cn('flex items-center gap-3 text-sm text-muted-foreground', className)}>
            {isSyncing && progress ? (
                <span>{t('sync.syncing', { current: progress.current, total: progress.total })}</span>
            ) : (
                <span>{t('sync.lastSynced', { time: lastSyncLabel })}</span>
            )}
            <button
                aria-label={t('sync.resyncAriaLabel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 bg-secondary text-foreground"
                disabled={isLoading}
                onClick={onResync}
                type="button"
            >
                <RefreshCw aria-hidden="true" className={cn(isLoading && 'animate-spin')} size={12} />
                {t('sync.resync')}
            </button>
        </div>
    )
}
