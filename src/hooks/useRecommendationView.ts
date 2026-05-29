import { useCallback, useEffect, useMemo, useState } from 'react'

import { deriveFormatKey, type MediaType, type Recommendation } from '../lib/recommendations'
import { dismissMedia, usePreferences } from '../store/preferences'

const PAGE_SIZE = 24

export interface RecommendationView {
    /** True when more items beyond the current page are available. */
    canLoadMore: boolean
    loadMore: () => void
    /** Persist + locally hide an item. */
    onDismiss: (mediaId: number) => void
    setStatusFilter: (v: StatusFilter) => void
    statusFilter: StatusFilter
    totalVisible: number
    /** Visible items after all filters, truncated to the current page. */
    visible: Recommendation[]
    /** Same as `visible` but without pagination. */
    visibleAll: Recommendation[]
}

/** Which entries to show based on the user's list status. */
export type StatusFilter = 'all' | 'backlog' | 'new'

/**
 * Per-page view state for a recommendation list: status filter (all / backlog /
 * new), format/adult filters, local dismiss tracking, and "Load more" pagination.
 *
 * Uses a single unified list — no split into sections — so page boundaries are
 * always clean multiples of the 3-column grid.
 */
export const useRecommendationView = (recs: readonly Recommendation[], mediaType: MediaType): RecommendationView => {
    const prefs = usePreferences()
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [localDismissed, setLocalDismissed] = useState<readonly number[]>([])
    const [pageCount, setPageCount] = useState(1)

    const enabledFormats = mediaType === 'ANIME' ? prefs.enabledAnimeFormats : prefs.enabledMangaFormats

    const visibleAll = useMemo(() => {
        const dismissedSet = new Set(localDismissed)
        const formatSet = enabledFormats.length > 0 ? new Set(enabledFormats) : null
        const adultAllowed = prefs.includeAdultContent
        return recs.filter((r) => {
            if (dismissedSet.has(r.mediaId)) return false
            if (statusFilter === 'backlog' && !r.isInPlanList) return false
            if (statusFilter === 'new' && r.isInPlanList) return false
            if (formatSet) {
                const key = deriveFormatKey(r)
                if (!key || !formatSet.has(key)) return false
            }
            if (r.isAdult) {
                if (!adultAllowed) return false
                if (prefs.adultFilter === 'exclude') return false
            } else if (adultAllowed && prefs.adultFilter === 'only') {
                return false
            }
            return true
        })
    }, [recs, statusFilter, localDismissed, enabledFormats, prefs.adultFilter, prefs.includeAdultContent])

    const limit = pageCount * PAGE_SIZE
    const visible = useMemo(() => visibleAll.slice(0, limit), [visibleAll, limit])

    // Reset pagination whenever the effective list changes.
    useEffect(() => {
        // eslint-disable-next-line @eslint-react/set-state-in-effect, react-hooks/set-state-in-effect
        setPageCount(1)
    }, [recs, statusFilter, enabledFormats, prefs.adultFilter, prefs.includeAdultContent])

    const onDismiss = useCallback(
        (mediaId: number) => {
            dismissMedia(mediaId, mediaType)
            setLocalDismissed((previous) => [...previous, mediaId])
        },
        [mediaType]
    )

    const loadMore = useCallback(() => {
        setPageCount((p) => p + 1)
    }, [])

    return {
        canLoadMore: visibleAll.length > visible.length,
        loadMore,
        onDismiss,
        setStatusFilter,
        statusFilter,
        totalVisible: visibleAll.length,
        visible,
        visibleAll,
    }
}
