import { groupByMedia } from './aggregate'
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from './config'
import { filterFriendRatings, indexUserEntries, isUserConsumed, isUserInProgress } from './filter'
import { buildReasons } from './reasons'
import { bayesianFriendAverage, SCORING_STRATEGIES } from './score'
import type { FriendInfo, Recommendation, RecommendationsInput } from './types'

/**
 * Orchestrates the full recommendation pipeline. Pure function: same input → same output,
 * no side effects, no globals.
 *
 * Pipeline:
 *   1. filter — drop excluded friends and statuses we don't count
 *   2. aggregate — group by media, deduplicate per friend
 *   3. score — apply the active strategy + always-on Bayesian blend
 *   4. reasons — build structured reason records for the UI
 *   5. emit — assemble Recommendation objects and sort by score desc
 *
 * Override scoring constants per-call with the optional `config` argument.
 */
export const buildRecommendations = (
    input: RecommendationsInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Recommendation[] => {
    const {
        dismissedIds,
        excludedFriendIds,
        friendInfoById,
        friendRatings,
        includeCurrentFriendEntries,
        mediaType,
        mode,
        userEntries,
    } = input

    const dismissedSet = new Set(dismissedIds)
    const scoreFor = SCORING_STRATEGIES[mode]

    const eligibleRatings = filterFriendRatings(friendRatings, excludedFriendIds, includeCurrentFriendEntries)
    const { entryByMediaId, statusByMediaId } = indexUserEntries(userEntries)
    const aggregatesByMedia = groupByMedia(eligibleRatings, config.minScoreThreshold)

    const out: Recommendation[] = []

    for (const [mediaId, aggregate] of aggregatesByMedia) {
        if (dismissedSet.has(mediaId)) continue

        const userStatus = statusByMediaId.get(mediaId)
        if (isUserConsumed(userStatus)) continue

        const userEntry = entryByMediaId.get(mediaId)
        const meta = userEntry ?? aggregate.sourceMeta
        const anilistScore = meta.averageScore ?? null

        const context = { aggregate, anilistScore, config }
        const score = scoreFor(context)
        const friendAvgScore = bayesianFriendAverage(context)

        const friendCount = aggregate.dedupedRatings.length
        const watchCount = aggregate.allWatchers.size
        const friendRawAvg =
            friendCount > 0 ? aggregate.normalisedScores.reduce((a, b) => a + b, 0) / friendCount : null

        const isInPlanList = userStatus === 'PLANNING'
        const isAlreadyStarted = isUserInProgress(userStatus)

        const ratingFriends: FriendInfo[] = aggregate.dedupedRatings
            .map((r) => friendInfoById.get(r.friendId))
            .filter((f): f is FriendInfo => f !== undefined)

        out.push({
            anilistScore,
            chapters: userEntry?.chapters ?? aggregate.sourceMeta.chapters ?? null,
            coverColor: userEntry?.coverColor ?? null,
            coverLarge: userEntry?.coverLarge ?? null,
            coverMedium: userEntry?.coverMedium ?? aggregate.sourceMeta.coverMedium ?? null,
            episodes: userEntry?.episodes ?? aggregate.sourceMeta.episodes ?? null,
            format: userEntry?.format ?? aggregate.sourceMeta.format ?? null,
            friendAvgScore,
            friendCount,
            friendRawAvg,
            genres: userEntry?.genres ?? aggregate.sourceMeta.genres ?? null,
            isAlreadyStarted,
            isInPlanList,
            mediaId,
            mediaStatus: userEntry?.mediaStatus ?? aggregate.sourceMeta.mediaStatus ?? null,
            mediaType,
            ratingFriends,
            reasons: buildReasons({ friendCount, isAlreadyStarted, isInPlanList, watchCount }),
            score,
            season: userEntry?.season ?? null,
            seasonYear: userEntry?.seasonYear ?? null,
            siteUrl: userEntry?.siteUrl ?? aggregate.sourceMeta.siteUrl ?? null,
            title: userEntry?.title ?? aggregate.sourceMeta.title,
            watchCount,
        })
    }

    return out.toSorted((a, b) => b.score - a.score)
}
