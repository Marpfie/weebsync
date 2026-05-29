import { ArrowUp } from 'lucide-react'
import { type FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRecommendationView } from '../../hooks/useRecommendationView'
import type { StatusFilter } from '../../hooks/useRecommendationView'
import type { MediaType, Recommendation } from '../../lib/recommendations'
import { setPreference, usePreferences } from '../../store/preferences'
import { FilterBar } from '../recommendations/FilterBar'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty'
import { RecommendationsGrid } from './RecommendationsGrid'

interface MediaRecsPageProps {
    initialStatus?: StatusFilter
    isLoading: boolean
    mediaType: MediaType
    recs: readonly Recommendation[]
}

/**
 * Shared anime/manga page shell.
 * Shows an inline Alert when the user has the corresponding format toggled off.
 * Handles filter UI, "Load more" pagination, and a back-to-top floating button
 * wired to an IntersectionObserver sentinel (no scroll listener).
 */
export const MediaRecsPage: FC<MediaRecsPageProps> = ({ initialStatus, isLoading, mediaType, recs }) => {
    const { t } = useTranslation()
    const prefs = usePreferences()
    const view = useRecommendationView(recs, mediaType, initialStatus)
    const context = { context: mediaType.toLowerCase() }

    const syncEnabled = mediaType === 'ANIME' ? prefs.syncAnime : prefs.syncManga
    const enableKey = mediaType === 'ANIME' ? 'syncAnime' : 'syncManga'

    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const [showBackToTop, setShowBackToTop] = useState(false)
    useEffect(() => {
        const node = sentinelRef.current
        if (!node) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowBackToTop(!entry.isIntersecting)
            },
            { rootMargin: '0px', threshold: 0 }
        )
        observer.observe(node)
        return () => {
            observer.disconnect()
        }
    }, [])

    const scrollToTop = () => {
        const reduce = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
        const main = document.querySelector('main') ?? document.scrollingElement ?? document.documentElement
        main.scrollTo({ behavior: reduce ? 'auto' : 'smooth', top: 0 })
    }

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
            <div aria-hidden="true" ref={sentinelRef} />
            <div className="flex items-start justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold">{t(`recs.title_${mediaType.toLowerCase()}`)}</h1>
                <FilterBar
                    mediaType={mediaType}
                    onStatusChange={view.setStatusFilter}
                    statusFilter={view.statusFilter}
                />
            </div>

            {isLoading ? (
                <RecommendationsGrid isLoading mediaType={mediaType} recs={[]} />
            ) : (view.visibleAll.length === 0 ? (
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
                    <RecommendationsGrid
                        mediaType={mediaType}
                        mode={prefs.recommendationMode}
                        onDismiss={view.onDismiss}
                        recs={view.visible}
                    />

                    {view.canLoadMore && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={view.loadMore} variant="outline">
                                {t('recs.loadMore', {
                                    remaining: view.totalVisible - view.visible.length,
                                })}
                            </Button>
                        </div>
                    )}
                </>
            ))}

            {showBackToTop && (
                <Button
                    aria-label={t('recs.backToTop')}
                    className="fixed bottom-6 right-6 shadow-lg"
                    onClick={scrollToTop}
                    size="icon"
                    variant="secondary"
                >
                    <ArrowUp />
                </Button>
            )}
        </div>
    )
}
