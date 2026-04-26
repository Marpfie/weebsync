import { useNavigate } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect } from 'react'

import { useAuth } from '../../hooks/useAuth'
import { useRecommendations } from '../../hooks/useRecommendations'
import { MediaRecsPage } from '../recommendations/MediaRecsPage'

export const AnimePage: FC = () => {
    const { token } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) void navigate({ to: '/' })
    }, [token, navigate])

    const { animeRecs, friendProgress, isLoadingBase, isLoadingFriends, isSyncing, lastSyncedAt, resync } =
        useRecommendations()

    return (
        <MediaRecsPage
            friendProgress={friendProgress.anime}
            isLoading={isLoadingBase || isLoadingFriends}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            mediaType="ANIME"
            onResync={resync}
            recs={animeRecs}
        />
    )
}
