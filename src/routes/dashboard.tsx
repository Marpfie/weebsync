import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { RecommendationsGrid } from '../components/recommendations/RecommendationsGrid'
import { SyncStatus } from '../components/sync/SyncStatus'
import { useRecommendations } from '../hooks/useRecommendations'
import { requireAuth } from '../lib/route-guards'
import { usePreferences } from '../store/preferences'

const TOP_PER_SECTION = 6
const BACKLOG_PER_TYPE = 3

const Dashboard = () => {
    const { t } = useTranslation()
    const { recommendationMode } = usePreferences()
    const recs = useRecommendations()

    const topAnime = recs.anime.slice(0, TOP_PER_SECTION)
    const topManga = recs.manga.slice(0, TOP_PER_SECTION)
    const backlog = [
        ...recs.anime.filter((r) => r.isInPlanList).slice(0, BACKLOG_PER_TYPE),
        ...recs.manga.filter((r) => r.isInPlanList).slice(0, BACKLOG_PER_TYPE),
    ].slice(0, TOP_PER_SECTION)

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-10">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        {t('dashboard.subtitle', { count: recs.following.length })}
                    </p>
                </div>
                <SyncStatus
                    isLoading={recs.isLoadingFriends}
                    isSyncing={recs.isSyncing}
                    lastSyncedAt={recs.lastSyncedAt}
                    onResync={recs.resync}
                    progress={recs.friendProgress.anime}
                />
            </div>

            {backlog.length > 0 && (
                <section aria-labelledby="backlog-heading">
                    <h2 className="text-lg font-semibold mb-4" id="backlog-heading">
                        {t('dashboard.backlogPicks')}
                    </h2>
                    <RecommendationsGrid mediaType="ANIME" mode={recommendationMode} recs={backlog} />
                </section>
            )}

            <section aria-labelledby="anime-heading">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold" id="anime-heading">
                        {t('dashboard.topAnime')}
                    </h2>
                    <a className="text-sm transition-colors text-primary" href="/anime">
                        {t('dashboard.seeAll')}
                    </a>
                </div>
                <RecommendationsGrid
                    emptyMessage={t('dashboard.noAnime')}
                    isLoading={recs.isLoadingBase}
                    mediaType="ANIME"
                    mode={recommendationMode}
                    recs={topAnime}
                    skeletonCount={3}
                />
            </section>

            <section aria-labelledby="manga-heading">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold" id="manga-heading">
                        {t('dashboard.topManga')}
                    </h2>
                    <a className="text-sm transition-colors text-primary" href="/manga">
                        {t('dashboard.seeAll')}
                    </a>
                </div>
                <RecommendationsGrid
                    emptyMessage={t('dashboard.noManga')}
                    isLoading={recs.isLoadingBase}
                    mediaType="MANGA"
                    mode={recommendationMode}
                    recs={topManga}
                    skeletonCount={3}
                />
            </section>
        </div>
    )
}

export const Route = createFileRoute('/dashboard')({ beforeLoad: requireAuth, component: Dashboard })
