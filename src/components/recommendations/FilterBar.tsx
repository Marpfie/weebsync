import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type SortOption = 'friends' | 'score'

interface FilterBarProps {
    className?: string
    onBacklogToggle: (v: boolean) => void
    showBacklogOnly: boolean
}

export const FilterBar: FC<FilterBarProps> = ({ className, onBacklogToggle, showBacklogOnly }) => {
    const { t } = useTranslation()

    return (
        <div className={cn('flex items-center gap-3 flex-wrap', className)}>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                    checked={showBacklogOnly}
                    className="w-4 h-4 rounded accent-primary"
                    onChange={(event) => {
                        onBacklogToggle(event.target.checked)
                    }}
                    type="checkbox"
                />
                <span className="text-muted-foreground">{t('recs.backlogOnly')}</span>
            </label>
        </div>
    )
}
