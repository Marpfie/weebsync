import type { FC } from 'react'

import { cn } from '@/lib/utils'

import { Card } from './card'

interface SkeletonProps {
    className?: string
}

export const Skeleton: FC<SkeletonProps> = ({ className }) => (
    <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-secondary', className)} />
)

export const MediaCardSkeleton: FC = () => (
    <Card aria-hidden="true" className="flex flex-row gap-3 p-3">
        <Skeleton className="w-16 h-24 shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    </Card>
)
