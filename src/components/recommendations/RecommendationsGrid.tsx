import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaType, Recommendation, RecommendationMode } from '../../lib/recommendations'
import { MediaCard } from '../media/MediaCard'
import { MediaCardSkeleton } from '../ui/Skeleton'

interface RecommendationsGridProps {
    emptyMessage?: string
    isLoading?: boolean
    mediaType: MediaType
    mode?: RecommendationMode
    onDismiss?: (mediaId: number) => void
    recs: readonly Recommendation[]
    skeletonCount?: number
}

const placeholderKeys = (n: number) => Array.from({ length: n }, (_, index) => index)

/**
 * Responsive grid of `MediaCard`s with a skeleton-loading state and an empty
 * state. Used by Dashboard, Anime, and Manga pages — the styling lives here so
 * those callers don't drift apart.
 */
export const RecommendationsGrid: FC<RecommendationsGridProps> = ({
    emptyMessage,
    isLoading = false,
    mediaType,
    mode,
    onDismiss,
    recs,
    skeletonCount = 6,
}) => {
    const { t } = useTranslation()

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {placeholderKeys(skeletonCount).map((k) => (
                    <MediaCardSkeleton key={k} />
                ))}
            </div>
        )
    }

    if (recs.length === 0) {
        return (
            <p className="col-span-3 text-sm py-6 text-center text-muted-foreground/60">
                {emptyMessage ?? t('recs.empty')}
            </p>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recs.map((rec) => (
                <MediaCard key={`${mediaType}-${rec.mediaId}`} mode={mode} onDismiss={onDismiss} rec={rec} />
            ))}
        </div>
    )
}
