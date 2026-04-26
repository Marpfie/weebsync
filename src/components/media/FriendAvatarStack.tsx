import type { FC } from 'react'

import { cn } from '@/lib/utils'

interface Friend {
    avatarUrl?: null | string
    id: number
    name: string
}

interface FriendAvatarStackProps {
    className?: string
    friends: Friend[]
    max?: number
}

export const FriendAvatarStack: FC<FriendAvatarStackProps> = ({ className, friends, max = 5 }) => {
    const visible = friends.slice(0, max)
    const overflow = friends.length - visible.length

    return (
        <div aria-label={`${friends.length} friends rated this`} className={cn('flex items-center', className)}>
            <div className="flex -space-x-2">
                {visible.map((friend) => (
                    <div
                        className="w-6 h-6 rounded-full ring-2 overflow-hidden flex items-center justify-center text-xs font-bold bg-secondary text-muted-foreground"
                        key={friend.id}
                        title={friend.name}
                    >
                        {friend.avatarUrl ? (
                            <img
                                alt={friend.name}
                                className="w-full h-full object-cover"
                                height={24}
                                src={friend.avatarUrl}
                                width={24}
                            />
                        ) : (
                            friend.name[0].toUpperCase()
                        )}
                    </div>
                ))}
            </div>
            {overflow > 0 && <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>}
        </div>
    )
}
