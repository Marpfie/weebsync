import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { RecommendationsGrid } from '../components/recommendations/RecommendationsGrid'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { requireIdentity } from '../lib/route-guards'
import { setPreference, usePreferences } from '../store/preferences'
import { useRecommendationsStore } from '../store/recommendationsStore'

const TOP_PER_SECTION = 6
const BACKLOG_PER_TYPE = 3

const Dashboard = () => {
    const { t } = useTranslation()
    const prefs = usePreferences()
    const recs = useRecommendationsStore()

    const topAnime = recs.anime.slice(0, TOP_PER_SECTION)
    const topManga = recs.manga.slice(0, TOP_PER_SECTION)
    const backlog = [
        ...recs.anime.filter((r) => r.isInPlanList).slice(0, BACKLOG_PER_TYPE),
        ...recs.manga.filter((r) => r.isInPlanList).slice(0, BACKLOG_PER_TYPE),
    ].slice(0, TOP_PER_SECTION)

    const bothEnabled = prefs.syncAnime && prefs.syncManga
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

            {bothEnabled && backlog.length > 0 && (
                <section aria-labelledby="backlog-heading">
                    <h2 className="text-lg font-semibold mb-4" id="backlog-heading">
                        {t('dashboard.backlogPicks')}
                    </h2>
                    <RecommendationsGrid mediaType="ANIME" mode={prefs.recommendationMode} recs={backlog} />
                </section>
            )}

            {prefs.syncAnime && (
                <section aria-labelledby="anime-heading">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold" id="anime-heading">
                            {t('dashboard.topAnime')}
                        </h2>
                        <Link className="text-sm transition-colors text-primary" to="/anime">
                            {t('dashboard.seeAll')}
                        </Link>
                    </div>
                    <RecommendationsGrid
                        emptyMessage={t('dashboard.noAnime')}
                        isLoading={recs.isLoadingBase}
                        mediaType="ANIME"
                        mode={prefs.recommendationMode}
                        recs={topAnime}
                        skeletonCount={3}
                    />
                </section>
            )}

            {prefs.syncManga && (
                <section aria-labelledby="manga-heading">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold" id="manga-heading">
                            {t('dashboard.topManga')}
                        </h2>
                        <Link className="text-sm transition-colors text-primary" to="/manga">
                            {t('dashboard.seeAll')}
                        </Link>
                    </div>
                    <RecommendationsGrid
                        emptyMessage={t('dashboard.noManga')}
                        isLoading={recs.isLoadingBase}
                        mediaType="MANGA"
                        mode={prefs.recommendationMode}
                        recs={topManga}
                        skeletonCount={3}
                    />
                </section>
            )}
        </div>
    )
}

export const Route = createFileRoute('/dashboard')({ beforeLoad: requireIdentity, component: Dashboard })
