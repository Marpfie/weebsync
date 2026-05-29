import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import type { StatusFilter } from '../hooks/useRecommendationView'
import { requireIdentity } from '../lib/route-guards'
import { useRecommendationsStore } from '../store/recommendationsStore'

const MangaPage = () => {
    const { isLoadingBase, isLoadingFriends, manga } = useRecommendationsStore()
    const { status } = Route.useSearch()
    return (
        <MediaRecsPage
            initialStatus={status}
            isLoading={isLoadingBase || isLoadingFriends}
            mediaType="MANGA"
            recs={manga}
        />
    )
}

export const Route = createFileRoute('/manga')({
    beforeLoad: requireIdentity,
    component: MangaPage,
    validateSearch: (search): { status?: StatusFilter } => ({
        status: ['all', 'backlog', 'new'].includes(search['status'] as string)
            ? (search['status'] as StatusFilter)
            : undefined,
    }),
})
