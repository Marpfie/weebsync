import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useRecommendationView } from '../../hooks/useRecommendationView'
import type { MediaType, Recommendation } from '../../lib/recommendations'
import { usePreferences } from '../../store/preferences'
import { FilterBar } from '../recommendations/FilterBar'
import { SyncStatus } from '../sync/SyncStatus'
import { RecommendationsGrid } from './RecommendationsGrid'

interface MediaRecsPageProps {
    friendProgress?: { current: number; total: number }
    isLoading: boolean
    isSyncing?: boolean
    lastSyncedAt: null | number
    mediaType: MediaType
    onResync: () => void
    recs: readonly Recommendation[]
}

/**
 * Shared anime/manga page shell. Owns the SyncStatus + FilterBar layout and
 * delegates filter/dismiss state to `useRecommendationView` and rendering to
 * `RecommendationsGrid`. Anime and Manga routes are now one-liners around this.
 */
export const MediaRecsPage: FC<MediaRecsPageProps> = ({
    friendProgress,
    isLoading,
    isSyncing = false,
    lastSyncedAt,
    mediaType,
    onResync,
    recs,
}) => {
    const { t } = useTranslation()
    const { recommendationMode } = usePreferences()
    const view = useRecommendationView(recs, mediaType)
    const context = { context: mediaType.toLowerCase() }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold">{t(`recs.title_${mediaType.toLowerCase()}`)}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <SyncStatus
                        isLoading={isLoading}
                        isSyncing={isSyncing}
                        lastSyncedAt={lastSyncedAt}
                        onResync={onResync}
                        progress={friendProgress}
                    />
                    <FilterBar onBacklogToggle={view.setBacklogOnly} showBacklogOnly={view.backlogOnly} />
                </div>
            </div>

            {isLoading ? (
                <RecommendationsGrid isLoading mediaType={mediaType} recs={[]} />
            ) : (view.visible.length === 0 ? (
                <div className="rounded-xl py-16 text-center bg-card border border-border">
                    <p className="text-4xl mb-3">🌱</p>
                    <p className="font-medium">{t('recs.empty')}</p>
                    <p className="text-sm mt-1 text-muted-foreground">{t('recs.emptyDetail', context)}</p>
                </div>
            ) : (
                <>
                    {view.backlog.length > 0 && (
                        <section aria-labelledby="backlog-section">
                            <h2 className="text-base font-semibold mb-3 flex items-center gap-2" id="backlog-section">
                                <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-primary" />
                                {t('recs.fromBacklog')}
                            </h2>
                            <RecommendationsGrid
                                mediaType={mediaType}
                                mode={recommendationMode}
                                onDismiss={view.onDismiss}
                                recs={view.backlog}
                            />
                        </section>
                    )}
                    {view.discovery.length > 0 && (
                        <section aria-labelledby="new-section">
                            <h2 className="text-base font-semibold mb-3 flex items-center gap-2" id="new-section">
                                <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                                {t('recs.newDiscoveries')}
                            </h2>
                            <RecommendationsGrid
                                mediaType={mediaType}
                                mode={recommendationMode}
                                onDismiss={view.onDismiss}
                                recs={view.discovery}
                            />
                        </section>
                    )}
                </>
            ))}
        </div>
    )
}
