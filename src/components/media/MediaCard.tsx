import { ExternalLink, Star } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { ReasonData, Recommendation } from '../../lib/recommendations'
import { RecommendationBadge } from './RecommendationBadge'

interface MediaCardProps {
    className?: string
    onDismiss?: (mediaId: number) => void
    rec: Recommendation
}

const FORMAT_LABELS: Record<string, string> = {
    MANGA: 'Manga',
    MOVIE: 'Movie',
    NOVEL: 'Light Novel',
    ONA: 'ONA',
    ONE_SHOT: 'One Shot',
    OVA: 'OVA',
    SPECIAL: 'Special',
    TV: 'TV',
    TV_SHORT: 'TV Short',
}

export const MediaCard: FC<MediaCardProps> = ({ className, onDismiss, rec }) => {
    const { t } = useTranslation()
    const context = { context: rec.mediaType.toLowerCase() }
    const badgeType = rec.isInPlanList ? 'plan' : (rec.isAlreadyStarted ? 'started' : 'new')
    const formatLabel = rec.format ? (FORMAT_LABELS[rec.format] ?? rec.format) : null
    const accentColor = rec.coverColor ?? 'var(--primary)'

    const formatReason = (r: ReasonData): string => {
        switch (r.type) {
            case 'alreadyStarted': {
                return t('reasons.alreadyStarted', context)
            }
            case 'inPlanList': {
                return t('reasons.inPlanList', context)
            }
            case 'ratedOnly': {
                return t('reasons.ratedOnly', { avg: r.avg.toFixed(1), count: r.ratedCount, ...context })
            }
            case 'watchedAndRated': {
                return t('reasons.watchedAndRated', {
                    avg: r.avg.toFixed(1),
                    count: r.watchCount,
                    ratedCount: r.ratedCount,
                    ...context,
                })
            }
            case 'watchedNoRatings': {
                return t('reasons.watchedNoRatings', { count: r.watchCount, ...context })
            }
        }
    }

    return (
        <article
            className={cn(
                'group relative flex gap-3 rounded-xl p-3 transition-all duration-200',
                'hover:scale-[1.01] bg-card border border-border shadow-sm',
                className
            )}
        >
            {/* Cover image */}
            <a
                aria-label={t('card.openOnAniList', { title: rec.title })}
                className="shrink-0 relative"
                href={rec.siteUrl ?? '#'}
                rel="noopener noreferrer"
                target="_blank"
            >
                <div className="w-16 h-24 rounded-lg overflow-hidden" style={{ backgroundColor: accentColor + '33' }}>
                    {rec.coverMedium ? (
                        <img
                            alt={`Cover art for ${rec.title}`}
                            className="w-full h-full object-cover"
                            height={96}
                            loading="lazy"
                            src={rec.coverMedium}
                            width={64}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📺</div>
                    )}
                </div>
            </a>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{rec.title}</h3>
                    {rec.siteUrl && (
                        <a
                            aria-label={t('card.viewOnAniList', { title: rec.title })}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60"
                            href={rec.siteUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <RecommendationBadge type={badgeType} />
                    {formatLabel && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {formatLabel}
                        </span>
                    )}
                </div>

                {/* Score row: friend avg · AniList avg · weighted */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Friend avg */}
                    <div className="flex items-center gap-1" title={t('card.friendAvgTitle')}>
                        <Star aria-hidden="true" className="fill-current text-amber-400" size={12} />
                        <span className="text-sm font-semibold tabular-nums">
                            {rec.friendRawAvg == undefined ? t('card.noRatingOutOf10') : rec.friendRawAvg.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                    {/* AniList site avg */}
                    {rec.anilistScore != undefined && (
                        <div className="flex items-center gap-1" title={t('card.anilistAvgTitle')}>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                AL {rec.anilistScore}%
                            </span>
                        </div>
                    )}
                    {/* Weighted Bayesian score */}
                    <div className="flex items-center gap-1" title={t('card.weightedTitle')}>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            ⊕ {rec.friendAvgScore.toFixed(1)}
                        </span>
                    </div>
                </div>

                {/* Watch / rated counts */}
                <div>
                    {rec.watchCount > rec.friendCount ? (
                        <span className="text-xs text-muted-foreground">
                            {t('card.watchedAndRated', {
                                ratedCount: rec.friendCount,
                                watchCount: rec.watchCount,
                                ...context,
                            })}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            {t('card.friends', { count: rec.friendCount })}
                        </span>
                    )}
                </div>

                {/* Reasons */}
                <ul className="mt-auto space-y-0.5">
                    {rec.reasons.map((reason) => (
                        <li className="text-xs text-muted-foreground" key={reason.type}>
                            {formatReason(reason)}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Dismiss button */}
            {onDismiss && (
                <button
                    aria-label={t('card.dismiss', { title: rec.title })}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center text-xs bg-accent text-muted-foreground/60"
                    onClick={() => {
                        onDismiss(rec.mediaId)
                    }}
                    type="button"
                >
                    ×
                </button>
            )}
        </article>
    )
}
