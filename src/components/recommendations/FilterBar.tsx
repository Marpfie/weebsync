import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'

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
            <Label className="cursor-pointer" htmlFor="filter-backlog-only">
                <Checkbox
                    checked={showBacklogOnly}
                    id="filter-backlog-only"
                    onCheckedChange={(checked) => {
                        onBacklogToggle(checked)
                    }}
                />
                <span className="text-muted-foreground font-normal">{t('recs.backlogOnly')}</span>
            </Label>
        </div>
    )
}
