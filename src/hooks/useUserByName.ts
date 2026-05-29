import { useQuery } from '@apollo/client/react'

import { UserByNameDocument, type UserByNameQuery } from '../gql/graphql'

interface UseUserByNameResult {
    data: null | undefined | UserByNameQuery['User']
    error: Error | null
    loading: boolean
}

/**
 * Looks up an AniList user by exact-ish username. Used by the landing page to
 * show an avatar preview before the user commits.
 */
export const useUserByName = (name: string): UseUserByNameResult => {
    const trimmed = name.trim()

    const { data, error, loading } = useQuery(UserByNameDocument, {
        fetchPolicy: 'cache-first',
        skip: trimmed.length === 0,
        variables: { name: trimmed },
    })

    return { data: data?.User, error: error ?? null, loading }
}
