import { ExternalLink } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { Recommendation, RecommendationMode } from '../../lib/recommendations'
import { FriendAvatarStack } from './FriendAvatarStack'
import { MediaReasons } from './MediaReasons'
import { MediaScoreRow } from './MediaScoreRow'
import { RecommendationBadge } from './RecommendationBadge'

interface MediaCardProps {
    className?: string
    mode?: RecommendationMode
    onDismiss?: (mediaId: number) => void
    rec: Recommendation
}

const badgeFor = (rec: Recommendation): 'new' | 'plan' | 'started' => {
    if (rec.isInPlanList) return 'plan'
    if (rec.isAlreadyStarted) return 'started'
    return 'new'
}

/**
 * One recommendation, rendered as a card. Composes the sub-pieces
 * (`MediaScoreRow`, `MediaReasons`, `FriendAvatarStack`, `RecommendationBadge`)
 * so each can evolve or be swapped without rewriting the card shell.
 */
export const MediaCard: FC<MediaCardProps> = ({ className, mode, onDismiss, rec }) => {
    const { t } = useTranslation()
    const formatLabel = rec.format ? t(`format.${rec.format}`, { defaultValue: rec.format }) : null
    const accentColor = rec.coverColor ?? 'var(--primary)'

    return (
        <article
            className={cn(
                'group relative flex gap-3 rounded-xl p-3 transition-all duration-200',
                'hover:scale-[1.01] bg-card border border-border shadow-sm',
                className
            )}
        >
            <a
                aria-label={t('card.openOnAniList', { title: rec.title })}
                className="shrink-0 relative"
                href={rec.siteUrl ?? '#'}
                rel="noopener noreferrer"
                target="_blank"
            >
                <div
                    className="w-16 h-24 rounded-lg overflow-hidden"
                    style={{ backgroundColor: `${accentColor}33` }}
                >
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
                    <RecommendationBadge type={badgeFor(rec)} />
                    {formatLabel && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {formatLabel}
                        </span>
                    )}
                </div>

                <MediaScoreRow mode={mode} rec={rec} />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                        {rec.watchCount > rec.friendCount
                            ? t('card.watchedAndRated', {
                                  context: rec.mediaType.toLowerCase(),
                                  ratedCount: rec.friendCount,
                                  watchCount: rec.watchCount,
                              })
                            : t('card.friends', { count: rec.friendCount })}
                    </span>
                    <FriendAvatarStack friends={rec.ratingFriends} />
                </div>

                <MediaReasons mediaType={rec.mediaType} reasons={rec.reasons} />
            </div>

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
