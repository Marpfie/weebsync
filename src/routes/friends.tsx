import { createFileRoute } from '@tanstack/react-router'
import { CheckSquare, ChevronDown, MoreHorizontal, Square, SquareDot, UserPlus } from 'lucide-react'
import { type FC, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button, buttonVariants } from '../components/ui/button'
import { Card } from '../components/ui/card'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ScrollArea } from '../components/ui/scroll-area'
import { Spinner } from '../components/ui/spinner'
import type { FollowingQuery } from '../gql/graphql'
import { useFollowing } from '../hooks/useFollowing'
import { requireIdentity } from '../lib/route-guards'
import { useIdentity } from '../store/identity'
import { mutate as mutatePrefs, toggleFriendExclusion, usePreferences } from '../store/preferences'
import type { FriendRatingCount } from '../store/recommendationsStore'
import { useRecommendationsStore } from '../store/recommendationsStore'

type FollowingUser = NonNullable<NonNullable<NonNullable<FollowingQuery['Page']>['following']>[number]>

interface RatingRange {
    animeMax: string
    animeMin: string
    mangaMax: string
    mangaMin: string
}

const EMPTY_RANGE: RatingRange = { animeMax: '', animeMin: '', mangaMax: '', mangaMin: '' }
const EMPTY_COUNTS: FriendRatingCount = { animeRated: 0, animeWatched: 0, mangaRated: 0, mangaWatched: 0 }

const parseNumber = (raw: string): null | number => {
    if (raw.trim() === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
}

const inRange = (value: number, min: null | number, max: null | number): boolean => {
    if (min !== null && value < min) return false
    if (max !== null && value > max) return false
    return true
}

interface FriendRowProps {
    counts: FriendRatingCount
    friend: FollowingUser
    fullyExcluded: boolean
    hasSyncedData: boolean
    noAnime: boolean
    noManga: boolean
}

const FriendRow: FC<FriendRowProps> = ({ counts, friend, fullyExcluded, hasSyncedData, noAnime, noManga }) => {
    const { t } = useTranslation()

    return (
        <Card className={cn('flex-row items-center gap-3 p-3', fullyExcluded && 'opacity-50')} size="sm">
            <Avatar size="lg">
                {friend.avatar?.medium && (
                    <AvatarImage alt={t('friends.avatarAlt', { name: friend.name })} src={friend.avatar.medium} />
                )}
                <AvatarFallback>{friend.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{friend.name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {friend.siteUrl && (
                        <a
                            className={buttonVariants({
                                className: 'h-auto p-0 text-xs text-muted-foreground/60',
                                variant: 'link',
                            })}
                            href={friend.siteUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {t('friends.viewOnAniList')}
                        </a>
                    )}
                    <span className="text-xs text-muted-foreground/80">
                        {hasSyncedData
                            ? t('friends.ratingCounts', {
                                  anime: counts.animeRated,
                                  manga: counts.mangaRated,
                              })
                            : t('friends.notSyncedYet')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {fullyExcluded && <Badge variant="destructive">{t('friends.badgeFull')}</Badge>}
                    {!fullyExcluded && noAnime && <Badge variant="outline">{t('friends.badgeNoAnime')}</Badge>}
                    {!fullyExcluded && noManga && <Badge variant="outline">{t('friends.badgeNoManga')}</Badge>}
                </div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            aria-label={t('friends.menuAriaLabel', { name: friend.name })}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <MoreHorizontal />
                        </Button>
                    }
                />
                <DropdownMenuContent align="end" className="min-w-56">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>{t('friends.menuLabel')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={noAnime}
                            onCheckedChange={() => {
                                toggleFriendExclusion(friend.id, 'anime')
                            }}
                        >
                            {t('friends.excludeAnime')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={noManga}
                            onCheckedChange={() => {
                                toggleFriendExclusion(friend.id, 'manga')
                            }}
                        >
                            {t('friends.excludeManga')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={fullyExcluded}
                            onCheckedChange={() => {
                                toggleFriendExclusion(friend.id, 'full')
                            }}
                        >
                            {t('friends.excludeFull')}
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </Card>
    )
}

interface RangeRowProps {
    label: string
    max: string
    min: string
    onMaxChange: (v: string) => void
    onMinChange: (v: string) => void
}

const RangeRow: FC<RangeRowProps> = ({ label, max, min, onMaxChange, onMinChange }) => (
    <div className="mb-2">
        <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
        <div className="flex gap-1.5 items-center">
            <Input
                aria-label={`${label} min`}
                inputMode="numeric"
                onChange={(event) => {
                    onMinChange(event.target.value)
                }}
                placeholder="min"
                type="number"
                value={min}
            />
            <span aria-hidden="true" className="text-muted-foreground">
                –
            </span>
            <Input
                aria-label={`${label} max`}
                inputMode="numeric"
                onChange={(event) => {
                    onMaxChange(event.target.value)
                }}
                placeholder="max"
                type="number"
                value={max}
            />
        </div>
    </div>
)

const FriendsPage = () => {
    const { t } = useTranslation()
    const prefs = usePreferences()
    const identity = useIdentity()
    const followingResult = useFollowing(identity?.userId)
    const following = followingResult.data?.Page?.following ?? []
    const friendRatingCounts = useRecommendationsStore((s) => s.friendRatingCounts)

    const [search, setSearch] = useState('')
    const deferredSearch = useDeferredValue(search)
    const [range, setRange] = useState<RatingRange>(EMPTY_RANGE)
    const rangeActive = Object.values(range).some((v) => v !== '')

    const cleanedFriends = useMemo(() => following.filter((f): f is FollowingUser => f != null), [following])

    const visibleFriends = useMemo(() => {
        const term = deferredSearch.trim().toLowerCase()
        const animeMin = parseNumber(range.animeMin)
        const animeMax = parseNumber(range.animeMax)
        const mangaMin = parseNumber(range.mangaMin)
        const mangaMax = parseNumber(range.mangaMax)

        return cleanedFriends.filter((friend) => {
            if (term && !friend.name.toLowerCase().includes(term)) return false
            const counts = friendRatingCounts.get(friend.id) ?? EMPTY_COUNTS
            if (!inRange(counts.animeRated, animeMin, animeMax)) return false
            if (!inRange(counts.mangaRated, mangaMin, mangaMax)) return false
            return true
        })
    }, [cleanedFriends, deferredSearch, range, friendRatingCounts])

    const selectAll = () => {
        const ids = new Set(visibleFriends.map((f) => f.id))
        mutatePrefs((draft) => {
            draft.excludedFriendIds = draft.excludedFriendIds.filter((id) => !ids.has(id))
            return draft
        })
    }

    const selectNone = () => {
        const ids = visibleFriends.map((f) => f.id)
        mutatePrefs((draft) => {
            draft.excludedFriendIds = [...new Set([...draft.excludedFriendIds, ...ids])]
            return draft
        })
    }

    const invertSelection = () => {
        mutatePrefs((draft) => {
            const current = new Set(draft.excludedFriendIds)
            const next = new Set(current)
            for (const friend of visibleFriends) {
                if (current.has(friend.id)) next.delete(friend.id)
                else next.add(friend.id)
            }
            draft.excludedFriendIds = [...next]
            return draft
        })
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('friends.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                    {t('friends.subtitle', { count: cleanedFriends.length })}
                </p>
            </div>

            {followingResult.error && (
                <Alert variant="destructive">
                    <AlertTitle>{t('friends.errorTitle')}</AlertTitle>
                    <AlertDescription>{followingResult.error.message}</AlertDescription>
                </Alert>
            )}

            {followingResult.loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner />
                    <span>{t('friends.loading')}</span>
                </div>
            )}

            {!followingResult.loading && cleanedFriends.length === 0 && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UserPlus />
                        </EmptyMedia>
                        <EmptyTitle>{t('friends.emptyTitle')}</EmptyTitle>
                        <EmptyDescription>{t('friends.emptyDescription')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            {cleanedFriends.length > 0 && (
                <>
                    <Card className="p-3 space-y-3" size="sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                aria-label={t('friends.searchAriaLabel')}
                                className="flex-1 min-w-40"
                                onChange={(event) => {
                                    setSearch(event.target.value)
                                }}
                                placeholder={t('friends.searchPlaceholder')}
                                type="search"
                                value={search}
                            />
                            <Button onClick={selectAll} size="sm" variant="outline">
                                <CheckSquare /> {t('friends.bulkSelectAll')}
                            </Button>
                            <Button onClick={selectNone} size="sm" variant="outline">
                                <Square /> {t('friends.bulkSelectNone')}
                            </Button>
                            <Button onClick={invertSelection} size="sm" variant="outline">
                                <SquareDot /> {t('friends.bulkInvert')}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button size="sm" variant={rangeActive ? 'default' : 'outline'}>
                                            {rangeActive && (
                                                <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current opacity-80" />
                                            )}
                                            {t('friends.rangeFilterLabel')} <ChevronDown />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="end" className="p-3 w-72">
                                    <p className="text-xs text-muted-foreground mb-2">{t('friends.rangeHelp')}</p>
                                    <RangeRow
                                        label={t('friends.rangeAnime')}
                                        max={range.animeMax}
                                        min={range.animeMin}
                                        onMaxChange={(v) => {
                                            setRange((r) => ({ ...r, animeMax: v }))
                                        }}
                                        onMinChange={(v) => {
                                            setRange((r) => ({ ...r, animeMin: v }))
                                        }}
                                    />
                                    <RangeRow
                                        label={t('friends.rangeManga')}
                                        max={range.mangaMax}
                                        min={range.mangaMin}
                                        onMaxChange={(v) => {
                                            setRange((r) => ({ ...r, mangaMax: v }))
                                        }}
                                        onMinChange={(v) => {
                                            setRange((r) => ({ ...r, mangaMin: v }))
                                        }}
                                    />
                                    <Button
                                        className="mt-2 w-full"
                                        onClick={() => {
                                            setRange(EMPTY_RANGE)
                                        }}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        {t('friends.rangeReset')}
                                    </Button>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('friends.showing', { shown: visibleFriends.length, total: cleanedFriends.length })}
                        </p>
                    </Card>

                    <ScrollArea className="max-h-[70vh] pr-3">
                        <ul aria-label={t('friends.listAriaLabel')} className="space-y-2">
                            {visibleFriends.map((friend) => {
                                const fullyExcluded = prefs.excludedFriendIds.includes(friend.id)
                                const noAnime = prefs.friendAnimeExclusions.includes(friend.id) || fullyExcluded
                                const noManga = prefs.friendMangaExclusions.includes(friend.id) || fullyExcluded
                                const counts = friendRatingCounts.get(friend.id) ?? EMPTY_COUNTS
                                const hasSyncedData = friendRatingCounts.has(friend.id)
                                return (
                                    <li key={friend.id}>
                                        <FriendRow
                                            counts={counts}
                                            friend={friend}
                                            fullyExcluded={fullyExcluded}
                                            hasSyncedData={hasSyncedData}
                                            noAnime={noAnime}
                                            noManga={noManga}
                                        />
                                    </li>
                                )
                            })}
                        </ul>
                    </ScrollArea>
                </>
            )}
        </div>
    )
}

export const Route = createFileRoute('/friends')({ beforeLoad: requireIdentity, component: FriendsPage })
