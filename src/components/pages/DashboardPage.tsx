import { useNavigate } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'
import { useRecommendations } from '../../hooks/useRecommendations'
import { MediaCard } from '../media/MediaCard'
import { SyncStatus } from '../sync/SyncStatus'
import { MediaCardSkeleton } from '../ui/Skeleton'

export const DashboardPage: FC = () => {
    const { t } = useTranslation()
    const { token } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) void navigate({ to: '/' })
    }, [token, navigate])

    const {
        animeRecs,
        following,
        friendProgress,
        isLoadingBase,
        isLoadingFriends,
        isSyncing,
        lastSyncedAt,
        mangaRecs,
        resync,
    } = useRecommendations()

    const topAnime = animeRecs.slice(0, 6)
    const topManga = mangaRecs.slice(0, 6)
    const backlogAnime = animeRecs.filter((r) => r.isInPlanList).slice(0, 3)
    const backlogManga = mangaRecs.filter((r) => r.isInPlanList).slice(0, 3)

    const skeletons = Array.from({ length: 3 }, (_, index) => index)

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-10">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        {t('dashboard.subtitle', { count: following.length })}
                    </p>
                </div>
                <SyncStatus
                    isLoading={isLoadingFriends}
                    isSyncing={isSyncing}
                    lastSyncedAt={lastSyncedAt}
                    onResync={resync}
                    progress={friendProgress.anime}
                />
            </div>

            {/* Top backlog picks */}
            {(backlogAnime.length > 0 || backlogManga.length > 0) && (
                <section aria-labelledby="backlog-heading">
                    <h2 className="text-lg font-semibold mb-4" id="backlog-heading">
                        {t('dashboard.backlogPicks')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[...backlogAnime, ...backlogManga].slice(0, 6).map((rec) => (
                            <MediaCard key={rec.mediaId} rec={rec} />
                        ))}
                    </div>
                </section>
            )}

            {/* Anime section */}
            <section aria-labelledby="anime-heading">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold" id="anime-heading">
                        {t('dashboard.topAnime')}
                    </h2>
                    <a className="text-sm transition-colors text-primary" href="/anime">
                        {t('dashboard.seeAll')}
                    </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isLoadingBase
                        ? skeletons.map((n) => <MediaCardSkeleton key={n} />)
                        : topAnime.map((rec) => <MediaCard key={rec.mediaId} rec={rec} />)}
                    {!isLoadingBase && topAnime.length === 0 && (
                        <p className="col-span-3 text-sm py-6 text-center text-muted-foreground/60">
                            {t('dashboard.noAnime')}
                        </p>
                    )}
                </div>
            </section>

            {/* Manga section */}
            <section aria-labelledby="manga-heading">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold" id="manga-heading">
                        {t('dashboard.topManga')}
                    </h2>
                    <a className="text-sm transition-colors text-primary" href="/manga">
                        {t('dashboard.seeAll')}
                    </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isLoadingBase
                        ? skeletons.map((n) => <MediaCardSkeleton key={n} />)
                        : topManga.map((rec) => <MediaCard key={rec.mediaId} rec={rec} />)}
                    {!isLoadingBase && topManga.length === 0 && (
                        <p className="col-span-3 text-sm py-6 text-center text-muted-foreground/60">
                            {t('dashboard.noManga')}
                        </p>
                    )}
                </div>
            </section>
        </div>
    )
}
