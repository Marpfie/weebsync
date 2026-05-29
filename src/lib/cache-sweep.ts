/**
 * Drop friend / user-list cache entries older than the shared 24h TTL.
 * Called on every identity mutation (login, switch user, logout) so stale
 * data from previous accounts is reclaimed instead of accumulating silently.
 *
 * Per-userId targeted deletion is unnecessary — fresh public friend data is
 * valid regardless of who is logged in, and the TTL covers the rest.
 */

import { CACHE_TTL_MS, STORAGE_KEYS } from './storage-keys'

interface MaybePayload {
    cachedAt?: number
}

export const sweepStaleCaches = (now: number = Date.now()): void => {
    try {
        const keysToRemove: string[] = []

        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index)
            if (!key) continue
            if (
                !key.startsWith(STORAGE_KEYS.FRIEND_CACHE_PREFIX) &&
                !key.startsWith(STORAGE_KEYS.USER_LIST_CACHE_PREFIX)
            )
                continue

            const raw = localStorage.getItem(key)
            if (!raw) continue

            let cachedAt: number | undefined
            try {
                const parsed = JSON.parse(raw) as MaybePayload
                cachedAt = parsed.cachedAt
            } catch {
                // Corrupt entry — drop it.
                keysToRemove.push(key)
                continue
            }

            if (typeof cachedAt !== 'number' || now - cachedAt >= CACHE_TTL_MS) {
                keysToRemove.push(key)
            }
        }

        for (const key of keysToRemove) localStorage.removeItem(key)
    } catch {
        // localStorage unavailable — nothing to sweep.
    }
}
