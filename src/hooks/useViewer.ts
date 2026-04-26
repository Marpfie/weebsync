import { useQuery } from '@apollo/client/react'
import { useEffect } from 'react'

import { ViewerDocument } from '../documents'
import { useAuth } from './useAuth'

export const useViewer = () => {
    const { setUser, token } = useAuth()
    const result = useQuery(ViewerDocument, { skip: !token })

    useEffect(() => {
        if (result.data?.Viewer) {
            const v = result.data.Viewer
            setUser({
                avatar: v.avatar ?? null,
                id: v.id,
                name: v.name,
                siteUrl: v.siteUrl ?? null,
            })
        }
    }, [result.data, setUser])

    return result
}
