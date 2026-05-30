import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink, Sparkles } from 'lucide-react'
import { type FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useFriendInsightsData } from '../hooks/useFriendInsightsData'
import { computePersonalityByFriend, toAniListMeanMap } from '../lib/insights/stats'
import type { FriendRating, MediaType } from '../lib/recommendations'
import { requireIdentity } from '../lib/route-guards'
import { cn } from '../lib/utils'
import { useRecommendationsStore } from '../store/recommendationsStore'

type SortKey = 'bias' | 'conformity' | 'hater' | 'hipster' | 'sample'

const fmt = (n: null | number, sign = false): string => {
    if (n == null) return '—'
    const rounded = Math.round(n * 100) / 100
    if (!sign) return rounded.toFixed(2)
    if (rounded === 0) return '0.00'
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

const biasTone = (n: null | number): string => {
    if (n == null) return 'text-muted-foreground'
    if (n >= 0.5) return 'text-emerald-600 dark:text-emerald-400'
    if (n <= -0.5) return 'text-rose-600 dark:text-rose-400'
    return 'text-muted-foreground'
}

const StatsTable: FC<{ mediaType: MediaType }> = ({ mediaType }) => {
    const { t } = useTranslation()
    const data = useFriendInsightsData()
    const following = useRecommendationsStore((s) => s.following)
    const [sortKey, setSortKey] = useState<SortKey>('hipster')

    const ratings: readonly FriendRating[] = mediaType === 'ANIME' ? data.animeRatings : data.mangaRatings

    const rows = useMemo(() => {
        const anilistMeans = toAniListMeanMap(ratings)
        const byFriend = computePersonalityByFriend(ratings, anilistMeans)
        const friendById = new Map(following.map((f) => [f.id, f]))
        const decorated = Array.from(byFriend, ([friendId, stats]) => ({
            friend: friendById.get(friendId),
            friendId,
            stats,
        })).filter((row) => row.friend !== undefined && row.stats.sampleSize >= 5)

        const cmp = (a: (typeof decorated)[number], b: (typeof decorated)[number]): number => {
            switch (sortKey) {
                case 'bias': {
                    return Math.abs(b.stats.contrarianBias ?? 0) - Math.abs(a.stats.contrarianBias ?? 0)
                }
                case 'conformity': {
                    return (a.stats.conformity ?? Infinity) - (b.stats.conformity ?? Infinity)
                }
                case 'hater': {
                    return Math.abs(b.stats.hater ?? 0) - Math.abs(a.stats.hater ?? 0)
                }
                case 'sample': {
                    return b.stats.sampleSize - a.stats.sampleSize
                }
                default: {
                    return (b.stats.hipster ?? -Infinity) - (a.stats.hipster ?? -Infinity)
                }
            }
        }
        return decorated.toSorted(cmp)
    }, [ratings, following, sortKey])

    if (ratings.length === 0 || rows.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Sparkles />
                    </EmptyMedia>
                    <EmptyTitle>{t('stats.emptyTitle')}</EmptyTitle>
                    <EmptyDescription>{t('stats.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    }

    const headerButton = (label: string, key: SortKey): React.ReactNode => (
        <button
            className={cn(
                'inline-flex items-center gap-1 hover:text-foreground transition-colors',
                sortKey === key ? 'text-foreground font-semibold' : 'text-muted-foreground'
            )}
            onClick={() => {
                setSortKey(key)
            }}
            type="button"
        >
            {label}
        </button>
    )

    return (
        <Card className="p-0 overflow-hidden" size="sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('stats.col.friend')}</TableHead>
                        <TableHead className="text-right">{headerButton(t('stats.col.sample'), 'sample')}</TableHead>
                        <TableHead className="text-right" title={t('stats.hipsterDescription')}>
                            {headerButton(t('stats.col.hipster'), 'hipster')}
                        </TableHead>
                        <TableHead className="text-right" title={t('stats.haterDescription')}>
                            {headerButton(t('stats.col.hater'), 'hater')}
                        </TableHead>
                        <TableHead className="text-right" title={t('stats.biasDescription')}>
                            {headerButton(t('stats.col.bias'), 'bias')}
                        </TableHead>
                        <TableHead className="text-right" title={t('stats.conformistDescription')}>
                            {headerButton(t('stats.col.conformity'), 'conformity')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ friend, friendId, stats }) => {
                        if (!friend) return null
                        const f = friend
                        const profileUrl = `https://anilist.co/user/${encodeURIComponent(f.name)}/`
                        return (
                            <TableRow key={friendId}>
                                <TableCell>
                                    <a
                                        className="inline-flex items-center gap-2 hover:underline"
                                        href={profileUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <Avatar className="size-7">
                                            <AvatarImage alt="" src={f.avatarUrl ?? undefined} />
                                            <AvatarFallback>{f.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{f.name}</span>
                                        <ExternalLink aria-hidden="true" className="size-3 text-muted-foreground" />
                                    </a>
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {stats.sampleSize}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-emerald-700/80 dark:text-emerald-400">
                                    {fmt(stats.hipster, true)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-rose-700/80 dark:text-rose-400">
                                    {fmt(stats.hater, true)}
                                </TableCell>
                                <TableCell className={cn('text-right tabular-nums', biasTone(stats.contrarianBias))}>
                                    {fmt(stats.contrarianBias, true)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{fmt(stats.conformity)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

const StatsPage = () => {
    const { t } = useTranslation()
    const [tab, setTab] = useState<MediaType>('ANIME')

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('stats.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">{t('stats.subtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{t('stats.hipsterDescription')}</Badge>
                <Badge variant="secondary">{t('stats.haterDescription')}</Badge>
                <Badge variant="secondary">{t('stats.conformistDescription')}</Badge>
            </div>

            <Tabs
                onValueChange={(v) => {
                    setTab(v as MediaType)
                }}
                value={tab}
            >
                <TabsList>
                    <TabsTrigger value="ANIME">{t('nav.anime')}</TabsTrigger>
                    <TabsTrigger value="MANGA">{t('nav.manga')}</TabsTrigger>
                </TabsList>
            </Tabs>

            <StatsTable mediaType={tab} />

            <p className="text-xs text-muted-foreground">
                <Link className="underline" to="/agreement">
                    {t('nav.agreement')}
                </Link>
            </p>
        </div>
    )
}

export const Route = createFileRoute('/stats')({
    beforeLoad: requireIdentity,
    component: StatsPage,
})
