import type { MediaAggregate } from './aggregate'
import { stddev, sum } from './aggregate'
import type { ScoringConfig } from './config'
import type { RecommendationMode } from './types'

/** Snapshot of everything a scoring strategy needs about a single media item. */
export interface ScoreContext {
    aggregate: MediaAggregate
    /** AniList community average on the 0–100 scale, or null if unknown. */
    anilistScore: null | number
    config: ScoringConfig
}

/** A pure function from `ScoreContext` to a final ranking score. */
export type ScoringStrategy = (context: ScoreContext) => number

/** Bayesian blend of AniList score and friend scores. Best general-purpose ranking. */
const friendFavourites: ScoringStrategy = ({ aggregate, anilistScore, config }) => {
    const anilistMean = (anilistScore ?? 75) / 10
    const friendScoreSum = sum(aggregate.normalisedScores)
    const friendCount = aggregate.dedupedRatings.length
    return (config.anilistPriorWeight * anilistMean + friendScoreSum) / (config.anilistPriorWeight + friendCount)
}

/** Bayesian blend with a neutral prior instead of AniList — pure friend signal. */
const friendsOnly: ScoringStrategy = ({ aggregate, config }) => {
    const friendScoreSum = sum(aggregate.normalisedScores)
    const friendCount = aggregate.dedupedRatings.length
    return (
        (config.friendsOnlyPriorWeight * config.neutralPriorMean + friendScoreSum) /
        (config.friendsOnlyPriorWeight + friendCount)
    )
}

/** Raw friend average penalised by disagreement (stddev). Rewards consensus. */
const mostAgreed: ScoringStrategy = ({ aggregate }) => {
    const friendCount = aggregate.dedupedRatings.length
    if (friendCount === 0) return 0
    const mean = sum(aggregate.normalisedScores) / friendCount
    return mean - stddev(aggregate.normalisedScores, mean)
}

/**
 * Registry of scoring strategies. Adding a new mode is two steps:
 *   1. Add the mode name to `RecommendationMode` in types.ts.
 *   2. Add an entry here.
 * No other file needs to change.
 */
export const SCORING_STRATEGIES: Record<RecommendationMode, ScoringStrategy> = {
    'friend-favourites': friendFavourites,
    'friends-only': friendsOnly,
    'most-agreed': mostAgreed,
}

/**
 * Always-on Bayesian blend used as `Recommendation.friendAvgScore` (the value
 * shown in the UI regardless of mode). Distinct from the mode-driven `score`.
 */
export const bayesianFriendAverage: ScoringStrategy = friendFavourites
