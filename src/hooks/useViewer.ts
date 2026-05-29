import { useQuery } from '@apollo/client/react'
import { useEffect } from 'react'

import { ViewerDocument } from '../gql/graphql'
import { useAuth } from '../hooks/useAuth'

/**
 * Fetches the authenticated user's profile and mirrors it into `AuthContext.user`
 * so non-Apollo consumers (navigation, etc.) can read it without a query.
 */
export const useViewer = () => {
    const { setUser, token } = useAuth()
    const result = useQuery(ViewerDocument, { skip: !token })

    useEffect(() => {
        const v = result.data?.Viewer
        if (!v) return
        setUser({
            avatar: v.avatar ?? null,
            id: v.id,
            name: v.name,
            siteUrl: v.siteUrl ?? null,
        })
    }, [result.data, setUser])

    return result
}
