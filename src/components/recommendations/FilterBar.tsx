import { ChevronDown, Filter } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { StatusFilter } from '../../hooks/useRecommendationView'
import { formatKeysFor, type MediaType } from '../../lib/recommendations'
import type { AdultFilterMode } from '../../store/preferences'
import { mutate as mutatePrefs, setPreference, usePreferences } from '../../store/preferences'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export type SortOption = 'friends' | 'score'

interface FilterBarProps {
    className?: string
    mediaType: MediaType
    onStatusChange: (v: StatusFilter) => void
    statusFilter: StatusFilter
}

export const FilterBar: FC<FilterBarProps> = ({ className, mediaType, onStatusChange, statusFilter }) => {
    const { t } = useTranslation()
    const prefs = usePreferences()

    const allKeys = formatKeysFor(mediaType)
    const enabledKey = mediaType === 'ANIME' ? 'enabledAnimeFormats' : 'enabledMangaFormats'
    const enabled = prefs[enabledKey]
    const enabledSet = new Set(enabled)

    const toggleFormat = (key: string): void => {
        mutatePrefs((draft) => {
            const list = draft[enabledKey]
            draft[enabledKey] = list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
            return draft
        })
    }

    const clearFormats = (): void => {
        setPreference(enabledKey, [])
    }

    const formatButtonLabel =
        enabled.length === 0 ? t('filter.allFormats') : t('filter.formatsCount', { count: enabled.length })

    const adultEnabled = prefs.includeAdultContent
    const statusActive = statusFilter !== 'all'

    return (
        <div className={cn('flex items-center gap-3 flex-wrap', className)}>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button size="sm" variant={statusActive ? 'default' : 'outline'}>
                            {t(`filter.status.${statusFilter}`)} <ChevronDown />
                        </Button>
                    }
                />
                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>{t('filter.statusLabel')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                            onValueChange={(v) => {
                                onStatusChange(v as StatusFilter)
                            }}
                            value={statusFilter}
                        >
                            <DropdownMenuRadioItem value="all">{t('filter.status.all')}</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="backlog">{t('filter.status.backlog')}</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="new">{t('filter.status.new')}</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button size="sm" variant="outline">
                            <Filter /> {formatButtonLabel} <ChevronDown />
                        </Button>
                    }
                />
                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>{t('filter.formatsLabel')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allKeys.map((key) => (
                            <DropdownMenuCheckboxItem
                                checked={enabledSet.has(key)}
                                key={key}
                                onCheckedChange={() => {
                                    toggleFormat(key)
                                }}
                            >
                                {t(`format.${key}`, { defaultValue: key })}
                            </DropdownMenuCheckboxItem>
                        ))}
                        {enabled.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <Button
                                    className="w-full justify-start"
                                    onClick={clearFormats}
                                    size="sm"
                                    variant="ghost"
                                >
                                    {t('filter.clearFormats')}
                                </Button>
                            </>
                        )}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {adultEnabled && (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button size="sm" variant="outline">
                                {t(`filter.adult.${prefs.adultFilter}`)} <ChevronDown />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>{t('filter.adultLabel')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                                onValueChange={(value) => {
                                    setPreference('adultFilter', value as AdultFilterMode)
                                }}
                                value={prefs.adultFilter}
                            >
                                <DropdownMenuRadioItem value="include">
                                    {t('filter.adult.include')}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="exclude">
                                    {t('filter.adult.exclude')}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="only">{t('filter.adult.only')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}
