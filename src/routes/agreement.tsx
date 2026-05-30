import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronDown, ChevronsUpDown, ChevronUp, ExternalLink, Users } from 'lucide-react'
import { type FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
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

type SortDir = 'asc' | 'desc'
type SortKey = 'avgDelta' | 'meanAbsDiff' | 'name' | 'overlap' | 'pearson'

const DEFAULT_DIR: Record<SortKey, SortDir> = {
    avgDelta: 'desc',
    meanAbsDiff: 'asc',
    name: 'asc',
    overlap: 'desc',
    pearson: 'desc',
}

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
    const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_DIR.overlap)

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(key)
            setSortDir(DEFAULT_DIR[key])
        }
    }

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

        const ascCmp = (a: (typeof decorated)[number], b: (typeof decorated)[number]): number => {
            switch (sortKey) {
                case 'avgDelta': {
                    return (a.avgDelta ?? 0) - (b.avgDelta ?? 0)
                }
                case 'meanAbsDiff': {
                    return (a.meanAbsDiff ?? Infinity) - (b.meanAbsDiff ?? Infinity)
                }
                case 'name': {
                    return (a.friend?.name ?? '').localeCompare(b.friend?.name ?? '')
                }
                case 'pearson': {
                    return (a.pearson ?? -Infinity) - (b.pearson ?? -Infinity)
                }
                default: {
                    return a.overlap - b.overlap
                }
            }
        }
        const cmp =
            sortDir === 'asc' ? ascCmp : (a: (typeof decorated)[number], b: (typeof decorated)[number]) => -ascCmp(a, b)
        return decorated.toSorted(cmp)
    }, [ratings, userEntries, following, sortKey, sortDir])

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

    const headerButton = (label: string, key: SortKey): React.ReactNode => {
        const active = sortKey === key
        const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
        return (
            <button
                aria-label={t('agreement.sortAriaLabel', { column: label })}
                className={cn(
                    'inline-flex items-center gap-1 hover:text-foreground transition-colors',
                    active ? 'text-foreground font-semibold' : 'text-muted-foreground'
                )}
                onClick={() => {
                    handleSort(key)
                }}
                type="button"
            >
                {label}
                <Icon aria-hidden="true" className={cn('size-3', !active && 'opacity-40')} />
            </button>
        )
    }

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

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {(
                    [
                        ['pearsonTerm', 'pearsonDesc'],
                        ['avgDeltaTerm', 'avgDeltaDesc'],
                        ['meanAbsDiffTerm', 'meanAbsDiffDesc'],
                        ['minOverlapTerm', 'minOverlapDesc'],
                    ] as const
                ).map(([termKey, descKey]) => (
                    <div className="flex gap-2" key={termKey}>
                        <dt className="font-medium text-foreground shrink-0 min-w-[5.5rem]">
                            {t(`agreement.legend.${termKey}`)}
                        </dt>
                        <dd className="text-muted-foreground">{t(`agreement.legend.${descKey}`)}</dd>
                    </div>
                ))}
            </dl>

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
