import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { FriendInfo } from '../../lib/recommendations'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '../ui/avatar'

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
        <AvatarGroup
            aria-label={t('card.friendStackLabel', { count: friends.length })}
            className={cn(className)}
            data-size="sm"
        >
            {visible.map((friend) => (
                <Avatar key={friend.id} size="sm" title={friend.name}>
                    {friend.avatarUrl && <AvatarImage alt="" src={friend.avatarUrl} />}
                    <AvatarFallback>{friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
            ))}
            {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
        </AvatarGroup>
    )
}
