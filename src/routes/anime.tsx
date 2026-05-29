import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import type { StatusFilter } from '../hooks/useRecommendationView'
import { requireIdentity } from '../lib/route-guards'
import { useRecommendationsStore } from '../store/recommendationsStore'

const AnimePage = () => {
    const { anime, isLoadingBase, isLoadingFriends } = useRecommendationsStore()
    const { status } = Route.useSearch()
    return (
        <MediaRecsPage
            initialStatus={status}
            isLoading={isLoadingBase || isLoadingFriends}
            mediaType="ANIME"
            recs={anime}
        />
    )
}

export const Route = createFileRoute('/anime')({
    beforeLoad: requireIdentity,
    component: AnimePage,
    validateSearch: (search): { status?: StatusFilter } => ({
        status: ['all', 'backlog', 'new'].includes(search['status'] as string)
            ? (search['status'] as StatusFilter)
            : undefined,
    }),
})
