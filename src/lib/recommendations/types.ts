import type { MediaListStatus } from '../../gql/graphql'

/** Minimal friend identity carried alongside ratings so the UI can render attribution. */
export interface FriendInfo {
    avatarUrl: null | string
    id: number
    name: string
}

/**
 * One friend's rating of one media item.
 * `score === 0` means "watched/read but not rated".
 */
export interface FriendRating {
    averageScore?: null | number
    chapters?: null | number
    countryOfOrigin?: null | string
    episodes?: null | number
    friendId: number
    genres?: (null | string)[] | null
    isAdult?: boolean | null
    mediaCover?: null | string
    mediaFormat?: null | string
    mediaId: number
    mediaStatus?: null | string
    mediaTitle?: string
    score: number
    siteUrl?: null | string
    status: string
}

export type MediaType = 'ANIME' | 'MANGA'

export type ReasonData =
    | { ratedCount: number; type: 'ratedOnly' }
    | { ratedCount: number; type: 'watchedAndRated'; watchCount: number }
    | { type: 'alreadyStarted' }
    | { type: 'inPlanList' }
    | { type: 'watchedNoRatings'; watchCount: number }

export interface Recommendation {
    /** AniList community average score (0–100). */
    anilistScore: null | number
    chapters: null | number
    countryOfOrigin: null | string
    coverColor: null | string
    coverLarge: null | string
    coverMedium: null | string
    episodes: null | number
    format: null | string
    /** Bayesian average blending AniList score with friend scores (0–10). */
    friendAvgScore: number
    /** Number of friends with an explicit score above the threshold. */
    friendCount: number
    /** Pure average of friend scores (0–10), no AniList influence. */
    friendRawAvg: null | number
    genres: (null | string)[] | null
    isAdult: boolean | null
    isAlreadyStarted: boolean
    isInPlanList: boolean
    mediaId: number
    mediaStatus: null | string
    mediaType: MediaType
    /** Friends who contributed to the score, for attribution in the UI. */
    ratingFriends: FriendInfo[]
    reasons: ReasonData[]
    /** Final ranking score — interpretation depends on the active mode. */
    score: number
    season: null | string
    seasonYear: null | number
    siteUrl: null | string
    title: string
    /** Friends who completed/watched, including those that didn't rate. */
    watchCount: number
}

export type RecommendationMode = 'friend-favourites' | 'friends-only' | 'most-agreed'

/** Input bundle for `buildRecommendations`. All slices are read-only. */
export interface RecommendationsInput {
    /** Extra `MediaListStatus` values (PAUSED/DROPPED/REPEATING) to include beyond the defaults. */
    additionalStatuses?: readonly string[]
    dismissedIds: readonly number[]
    excludedFriendIds: readonly number[]
    friendInfoById: ReadonlyMap<number, FriendInfo>
    friendRatings: readonly FriendRating[]
    includeCurrentFriendEntries: boolean
    mediaType: MediaType
    mode: RecommendationMode
    userEntries: readonly UserMediaEntry[]
}

/** An item from the current user's own media list. Used to filter & label recs. */
export interface UserMediaEntry {
    averageScore: null | number
    chapters: null | number
    countryOfOrigin: null | string
    coverColor: null | string
    coverLarge: null | string
    coverMedium: null | string
    episodes: null | number
    format: null | string
    genres: (null | string)[] | null
    isAdult: boolean | null
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
