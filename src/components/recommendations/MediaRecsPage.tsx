import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useRecommendationView } from '../../hooks/useRecommendationView'
import type { MediaType, Recommendation } from '../../lib/recommendations'
import { setPreference, usePreferences } from '../../store/preferences'
import { FilterBar } from '../recommendations/FilterBar'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty'
import { RecommendationsGrid } from './RecommendationsGrid'

interface MediaRecsPageProps {
    isLoading: boolean
    mediaType: MediaType
    recs: readonly Recommendation[]
}

/**
 * Shared anime/manga page shell.
 * Shows an inline Alert when the user has the corresponding format toggled off.
 */
export const MediaRecsPage: FC<MediaRecsPageProps> = ({ isLoading, mediaType, recs }) => {
    const { t } = useTranslation()
    const prefs = usePreferences()
    const view = useRecommendationView(recs, mediaType)
    const context = { context: mediaType.toLowerCase() }

    const syncEnabled = mediaType === 'ANIME' ? prefs.syncAnime : prefs.syncManga
    const enableKey = mediaType === 'ANIME' ? 'syncAnime' : 'syncManga'

    if (!syncEnabled) {
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold">{t(`recs.title_${mediaType.toLowerCase()}`)}</h1>
                <Alert>
                    <AlertTitle>{t(`recs.disabledAlertTitle`, context)}</AlertTitle>
                    <AlertDescription>{t(`recs.disabledAlertBody`, context)}</AlertDescription>
                    <AlertAction>
                        <Button
                            onClick={() => {
                                setPreference(enableKey, true)
                            }}
                            size="sm"
                        >
                            {t('recs.enableSync', context)}
                        </Button>
                    </AlertAction>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold">{t(`recs.title_${mediaType.toLowerCase()}`)}</h1>
                <FilterBar onBacklogToggle={view.setBacklogOnly} showBacklogOnly={view.backlogOnly} />
            </div>

            {isLoading ? (
                <RecommendationsGrid isLoading mediaType={mediaType} recs={[]} />
            ) : (view.visible.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia>
                            <p className="text-4xl">🌱</p>
                        </EmptyMedia>
                        <EmptyTitle>{t('recs.empty')}</EmptyTitle>
                        <EmptyDescription>{t('recs.emptyDetail', context)}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
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
                                mode={prefs.recommendationMode}
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
                                mode={prefs.recommendationMode}
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
