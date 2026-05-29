import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { RecommendationsGrid } from '../components/recommendations/RecommendationsGrid'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { requireIdentity } from '../lib/route-guards'
import { setPreference, usePreferences } from '../store/preferences'
import { useRecommendationsStore } from '../store/recommendationsStore'

const TOP_PER_SECTION = 6

const Dashboard = () => {
    const { t } = useTranslation()
    const prefs = usePreferences()
    const recs = useRecommendationsStore()

    const animeBacklog = recs.anime.filter((r) => r.isInPlanList || r.isAlreadyStarted).slice(0, TOP_PER_SECTION)
    const animeNew = recs.anime.filter((r) => !r.isInPlanList && !r.isAlreadyStarted).slice(0, TOP_PER_SECTION)
    const mangaBacklog = recs.manga.filter((r) => r.isInPlanList || r.isAlreadyStarted).slice(0, TOP_PER_SECTION)
    const mangaNew = recs.manga.filter((r) => !r.isInPlanList && !r.isAlreadyStarted).slice(0, TOP_PER_SECTION)

    const someDisabled = !prefs.syncAnime || !prefs.syncManga
    const disabledKey: 'syncAnime' | 'syncManga' = prefs.syncAnime ? 'syncManga' : 'syncAnime'
    const disabledContext = { context: prefs.syncAnime ? 'manga' : 'anime' }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-10">
            <div>
                <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                    {t('dashboard.subtitle', { count: recs.following.length })}
                </p>
            </div>

            {someDisabled && (
                <Alert>
                    <AlertTitle>{t('dashboard.partialSyncTitle')}</AlertTitle>
                    <AlertDescription>{t('dashboard.partialSyncBody', disabledContext)}</AlertDescription>
                    <AlertAction>
                        <Button
                            onClick={() => {
                                setPreference(disabledKey, true)
                            }}
                            size="sm"
                        >
                            {t('dashboard.partialSyncEnable', disabledContext)}
                        </Button>
                    </AlertAction>
                </Alert>
            )}

            {prefs.syncAnime && (
                <>
                    {animeBacklog.length > 0 && (
                        <section aria-labelledby="anime-backlog-heading">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" id="anime-backlog-heading">
                                    {t('dashboard.animeBacklog')}
                                </h2>
                                <Link
                                    className="text-sm transition-colors text-primary"
                                    search={{ status: 'backlog' }}
                                    to="/anime"
                                >
                                    {t('dashboard.seeAll')}
                                </Link>
                            </div>
                            <RecommendationsGrid
                                isLoading={recs.isLoadingBase}
                                mediaType="ANIME"
                                mode={prefs.recommendationMode}
                                recs={animeBacklog}
                                skeletonCount={3}
                            />
                        </section>
                    )}
                    {animeNew.length > 0 && (
                        <section aria-labelledby="anime-new-heading">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" id="anime-new-heading">
                                    {t('dashboard.animeNew')}
                                </h2>
                                <Link
                                    className="text-sm transition-colors text-primary"
                                    search={{ status: 'new' }}
                                    to="/anime"
                                >
                                    {t('dashboard.seeAll')}
                                </Link>
                            </div>
                            <RecommendationsGrid
                                emptyMessage={t('dashboard.noAnime')}
                                isLoading={recs.isLoadingBase}
                                mediaType="ANIME"
                                mode={prefs.recommendationMode}
                                recs={animeNew}
                                skeletonCount={3}
                            />
                        </section>
                    )}
                </>
            )}

            {prefs.syncManga && (
                <>
                    {mangaBacklog.length > 0 && (
                        <section aria-labelledby="manga-backlog-heading">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" id="manga-backlog-heading">
                                    {t('dashboard.mangaBacklog')}
                                </h2>
                                <Link
                                    className="text-sm transition-colors text-primary"
                                    search={{ status: 'backlog' }}
                                    to="/manga"
                                >
                                    {t('dashboard.seeAll')}
                                </Link>
                            </div>
                            <RecommendationsGrid
                                isLoading={recs.isLoadingBase}
                                mediaType="MANGA"
                                mode={prefs.recommendationMode}
                                recs={mangaBacklog}
                                skeletonCount={3}
                            />
                        </section>
                    )}
                    {mangaNew.length > 0 && (
                        <section aria-labelledby="manga-new-heading">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" id="manga-new-heading">
                                    {t('dashboard.mangaNew')}
                                </h2>
                                <Link
                                    className="text-sm transition-colors text-primary"
                                    search={{ status: 'new' }}
                                    to="/manga"
                                >
                                    {t('dashboard.seeAll')}
                                </Link>
                            </div>
                            <RecommendationsGrid
                                emptyMessage={t('dashboard.noManga')}
                                isLoading={recs.isLoadingBase}
                                mediaType="MANGA"
                                mode={prefs.recommendationMode}
                                recs={mangaNew}
                                skeletonCount={3}
                            />
                        </section>
                    )}
                </>
            )}
        </div>
    )
}

export const Route = createFileRoute('/dashboard')({ beforeLoad: requireIdentity, component: Dashboard })
