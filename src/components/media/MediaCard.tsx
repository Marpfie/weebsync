import { X } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { Recommendation, RecommendationMode } from '../../lib/recommendations'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
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
 * One recommendation, rendered as a shadcn `Card`. Composes the sub-pieces
 * (`MediaScoreRow`, `MediaReasons`, `FriendAvatarStack`, `RecommendationBadge`)
 * so each can evolve or be swapped without rewriting the card shell.
 */
export const MediaCard: FC<MediaCardProps> = ({ className, mode, onDismiss, rec }) => {
    const { t } = useTranslation()
    const formatLabel = rec.format ? t(`format.${rec.format}`, { defaultValue: rec.format }) : null
    const accentColor = rec.coverColor ?? 'var(--primary)'

    return (
        <Card
            className={cn(
                'group relative flex-row gap-3 overflow-visible p-3 transition-transform duration-200 hover:scale-[1.01]',
                className
            )}
            size="sm"
        >
            <a
                aria-label={t('card.openOnAniList', { title: rec.title })}
                className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={rec.siteUrl ?? '#'}
                rel="noopener noreferrer"
                style={{ backgroundColor: `${accentColor}33` }}
                target="_blank"
            >
                {rec.coverMedium ? (
                    <img
                        alt={`Cover art for ${rec.title}`}
                        className="h-full w-full object-cover"
                        height={96}
                        loading="lazy"
                        src={rec.coverMedium}
                        width={64}
                    />
                ) : (
                    <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-2xl">
                        📺
                    </span>
                )}
            </a>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <a
                    className="line-clamp-2 rounded-sm text-sm font-semibold leading-tight outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    href={rec.siteUrl ?? '#'}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <h3 className="pr-8">{rec.title}</h3>
                </a>

                <div className="flex flex-wrap items-center gap-2">
                    <RecommendationBadge type={badgeFor(rec)} />
                    {formatLabel && <Badge variant="secondary">{formatLabel}</Badge>}
                </div>

                <MediaScoreRow mode={mode} rec={rec} />

                <div className="flex flex-wrap items-center justify-between gap-2">
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
                <Button
                    aria-label={t('card.dismiss', { title: rec.title })}
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => {
                        onDismiss(rec.mediaId)
                    }}
                    size="icon-xs"
                    variant="secondary"
                >
                    <X />
                </Button>
            )}
        </Card>
    )
}
