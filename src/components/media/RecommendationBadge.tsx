import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface RecommendationBadgeProps {
    className?: string
    type: 'new' | 'plan' | 'started'
}

const BADGE_STYLES: Record<RecommendationBadgeProps['type'], string> = {
    new: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
    plan: 'bg-primary/15 text-primary border border-primary/30',
    started: 'bg-green-400/15 text-green-400 border border-green-400/30',
}

export const RecommendationBadge: FC<RecommendationBadgeProps> = ({ className, type }) => {
    const { t } = useTranslation()
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                BADGE_STYLES[type],
                className
            )}
        >
            {t(`badge.${type}`)}
        </span>
    )
}
