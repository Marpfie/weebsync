import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import { requireIdentity } from '../lib/route-guards'
import { useRecommendationsStore } from '../store/recommendationsStore'

const MangaPage = () => {
    const { isLoadingBase, isLoadingFriends, manga } = useRecommendationsStore()
    return <MediaRecsPage isLoading={isLoadingBase || isLoadingFriends} mediaType="MANGA" recs={manga} />
}

export const Route = createFileRoute('/manga')({ beforeLoad: requireIdentity, component: MangaPage })
