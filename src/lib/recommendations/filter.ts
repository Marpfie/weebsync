import type { FriendRating, UserMediaEntry } from './types'

/** Statuses that mark a media item as "off the table" for the current user. */
const COMPLETED_USER_STATUSES = new Set(['COMPLETED', 'DROPPED'])

/** Statuses that count as "already started" — relevant for the in-progress badge. */
const IN_PROGRESS_USER_STATUSES = new Set(['CURRENT', 'PAUSED', 'REPEATING'])

export const isUserConsumed = (status: string | undefined): boolean => COMPLETED_USER_STATUSES.has(status ?? '')

export const isUserInProgress = (status: string | undefined): boolean => IN_PROGRESS_USER_STATUSES.has(status ?? '')

/**
 * Filters raw friend entries down to the set that should influence scoring:
 * - drops excluded friends
 * - keeps `COMPLETED` always; keeps `CURRENT` when the per-format toggle is on
 * - keeps any additional statuses (PAUSED / DROPPED / REPEATING) the user opted into
 *
 * Scoring threshold (`minScoreThreshold`) is applied later — this keeps the
 * "watched but unrated" entries available for watch-count calculation.
 */
export const filterFriendRatings = (
    ratings: readonly FriendRating[],
    excludedFriendIds: readonly number[],
    includeCurrentFriendEntries: boolean,
    additionalStatuses: readonly string[] = []
): FriendRating[] => {
    const excluded = new Set(excludedFriendIds)
    const extra = new Set(additionalStatuses)
    return ratings.filter((r) => {
        if (excluded.has(r.friendId)) return false
        if (r.status === 'COMPLETED') return true
        if (r.status === 'CURRENT' && includeCurrentFriendEntries) return true
        if (extra.has(r.status)) return true
        return false
    })
}

/** Build O(1) lookup maps from the user's own list. */
export const indexUserEntries = (entries: readonly UserMediaEntry[]) => {
    const entryByMediaId = new Map<number, UserMediaEntry>()
    const statusByMediaId = new Map<number, string>()
    for (const entry of entries) {
        entryByMediaId.set(entry.mediaId, entry)
        statusByMediaId.set(entry.mediaId, entry.status ?? '')
    }
    return { entryByMediaId, statusByMediaId }
}
