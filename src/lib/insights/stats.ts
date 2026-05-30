/**
 * Pure stats helpers for the agreement and hipster/hater/conformist insights.
 *
 * All scores normalised to 0–10. Inputs are read-only arrays of paired numbers;
 * outputs are plain numbers (or null when there's not enough data).
 */

import type { FriendRating, UserMediaEntry } from '../recommendations'
import { normaliseScore } from '../recommendations/config'

/** Map of mediaId → rated 0–10 score. Excludes unrated entries (score 0). */
export type ScoreMap = ReadonlyMap<number, number>

/** Build a {mediaId → 0–10 score} map from rated entries only. */
export const toScoreMap = (ratings: readonly { mediaId: number; score: number }[]): ScoreMap => {
    const out = new Map<number, number>()
    for (const r of ratings) {
        if (r.score > 0) out.set(r.mediaId, normaliseScore(r.score))
    }
    return out
}

/** Same as `toScoreMap` but pulls from `UserMediaEntry[]`. */
export const userEntriesToScoreMap = (entries: readonly UserMediaEntry[]): ScoreMap => {
    const out = new Map<number, number>()
    for (const entry of entries) {
        if (typeof entry.score === 'number' && entry.score > 0) out.set(entry.mediaId, normaliseScore(entry.score))
    }
    return out
}

/** AniList community average map: mediaId → 0–10 score. */
export const toAniListMeanMap = (entries: readonly { averageScore?: null | number; mediaId: number }[]): ScoreMap => {
    const out = new Map<number, number>()
    for (const entry of entries) {
        const raw = entry.averageScore ?? null
        if (typeof raw === 'number') out.set(entry.mediaId, raw / 10)
    }
    return out
}

/** Pearson correlation coefficient on paired arrays. Returns null for N < 3. */
export const pearson = (xs: readonly number[], ys: readonly number[]): null | number => {
    const n = Math.min(xs.length, ys.length)
    if (n < 3) return null
    let sx = 0
    let sy = 0
    for (let index = 0; index < n; index++) {
        sx += xs[index]
        sy += ys[index]
    }
    const mx = sx / n
    const my = sy / n
    let number_ = 0
    let dx2 = 0
    let dy2 = 0
    for (let index = 0; index < n; index++) {
        const dx = xs[index] - mx
        const dy = ys[index] - my
        number_ += dx * dy
        dx2 += dx * dx
        dy2 += dy * dy
    }
    const denom = Math.sqrt(dx2 * dy2)
    if (denom === 0) return null
    return number_ / denom
}

export interface AgreementRow {
    /** Average signed delta (friend − user). Positive = friend rates higher than you. */
    avgDelta: null | number
    friendId: number
    /** Mean absolute difference across overlapping rated items. */
    meanAbsDiff: null | number
    /** Number of items both rated. */
    overlap: number
    /** Pearson correlation on overlapping items (null if N<3 or zero variance). */
    pearson: null | number
}

/**
 * For each friend, compute overlap + agreement stats against the user's ratings.
 * Pure: ratings + user map → stats rows.
 */
export const computeAgreement = (friendRatings: readonly FriendRating[], userScores: ScoreMap): AgreementRow[] => {
    if (userScores.size === 0) return []

    // Bucket ratings by friend.
    const byFriend = new Map<number, { friendScores: number[]; userScores: number[] }>()
    for (const r of friendRatings) {
        if (r.score <= 0) continue
        const userScore = userScores.get(r.mediaId)
        if (userScore === undefined) continue
        const fs = normaliseScore(r.score)
        let bucket = byFriend.get(r.friendId)
        if (!bucket) {
            bucket = { friendScores: [], userScores: [] }
            byFriend.set(r.friendId, bucket)
        }
        bucket.friendScores.push(fs)
        bucket.userScores.push(userScore)
    }

    const rows: AgreementRow[] = []
    for (const [friendId, { friendScores, userScores: us }] of byFriend) {
        const n = friendScores.length
        let sumDelta = 0
        let sumAbs = 0
        for (let index = 0; index < n; index++) {
            sumDelta += friendScores[index] - us[index]
            sumAbs += Math.abs(friendScores[index] - us[index])
        }
        rows.push({
            avgDelta: n > 0 ? sumDelta / n : null,
            friendId,
            meanAbsDiff: n > 0 ? sumAbs / n : null,
            overlap: n,
            pearson: pearson(friendScores, us),
        })
    }

    return rows
}

export interface PersonalityScore {
    /** Mean absolute deviation from AniList score. 0 = always agrees with crowd. */
    conformity: null | number
    /** Average signed deviation (friend − crowd). Positive = rates above crowd. */
    contrarianBias: null | number
    /** Mean deviation when rating BELOW the crowd (hater picks). */
    hater: null | number
    /** Mean deviation when rating ABOVE the crowd (hipster picks). */
    hipster: null | number
    /** Items considered (had both a friend rating and an AniList mean). */
    sampleSize: number
}

/**
 * Build a personality profile from a friend's ratings vs the AniList crowd.
 * Pure function over already-deduplicated ratings.
 */
export const computePersonality = (
    ratings: readonly { mediaId: number; score: number }[],
    anilistMeans: ScoreMap
): PersonalityScore => {
    let totalAbs = 0
    let totalSigned = 0
    let n = 0
    const aboveDeltas: number[] = []
    const belowDeltas: number[] = []

    for (const r of ratings) {
        if (r.score <= 0) continue
        const mean = anilistMeans.get(r.mediaId)
        if (mean === undefined) continue
        const fs = normaliseScore(r.score)
        const delta = fs - mean
        totalSigned += delta
        totalAbs += Math.abs(delta)
        n += 1
        if (delta > 0) aboveDeltas.push(delta)
        else if (delta < 0) belowDeltas.push(delta)
    }

    if (n === 0) {
        return { conformity: null, contrarianBias: null, hater: null, hipster: null, sampleSize: 0 }
    }

    return {
        conformity: totalAbs / n,
        contrarianBias: totalSigned / n,
        hater: meanOrNull(belowDeltas),
        hipster: meanOrNull(aboveDeltas),
        sampleSize: n,
    }
}

const meanOrNull = (xs: readonly number[]): null | number =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length

/**
 * Build per-friend personality scores from the full friend-ratings stream.
 * Deduplicates per-friend per-media (highest score wins) before computing.
 */
export const computePersonalityByFriend = (
    friendRatings: readonly FriendRating[],
    anilistMeans: ScoreMap
): Map<number, PersonalityScore> => {
    // Dedup per friend × media (multiple list entries possible).
    const byFriend = new Map<number, Map<number, number>>()
    for (const r of friendRatings) {
        if (r.score <= 0) continue
        let inner = byFriend.get(r.friendId)
        if (!inner) {
            inner = new Map()
            byFriend.set(r.friendId, inner)
        }
        const existing = inner.get(r.mediaId) ?? 0
        if (r.score > existing) inner.set(r.mediaId, r.score)
    }

    const out = new Map<number, PersonalityScore>()
    for (const [friendId, scoreMap] of byFriend) {
        const array = Array.from(scoreMap, ([mediaId, score]) => ({ mediaId, score }))
        out.set(friendId, computePersonality(array, anilistMeans))
    }
    return out
}
