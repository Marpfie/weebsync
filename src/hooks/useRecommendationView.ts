import { useCallback, useMemo, useState } from 'react'

import type { MediaType, Recommendation } from '../lib/recommendations'
import { dismissMedia } from '../store/preferences'

export interface RecommendationView extends ViewState {
    /** Items currently in the user's PLANNING list. */
    backlog: Recommendation[]
    /** Items the user hasn't added yet. */
    discovery: Recommendation[]
    /** Persist + locally hide an item. */
    onDismiss: (mediaId: number) => void
    /** All visible items (after dismiss + backlog filters). */
    visible: Recommendation[]
}

interface ViewState {
    backlogOnly: boolean
    setBacklogOnly: (v: boolean) => void
}

/**
 * Per-page view state for a recommendation list: filter toggles, local dismiss
 * tracking (so a dismiss is reflected immediately, before the next render of
 * the parent), and the backlog/discovery split.
 *
 * Kept separate from `useRecommendations` so multiple pages can show different
 * filters of the same underlying list.
 */
export const useRecommendationView = (recs: readonly Recommendation[], mediaType: MediaType): RecommendationView => {
    const [backlogOnly, setBacklogOnly] = useState(false)
    const [localDismissed, setLocalDismissed] = useState<readonly number[]>([])

    const visible = useMemo(() => {
        const dismissedSet = new Set(localDismissed)
        let out = recs.filter((r) => !dismissedSet.has(r.mediaId))
        if (backlogOnly) out = out.filter((r) => r.isInPlanList)
        return out
    }, [recs, backlogOnly, localDismissed])

    const backlog = useMemo(() => visible.filter((r) => r.isInPlanList), [visible])
    const discovery = useMemo(() => visible.filter((r) => !r.isInPlanList), [visible])

    const onDismiss = useCallback(
        (mediaId: number) => {
            dismissMedia(mediaId, mediaType)
            setLocalDismissed((previous) => [...previous, mediaId])
        },
        [mediaType]
    )

    return { backlog, backlogOnly, discovery, onDismiss, setBacklogOnly, visible }
}
