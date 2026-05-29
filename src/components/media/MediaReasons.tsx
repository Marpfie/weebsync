import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import type { MediaType, ReasonData } from '../../lib/recommendations'

interface MediaReasonsProps {
    mediaType: MediaType
    reasons: readonly ReasonData[]
}

/**
 * Renders the structured `ReasonData[]` from the recommendation engine as a
 * localised bullet list. Adding a new reason variant = adding a `case` here
 * + a key in `en.json` under `reasons.*`.
 */
export const MediaReasons: FC<MediaReasonsProps> = ({ mediaType, reasons }) => {
    const { t } = useTranslation()
    const context = { context: mediaType.toLowerCase() }

    const format = (r: ReasonData): string => {
        switch (r.type) {
            case 'alreadyStarted': {
                return t('reasons.alreadyStarted', context)
            }
            case 'inPlanList': {
                return t('reasons.inPlanList', context)
            }
            case 'ratedOnly': {
                return t('reasons.ratedOnly', { count: r.ratedCount, ...context })
            }
            case 'watchedAndRated': {
                return t('reasons.watchedAndRated', { count: r.watchCount, ratedCount: r.ratedCount, ...context })
            }
            case 'watchedNoRatings': {
                return t('reasons.watchedNoRatings', { count: r.watchCount, ...context })
            }
        }
    }

    return (
        <ul className="mt-auto space-y-0.5">
            {reasons.map((reason) => (
                <li className="text-xs text-muted-foreground" key={reason.type}>
                    {format(reason)}
                </li>
            ))}
        </ul>
    )
}
