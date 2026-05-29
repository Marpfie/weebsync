import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, ServerError } from '@apollo/client'
import { ErrorLink } from '@apollo/client/link/error'
import { persistCache } from 'apollo3-cache-persist'
import { toast } from 'sonner'

import { clearToken, getToken } from './anilist-auth'

/**
 * Stable type policies. Without these, Apollo cannot reliably cache the
 * `MediaListCollection` (no id in our query) or merge the paginated
 * `Page.following` list — both of which would force network refetches that
 * defeat the cache-first strategy in `defaultOptions` below.
 */
const cache = new InMemoryCache({
    typePolicies: {
        MediaList: {
            keyFields: ['id'],
        },
        MediaListCollection: {
            // No id in our query; embed inline under the parent query.
            keyFields: false,
        },
        MediaListGroup: {
            keyFields: false,
        },
        Page: {
            fields: {
                following: {
                    keyArgs: ['userId', 'sort'],
                    // Concatenate consecutive pages; resetting on page=1 keeps
                    // a fresh first request from doubling up on the cached list.
                    merge(existing: unknown[] = [], incoming: unknown[], options) {
                        const arguments_ = options.args as null | undefined | { page?: number }
                        const page = arguments_?.page ?? 1
                        return page <= 1 ? incoming : [...existing, ...incoming]
                    },
                },
            },
            // Page is a query wrapper, never standalone — don't normalize.
            keyFields: false,
        },
        User: {
            keyFields: ['id'],
        },
    },
})

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

// Direct request to AniList. Going through a proxy (dev or prod) would route
// every user's traffic through a single IP, sharing one rate-limit bucket
// across the whole user base. Cross-origin is fine: AniList's CORS allows it.
const httpLink = new HttpLink({ uri: 'https://graphql.anilist.co' })
const CACHE_KEY = 'apollo-cache-persist'

/**
 * Surface unrecoverable errors to the user. The rate-limiter handles 429
 * retries silently; this link only fires when those exhaust, when the auth
 * token is rejected, or when the network is unreachable. Per-friend 5xx
 * failures are handled in `useFriendLists` (preserves stale cache) and
 * intentionally don't toast here.
 */
let lastToastedKind: null | string = null
let lastToastAt = 0
const TOAST_DEDUP_MS = 5000

const toastOnce = (kind: string, fire: () => void): void => {
    const now = Date.now()
    if (lastToastedKind === kind && now - lastToastAt < TOAST_DEDUP_MS) return
    lastToastedKind = kind
    lastToastAt = now
    fire()
}

const errorLink = new ErrorLink(({ error, operation }) => {
    if (ServerError.is(error)) {
        if (error.statusCode === 401) {
            clearToken()
            toastOnce('auth', () => toast.error('Your AniList session expired. Please log in again.'))
            return
        }
        if (error.statusCode === 429) {
            toastOnce('rate-limit', () =>
                toast.error('AniList rate limit hit — please wait a moment before retrying.')
            )
            return
        }
        // Per-friend 5xx is handled with stale-data preservation; skip here.
        if (operation.operationName === 'FriendMediaLists') return
        toastOnce(`server-${error.statusCode}`, () =>
            toast.error(`AniList returned an error (${String(error.statusCode)}). Try again later.`)
        )
        return
    }

    if (error instanceof TypeError) {
        toastOnce('network', () => toast.error('Network error — check your connection and retry.'))
    }
})

/**
 * localStorage-backed storage for apollo3-cache-persist.
 *
 * Survives tab reloads. Handles QuotaExceededError by
 * evicting the stale snapshot and retrying once with the current data. If the
 * fresh data is itself too large the write is silently dropped and the in-memory
 * cache continues working without persistence.
 */
const quotaSafeLocalStorage = {
    getItem: (key: string) => globalThis.localStorage.getItem(key),
    removeItem: (key: string) => {
        globalThis.localStorage.removeItem(key)
    },
    setItem: (key: string, value: string) => {
        try {
            globalThis.localStorage.setItem(key, value)
        } catch (error) {
            const isQuota =
                error instanceof DOMException &&
                (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            if (!isQuota) throw error

            globalThis.localStorage.removeItem(key)
            try {
                globalThis.localStorage.setItem(key, value)
            } catch {
                // Still too large, drop the persisted snapshot silently.
            }
        }
    },
}

export async function initApollo() {
    await persistCache({
        cache,
        key: CACHE_KEY,
        maxSize: 4_194_304,
        storage: quotaSafeLocalStorage,
    })

    return new ApolloClient({
        cache,
        defaultOptions: {
            query: {
                fetchPolicy: 'cache-first',
            },
            watchQuery: {
                // Cache-first kills the background refetch storm that previously
                // fired on every route mount. Stale-while-revalidate semantics
                // are handled explicitly by `useRecommendationSync`.
                fetchPolicy: 'cache-first',
                nextFetchPolicy: 'cache-first',
            },
        },
        link: ApolloLink.from([errorLink, authLink, httpLink]),
    })
}
