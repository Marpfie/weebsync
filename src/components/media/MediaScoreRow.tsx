import { Star } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import type { Recommendation, RecommendationMode } from '../../lib/recommendations'

const WEIGHTED_TITLE_KEYS: Record<RecommendationMode, string> = {
    'friend-favourites': 'card.weightedTitleFriendFavourites',
    'friends-only': 'card.weightedTitleFriendsOnly',
    'most-agreed': 'card.weightedTitleMostAgreed',
}

interface MediaScoreRowProps {
    mode?: RecommendationMode
    rec: Recommendation
}

/**
 * One-line score summary: friend average · AniList community average · ranking score.
 * Pure presentational — feed it a `Recommendation`, it renders three numbers.
 */
export const MediaScoreRow: FC<MediaScoreRowProps> = ({ mode, rec }) => {
    const { t } = useTranslation()
    const weightedTitleKey = mode ? WEIGHTED_TITLE_KEYS[mode] : 'card.weightedTitle'

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1" title={t('card.friendAvgTitle')}>
                <Star aria-hidden="true" className="fill-current text-amber-400" size={12} />
                <span className="text-sm font-semibold tabular-nums">
                    {rec.friendRawAvg == null ? t('card.noRatingOutOf10') : rec.friendRawAvg.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/10</span>
            </div>
            {rec.anilistScore != null && (
                <span
                    className="text-xs font-medium tabular-nums text-muted-foreground"
                    title={t('card.anilistAvgTitle')}
                >
                    AL {rec.anilistScore}%
                </span>
            )}
            <span className="text-xs font-medium tabular-nums text-muted-foreground" title={t(weightedTitleKey)}>
                ⊕ {rec.score.toFixed(1)}
            </span>
        </div>
    )
}
