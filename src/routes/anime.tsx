import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import { useRecommendations } from '../hooks/useRecommendations'
import { requireAuth } from '../lib/route-guards'

const AnimePage = () => {
    const recs = useRecommendations()
    return (
        <MediaRecsPage
            friendProgress={recs.friendProgress.anime}
            isLoading={recs.isLoadingBase || recs.isLoadingFriends}
            isSyncing={recs.isSyncing}
            lastSyncedAt={recs.lastSyncedAt}
            mediaType="ANIME"
            onResync={recs.resync}
            recs={recs.anime}
        />
    )
}

export const Route = createFileRoute('/anime')({ beforeLoad: requireAuth, component: AnimePage })
