import { useMemo } from 'react'

import type { UserMediaListsQuery } from '../gql/graphql'
import type { UserMediaEntry } from '../lib/recommendations'

/**
 * Flattens the `MediaListCollection` GraphQL shape into the engine's `UserMediaEntry[]`.
 * Pure so it can be reused by tests and other hooks.
 */
export const toUserEntries = (data: undefined | UserMediaListsQuery): UserMediaEntry[] => {
    const out: UserMediaEntry[] = []
    for (const list of data?.MediaListCollection?.lists ?? []) {
        for (const entry of list?.entries ?? []) {
            const media = entry?.media
            if (!media) continue
            out.push({
                averageScore: media.averageScore ?? null,
                chapters: media.chapters ?? null,
                coverColor: media.coverImage?.color ?? null,
                coverLarge: media.coverImage?.large ?? null,
                coverMedium: media.coverImage?.medium ?? null,
                episodes: media.episodes ?? null,
                format: media.format ?? null,
                genres: media.genres ?? null,
                mediaId: media.id,
                mediaStatus: media.status ?? null,
                score: entry.score ?? null,
                season: media.season ?? null,
                seasonYear: media.seasonYear ?? null,
                siteUrl: media.siteUrl ?? null,
                status: entry.status,
                title: media.title?.english ?? media.title?.romaji ?? media.title?.native ?? 'Unknown',
                volumes: media.volumes ?? null,
            })
        }
    }
    return out
}

/** Memoising wrapper around `toUserEntries`. */
export const useUserEntries = (data: undefined | UserMediaListsQuery): UserMediaEntry[] =>
    useMemo(() => toUserEntries(data), [data])
