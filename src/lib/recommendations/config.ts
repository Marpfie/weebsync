/**
 * Tunable knobs for the recommendation pipeline.
 *
 * Everything that used to be a magic number in `buildRecommendations` lives here.
 * Pass a partial override to `buildRecommendations(input, { ... })` to tweak behaviour
 * without forking the engine. Future work: expose subsets of these in the Settings UI.
 */
export interface ScoringConfig {
    /** Bayesian prior weight (in "friend votes") for the AniList community score. */
    anilistPriorWeight: number
    /** Bayesian prior weight for the neutral mean in friends-only mode. */
    friendsOnlyPriorWeight: number
    /** Minimum friend score that counts toward the rated average (0–10 scale). */
    minScoreThreshold: number
    /** Neutral prior mean (0–10) used in friends-only mode. */
    neutralPriorMean: number
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
    anilistPriorWeight: 3,
    friendsOnlyPriorWeight: 2,
    minScoreThreshold: 6,
    neutralPriorMean: 7,
}

/**
 * Guards against stale localStorage data written when scores were stored on a 0–100 scale.
 * Modern scores are always 0–10 (POINT_10_DECIMAL).
 */
export const normaliseScore = (score: number): number => (score > 10 ? score / 10 : score)
