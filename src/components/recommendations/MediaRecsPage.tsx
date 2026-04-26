import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Recommendation, RecommendationMode } from '../../lib/recommendations'
import { dismissMedia, getPreferences } from '../../store/preferences'
import { MediaCard } from '../media/MediaCard'
import { FilterBar } from '../recommendations/FilterBar'
import { SyncStatus } from '../sync/SyncStatus'
import { MediaCardSkeleton } from '../ui/Skeleton'

interface MediaRecsPageProps {
    friendProgress?: { current: number; total: number }
    isLoading: boolean
    isSyncing?: boolean
    lastSyncedAt: null | number
    mediaType: 'ANIME' | 'MANGA'
    mode?: RecommendationMode
    onResync: () => void
    recs: Recommendation[]
}

export const MediaRecsPage: FC<MediaRecsPageProps> = ({
    friendProgress,
    isLoading,
    isSyncing = false,
    lastSyncedAt,
    mediaType,
    mode,
    onResync,
    recs,
}) => {
    const resolvedMode = mode ?? getPreferences().recommendationMode
    const { t } = useTranslation()
    const context = { context: mediaType.toLowerCase() }
    const title = t(`recs.title_${mediaType.toLowerCase()}`)

    const [backlogOnly, setBacklogOnly] = useState(false)
    const [dismissed, setDismissed] = useState<number[]>([])

    const sorted = useMemo(() => {
        let list = recs.filter((r) => !dismissed.includes(r.mediaId))
        if (backlogOnly) list = list.filter((r) => r.isInPlanList)
        return list
    }, [recs, backlogOnly, dismissed])

    const backlogRecs = sorted.filter((r) => r.isInPlanList)
    const discoveryRecs = sorted.filter((r) => !r.isInPlanList)

    const handleDismiss = (mediaId: number) => {
        dismissMedia(mediaId, mediaType)
        setDismissed((previous) => [...previous, mediaId])
    }

    const skeletons = Array.from({ length: 6 }, (_, index) => index)

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <SyncStatus
                        isLoading={isLoading}
                        isSyncing={isSyncing}
                        lastSyncedAt={lastSyncedAt}
                        onResync={onResync}
                        progress={friendProgress}
                    />
                    <FilterBar onBacklogToggle={setBacklogOnly} showBacklogOnly={backlogOnly} />
                </div>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {skeletons.map((key) => (
                        <MediaCardSkeleton key={key} />
                    ))}
                </div>
            )}

            {!isLoading && backlogRecs.length > 0 && (
                <section aria-labelledby="backlog-section">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2" id="backlog-section">
                        <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-primary" />
                        {t('recs.fromBacklog')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {backlogRecs.map((rec) => (
                            <MediaCard key={rec.mediaId} mode={resolvedMode} onDismiss={handleDismiss} rec={rec} />
                        ))}
                    </div>
                </section>
            )}

            {!isLoading && discoveryRecs.length > 0 && (
                <section aria-labelledby="new-section">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2" id="new-section">
                        <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                        {t('recs.newDiscoveries')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {discoveryRecs.map((rec) => (
                            <MediaCard key={rec.mediaId} mode={resolvedMode} onDismiss={handleDismiss} rec={rec} />
                        ))}
                    </div>
                </section>
            )}

            {!isLoading && sorted.length === 0 && (
                <div className="rounded-xl py-16 text-center bg-card border border-border">
                    <p className="text-4xl mb-3">🌱</p>
                    <p className="font-medium">{t('recs.empty')}</p>
                    <p className="text-sm mt-1 text-muted-foreground">{t('recs.emptyDetail', context)}</p>
                </div>
            )}
        </div>
    )
}
