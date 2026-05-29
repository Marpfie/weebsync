import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { buttonVariants } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty'
import { Label } from '../components/ui/label'
import { ScrollArea } from '../components/ui/scroll-area'
import { Spinner } from '../components/ui/spinner'
import { Switch } from '../components/ui/switch'
import type { FollowingQuery } from '../gql/graphql'
import { useFollowing } from '../hooks/useFollowing'
import { requireIdentity } from '../lib/route-guards'
import { useIdentity } from '../store/identity'
import { toggleExcludedFriend, usePreferences } from '../store/preferences'

type FollowingUser = NonNullable<NonNullable<NonNullable<FollowingQuery['Page']>['following']>[number]>

const FriendsPage = () => {
    const { t } = useTranslation()
    const { excludedFriendIds } = usePreferences()
    const identity = useIdentity()
    const followingResult = useFollowing(identity?.userId)
    const following = followingResult.data?.Page?.following ?? []

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('friends.title')}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                    {t('friends.subtitle', { count: following.length })}
                </p>
            </div>

            {followingResult.error && (
                <Alert variant="destructive">
                    <AlertTitle>{t('friends.errorTitle')}</AlertTitle>
                    <AlertDescription>{followingResult.error.message}</AlertDescription>
                </Alert>
            )}

            {followingResult.loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner />
                    <span>{t('friends.loading')}</span>
                </div>
            )}

            {!followingResult.loading && following.length === 0 && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UserPlus />
                        </EmptyMedia>
                        <EmptyTitle>{t('friends.emptyTitle')}</EmptyTitle>
                        <EmptyDescription>{t('friends.emptyDescription')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            {following.length > 0 && (
                <ScrollArea className="max-h-[70vh] pr-3">
                    <ul aria-label={t('friends.listAriaLabel')} className="space-y-2">
                        {following.map((friend: FollowingUser | null) => {
                            if (!friend) return null
                            const isExcluded = excludedFriendIds.includes(friend.id)
                            return (
                                <li key={friend.id}>
                                    <Card
                                        className={cn('flex-row items-center gap-3 p-3', isExcluded && 'opacity-50')}
                                        size="sm"
                                    >
                                        <Avatar size="lg">
                                            {friend.avatar?.medium && (
                                                <AvatarImage
                                                    alt={t('friends.avatarAlt', { name: friend.name })}
                                                    src={friend.avatar.medium}
                                                />
                                            )}
                                            <AvatarFallback>{friend.name[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{friend.name}</p>
                                            {friend.siteUrl && (
                                                <a
                                                    className={buttonVariants({
                                                        className: 'h-auto p-0 text-xs text-muted-foreground/60',
                                                        variant: 'link',
                                                    })}
                                                    href={friend.siteUrl}
                                                    rel="noopener noreferrer"
                                                    target="_blank"
                                                >
                                                    {t('friends.viewOnAniList')}
                                                </a>
                                            )}
                                        </div>

                                        <Label className="cursor-pointer">
                                            <span className="sr-only">
                                                {isExcluded
                                                    ? t('friends.toggleSrExcluded', { name: friend.name })
                                                    : t('friends.toggleSrIncluded', { name: friend.name })}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-normal">
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
                                                    toggleExcludedFriend(friend.id)
                                                }}
                                            />
                                        </Label>
                                    </Card>
                                </li>
                            )
                        })}
                    </ul>
                </ScrollArea>
            )}
        </div>
    )
}

export const Route = createFileRoute('/friends')({ beforeLoad: requireIdentity, component: FriendsPage })
