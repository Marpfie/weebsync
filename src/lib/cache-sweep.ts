/**
 * Drop friend / user-list cache entries older than the shared 24h TTL.
 * Called on every identity mutation (login, switch user, logout) so stale
 * data from previous accounts is reclaimed instead of accumulating silently.
 *
 * Sweeps both IndexedDB (current storage) and localStorage (legacy entries
 * from before the IDB migration). The localStorage pass is cheap and lets
 * us reclaim the 4-5 MB that pre-migration installs may still be holding.
 *
 * Per-userId targeted deletion is unnecessary — fresh public friend data is
 * valid regardless of who is logged in, and the TTL covers the rest.
 */

import { idbDelete, idbGet, idbKeys } from './idb'
import { CACHE_TTL_MS, STORAGE_KEYS } from './storage-keys'

interface MaybePayload {
    cachedAt?: number
}

const isCacheKey = (key: string) =>
    key.startsWith(STORAGE_KEYS.FRIEND_CACHE_PREFIX) || key.startsWith(STORAGE_KEYS.USER_LIST_CACHE_PREFIX)

const sweepLocalStorage = (now: number): void => {
    try {
        const keysToRemove: string[] = []
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index)
            if (!key || !isCacheKey(key)) continue

            const raw = localStorage.getItem(key)
            if (!raw) continue

            let cachedAt: number | undefined
            try {
                const parsed = JSON.parse(raw) as MaybePayload
                cachedAt = parsed.cachedAt
            } catch {
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

const sweepIdb = async (now: number): Promise<void> => {
    const all = await idbKeys()
    await Promise.all(
        all
            .filter((key) => isCacheKey(key))
            .map(async (key) => {
                const payload = await idbGet<MaybePayload>(key)
                if (!payload || typeof payload.cachedAt !== 'number' || now - payload.cachedAt >= CACHE_TTL_MS) {
                    await idbDelete(key)
                }
            })
    )
}

export const sweepStaleCaches = (now: number = Date.now()): void => {
    sweepLocalStorage(now)
    void sweepIdb(now)
}
