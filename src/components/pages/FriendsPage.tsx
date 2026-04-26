import { useNavigate } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { FollowingQuery } from '../../gql/graphql'
import { useAuth } from '../../hooks/useAuth'
import { useFollowing } from '../../hooks/useFollowing'
import { useViewer } from '../../hooks/useViewer'
import { getPreferences, toggleExcludedFriend } from '../../store/preferences'
import { Switch } from '../ui/switch'

type FollowingUser = NonNullable<NonNullable<NonNullable<FollowingQuery['Page']>['following']>[number]>

export const FriendsPage: FC = () => {
    const { t } = useTranslation()
    const { token } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) void navigate({ to: '/' })
    }, [token, navigate])

    const viewerResult = useViewer()
    const userId = viewerResult.data?.Viewer?.id
    const followingResult = useFollowing(userId)
    const following = followingResult.data?.Page?.following ?? []

    const [excluded, setExcluded] = useState<number[]>(() => getPreferences().excludedFriendIds)

    const handleToggle = (friendId: number) => {
        toggleExcludedFriend(friendId)
        setExcluded(getPreferences().excludedFriendIds)
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('friends.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                    {t('friends.subtitle', { count: following.length })}
                </p>
            </div>

            {followingResult.loading && <p className="text-muted-foreground">{t('friends.loading')}</p>}

            <ul aria-label={t('friends.listAriaLabel')} className="space-y-2">
                {following.map((friend: FollowingUser | null) => {
                    if (!friend) return null
                    const isExcluded = excluded.includes(friend.id)
                    return (
                        <li
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-xl bg-card border border-border',
                                isExcluded && 'opacity-50'
                            )}
                            key={friend.id}
                        >
                            {friend.avatar?.medium ? (
                                <img
                                    alt={t('friends.avatarAlt', { name: friend.name })}
                                    className="rounded-full w-10 h-10 object-cover"
                                    height={40}
                                    src={friend.avatar.medium}
                                    width={40}
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-secondary text-primary"
                                >
                                    {friend.name[0].toUpperCase()}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{friend.name}</p>
                                {friend.siteUrl && (
                                    <a
                                        className="text-xs text-muted-foreground/60"
                                        href={friend.siteUrl}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        {t('friends.viewOnAniList')}
                                    </a>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="sr-only">
                                    {isExcluded
                                        ? t('friends.toggleSrExcluded', { name: friend.name })
                                        : t('friends.toggleSrIncluded', { name: friend.name })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {isExcluded ? t('friends.excluded') : t('friends.included')}
                                </span>
                                <Switch
                                    aria-label={
                                        isExcluded
                                            ? t('friends.includeAriaLabel', { name: friend.name })
                                            : t('friends.excludeAriaLabel', { name: friend.name })
                                    }
                                    checked={!isExcluded}
                                    onCheckedChange={() => {
                                        handleToggle(friend.id)
                                    }}
                                />
                            </label>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
