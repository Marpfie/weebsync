/**
 * Centralised localStorage keys and shared cache constants. Anything that
 * touches `localStorage` should import its key from here so renames stay in
 * one place and the `weebsync_*` namespace can be swept reliably.
 *
 * Apollo's persisted cache key (`apollo-cache-persist-`) is intentionally
 * *not* in this file — it lives next to the Apollo client setup and is
 * managed by `apollo3-cache-persist`, not our own code paths.
 */

export const STORAGE_KEYS = {
    /** Per-friend (friendId, mediaType) media-list cache. Keyed `weebsync_friend_<friendId>_<type>`.
     *  Global across viewers — anyone who follows the same friend reuses the entry. */
    FRIEND_CACHE_PREFIX: 'weebsync_friend_',
    /**
     * Legacy per-viewer friend cache prefix. Pre-IDB-migration and pre-per-friend
     * refactor entries lived here, both in localStorage and (briefly) in IDB.
     * Kept around so `sweepStaleCaches` can reclaim them on upgrade.
     */
    FRIEND_CACHE_PREFIX_LEGACY: 'weebsync_fcache_',
    /** Current identity (guest or authed). Single entry. */
    IDENTITY: 'weebsync_identity',
    /** User preferences (filters, sync toggles, exclusions). Single entry. */
    PREFERENCES: 'weebsync_prefs',
    /** OAuth access token. Single entry. */
    TOKEN: 'weebsync_token',
    /** Logged-in user's own media-list cache. Keyed `weebsync_ulcache_<userId>_<type>`. */
    USER_LIST_CACHE_PREFIX: 'weebsync_ulcache_',
}

/** Shared TTL for friendCache and userListCache. 24 hours. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000
