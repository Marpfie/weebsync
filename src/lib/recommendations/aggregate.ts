import { normaliseScore } from './config'
import type { FriendRating, UserMediaEntry } from './types'

/**
 * Aggregated, deduplicated view of one media item's friend activity.
 * Produced by `groupByMedia` and consumed by scoring + reason building.
 */
export interface MediaAggregate {
    /** Friend IDs of everyone who watched/read (rated or not). */
    allWatchers: Set<number>
    /** Friend ratings deduplicated by friendId (highest score kept). */
    dedupedRatings: FriendRating[]
    /** Convenience: the deduped rating scores, normalised to 0–10. */
    normalisedScores: number[]
    /** Best-effort metadata for the media — from any matching friend entry. */
    sourceMeta: SourceMeta
}

/** Subset of media metadata derivable from a `FriendRating`. Shape matches `UserMediaEntry`. */
type SourceMeta = Pick<
    UserMediaEntry,
    'averageScore' | 'chapters' | 'coverMedium' | 'episodes' | 'format' | 'genres' | 'mediaStatus' | 'siteUrl' | 'title'
>

const buildSourceMeta = (r: FriendRating): SourceMeta => ({
    averageScore: r.averageScore ?? null,
    chapters: r.chapters ?? null,
    coverMedium: r.mediaCover ?? null,
    episodes: r.episodes ?? null,
    format: r.mediaFormat ?? null,
    genres: r.genres ?? null,
    mediaStatus: r.mediaStatus ?? null,
    siteUrl: r.siteUrl ?? null,
    title: r.mediaTitle ?? `Media #${r.mediaId}`,
})

/**
 * Groups raw friend ratings by mediaId, deduplicating per-friend (AniList allows
 * the same media to appear in multiple lists — counting it twice would inflate
 * `friendCount`). Only entries with `score >= threshold` contribute to the
 * rating set; everything qualifying counts toward `allWatchers`.
 */
export const groupByMedia = (
    ratings: readonly FriendRating[],
    minScoreThreshold: number
): Map<number, MediaAggregate> => {
    const out = new Map<number, MediaAggregate>()

    for (const r of ratings) {
        let agg = out.get(r.mediaId)
        if (!agg) {
            agg = {
                allWatchers: new Set(),
                dedupedRatings: [],
                normalisedScores: [],
                sourceMeta: buildSourceMeta(r),
            }
            out.set(r.mediaId, agg)
        }
        agg.allWatchers.add(r.friendId)
    }

    // Second pass: build the deduped rating set per media using only rated entries.
    const ratedOnly = ratings.filter((r) => r.score >= minScoreThreshold)
    const dedupBuffers = new Map<number, Map<number, FriendRating>>()

    for (const r of ratedOnly) {
        let perFriend = dedupBuffers.get(r.mediaId)
        if (!perFriend) {
            perFriend = new Map()
            dedupBuffers.set(r.mediaId, perFriend)
        }
        const existing = perFriend.get(r.friendId)
        if (!existing || r.score > existing.score) perFriend.set(r.friendId, r)
    }

    for (const [mediaId, perFriend] of dedupBuffers) {
        const agg = out.get(mediaId)
        if (!agg) continue
        const deduped = [...perFriend.values()]
        agg.dedupedRatings = deduped
        agg.normalisedScores = deduped.map((r) => normaliseScore(r.score))
    }

    return out
}

/** Standard deviation, or 0 for a sample of size ≤ 1. */
export const stddev = (values: readonly number[], mean: number): number => {
    if (values.length <= 1) return 0
    const variance = values.reduce((accumulator, v) => accumulator + (v - mean) ** 2, 0) / values.length
    return Math.sqrt(variance)
}

/** Sum of an array. Defined here so callers don't pull in lodash for one method. */
export const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0)
