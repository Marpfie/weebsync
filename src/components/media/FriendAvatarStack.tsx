import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { FriendInfo } from '../../lib/recommendations'

interface FriendAvatarStackProps {
    className?: string
    friends: readonly FriendInfo[]
    max?: number
}

/**
 * Horizontally overlapping avatars (Discord-style). Truncates to `max` and shows
 * a `+N` indicator for the remainder. Used on `MediaCard` to show which friends
 * rated each recommendation.
 */
export const FriendAvatarStack: FC<FriendAvatarStackProps> = ({ className, friends, max = 5 }) => {
    const { t } = useTranslation()
    if (friends.length === 0) return null

    const visible = friends.slice(0, max)
    const overflow = friends.length - visible.length

    return (
        <div
            aria-label={t('card.friendStackLabel', { count: friends.length })}
            className={cn('flex items-center', className)}
        >
            <div className="flex -space-x-2">
                {visible.map((friend) => (
                    <div
                        className="w-6 h-6 rounded-full ring-2 ring-card overflow-hidden flex items-center justify-center text-[10px] font-bold bg-secondary text-muted-foreground"
                        key={friend.id}
                        title={friend.name}
                    >
                        {friend.avatarUrl ? (
                            <img
                                alt=""
                                className="w-full h-full object-cover"
                                height={24}
                                loading="lazy"
                                src={friend.avatarUrl}
                                width={24}
                            />
                        ) : (
                            friend.name.charAt(0).toUpperCase()
                        )}
                    </div>
                ))}
            </div>
            {overflow > 0 && <span className="ml-1.5 text-xs text-muted-foreground">+{overflow}</span>}
        </div>
    )
}
