/**
 * Thin wrapper around `idb-keyval` so the rest of the app stays decoupled
 * from the storage layer. Backed by IndexedDB.
 *
 * Background: friend + user list snapshots for a heavy account (3k+ anime,
 * ~30 friends, full media metadata) blow past localStorage's ~5 MB quota,
 * which silently dropped the anime cache and forced a full network re-fetch
 * on every reload. IDB gives us ~hundreds of MB of headroom.
 */

import { createStore, del, get, keys, set } from 'idb-keyval'

const store = createStore('weebsync', 'kv')

export const idbGet = async <T>(key: string): Promise<T | undefined> => {
    try {
        return await get<T>(key, store)
    } catch {
        return undefined
    }
}

export const idbSet = async (key: string, value: unknown): Promise<boolean> => {
    try {
        await set(key, value, store)
        return true
    } catch {
        return false
    }
}

export const idbDelete = async (key: string): Promise<void> => {
    try {
        await del(key, store)
    } catch {
        // ignore
    }
}

export const idbKeys = async (): Promise<string[]> => {
    try {
        const all = await keys(store)
        return all.filter((k): k is string => typeof k === 'string')
    } catch {
        return []
    }
}
