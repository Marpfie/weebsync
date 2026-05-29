import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../ui/badge'

interface RecommendationBadgeProps {
    className?: string
    type: 'new' | 'plan' | 'started'
}

const BADGE_STYLES: Record<RecommendationBadgeProps['type'], string> = {
    new: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
    plan: 'bg-primary/15 text-primary border-primary/30',
    started: 'bg-green-400/15 text-green-400 border-green-400/30',
}

export const RecommendationBadge: FC<RecommendationBadgeProps> = ({ className, type }) => {
    const { t } = useTranslation()
    return (
        <Badge className={`${BADGE_STYLES[type]} ${className ?? ''}`} variant="outline">
            {t(`badge.${type}`)}
        </Badge>
    )
}
