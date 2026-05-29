import { useQuery } from '@apollo/client/react'
import { useEffect } from 'react'

import { ViewerDocument } from '../gql/graphql'
import { useAuth } from '../hooks/useAuth'
import { setAuthedIdentity } from '../store/identity'

/**
 * Fetches the authenticated user's profile and mirrors it into `AuthContext.user`
 */
export const useViewer = () => {
    const { setUser, token } = useAuth()
    const result = useQuery(ViewerDocument, { skip: !token })

    useEffect(() => {
        const v = result.data?.Viewer

        if (!v) {
            return
        }

        setUser({
            avatar: v.avatar ?? null,
            id: v.id,
            name: v.name,
            siteUrl: v.siteUrl ?? null,
        })
        setAuthedIdentity({
            avatarUrl: v.avatar?.medium ?? null,
            name: v.name,
            userId: v.id,
        })
    }, [result.data, setUser])

    return result
}
