import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { persistCache } from 'apollo3-cache-persist'

import { getToken } from './anilist-auth'

const cache = new InMemoryCache()

const authLink = new ApolloLink((operation, forward) => {
    const token = getToken()

    operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    }))

    return forward(operation)
})

// Always route through a same-origin proxy path (/anilist) so the browser can
// read 429 responses — AniList omits CORS headers on errors, making them
// opaque if fetched cross-origin. In dev Vite proxies this; in production nginx does.
const httpLink = new HttpLink({ uri: '/anilist' })

const CACHE_KEY = 'apollo-cache-persist'

/**
 * sessionStorage-backed storage for apollo3-cache-persist.
 *
 * Handles QuotaExceededError by evicting the stale snapshot and retrying once
 * with the current data. If the fresh data is itself too large the write is
 * silently dropped.
 */
const quotaSafeSessionStorage = {
    getItem: (key: string) => globalThis.sessionStorage.getItem(key),
    removeItem: (key: string) => {
        globalThis.sessionStorage.removeItem(key)
    },
    setItem: (key: string, value: string) => {
        try {
            globalThis.sessionStorage.setItem(key, value)
        } catch (error) {
            const isQuota =
                error instanceof DOMException &&
                (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            if (!isQuota) throw error

            // Evict the stale snapshot and retry with fresh data
            globalThis.sessionStorage.removeItem(key)
            try {
                globalThis.sessionStorage.setItem(key, value)
            } catch {
                // Still too large, in-memory cache continues working without persistence
            }
        }
    },
}

export async function initApollo() {
    await persistCache({
        cache,
        key: CACHE_KEY,
        maxSize: 4_194_304,
        storage: quotaSafeSessionStorage,
    })

    return new ApolloClient({
        cache,
        defaultOptions: {
            watchQuery: {
                // Show cached data immediately, refresh in the background
                fetchPolicy: 'cache-and-network',
            },
        },
        link: ApolloLink.from([authLink, httpLink]),
    })
}
