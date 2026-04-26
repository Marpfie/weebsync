import { useQuery } from '@apollo/client/react'

import { UserMediaListsDocument } from '../documents'
import type { MediaType } from '../gql/graphql'

export const useUserLists = (userId: null | number | undefined, type: MediaType) => {
    return useQuery(UserMediaListsDocument, {
        skip: !userId,
        variables: { type, userId: userId ?? 0 },
    })
}
