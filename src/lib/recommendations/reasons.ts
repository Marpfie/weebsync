import type { ReasonData } from './types'

interface ReasonContext {
    friendCount: number
    isAlreadyStarted: boolean
    isInPlanList: boolean
    watchCount: number
}

/**
 * Builds the human-readable reason list for a recommendation.
 * Strings are produced in the UI from these structured records (i18n-friendly).
 */
export const buildReasons = ({
    friendCount,
    isAlreadyStarted,
    isInPlanList,
    watchCount,
}: ReasonContext): ReasonData[] => {
    const reasons: ReasonData[] = []

    if (isInPlanList) reasons.push({ type: 'inPlanList' })

    if (friendCount === 0) {
        reasons.push({ type: 'watchedNoRatings', watchCount })
    } else if (watchCount > friendCount) {
        reasons.push({ ratedCount: friendCount, type: 'watchedAndRated', watchCount })
    } else {
        reasons.push({ ratedCount: friendCount, type: 'ratedOnly' })
    }

    if (isAlreadyStarted) reasons.push({ type: 'alreadyStarted' })

    return reasons
}
