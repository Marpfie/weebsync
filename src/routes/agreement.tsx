import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink, Users } from 'lucide-react'
import { type FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useFriendInsightsData } from '../hooks/useFriendInsightsData'
import { computeAgreement, userEntriesToScoreMap } from '../lib/insights/stats'
import type { MediaType } from '../lib/recommendations'
import { requireIdentity } from '../lib/route-guards'
import { cn } from '../lib/utils'
import { useRecommendationsStore } from '../store/recommendationsStore'

type SortKey = 'avgDelta' | 'meanAbsDiff' | 'name' | 'overlap' | 'pearson'

const fmtCorrelation = (n: null | number): string => (n == null ? '—' : n.toFixed(2))
const fmtDelta = (n: null | number): string => {
    if (n == null) return '—'
    const rounded = Math.round(n * 100) / 100
    if (rounded === 0) return '0.00'
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

const correlationTone = (n: null | number): string => {
    if (n == null) return 'text-muted-foreground'
    if (n >= 0.6) return 'text-emerald-600 dark:text-emerald-400'
    if (n >= 0.3) return 'text-emerald-700/70 dark:text-emerald-300/80'
    if (n >= 0) return 'text-muted-foreground'
    if (n >= -0.3) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
}

const AgreementTable: FC<{ mediaType: MediaType }> = ({ mediaType }) => {
    const { t } = useTranslation()
    const data = useFriendInsightsData()
    const following = useRecommendationsStore((s) => s.following)
    const [sortKey, setSortKey] = useState<SortKey>('overlap')

    const ratings = mediaType === 'ANIME' ? data.animeRatings : data.mangaRatings
    const userEntries = mediaType === 'ANIME' ? data.animeUserEntries : data.mangaUserEntries

    const rows = useMemo(() => {
        const userScores = userEntriesToScoreMap(userEntries)
        if (userScores.size === 0) return []
        const agreement = computeAgreement(ratings, userScores)
        const friendById = new Map(following.map((f) => [f.id, f]))
        const decorated = agreement
            .filter((row) => row.overlap >= 3)
            .map((row) => ({
                ...row,
                friend: friendById.get(row.friendId),
            }))
            .filter((row) => row.friend !== undefined)

        const cmp = (a: (typeof decorated)[number], b: (typeof decorated)[number]): number => {
            switch (sortKey) {
                case 'avgDelta': {
                    return Math.abs(b.avgDelta ?? 0) - Math.abs(a.avgDelta ?? 0)
                }
                case 'meanAbsDiff': {
                    return (a.meanAbsDiff ?? Infinity) - (b.meanAbsDiff ?? Infinity)
                }
                case 'name': {
                    return (a.friend?.name ?? '').localeCompare(b.friend?.name ?? '')
                }
                case 'pearson': {
                    return (b.pearson ?? -Infinity) - (a.pearson ?? -Infinity)
                }
                default: {
                    return b.overlap - a.overlap
                }
            }
        }
        return decorated.toSorted(cmp)
    }, [ratings, userEntries, following, sortKey])

    if (userEntries.length === 0 || ratings.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Users />
                    </EmptyMedia>
                    <EmptyTitle>{t('agreement.emptyTitle')}</EmptyTitle>
                    <EmptyDescription>{t('agreement.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    }

    if (rows.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Users />
                    </EmptyMedia>
                    <EmptyTitle>{t('agreement.noOverlapTitle')}</EmptyTitle>
                    <EmptyDescription>{t('agreement.noOverlapDescription')}</EmptyDescription>
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
                        <TableHead>{headerButton(t('agreement.col.friend'), 'name')}</TableHead>
                        <TableHead className="text-right">
                            {headerButton(t('agreement.col.overlap'), 'overlap')}
                        </TableHead>
                        <TableHead className="text-right">
                            {headerButton(t('agreement.col.pearson'), 'pearson')}
                        </TableHead>
                        <TableHead className="text-right">
                            {headerButton(t('agreement.col.avgDelta'), 'avgDelta')}
                        </TableHead>
                        <TableHead className="text-right">
                            {headerButton(t('agreement.col.meanAbsDiff'), 'meanAbsDiff')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => {
                        const f = row.friend
                        if (!f) return null
                        const profileUrl = `https://anilist.co/user/${encodeURIComponent(f.name)}/`
                        return (
                            <TableRow key={row.friendId}>
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
                                <TableCell className="text-right tabular-nums">{row.overlap}</TableCell>
                                <TableCell className={cn('text-right tabular-nums', correlationTone(row.pearson))}>
                                    {fmtCorrelation(row.pearson)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{fmtDelta(row.avgDelta)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {row.meanAbsDiff == null ? '—' : row.meanAbsDiff.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

const AgreementPage = () => {
    const { t } = useTranslation()
    const [tab, setTab] = useState<MediaType>('ANIME')

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('agreement.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">{t('agreement.subtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{t('agreement.legendPearson')}</Badge>
                <Badge variant="secondary">{t('agreement.legendDelta')}</Badge>
                <Badge variant="secondary">{t('agreement.legendMinOverlap')}</Badge>
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

            <AgreementTable mediaType={tab} />

            <p className="text-xs text-muted-foreground">
                {t('agreement.footnote')}{' '}
                <Link className="underline" to="/friends">
                    {t('agreement.footnoteLink')}
                </Link>
            </p>
        </div>
    )
}

export const Route = createFileRoute('/agreement')({
    beforeLoad: requireIdentity,
    component: AgreementPage,
})
