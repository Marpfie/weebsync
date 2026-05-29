import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import { requireIdentity } from '../lib/route-guards'
import { useRecommendationsStore } from '../store/recommendationsStore'

const AnimePage = () => {
    const { anime, isLoadingBase, isLoadingFriends } = useRecommendationsStore()
    return <MediaRecsPage isLoading={isLoadingBase || isLoadingFriends} mediaType="ANIME" recs={anime} />
}

export const Route = createFileRoute('/anime')({ beforeLoad: requireIdentity, component: AnimePage })
