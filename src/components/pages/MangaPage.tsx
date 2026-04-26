import { useNavigate } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect } from 'react'

import { useAuth } from '../../hooks/useAuth'
import { useRecommendations } from '../../hooks/useRecommendations'
import { MediaRecsPage } from '../recommendations/MediaRecsPage'

export const MangaPage: FC = () => {
    const { token } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) void navigate({ to: '/' })
    }, [token, navigate])

    const { friendProgress, isLoadingBase, isLoadingFriends, isSyncing, lastSyncedAt, mangaRecs, resync } =
        useRecommendations()

    return (
        <MediaRecsPage
            friendProgress={friendProgress.manga}
            isLoading={isLoadingBase || isLoadingFriends}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            mediaType="MANGA"
            onResync={resync}
            recs={mangaRecs}
        />
    )
}
