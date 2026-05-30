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
        additionalStatuses,
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

    const eligibleRatings = filterFriendRatings(
        friendRatings,
        excludedFriendIds,
        includeCurrentFriendEntries,
        additionalStatuses
    )
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
            countryOfOrigin: userEntry?.countryOfOrigin ?? aggregate.sourceMeta.countryOfOrigin ?? null,
            coverColor: userEntry?.coverColor ?? null,
            coverLarge: userEntry?.coverLarge ?? null,
            coverMedium: userEntry?.coverMedium ?? aggregate.sourceMeta.coverMedium ?? null,
            episodes: userEntry?.episodes ?? aggregate.sourceMeta.episodes ?? null,
            format: userEntry?.format ?? aggregate.sourceMeta.format ?? null,
            friendAvgScore,
            friendCount,
            friendRawAvg,
            genres: userEntry?.genres ?? aggregate.sourceMeta.genres ?? null,
            isAdult: userEntry?.isAdult ?? aggregate.sourceMeta.isAdult ?? null,
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

    return applyGlobalWatchShrinkage(out, config).toSorted((a, b) => b.score - a.score)
}

/**
 * Second-stage Bayesian shrinkage: pulls each per-item base score toward the
 * global mean across all recs, using each item's watcher count as its "votes".
 *
 * Items watched by many friends keep their stage-1 score; items watched by few
 * friends are shrunk toward the global mean. This discounts niche picks where
 * the friend signal is thin, even if those few friends rated highly.
 *
 * The global mean is itself watch-weighted, so a popular series at 7.5 dominates
 * the prior more than an unwatched series at 9. Pure function over `out`.
 */
const applyGlobalWatchShrinkage = (out: Recommendation[], config: ScoringConfig): Recommendation[] => {
    if (out.length === 0) return out

    let weightedScoreSum = 0
    let weightSum = 0
    for (const rec of out) {
        const w = rec.watchCount
        if (w <= 0) continue
        weightedScoreSum += rec.score * w
        weightSum += w
    }
    const globalMean = weightSum > 0 ? weightedScoreSum / weightSum : config.neutralPriorMean

    const W = config.watchCountPriorWeight
    for (const rec of out) {
        const w = rec.watchCount
        rec.score = (W * globalMean + w * rec.score) / (W + w)
    }
    return out
}
