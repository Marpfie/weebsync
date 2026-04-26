import type { MediaListStatus } from '../gql/graphql'

export interface FriendRating {
    averageScore?: null | number
    chapters?: null | number
    episodes?: null | number
    friendId: number
    genres?: (null | string)[] | null
    mediaCover?: null | string
    mediaFormat?: null | string
    mediaId: number
    mediaStatus?: null | string
    mediaTitle?: string
    score: number
    siteUrl?: null | string
    status: string
}

export type ReasonData =
    | { ratedCount: number; type: 'ratedOnly' }
    | { ratedCount: number; type: 'watchedAndRated'; watchCount: number }
    | { type: 'alreadyStarted' }
    | { type: 'inPlanList' }
    | { type: 'watchedNoRatings'; watchCount: number }

export interface Recommendation {
    /** AniList community average score (0–100), distinct from friend scores */
    anilistScore: null | number
    chapters: null | number
    coverColor: null | string
    coverLarge: null | string
    coverMedium: null | string
    episodes: null | number
    format: null | string
    /** Bayesian average blending AniList score with friend scores (0–10) */
    friendAvgScore: number
    /** Friends who gave an explicit score >= threshold */
    friendCount: number
    /** Pure average of friend scores (0–10), no AniList influence */
    friendRawAvg: null | number
    genres: (null | string)[] | null
    isAlreadyStarted: boolean
    isInPlanList: boolean
    mediaId: number
    mediaStatus: null | string
    mediaType: 'ANIME' | 'MANGA'
    reasons: ReasonData[]
    score: number
    season: null | string
    seasonYear: null | number
    siteUrl: null | string
    title: string
    /** Friends who completed/watched regardless of whether they rated it */
    watchCount: number
}

export type RecommendationMode = 'friend-favourites' | 'friends-only' | 'most-agreed'

export interface UserMediaEntry {
    averageScore: null | number
    chapters: null | number
    coverColor: null | string
    coverLarge: null | string
    coverMedium: null | string
    episodes: null | number
    format: null | string
    genres: (null | string)[] | null
    mediaId: number
    mediaStatus: null | string
    score: null | number | undefined
    season: null | string
    seasonYear: null | number
    siteUrl: null | string
    status: MediaListStatus | null | undefined
    title: string
    volumes: null | number
}

const PLAN_BONUS = 1.5 // added to rawScore (which is ~0–10 scale)
const MIN_SCORE_THRESHOLD = 6
/** How many "votes" the AniList community score is worth vs a single friend rating */
const BAYESIAN_WEIGHT = 3

//TODO shouldnt be necessary
const normalizeScore = (score: number) => (score > 10 ? score / 10 : score)

export const buildRecommendations = (
    userEntries: UserMediaEntry[],
    friendRatings: FriendRating[],
    excludedFriendIds: number[],
    dismissedIds: number[],
    mediaType: 'ANIME' | 'MANGA',
    mode: RecommendationMode,
    includeCurrentFriendEntries: boolean
): Recommendation[] => {
    const qualifyingStatus = (r: FriendRating) =>
        r.status === 'COMPLETED' || (includeCurrentFriendEntries && r.status === 'CURRENT')

    // All entries with a qualifying status, regardless of score - used for watchCount
    const activeEntries = friendRatings.filter((r) => !excludedFriendIds.includes(r.friendId) && qualifyingStatus(r))

    // Only entries with an explicit score above threshold - used for scoring
    const ratedEntries = activeEntries.filter((r) => r.score >= MIN_SCORE_THRESHOLD)

    const userStatusByMediaId = new Map<number, string>(userEntries.map((entry) => [entry.mediaId, entry.status ?? '']))
    const userEntryByMediaId = new Map<number, UserMediaEntry>(userEntries.map((entry) => [entry.mediaId, entry]))

    // Group by media: all watchers and rated-only watchers separately
    const watchersByMedia = new Map<number, Set<number>>()
    for (const r of activeEntries) {
        if (!watchersByMedia.has(r.mediaId)) watchersByMedia.set(r.mediaId, new Set())
        watchersByMedia.get(r.mediaId)?.add(r.friendId)
    }

    const ratedByMedia = new Map<number, FriendRating[]>()
    for (const r of ratedEntries) {
        if (!ratedByMedia.has(r.mediaId)) ratedByMedia.set(r.mediaId, [])
        ratedByMedia.get(r.mediaId)?.push(r)
    }

    // Normalise friend metadata into UserMediaEntry shape for media not in the user's list
    const friendMetaByMediaId = new Map<number, UserMediaEntry>()
    for (const r of activeEntries) {
        if (!friendMetaByMediaId.has(r.mediaId)) {
            friendMetaByMediaId.set(r.mediaId, {
                averageScore: r.averageScore ?? null,
                chapters: r.chapters ?? null,
                coverColor: null,
                coverLarge: null,
                coverMedium: r.mediaCover ?? null,
                episodes: r.episodes ?? null,
                format: r.mediaFormat ?? null,
                genres: r.genres ?? null,
                mediaId: r.mediaId,
                mediaStatus: r.mediaStatus ?? null,
                score: null,
                season: null,
                seasonYear: null,
                siteUrl: r.siteUrl ?? null,
                status: null,
                title: r.mediaTitle ?? `Media #${r.mediaId}`,
                volumes: null,
            })
        }
    }

    const results: Recommendation[] = []

    for (const [mediaId, watcherSet] of watchersByMedia.entries()) {
        if (dismissedIds.includes(mediaId)) continue

        const userStatus = userStatusByMediaId.get(mediaId)
        if (userStatus === 'COMPLETED' || userStatus === 'DROPPED') continue

        const isInPlanList = userStatus === 'PLANNING'
        const isAlreadyStarted = ['CURRENT', 'PAUSED', 'REPEATING'].includes(userStatus ?? '')

        const watchCount = watcherSet.size

        // Deduplicate ratings by friendId. AniList can place the same media in multiple
        // lists (e.g. "Completed" + a custom list), inflating friendScoreSum vs friendCount.
        // Keep the highest score per friend to avoid counting any friend twice.
        const rawRatings = ratedByMedia.get(mediaId) ?? []
        const uniqueRatingsMap = new Map<number, FriendRating>()

        for (const r of rawRatings) {
            const existing = uniqueRatingsMap.get(r.friendId)
            if (!existing || r.score > existing.score) uniqueRatingsMap.set(r.friendId, r)
        }

        const ratings = [...uniqueRatingsMap.values()]
        const friendCount = ratings.length

        const mediaEntry = userEntryByMediaId.get(mediaId) ?? friendMetaByMediaId.get(mediaId)
        const anilistScore = mediaEntry?.averageScore ?? null

        // Normalize to 0–10 scale (guards against stale cache data stored on 0–100 scale)
        const normalizedScores = ratings.map((r) => normalizeScore(r.score))

        const friendRawAvg = friendCount > 0 ? normalizedScores.reduce((a, b) => a + b, 0) / friendCount : null

        // Bayesian average: blend AniList community score (as prior) with friend scores
        // anilistScore is on 0–100 scale; friend/normalized scores are 0–10
        const anilistMean = (anilistScore ?? 75) / 10
        const friendScoreSum = normalizedScores.reduce((a, b) => a + b, 0)
        const bayesianAvg = (BAYESIAN_WEIGHT * anilistMean + friendScoreSum) / (BAYESIAN_WEIGHT + friendCount)

        const planBonus = isInPlanList ? PLAN_BONUS : 0

        // friend-favourites: Bayesian avg (AniList prior + friend scores) — surfaces quality picks
        // most-agreed:       friendCount × raw friend avg — surfaces consensus picks, no AniList influence
        // friends-only:      pure raw friend avg — completely ignores AniList community score
        let rawScore: number
        switch (mode) {
            case 'friend-favourites': {
                rawScore = bayesianAvg + planBonus
                break
            }
            case 'friends-only': {
                rawScore = (friendRawAvg ?? 0) + planBonus
                break
            }
            case 'most-agreed': {
                rawScore = friendCount * (friendRawAvg ?? 0) + planBonus
                break
            }
        }

        // Build structured reasons for i18n formatting in the UI
        const reasons: ReasonData[] = []
        if (isInPlanList) reasons.push({ type: 'inPlanList' })
        if (friendCount === 0) {
            reasons.push({ type: 'watchedNoRatings', watchCount })
        } else if (watchCount > friendCount) {
            reasons.push({
                ratedCount: friendCount,
                type: 'watchedAndRated',
                watchCount,
            })
        } else {
            reasons.push({ ratedCount: friendCount, type: 'ratedOnly' })
        }
        if (isAlreadyStarted) reasons.push({ type: 'alreadyStarted' })

        results.push({
            anilistScore,
            chapters: mediaEntry?.chapters ?? null,
            coverColor: mediaEntry?.coverColor ?? null,
            coverLarge: mediaEntry?.coverLarge ?? null,
            coverMedium: mediaEntry?.coverMedium ?? null,
            episodes: mediaEntry?.episodes ?? null,
            format: mediaEntry?.format ?? null,
            friendAvgScore: bayesianAvg,
            friendCount,
            friendRawAvg,
            genres: mediaEntry?.genres ?? null,
            isAlreadyStarted,
            isInPlanList,
            mediaId,
            mediaStatus: mediaEntry?.mediaStatus ?? null,
            mediaType,
            reasons,
            score: rawScore,
            season: mediaEntry?.season ?? null,
            seasonYear: mediaEntry?.seasonYear ?? null,
            siteUrl: mediaEntry?.siteUrl ?? null,
            title: mediaEntry?.title ?? `Media #${mediaId}`,
            watchCount,
        })
    }

    return results.toSorted((a, b) => {
        if (a.isInPlanList !== b.isInPlanList) return a.isInPlanList ? -1 : 1
        return b.score - a.score
    })
}
