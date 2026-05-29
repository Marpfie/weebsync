import { createFileRoute } from '@tanstack/react-router'

import { MediaRecsPage } from '../components/recommendations/MediaRecsPage'
import { useRecommendations } from '../hooks/useRecommendations'
import { requireIdentity } from '../lib/route-guards'

const MangaPage = () => {
    const recs = useRecommendations()
    return (
        <MediaRecsPage
            friendProgress={recs.friendProgress.manga}
            isLoading={recs.isLoadingBase || recs.isLoadingFriends}
            isSyncing={recs.isSyncing}
            lastSyncedAt={recs.lastSyncedAt}
            mediaType="MANGA"
            onResync={recs.resync}
            recs={recs.manga}
        />
    )
}

export const Route = createFileRoute('/manga')({ beforeLoad: requireIdentity, component: MangaPage })
